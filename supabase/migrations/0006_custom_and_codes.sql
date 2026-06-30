-- ============================================================================
-- CUSTOM-PLAN VOLUME/PRICE + SUPER-ADMIN CODE MINTING
--
--  - pr_accounts gains custom_pdfs / custom_price so a Custom subscriber's
--    chosen monthly volume (and the price it computes to) is persisted and
--    returned at login (drives the quota badge + report money).
--  - pr_admin_create_code lets the super admin mint a one-time subscription
--    code for a plan (inserted into the redeemable-code pool).
--
-- Idempotent — safe to re-run in the Supabase SQL editor.
-- ============================================================================

alter table public.pr_accounts add column if not exists custom_pdfs  int;
alter table public.pr_accounts add column if not exists custom_price int;

-- Store custom volume/price on create.
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
  insert into public.pr_accounts(username, password, plan, center_name, center_type, full_name, email, custom_pdfs, custom_price)
  values (
    v_username, p->>'password', coalesce(p->>'plan', 'business'),
    p->>'center_name', p->>'center_type', p->>'full_name', coalesce(p->>'email', v_username),
    nullif(p->>'custom_pdfs', '')::int, nullif(p->>'custom_price', '')::int
  );
  return json_build_object('ok', true, 'username', v_username, 'plan', coalesce(p->>'plan', 'business'));
end $$;

-- Return custom volume/price at login.
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
  return json_build_object(
    'ok', true, 'plan', a.plan, 'full_name', a.full_name, 'center_name', a.center_name,
    'price', a.custom_price, 'pdfs', a.custom_pdfs
  );
end $$;

-- Super admin mints a one-time subscription code (credits + kind per plan).
create or replace function public.pr_admin_create_code(p_code text, p_credits int, p_kind text)
  returns json language plpgsql security definer set search_path = public as $$
begin
  insert into public.pr_topup_codes(code, credits, kind)
  values (upper(trim(p_code)), greatest(0, coalesce(p_credits, 0)), coalesce(p_kind, 'pdf'))
  on conflict (code) do nothing;
  return json_build_object('ok', true, 'code', upper(trim(p_code)));
end $$;

revoke all on function public.pr_admin_create_code(text, int, text) from public;
grant execute on function public.pr_admin_create_code(text, int, text) to anon, authenticated;

-- Self-service password reset (verify with username + center name).
create or replace function public.pr_reset_password(p_username text, p_center text, p_password text)
  returns json language plpgsql security definer set search_path = public as $$
declare a public.pr_accounts;
begin
  select * into a from public.pr_accounts where username = lower(trim(p_username));
  if a.username is null then
    return json_build_object('ok', false, 'reason', 'No account found for that username.');
  end if;
  if lower(trim(coalesce(a.center_name, ''))) <> lower(trim(coalesce(p_center, ''))) then
    return json_build_object('ok', false, 'reason', 'Center name does not match our records.');
  end if;
  update public.pr_accounts set password = p_password where username = a.username;
  return json_build_object('ok', true);
end $$;
revoke all on function public.pr_reset_password(text, text, text) from public;
grant execute on function public.pr_reset_password(text, text, text) to anon, authenticated;

-- Super-admin: list accounts (NO passwords) for username lookup / support.
create or replace function public.pr_list_accounts()
  returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  select coalesce(json_agg(row_to_json(t) order by t.username), '[]'::json) into result
  from (select username, center_name, full_name, plan from public.pr_accounts) t;
  return result;
end $$;
revoke all on function public.pr_list_accounts() from public;
grant execute on function public.pr_list_accounts() to anon, authenticated;
