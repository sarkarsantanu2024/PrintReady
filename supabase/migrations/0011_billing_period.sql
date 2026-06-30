-- ============================================================================
-- MONTHLY BILLING PERIOD
--
-- An account's allowance is valid only for the month it was activated. We stamp
-- pr_accounts.period ('YYYY-MM') on redemption. The quota snapshot returns the
-- allowance ONLY when period = current month — so next month it reads as 0
-- (renewal due → the pay QR shows again). A plan/quota change already zeroes
-- granted, so that also re-prompts payment.
--
-- Idempotent — safe to re-run.
-- ============================================================================

alter table public.pr_accounts add column if not exists period text;

-- Quota snapshot: allowance is period-gated (0 once the month rolls over).
create or replace function public.pr_account_quota(p_account text)
  returns json language plpgsql security definer set search_path = public as $$
declare a public.pr_accounts; v_used int; acc text := lower(trim(p_account));
  v_period text := to_char(now(), 'YYYY-MM'); v_granted int; v_qr int;
begin
  select * into a from public.pr_accounts where username = acc;
  select count(*)::int into v_used from public.pr_usage_log
    where account = acc and to_char(created_at, 'YYYY-MM') = v_period;
  if a.period = v_period then
    v_granted := coalesce(a.granted, 0);
    v_qr := coalesce(a.qr_granted, 0);
  else
    v_granted := 0;  -- new month: renewal due
    v_qr := 0;
  end if;
  return json_build_object(
    'granted', v_granted, 'used', coalesce(v_used, 0),
    'qr_granted', v_qr, 'qr_used', coalesce(a.qr_used, 0),
    'period', a.period, 'active', (a.period = v_period and coalesce(a.granted, 0) > 0)
  );
end $$;

-- Redeem: stamp the current month. New month → fresh allowance; same month → top-up.
create or replace function public.pr_redeem_account_code(p_account text, p_code text)
  returns json language plpgsql security definer set search_path = public as $$
declare c public.pr_topup_codes; a public.pr_accounts; acc text := lower(trim(p_account));
  v_period text := to_char(now(), 'YYYY-MM');
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
  if a.period is distinct from v_period then
    update public.pr_accounts
       set granted = c.credits, qr_granted = coalesce(c.qr_credits, 0), qr_used = 0, period = v_period
     where username = acc returning * into a;
  else
    update public.pr_accounts
       set granted = granted + c.credits, qr_granted = qr_granted + coalesce(c.qr_credits, 0), period = v_period
     where username = acc returning * into a;
  end if;
  return json_build_object('ok', true, 'granted', a.granted, 'qr_granted', a.qr_granted);
end $$;
