-- ============================================================================
-- ACCOUNT DETAILS + PLAN SWITCHING
--   pr_account_info  — full (password-free) account details for the profile.
--   pr_set_plan      — switch a subscriber's plan (or, for Custom, change the
--                      PDFs/mo + price). Switching RESETS the allowance to 0 so
--                      the customer re-activates (pays) for the new plan.
-- Idempotent — safe to re-run.
-- ============================================================================

create or replace function public.pr_account_info(p_account text)
  returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  select row_to_json(t) into result from (
    select username, full_name, center_name, center_type, email, plan, custom_pdfs, custom_price
    from public.pr_accounts where username = lower(trim(p_account))
  ) t;
  return coalesce(result, '{}'::json);
end $$;

create or replace function public.pr_set_plan(
  p_account text, p_plan text, p_custom_pdfs int, p_custom_price int
) returns json language plpgsql security definer set search_path = public as $$
declare a public.pr_accounts; acc text := lower(trim(p_account));
begin
  select * into a from public.pr_accounts where username = acc;
  if a.username is null then
    return json_build_object('ok', false, 'reason', 'Unknown account.');
  end if;
  update public.pr_accounts set
    plan = p_plan,
    custom_pdfs  = case when p_plan = 'custom' then p_custom_pdfs  else null end,
    custom_price = case when p_plan = 'custom' then p_custom_price else null end,
    granted = 0, qr_granted = 0, qr_used = 0
  where username = acc returning * into a;
  return json_build_object('ok', true, 'plan', a.plan, 'pdfs', a.custom_pdfs, 'price', a.custom_price);
end $$;

revoke all on function public.pr_account_info(text)                 from public;
revoke all on function public.pr_set_plan(text, text, int, int)     from public;
grant execute on function public.pr_account_info(text)              to anon, authenticated;
grant execute on function public.pr_set_plan(text, text, int, int)  to anon, authenticated;
