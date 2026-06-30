-- ============================================================================
-- VERIFIABLE QR — paid add-on for the single MMA client.
--
-- Pricing kept SEPARATE from the base plan:
--   base plan   (₹1960) -> 130 print-ready PDFs           (kind = 'pdf')
--   QR plan     (₹2300) -> 130 PDFs + 130 verifiable cards (kind = 'qr')
--
-- A "verifiable card" is metered PER CARD (130 cards = the ₹2300 plan), unlike
-- the base PDF quota which is metered per generate. Redeeming a 'qr' code tops
-- up BOTH buckets so one code unlocks the whole QR plan.
--
-- The card RECORDS in pr_verified_cards are PERMANENT — they survive the strict
-- monthly quota reset, because a printed card must stay verifiable forever
-- (until you revoke it). Only the monthly *allowance* (qr_granted/qr_used)
-- resets on the 1st, exactly like the PDF quota.
--
-- The browser only ever gets EXECUTE on the SECURITY DEFINER functions below;
-- it has NO direct table access. Apply in the Supabase SQL editor (safe to
-- re-run — every statement is idempotent).
-- ============================================================================

-- --- extend the single-client quota row with a QR allowance --------------- --
alter table public.pr_quota add column if not exists qr_used    int not null default 0;
alter table public.pr_quota add column if not exists qr_granted int not null default 0;

-- --- mark codes as base ('pdf') or QR-plan ('qr') ------------------------- --
alter table public.pr_topup_codes
  add column if not exists kind text not null default 'pdf';
-- (intentionally no CHECK constraint so older rows upgrade cleanly)

