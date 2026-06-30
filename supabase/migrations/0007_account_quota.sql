-- ============================================================================
-- PER-ACCOUNT QUOTA ACTIVATION
--
-- A paid account (Business / Enterprise / Custom) starts with ZERO allowance —
-- no quota shown, can't generate — until the customer pays and redeems a
-- subscription code the super admin issues. Redeeming sets the account's
-- monthly PDF allowance (and QR allowance for QR-plan codes).
--
-- PDF "used" is derived live from pr_usage_log (per calendar month, auto-resets);
-- QR usage is a running counter on the account. Free needs no code (the app
-- uses the plan's built-in allowance).
--
-- Idempotent — safe to re-run in the Supabase SQL editor.
-- ============================================================================

alter table public.pr_accounts add column if not exists granted    int not null default 0;
alter table public.pr_accounts add column if not exists qr_granted int not null default 0;
alter table public.pr_accounts add column if not exists qr_used    int not null default 0;

-- Live quota snapshot for one account.
create or replace function public.pr_account_quota(p_account text)
  returns json language plpgsql security definer set search_path = public as $$
declare a public.pr_accounts; v_used int; acc text := lower(trim(p_account));
begin
  select * into a from public.pr_accounts where username = acc;
  select count(*)::int into v_used from public.pr_usage_log
    where account = acc and to_char(created_at, 'YYYY-MM') = to_char(now(), 'YYYY-MM');
  return json_build_object(
    'granted', coalesce(a.granted, 0),
    'used', coalesce(v_used, 0),
    'qr_granted', coalesce(a.qr_granted, 0),
    'qr_used', coalesce(a.qr_used, 0)
  );
end $$;

-- Redeem a subscription code FOR an account (activates / extends its allowance).
create or replace function public.pr_redeem_account_code(p_account text, p_code text)
  returns json language plpgsql security definer set search_path = public as $$
declare c public.pr_topup_codes; a public.pr_accounts; acc text := lower(trim(p_account));
begin
  select * into a from public.pr_accounts where username = acc;
  if a.username is null then
    return json_build_object('ok', false, 'reason', 'Unknown account — please sign in again.');
  end if;
  select * into c from public.pr_topup_codes where upper(code) = upper(trim(p_code)) for update;
  if c.code is null then
    return json_build_object('ok', false, 'reason', 'Invalid code.');
  end if;
  if c.used then
    return json_build_object('ok', false, 'reason', 'This code has already been used.');
  end if;
  update public.pr_topup_codes set used = true, redeemed_at = now() where code = c.code;
  if c.kind = 'qr' then
    update public.pr_accounts set granted = granted + c.credits, qr_granted = qr_granted + c.credits
      where username = acc returning * into a;
  else
    update public.pr_accounts set granted = granted + c.credits
      where username = acc returning * into a;
  end if;
  return json_build_object('ok', true, 'granted', a.granted, 'qr_granted', a.qr_granted, 'credits', c.credits);
end $$;

-- Register verifiable cards against an account's QR allowance.
create or replace function public.pr_register_cards_acc(p_account text, p_cards json)
  returns json language plpgsql security definer set search_path = public as $$
declare a public.pr_accounts; v_count int; c json; acc text := lower(trim(p_account));
begin
  select * into a from public.pr_accounts where username = acc for update;
  if a.username is null then
    return json_build_object('ok', false, 'reason', 'Unknown account.');
  end if;
  v_count := coalesce(json_array_length(p_cards), 0);
  if v_count = 0 then
    return json_build_object('ok', false, 'reason', 'No cards to register.');
  end if;
  if a.qr_used + v_count > a.qr_granted then
    return json_build_object('ok', false, 'reason', 'Verifiable-QR allowance exhausted.',
      'qr_used', a.qr_used, 'qr_granted', a.qr_granted);
  end if;
  for c in select value from json_array_elements(p_cards) as t(value) loop
    insert into public.pr_verified_cards(code, name, org, photo)
    values (upper(trim(c->>'code')), coalesce(c->>'name', ''), coalesce(c->>'org', ''), c->>'photo')
    on conflict (code) do update
      set name = excluded.name, org = excluded.org, photo = excluded.photo, revoked = false;
  end loop;
  update public.pr_accounts set qr_used = qr_used + v_count where username = acc returning * into a;
  return json_build_object('ok', true, 'qr_used', a.qr_used, 'qr_granted', a.qr_granted);
end $$;

revoke all on function public.pr_account_quota(text)              from public;
revoke all on function public.pr_redeem_account_code(text, text)  from public;
revoke all on function public.pr_register_cards_acc(text, json)   from public;
grant execute on function public.pr_account_quota(text)              to anon, authenticated;
grant execute on function public.pr_redeem_account_code(text, text)  to anon, authenticated;
grant execute on function public.pr_register_cards_acc(text, json)   to anon, authenticated;
