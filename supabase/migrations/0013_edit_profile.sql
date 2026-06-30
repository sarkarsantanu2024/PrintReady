-- ============================================================================
-- EDIT PROFILE — subscribers update their own details (not password / plan).
-- Idempotent — safe to re-run.
-- ============================================================================

create or replace function public.pr_update_profile(
  p_account text, p_full_name text, p_center_name text, p_center_type text,
  p_email text, p_phone text, p_address text
) returns json language plpgsql security definer set search_path = public as $$
declare a public.pr_accounts; acc text := lower(trim(p_account));
begin
  update public.pr_accounts set
    full_name   = p_full_name,
    center_name = p_center_name,
    center_type = p_center_type,
    email       = p_email,
    phone       = p_phone,
    address     = p_address
  where username = acc returning * into a;
  if a.username is null then return json_build_object('ok', false, 'reason', 'Unknown account.'); end if;
  return json_build_object('ok', true);
end $$;

revoke all on function public.pr_update_profile(text, text, text, text, text, text, text) from public;
grant execute on function public.pr_update_profile(text, text, text, text, text, text, text) to anon, authenticated;
