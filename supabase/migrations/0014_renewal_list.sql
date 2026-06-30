-- ============================================================================
-- RENEWAL LIST — accounts with phone + subscription status, for the super
-- admin's WhatsApp renewal reminders. Idempotent.
-- ============================================================================

create or replace function public.pr_renewal_list()
  returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  select coalesce(json_agg(row_to_json(t) order by t.days_left, t.username), '[]'::json) into result
  from (
    select
      username, full_name, phone, plan, custom_pdfs, custom_price, valid_until,
      case when valid_until is not null and valid_until > now()
        then greatest(0, ceil(extract(epoch from (valid_until - now())) / 86400.0)::int)
        else 0 end as days_left,
      (valid_until is not null and valid_until > now()) as active
    from public.pr_accounts
    where plan <> 'free'
  ) t;
  return result;
end $$;

revoke all on function public.pr_renewal_list() from public;
grant execute on function public.pr_renewal_list() to anon, authenticated;
