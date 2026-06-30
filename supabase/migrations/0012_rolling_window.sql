-- ============================================================================
-- ROLLING 1-MONTH SUBSCRIPTION WINDOW + EXTRA PROFILE FIELDS
--
-- Supersedes the calendar-month "period" model (0011). An account's allowance is
-- valid for ONE MONTH FROM ACTIVATION (activated_at → valid_until), so paying on
-- the 30th gives ~30 days, not 1. Also adds phone + address so we can capture
-- full details (including for Free signups).
--
-- Idempotent — safe to re-run.
-- ============================================================================

alter table public.pr_accounts add column if not exists activated_at timestamptz;
alter table public.pr_accounts add column if not exists valid_until  timestamptz;
alter table public.pr_accounts add column if not exists phone        text;
alter table public.pr_accounts add column if not exists address      text;

-- Store the new detail fields on signup.
create or replace function public.pr_create_account(p json) returns json
  language plpgsql security definer set search_path = public as $$
declare v_username text;
begin
  v_username := lower(trim(p->>'username'));
  if v_username is null or v_username = '' then
    return json_build_object('ok', false, 'reason', 'A username is required.');
  end if;
  if coalesce(p->>'password', '') = '' then
    return json_build_object('ok', false, 'reason', 'A password is required.');
  end if;
  if exists (select 1 from public.pr_accounts where username = v_username) then
    return json_build_object('ok', false, 'reason', 'An account with this username already exists.');
  end if;
  insert into public.pr_accounts(username, password, plan, center_name, center_type, full_name, email, phone, address, custom_pdfs, custom_price)
  values (v_username, p->>'password', coalesce(p->>'plan', 'free'),
          p->>'center_name', p->>'center_type', p->>'full_name', p->>'email', p->>'phone', p->>'address',
          nullif(p->>'custom_pdfs', '')::int, nullif(p->>'custom_price', '')::int);
  return json_build_object('ok', true, 'username', v_username, 'plan', coalesce(p->>'plan', 'free'));
end $$;

-- Return the extra fields for the profile.
create or replace function public.pr_account_info(p_account text)
  returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  select row_to_json(t) into result from (
    select username, full_name, center_name, center_type, email, phone, address, plan, custom_pdfs, custom_price
    from public.pr_accounts where username = lower(trim(p_account))
  ) t;
  return coalesce(result, '{}'::json);
end $$;

-- Quota snapshot — windowed. Allowance counts only while now() < valid_until.
create or replace function public.pr_account_quota(p_account text)
  returns json language plpgsql security definer set search_path = public as $$
declare a public.pr_accounts; v_used int; acc text := lower(trim(p_account));
  v_active boolean; v_granted int; v_qr int; v_days int;
begin
  select * into a from public.pr_accounts where username = acc;
  v_active := a.valid_until is not null and a.valid_until > now();
  if v_active then
    v_granted := coalesce(a.granted, 0);
    v_qr := coalesce(a.qr_granted, 0);
    select count(*)::int into v_used from public.pr_usage_log
      where account = acc and created_at >= a.activated_at;
    v_days := greatest(0, ceil(extract(epoch from (a.valid_until - now())) / 86400.0)::int);
  else
    v_granted := 0; v_qr := 0; v_used := 0; v_days := 0;
  end if;
  return json_build_object(
    'granted', v_granted, 'used', coalesce(v_used, 0),
    'qr_granted', v_qr, 'qr_used', coalesce(a.qr_used, 0),
    'active', v_active, 'days_left', v_days, 'valid_until', a.valid_until
  );
end $$;

-- Redeem — opens a fresh 1-month window, or tops up the current one.
create or replace function public.pr_redeem_account_code(p_account text, p_code text)
  returns json language plpgsql security definer set search_path = public as $$
declare c public.pr_topup_codes; a public.pr_accounts; acc text := lower(trim(p_account)); v_active boolean;
begin
  select * into a from public.pr_accounts where username = acc;
  if a.username is null then
    return json_build_object('ok', false, 'reason', 'Unknown account — please sign in again.');
  end if;
  select * into c from public.pr_topup_codes where upper(code) = upper(trim(p_code)) for update;
  if c.code is null then return json_build_object('ok', false, 'reason', 'Invalid code.'); end if;
  if c.used then return json_build_object('ok', false, 'reason', 'This code has already been used.'); end if;
  if c.account is not null and c.account <> acc then
    return json_build_object('ok', false, 'reason', 'This code was issued for a different account.');
  end if;
  update public.pr_topup_codes set used = true, redeemed_at = now() where code = c.code;
  v_active := a.valid_until is not null and a.valid_until > now();
  if v_active then
    update public.pr_accounts
       set granted = granted + c.credits, qr_granted = qr_granted + coalesce(c.qr_credits, 0)
     where username = acc returning * into a;
  else
    update public.pr_accounts
       set granted = c.credits, qr_granted = coalesce(c.qr_credits, 0), qr_used = 0,
           activated_at = now(), valid_until = now() + interval '1 month'
     where username = acc returning * into a;
  end if;
  return json_build_object('ok', true, 'granted', a.granted, 'qr_granted', a.qr_granted);
end $$;

grant execute on function public.pr_create_account(json)               to anon, authenticated;
grant execute on function public.pr_account_info(text)                  to anon, authenticated;
grant execute on function public.pr_account_quota(text)                 to anon, authenticated;
grant execute on function public.pr_redeem_account_code(text, text)     to anon, authenticated;
