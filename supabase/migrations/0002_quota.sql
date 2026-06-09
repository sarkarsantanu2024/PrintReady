-- ============================================================================
-- Server-side, tamper-proof monthly quota for the single Business client.
--
-- The browser only gets EXECUTE on three SECURITY DEFINER functions; it has NO
-- direct access to the tables (RLS on, no policies). So a user cannot reset the
-- count, mint top-ups, or read the code list from DevTools. Quota is shared
-- across every device/browser that uses the app.
--
-- Apply in the Supabase SQL editor (or `supabase db push`).
-- ============================================================================

create table if not exists public.pr_quota (
  client_id text primary key default 'default',
  period    text not null,
  used      int  not null default 0,
  topups    int  not null default 0
);

create table if not exists public.pr_topup_codes (
  code        text primary key,
  used        boolean not null default false,
  redeemed_at timestamptz
);

alter table public.pr_quota        enable row level security;
alter table public.pr_topup_codes  enable row level security;
-- (No policies on purpose — only the SECURITY DEFINER functions below can touch them.)

create or replace function public.pr_period() returns text
  language sql stable as $$ select to_char(now(), 'YYYY-MM') $$;

-- Fetch the single client row, creating it and resetting it at the start of a
-- new month (count + top-ups cleared). Returns the live row.
create or replace function public._pr_row() returns public.pr_quota
  language plpgsql security definer set search_path = public as $$
declare r public.pr_quota;
begin
  insert into public.pr_quota(client_id, period) values ('default', pr_period())
    on conflict (client_id) do nothing;
  select * into r from public.pr_quota where client_id = 'default' for update;
  if r.period <> pr_period() then
    update public.pr_quota set period = pr_period(), used = 0, topups = 0
      where client_id = 'default' returning * into r;
  end if;
  return r;
end $$;

create or replace function public.pr_get_quota() returns json
  language plpgsql security definer set search_path = public as $$
declare r public.pr_quota;
begin
  r := public._pr_row();
  return json_build_object('used', r.used, 'topups', r.topups, 'month', r.period);
end $$;

create or replace function public.pr_add_usage() returns json
  language plpgsql security definer set search_path = public as $$
declare r public.pr_quota;
begin
  perform public._pr_row();
  update public.pr_quota set used = used + 1 where client_id = 'default' returning * into r;
  return json_build_object('used', r.used, 'topups', r.topups, 'month', r.period);
end $$;

-- Redeem a one-time code: must exist and be unused. The valid codes live in the
-- DB (insert them after payment), so the secret is never in the app bundle.
create or replace function public.pr_redeem_topup(p_code text) returns json
  language plpgsql security definer set search_path = public as $$
declare r public.pr_quota; c public.pr_topup_codes;
begin
  perform public._pr_row();
  select * into c from public.pr_topup_codes where code = upper(trim(p_code)) for update;
  if c.code is null then
    return json_build_object('ok', false, 'reason', 'Invalid top-up code.');
  end if;
  if c.used then
    return json_build_object('ok', false, 'reason', 'This code has already been used.');
  end if;
  update public.pr_topup_codes set used = true, redeemed_at = now() where code = c.code;
  update public.pr_quota set topups = topups + 1 where client_id = 'default' returning * into r;
  return json_build_object('ok', true, 'used', r.used, 'topups', r.topups, 'month', r.period);
end $$;

revoke all on function public.pr_get_quota()           from public;
revoke all on function public.pr_add_usage()           from public;
revoke all on function public.pr_redeem_topup(text)    from public;
grant execute on function public.pr_get_quota()        to anon, authenticated;
grant execute on function public.pr_add_usage()        to anon, authenticated;
grant execute on function public.pr_redeem_topup(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Issue a top-up code after a ₹500 payment (run in the SQL editor):
--   insert into public.pr_topup_codes(code) values ('TOP-INV1042');
-- Give that exact code to the client; it adds +30 PDFs and works once.
-- ---------------------------------------------------------------------------
