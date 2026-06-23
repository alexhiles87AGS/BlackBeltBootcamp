-- BlackBeltBootcamp V3.0.1 Badge Manager + Weight Preference compatibility patch
-- Run once if Achievement Manager changes reappear after refresh, or if weight preference does not sync between devices.

create extension if not exists pgcrypto;

alter table if exists public.athlete_profiles
add column if not exists weight_unit text default 'kg';

update public.athlete_profiles
set weight_unit = 'kg'
where weight_unit is null or weight_unit not in ('kg','st');

alter table if exists public.badges add column if not exists is_active boolean default true;
alter table if exists public.badges add column if not exists updated_at timestamptz default now();

-- Clean duplicated badge definitions by keeping the newest active/inactive state per badge rule.
with ranked as (
  select id,
         row_number() over (
           partition by lower(coalesce(name,'')), coalesce(badge_type,''), coalesce(target_value,0)
           order by updated_at desc nulls last, created_at desc nulls last, id desc
         ) as rn
  from public.badges
)
delete from public.badges b
using ranked r
where b.id = r.id
and r.rn > 1;

alter table if exists public.badges enable row level security;

drop policy if exists "badges read" on public.badges;
drop policy if exists "badges admin write" on public.badges;
drop policy if exists "Allow public badges read" on public.badges;
drop policy if exists "Allow public badges insert" on public.badges;
drop policy if exists "Allow public badges update" on public.badges;
drop policy if exists "Allow public badges delete" on public.badges;

create policy "badges read"
on public.badges
for select
to authenticated
using (true);

create policy "badges admin insert"
on public.badges
for insert
to authenticated
with check (public.is_app_admin());

create policy "badges admin update"
on public.badges
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create policy "badges admin delete"
on public.badges
for delete
to authenticated
using (public.is_app_admin());
