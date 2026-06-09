-- ============================================================================
-- STRICT MONTHLY quota for the single Business client — leak-proof.
--
-- The month starts at 0 PDFs. PDFs are only granted by redeeming a code you
-- insert AFTER receiving payment:
--   plan code  (₹3200) -> credits 100
--   top-up code (₹500) -> credits 30
-- Everything resets to 0 on the 1st (no rollover, no free PDFs).
--
-- The browser only gets EXECUTE on the three SECURITY DEFINER functions; it has
-- NO direct table access, so it can't reset the count or read the codes.
-- Apply in the Supabase SQL editor (safe to re-run).
-- ============================================================================

create table if not exists public.pr_quota (
  client_id text primary key default 'default',
  period    text not null,
  used      int  not null default 0,
  granted   int  not null default 0
);
-- upgrade older installs
alter table public.pr_quota add column if not exists granted int not null default 0;
alter table public.pr_quota drop column if exists topups;

create table if not exists public.pr_topup_codes (
  code        text primary key,
  credits     int  not null default 30,
  used        boolean not null default false,
  redeemed_at timestamptz
);
alter table public.pr_topup_codes add column if not exists credits int not null default 30;

alter table public.pr_quota       enable row level security;
alter table public.pr_topup_codes enable row level security;
-- (No policies on purpose — only the SECURITY DEFINER functions below can touch them.)

create or replace function public.pr_period() returns text
  language sql stable as $$ select to_char(now(), 'YYYY-MM') $$;

-- Fetch the single client row, creating it and resetting to 0 at the start of a
-- new month (used + granted both cleared — strict monthly, no rollover).
create or replace function public._pr_row() returns public.pr_quota
  language plpgsql security definer set search_path = public as $$
declare r public.pr_quota;
begin
  insert into public.pr_quota(client_id, period) values ('default', pr_period())
    on conflict (client_id) do nothing;
  select * into r from public.pr_quota where client_id = 'default' for update;
  if r.period <> pr_period() then
    update public.pr_quota set period = pr_period(), used = 0, granted = 0
      where client_id = 'default' returning * into r;
  end if;
  return r;
end $$;

create or replace function public.pr_get_quota() returns json
  language plpgsql security definer set search_path = public as $$
declare r public.pr_quota;
begin
  r := public._pr_row();
  return json_build_object('used', r.used, 'granted', r.granted, 'month', r.period);
end $$;

create or replace function public.pr_add_usage() returns json
  language plpgsql security definer set search_path = public as $$
declare r public.pr_quota;
begin
  perform public._pr_row();
  update public.pr_quota set used = used + 1 where client_id = 'default' returning * into r;
  return json_build_object('used', r.used, 'granted', r.granted, 'month', r.period);
end $$;

-- Redeem a one-time code: adds its `credits` (100 plan / 30 top-up) to this month.
create or replace function public.pr_redeem_topup(p_code text) returns json
  language plpgsql security definer set search_path = public as $$
declare r public.pr_quota; c public.pr_topup_codes;
begin
  perform public._pr_row();
  select * into c from public.pr_topup_codes where code = upper(trim(p_code)) for update;
  if c.code is null then
    return json_build_object('ok', false, 'reason', 'Invalid code.');
  end if;
  if c.used then
    return json_build_object('ok', false, 'reason', 'This code has already been used.');
  end if;
  update public.pr_topup_codes set used = true, redeemed_at = now() where code = c.code;
  update public.pr_quota set granted = granted + c.credits where client_id = 'default' returning * into r;
  return json_build_object('ok', true, 'used', r.used, 'granted', r.granted, 'month', r.period);
end $$;

revoke all on function public.pr_get_quota()        from public;
revoke all on function public.pr_add_usage()        from public;
revoke all on function public.pr_redeem_topup(text) from public;
grant execute on function public.pr_get_quota()        to anon, authenticated;
grant execute on function public.pr_add_usage()        to anon, authenticated;
grant execute on function public.pr_redeem_topup(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Issue codes AFTER payment (run in the SQL editor, then send the code):
--   Monthly plan (₹3200, 100 PDFs):
--     insert into public.pr_topup_codes(code, credits) values ('PLAN-2026-06', 100);
--   Top-up (₹500, 30 PDFs):
--     insert into public.pr_topup_codes(code, credits) values ('TOP-2026-06-1', 30);
-- The code can be any text you like; it works once.
-- ---------------------------------------------------------------------------
