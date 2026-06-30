-- ============================================================================
-- PLAN ACCOUNTS + USAGE HISTORY
--
-- Adds two things the reshaped plans need:
--   1. pr_accounts   — self-service logins for the paid plans (Business /
--      Enterprise). Free & Starter keep the fixed santanu.sarkar credential;
--      the super admin is a separate fixed credential in the app code.
--   2. pr_usage_log  — one row per generated print-ready PDF, so the Report
--      feature can show REAL monthly / quarterly / yearly counts (the strict
--      pr_quota row only knows the current month and resets to 0).
--
-- Passwords are stored as plain text on purpose — this matches the existing
-- single-client trust model (the app already ships fixed plaintext creds) and
-- there is no sensitive PII here. Swap to hashing if that ever changes.
--
-- The browser only gets EXECUTE on the SECURITY DEFINER functions below.
-- Apply in the Supabase SQL editor (idempotent — safe to re-run).
-- ============================================================================

create table if not exists public.pr_accounts (
  username    text primary key,          -- login id (email), lowercased
  password    text not null,
  plan        text not null,             -- 'business' | 'enterprise'
  center_name text,
  center_type text,
  full_name   text,
  email       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.pr_usage_log (
  id         bigint generated always as identity primary key,
  account    text not null,              -- pr_accounts.username, or 'fixed:starter' etc.
  plan       text not null,
  created_at timestamptz not null default now()
);
create index if not exists pr_usage_log_account_idx on public.pr_usage_log (account, created_at);

alter table public.pr_accounts  enable row level security;
alter table public.pr_usage_log enable row level security;
-- (No policies — only the SECURITY DEFINER functions below may touch them.)

-- --- create a paid-plan account (from the Create-account page) ------------- --
create or replace function public.pr_create_account(p json) returns json
  language plpgsql security definer set search_path = public as $$
declare v_username text;
begin
  v_username := lower(trim(p->>'username'));
  if v_username is null or v_username = '' then
    return json_build_object('ok', false, 'reason', 'A username/email is required.');
  end if;
  if coalesce(p->>'password', '') = '' then
    return json_build_object('ok', false, 'reason', 'A password is required.');
  end if;
  if exists (select 1 from public.pr_accounts where username = v_username) then
    return json_build_object('ok', false, 'reason', 'An account with this email already exists.');
  end if;
  insert into public.pr_accounts(username, password, plan, center_name, center_type, full_name, email)
  values (
    v_username,
    p->>'password',
    coalesce(p->>'plan', 'business'),
    p->>'center_name',
    p->>'center_type',
    p->>'full_name',
    coalesce(p->>'email', v_username)
  );
  return json_build_object('ok', true, 'username', v_username, 'plan', coalesce(p->>'plan', 'business'));
end $$;

-- --- verify a login for a given plan -------------------------------------- --
create or replace function public.pr_login_account(p_username text, p_password text, p_plan text)
  returns json language plpgsql security definer set search_path = public as $$
declare a public.pr_accounts;
begin
  select * into a from public.pr_accounts where username = lower(trim(p_username));
  if a.username is null or a.password <> p_password then
    return json_build_object('ok', false, 'reason', 'Incorrect username or password.');
  end if;
  if p_plan is not null and a.plan <> p_plan then
    return json_build_object('ok', false, 'reason', 'This account is on the ' || a.plan || ' plan.');
  end if;
  return json_build_object('ok', true, 'plan', a.plan, 'full_name', a.full_name, 'center_name', a.center_name);
end $$;

-- --- log one generated PDF ------------------------------------------------- --
create or replace function public.pr_log_usage(p_account text, p_plan text)
  returns json language plpgsql security definer set search_path = public as $$
begin
  insert into public.pr_usage_log(account, plan) values (coalesce(p_account, 'anon'), coalesce(p_plan, 'free'));
  return json_build_object('ok', true);
end $$;

-- --- report for one account: monthly buckets (client rolls up the rest) ---- --
create or replace function public.pr_usage_report(p_account text)
  returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  select coalesce(json_agg(row_to_json(t) order by t.period), '[]'::json) into result
  from (
    select to_char(created_at, 'YYYY-MM') as period, count(*)::int as count
    from public.pr_usage_log
    where account = p_account
    group by 1
  ) t;
  return result;
end $$;

-- --- super-admin report: every account, monthly buckets -------------------- --
create or replace function public.pr_usage_report_all()
  returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  select coalesce(json_agg(row_to_json(t) order by t.account, t.period), '[]'::json) into result
  from (
    select account, max(plan) as plan, to_char(created_at, 'YYYY-MM') as period, count(*)::int as count
    from public.pr_usage_log
    group by account, to_char(created_at, 'YYYY-MM')
  ) t;
  return result;
end $$;

revoke all on function public.pr_create_account(json)              from public;
revoke all on function public.pr_login_account(text, text, text)   from public;
revoke all on function public.pr_log_usage(text, text)             from public;
revoke all on function public.pr_usage_report(text)                from public;
revoke all on function public.pr_usage_report_all()                from public;
grant execute on function public.pr_create_account(json)            to anon, authenticated;
grant execute on function public.pr_login_account(text, text, text) to anon, authenticated;
grant execute on function public.pr_log_usage(text, text)           to anon, authenticated;
grant execute on function public.pr_usage_report(text)              to anon, authenticated;
grant execute on function public.pr_usage_report_all()              to anon, authenticated;
