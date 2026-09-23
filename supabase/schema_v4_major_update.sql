-- BlackBeltBootcamp V4.0 major update
-- Adds cloud nutrition tracking, cross-device realtime refresh and compatibility improvements.
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- Profile/Auth compatibility -------------------------------------------------
alter table if exists public.athlete_profiles add column if not exists auth_user_id uuid;
alter table if exists public.athlete_profiles add column if not exists weight_unit text default 'kg';
alter table if exists public.athlete_profiles add column if not exists updated_at timestamptz default now();

update public.athlete_profiles ap
set auth_user_id = au.id,
    updated_at = now()
from auth.users au
where lower(ap.email) = lower(au.email)
and ap.auth_user_id is distinct from au.id;

-- Nutrition -----------------------------------------------------------------
create table if not exists public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athlete_profiles(id) on delete cascade,
  calories numeric not null default 2400,
  protein_g numeric not null default 180,
  carbs_g numeric not null default 250,
  fats_g numeric not null default 70,
  water_ml numeric not null default 3000,
  effective_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id)
);

create table if not exists public.nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athlete_profiles(id) on delete cascade,
  entry_date date not null default current_date,
  meal_type text not null default 'Snack' check (meal_type in ('Breakfast','Lunch','Dinner','Snack','Hydration')),
  name text not null,
  serving text,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fats_g numeric not null default 0,
  water_ml numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nutrition_entries_athlete_date_idx on public.nutrition_entries (athlete_id, entry_date desc);
create index if not exists workout_logs_athlete_exercise_date_idx on public.workout_logs (athlete_id, exercise_id, log_date desc);
create index if not exists training_sessions_athlete_date_idx on public.training_sessions (athlete_id, session_date desc);

-- Seed a sensible target for existing athletes if missing.
insert into public.nutrition_targets (athlete_id, calories, protein_g, carbs_g, fats_g, water_ml)
select id, 2400, 180, 250, 70, 3000
from public.athlete_profiles ap
where not exists (select 1 from public.nutrition_targets nt where nt.athlete_id = ap.id)
on conflict (athlete_id) do nothing;

-- RLS -----------------------------------------------------------------------
alter table public.nutrition_targets enable row level security;
alter table public.nutrition_entries enable row level security;

drop policy if exists "nutrition targets own or admin read" on public.nutrition_targets;
drop policy if exists "nutrition targets own or admin write" on public.nutrition_targets;
drop policy if exists "nutrition entries own or admin read" on public.nutrition_entries;
drop policy if exists "nutrition entries own or admin write" on public.nutrition_entries;

create policy "nutrition targets own or admin read"
on public.nutrition_targets for select to authenticated
using (public.is_app_admin() or athlete_id = public.current_athlete_profile_id());

create policy "nutrition targets own or admin write"
on public.nutrition_targets for all to authenticated
using (public.is_app_admin() or athlete_id = public.current_athlete_profile_id())
with check (public.is_app_admin() or athlete_id = public.current_athlete_profile_id());

create policy "nutrition entries own or admin read"
on public.nutrition_entries for select to authenticated
using (public.is_app_admin() or athlete_id = public.current_athlete_profile_id());

create policy "nutrition entries own or admin write"
on public.nutrition_entries for all to authenticated
using (public.is_app_admin() or athlete_id = public.current_athlete_profile_id())
with check (public.is_app_admin() or athlete_id = public.current_athlete_profile_id());

-- Ensure authenticated users can read their assigned programme details.
drop policy if exists "programme exercises authenticated read" on public.workout_programme_exercises;
create policy "programme exercises authenticated read"
on public.workout_programme_exercises for select to authenticated
using (
  public.is_app_admin()
  or programme_id in (
    select wp.id from public.workout_programmes wp
    where wp.owner_athlete_id is null
       or wp.owner_athlete_id = public.current_athlete_profile_id()
       or wp.id in (select ts.programme_id from public.training_sessions ts where ts.athlete_id = public.current_athlete_profile_id())
  )
);

-- Realtime ------------------------------------------------------------------
-- Add the app's live tables to Supabase Realtime without failing if already present.
do $$
declare t text;
begin
  foreach t in array array[
    'training_sessions','workout_programmes','workout_programme_exercises','workout_logs',
    'athlete_metrics','badges','app_settings','nutrition_targets','nutrition_entries'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

alter table public.training_sessions replica identity full;
alter table public.workout_programmes replica identity full;
alter table public.workout_programme_exercises replica identity full;
alter table public.workout_logs replica identity full;
alter table public.athlete_metrics replica identity full;
alter table public.badges replica identity full;
alter table public.app_settings replica identity full;
alter table public.nutrition_targets replica identity full;
alter table public.nutrition_entries replica identity full;
