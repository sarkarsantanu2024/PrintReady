-- PrintReady — initial schema
-- profiles, monthly usage tracking, RLS, profile auto-create trigger,
-- atomic increment_usage() and get_usage() RPCs.

-- =====================================================================
-- profiles (extends auth.users)
-- =====================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  plan        text not null default 'free' check (plan in ('free','starter','business','pro','enterprise')),
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- monthly usage tracking
-- =====================================================================
create table if not exists public.usage_monthly (
  user_id              uuid references auth.users(id) on delete cascade,
  period               text not null,                  -- 'YYYY-MM'
  documents_generated  int  not null default 0,
  primary key (user_id, period)
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.usage_monthly enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "own usage" on public.usage_monthly;
create policy "own usage" on public.usage_monthly
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================================
-- Auto-create profile row on signup
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, plan)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'plan', 'free')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Atomic usage check + increment
-- Returns: { allowed, used, limit, requested }
-- =====================================================================
create or replace function public.increment_usage(p_user_id uuid, p_count int default 1)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period  text := to_char(now(), 'YYYY-MM');
  v_plan    text;
  v_limit   int;
  v_current int;
begin
  if p_user_id is null or auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'forbidden';
  end if;

  select plan into v_plan from public.profiles where id = p_user_id;
  v_limit := case v_plan
    when 'free'       then 20
    when 'starter'    then 35
    when 'business'   then 130
    when 'pro'        then 170
    when 'enterprise' then 100000
    else 20
  end;

  insert into public.usage_monthly (user_id, period, documents_generated)
  values (p_user_id, v_period, 0)
  on conflict (user_id, period) do nothing;

  select documents_generated into v_current
    from public.usage_monthly
   where user_id = p_user_id and period = v_period;

  if v_current + p_count > v_limit then
    return json_build_object(
      'allowed',   false,
      'used',      v_current,
      'limit',     v_limit,
      'requested', p_count
    );
  end if;

  update public.usage_monthly
     set documents_generated = documents_generated + p_count
   where user_id = p_user_id and period = v_period;

  return json_build_object(
    'allowed',   true,
    'used',      v_current + p_count,
    'limit',     v_limit,
    'requested', p_count
  );
end;
$$;

-- =====================================================================
-- Read user's current usage + limit (for "5/15 used" UI meter)
-- =====================================================================
create or replace function public.get_usage(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period  text := to_char(now(), 'YYYY-MM');
  v_plan    text;
  v_limit   int;
  v_current int;
begin
  if p_user_id is null or auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'forbidden';
  end if;

  select plan into v_plan from public.profiles where id = p_user_id;
  v_limit := case v_plan
    when 'free'       then 20
    when 'starter'    then 35
    when 'business'   then 130
    when 'pro'        then 170
    when 'enterprise' then 100000
    else 20
  end;

  select coalesce(documents_generated, 0) into v_current
    from public.usage_monthly
   where user_id = p_user_id and period = v_period;

  return json_build_object(
    'used',  coalesce(v_current, 0),
    'limit', v_limit,
    'plan',  v_plan
  );
end;
$$;
