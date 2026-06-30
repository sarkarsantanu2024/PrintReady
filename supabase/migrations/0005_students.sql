-- ============================================================================
-- STUDENT DATABASE (Enterprise plan)
--
-- The Enterprise plan keeps a saved record of the students whose cards were
-- generated, so the customer can download their student details as CSV. Rows
-- are saved on each Enterprise generate; the super admin can export every
-- account's students.
--
-- Trust model matches the rest of the app: the browser only gets EXECUTE on the
-- SECURITY DEFINER functions below. Apply in the Supabase SQL editor (idempotent).
-- ============================================================================

create table if not exists public.pr_students (
  id          bigint generated always as identity primary key,
  account     text not null,
  name        text,
  center      text,
  phone       text,
  address     text,
  guardian    text,
  created_at  timestamptz not null default now()
);
create index if not exists pr_students_account_idx on public.pr_students (account, created_at);

alter table public.pr_students enable row level security;
-- (No policies — only the SECURITY DEFINER functions below may touch it.)

-- Save a batch of students for an account. Input: JSON array of
-- { name, center, phone, address, guardian }.
create or replace function public.pr_save_students(p_account text, p_students json)
  returns json language plpgsql security definer set search_path = public as $$
declare s json; n int := 0;
begin
  for s in select value from json_array_elements(coalesce(p_students, '[]'::json)) as t(value) loop
    insert into public.pr_students(account, name, center, phone, address, guardian)
    values (p_account, s->>'name', s->>'center', s->>'phone', s->>'address', s->>'guardian');
    n := n + 1;
  end loop;
  return json_build_object('ok', true, 'saved', n);
end $$;

-- List one account's students (newest first).
create or replace function public.pr_list_students(p_account text)
  returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  select coalesce(json_agg(row_to_json(t) order by t.created_at desc), '[]'::json) into result
  from (
    select account, name, center, phone, address, guardian, created_at
    from public.pr_students where account = p_account
  ) t;
  return result;
end $$;

-- Super-admin: list every account's students.
create or replace function public.pr_list_students_all()
  returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  select coalesce(json_agg(row_to_json(t) order by t.account, t.created_at desc), '[]'::json) into result
  from (
    select account, name, center, phone, address, guardian, created_at from public.pr_students
  ) t;
  return result;
end $$;

revoke all on function public.pr_save_students(text, json) from public;
revoke all on function public.pr_list_students(text)      from public;
revoke all on function public.pr_list_students_all()      from public;
grant execute on function public.pr_save_students(text, json) to anon, authenticated;
grant execute on function public.pr_list_students(text)      to anon, authenticated;
grant execute on function public.pr_list_students_all()      to anon, authenticated;
