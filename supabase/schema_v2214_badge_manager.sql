-- BlackBeltBootcamp V2.2.14 Badge Manager support
-- Run this only if Achievement Manager changes do not persist to Supabase.

create extension if not exists pgcrypto;

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text default '🏅',
  badge_type text not null default 'sessions_completed',
  target_value integer not null default 1,
  xp_value integer default 10,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.badges add column if not exists description text;
alter table public.badges add column if not exists icon text default '🏅';
alter table public.badges add column if not exists badge_type text default 'sessions_completed';
alter table public.badges add column if not exists target_value integer default 1;
alter table public.badges add column if not exists xp_value integer default 10;
alter table public.badges add column if not exists is_active boolean default true;
alter table public.badges add column if not exists created_at timestamptz default now();
alter table public.badges add column if not exists updated_at timestamptz default now();

alter table public.badges enable row level security;

drop policy if exists "Allow public badges read" on public.badges;
drop policy if exists "Allow public badges insert" on public.badges;
drop policy if exists "Allow public badges update" on public.badges;
drop policy if exists "Allow public badges delete" on public.badges;

create policy "Allow public badges read"
on public.badges
for select
to anon, authenticated
using (true);

create policy "Allow public badges insert"
on public.badges
for insert
to anon, authenticated
with check (true);

create policy "Allow public badges update"
on public.badges
for update
to anon, authenticated
using (true)
with check (true);

create policy "Allow public badges delete"
on public.badges
for delete
to anon, authenticated
using (true);