-- --- permanent verifiable-card records ------------------------------------ --
create table if not exists public.pr_verified_cards (
  code        text primary key,          -- e.g. 'PR-7F3A-9K2X' (stored UPPERCASE)
  name        text not null default '',
  org         text not null default '',
  photo       text,                       -- base64 PNG data URL shown on /verify
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.pr_verified_cards enable row level security;
-- (No policies on purpose — only the SECURITY DEFINER functions below can touch it.)

-- ============================================================================
-- Replace _pr_row() so the monthly reset also clears the QR allowance.
-- (Card records in pr_verified_cards are untouched — only the counters reset.)
-- ============================================================================
create or replace function public._pr_row() returns public.pr_quota
  language plpgsql security definer set search_path = public as $$
declare r public.pr_quota;
begin
  insert into public.pr_quota(client_id, period) values ('default', pr_period())
    on conflict (client_id) do nothing;
  select * into r from public.pr_quota where client_id = 'default' for update;
  if r.period <> pr_period() then
    update public.pr_quota
       set period = pr_period(), used = 0, granted = 0, qr_used = 0, qr_granted = 0
     where client_id = 'default' returning * into r;
  end if;
  return r;
end $$;

-- ============================================================================
-- pr_get_quota() now also reports the QR allowance.
-- ============================================================================
create or replace function public.pr_get_quota() returns json
  language plpgsql security definer set search_path = public as $$
declare r public.pr_quota;
begin
  r := public._pr_row();
  return json_build_object(
    'used', r.used, 'granted', r.granted, 'month', r.period,
    'qr_used', r.qr_used, 'qr_granted', r.qr_granted
  );
end $$;

-- ============================================================================
-- Redeem a one-time code. A 'qr' code tops up BOTH the PDF and QR buckets so
-- the single ₹2300 code unlocks the whole QR plan; a 'pdf' code is unchanged.
-- ============================================================================
create or replace function public.pr_redeem_topup(p_code text) returns json
  language plpgsql security definer set search_path = public as $$
declare r public.pr_quota; c public.pr_topup_codes;
begin
  perform public._pr_row();
  select * into c from public.pr_topup_codes where upper(code) = upper(trim(p_code)) for update;
  if c.code is null then
    return json_build_object('ok', false, 'reason', 'Invalid code.');
  end if;
  if c.used then
    return json_build_object('ok', false, 'reason', 'This code has already been used.');
  end if;
  update public.pr_topup_codes set used = true, redeemed_at = now() where code = c.code;
  if c.kind = 'qr' then
    update public.pr_quota
       set granted = granted + c.credits, qr_granted = qr_granted + c.credits
     where client_id = 'default' returning * into r;
  else
    update public.pr_quota
       set granted = granted + c.credits
     where client_id = 'default' returning * into r;
  end if;
  return json_build_object(
    'ok', true, 'used', r.used, 'granted', r.granted, 'month', r.period,
    'qr_used', r.qr_used, 'qr_granted', r.qr_granted
  );
end $$;

-- ============================================================================
-- Register a batch of verifiable cards (metered per card against qr_granted).
-- Input: JSON array of { code, name, org, photo }. All-or-nothing on quota.
-- ============================================================================
create or replace function public.pr_register_cards(p_cards json) returns json
  language plpgsql security definer set search_path = public as $$
declare r public.pr_quota; v_count int; c json;
begin
  perform public._pr_row();
  v_count := coalesce(json_array_length(p_cards), 0);
  if v_count = 0 then
    return json_build_object('ok', false, 'reason', 'No cards to register.');
  end if;
  select * into r from public.pr_quota where client_id = 'default' for update;
  if r.qr_used + v_count > r.qr_granted then
    return json_build_object(
      'ok', false, 'reason', 'Verifiable-QR allowance exhausted.',
      'qr_used', r.qr_used, 'qr_granted', r.qr_granted
    );
  end if;
  for c in select value from json_array_elements(p_cards) as t(value) loop
    insert into public.pr_verified_cards(code, name, org, photo)
    values (
      upper(trim(c->>'code')),
      coalesce(c->>'name', ''),
      coalesce(c->>'org', ''),
      c->>'photo'
    )
    on conflict (code) do update
      set name = excluded.name, org = excluded.org,
          photo = excluded.photo, revoked = false;
  end loop;
  update public.pr_quota set qr_used = qr_used + v_count
    where client_id = 'default' returning * into r;
  return json_build_object('ok', true, 'qr_used', r.qr_used, 'qr_granted', r.qr_granted);
end $$;

-- ============================================================================
-- Public scan endpoint — returns only the data shown on the verification page.
-- ============================================================================
create or replace function public.pr_verify_card(p_code text) returns json
  language plpgsql security definer set search_path = public as $$
declare v public.pr_verified_cards;
begin
  select * into v from public.pr_verified_cards where code = upper(trim(p_code));
  if v.code is null then
    return json_build_object('found', false);
  end if;
  return json_build_object(
    'found', true, 'revoked', v.revoked,
    'code', v.code, 'name', v.name, 'org', v.org,
    'photo', v.photo, 'issued', v.created_at
  );
end $$;

-- ============================================================================
-- Revoke a card (e.g. lost/stolen) so it scans as NOT VALID.
-- ============================================================================
create or replace function public.pr_revoke_card(p_code text) returns json
  language plpgsql security definer set search_path = public as $$
declare v public.pr_verified_cards;
begin
  update public.pr_verified_cards set revoked = true
    where code = upper(trim(p_code)) returning * into v;
  if v.code is null then
    return json_build_object('ok', false, 'reason', 'Card not found.');
  end if;
  return json_build_object('ok', true, 'code', v.code, 'revoked', v.revoked);
end $$;

-- --- grants (match the existing single-client trust model) ---------------- --
revoke all on function public.pr_register_cards(json) from public;
revoke all on function public.pr_verify_card(text)    from public;
revoke all on function public.pr_revoke_card(text)    from public;
grant execute on function public.pr_register_cards(json) to anon, authenticated;
grant execute on function public.pr_verify_card(text)    to anon, authenticated;
grant execute on function public.pr_revoke_card(text)    to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Issue the QR-plan code AFTER payment (₹2300). Store it UPPERCASE; redemption
-- uppercases the entered code. One code unlocks 130 PDFs + 130 verifiable cards.
--   insert into public.pr_topup_codes(code, credits, kind)
--     values ('QR-JUNE-2026', 130, 'qr') on conflict (code) do nothing;
-- ---------------------------------------------------------------------------
insert into public.pr_topup_codes(code, credits, kind)
  values ('QR-JUNE-2026', 130, 'qr')
  on conflict (code) do nothing;
