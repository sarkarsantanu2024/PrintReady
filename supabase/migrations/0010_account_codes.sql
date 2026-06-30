-- ============================================================================
-- ACCOUNT-BOUND SUBSCRIPTION CODES
--
-- The super admin generates a code FOR a specific subscriber (after adding or
-- changing their plan). Only that account can redeem it; redeeming activates /
-- tops up the account's monthly allowance. Single-use.
--
-- Idempotent — safe to re-run.
-- ============================================================================

alter table public.pr_topup_codes add column if not exists account     text;
alter table public.pr_topup_codes add column if not exists qr_credits  int not null default 0;

-- Admin issues a code bound to one account.
create or replace function public.pr_admin_issue_code(
  p_code text, p_account text, p_credits int, p_qr_credits int
) returns json language plpgsql security definer set search_path = public as $$
begin
  insert into public.pr_topup_codes(code, account, credits, qr_credits, kind, used)
  values (
    upper(trim(p_code)), lower(trim(p_account)),
    greatest(0, coalesce(p_credits, 0)), greatest(0, coalesce(p_qr_credits, 0)),
    'pdf', false
  )
  on conflict (code) do nothing;
  return json_build_object('ok', true, 'code', upper(trim(p_code)));
end $$;

-- Redeem a code for the signed-in account (checks account binding + single use).
create or replace function public.pr_redeem_account_code(p_account text, p_code text)
  returns json language plpgsql security definer set search_path = public as $$
declare c public.pr_topup_codes; a public.pr_accounts; acc text := lower(trim(p_account));
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
  update public.pr_accounts
     set granted = granted + c.credits, qr_granted = qr_granted + coalesce(c.qr_credits, 0)
   where username = acc returning * into a;
  return json_build_object('ok', true, 'granted', a.granted, 'qr_granted', a.qr_granted);
end $$;

revoke all on function public.pr_admin_issue_code(text, text, int, int) from public;
grant execute on function public.pr_admin_issue_code(text, text, int, int) to anon, authenticated;
revoke all on function public.pr_redeem_account_code(text, text) from public;
grant execute on function public.pr_redeem_account_code(text, text) to anon, authenticated;
