-- ============================================================================
-- DIRECT ADMIN ACTIVATION
--
-- The super admin sets an account's monthly allowance directly after confirming
-- the UPI payment — no bearer codes. This is the activation / top-up / quota-
-- change primitive: it sets the absolute PDF (and QR) allowance on the account.
-- "Used" still derives from pr_usage_log per month, so it keeps auto-resetting.
--
-- Idempotent — safe to re-run.
-- ============================================================================

create or replace function public.pr_admin_set_allowance(
  p_account text, p_granted int, p_qr_granted int
) returns json language plpgsql security definer set search_path = public as $$
declare a public.pr_accounts; acc text := lower(trim(p_account));
begin
  update public.pr_accounts set
    granted    = greatest(0, coalesce(p_granted, 0)),
    qr_granted = greatest(0, coalesce(p_qr_granted, 0))
  where username = acc returning * into a;
  if a.username is null then
    return json_build_object('ok', false, 'reason', 'Unknown account.');
  end if;
  return json_build_object('ok', true, 'granted', a.granted, 'qr_granted', a.qr_granted);
end $$;

revoke all on function public.pr_admin_set_allowance(text, int, int) from public;
grant execute on function public.pr_admin_set_allowance(text, int, int) to anon, authenticated;
