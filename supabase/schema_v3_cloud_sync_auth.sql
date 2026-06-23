-- BlackBeltBootcamp V3.0 Cloud Sync + Supabase Auth upgrade
-- Run this once in Supabase SQL Editor after deploying the V3 package.
-- Then create Supabase Auth users for Alex and James under Authentication > Users.

create extension if not exists pgcrypto;

-- Core cloud tables ---------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique,
  full_name text,
  name text,
  role text not null default 'athlete' check (role in ('admin','coach','athlete')),
  athlete_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.athlete_profiles (
  id uuid primary key default gen_random_uuid(),
  name text,
  full_name text,
  email text unique,
  role text default 'athlete' check (role in ('admin','coach','athlete')),
  date_of_birth date,
  age integer,
  height_cm numeric,
  weight_kg numeric,
  competition_weight_kg numeric,
  belt_rank text,
  gym text,
  goal text,
  profile_photo_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.athlete_profiles add column if not exists name text;
alter table public.athlete_profiles add column if not exists full_name text;
alter table public.athlete_profiles add column if not exists email text;
alter table public.athlete_profiles add column if not exists role text default 'athlete';
alter table public.athlete_profiles add column if not exists profile_photo_url text;
alter table public.athlete_profiles add column if not exists is_active boolean default true;
alter table public.athlete_profiles add column if not exists updated_at timestamptz default now();
update public.athlete_profiles set name = coalesce(name, full_name, email) where name is null;
update public.athlete_profiles set full_name = coalesce(full_name, name, email) where full_name is null;
create unique index if not exists athlete_profiles_email_unique on public.athlete_profiles(lower(email)) where email is not null;

-- Programme and session tables ---------------------------------------------
create table if not exists public.workout_programmes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  focus text,
  session_type text,
  created_by uuid default auth.uid(),
  owner_athlete_id uuid references public.athlete_profiles(id) on delete set null,
  is_template boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.workout_programmes add column if not exists owner_athlete_id uuid references public.athlete_profiles(id) on delete set null;
alter table public.workout_programmes add column if not exists is_template boolean default true;
alter table public.workout_programmes add column if not exists updated_at timestamptz default now();

create table if not exists public.workout_programme_exercises (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid references public.workout_programmes(id) on delete cascade,
  exercise_id text not null,
  exercise_name text,
  planned_sets integer default 3,
  planned_reps text default '8-12',
  planned_weight text,
  sort_order integer default 0,
  notes text
);

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references public.athlete_profiles(id) on delete cascade,
  programme_id uuid references public.workout_programmes(id) on delete set null,
  session_date date not null,
  start_time time,
  end_time time,
  title text not null,
  session_type text not null,
  status text not null default 'planned' check (status in ('planned','completed','missed')),
  class_name text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references public.athlete_profiles(id) on delete cascade,
  session_id uuid references public.training_sessions(id) on delete set null,
  log_date date not null default current_date,
  session_type text,
  exercise_id text,
  exercise_name text,
  sets jsonb default '[]'::jsonb,
  reps text,
  weight text,
  rpe numeric,
  notes text,
  completed boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.athlete_metrics (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references public.athlete_profiles(id) on delete cascade,
  metric_date date not null default current_date,
  height_cm numeric,
  weight_kg numeric,
  body_fat_percent numeric,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.fma_classes (
  id uuid primary key default gen_random_uuid(),
  class_name text not null,
  class_type text,
  focus text,
  default_duration_minutes integer default 60,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Badges / achievements -----------------------------------------------------
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text default '🏅',
  badge_type text default 'sessions_completed',
  target_value integer default 1,
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
alter table public.badges add column if not exists updated_at timestamptz default now();
update public.badges set icon = '🏅' where icon is null or icon = '' or icon ilike '%placeholder%';

-- Remove duplicate badge rows by same name/type/target.
with ranked as (
  select id, row_number() over (partition by lower(name), badge_type, target_value order by created_at nulls last, id) as rn
  from public.badges
)
delete from public.badges b using ranked r where b.id = r.id and r.rn > 1;

-- Seed fixed achievements if table is empty.
insert into public.badges (name, description, icon, badge_type, target_value, xp_value, is_active)
select * from (values
  ('First Workout','Complete the first logged workout.','🏁','sessions_completed',1,10,true),
  ('7 Day Streak','Train seven days in a row.','🔥','workout_streak',7,50,true),
  ('Footwork Focus','Complete 30 footwork sessions.','⚡','footwork_sessions',30,75,true),
  ('FMA Regular','Attend 25 FMA classes.','🥋','fma_sessions',25,100,true),
  ('Strength Builder','Log 50 strength exercises.','💪','strength_exercises',50,100,true),
  ('Fight Camp Ready','Complete 20 planned training sessions.','🏆','completed_workouts',20,150,true)
) as seed(name, description, icon, badge_type, target_value, xp_value, is_active)
where not exists (select 1 from public.badges where lower(public.badges.name)=lower(seed.name));

insert into public.app_settings (key, value)
values ('dashboard_focus_text','keep stacking the small wins.')
on conflict (key) do nothing;

-- Core profiles -------------------------------------------------------------
update public.athlete_profiles set
  name = 'Alex Hiles', full_name = 'Alex Hiles', role = 'admin', gym = 'BlackBeltBootcamp',
  goal = 'Manage James’s training platform, programmes and progress.', is_active = true, updated_at = now()
where lower(email) = 'alex.hiles.ags@gmail.com';

insert into public.athlete_profiles (name, full_name, email, role, gym, goal, is_active)
select 'Alex Hiles','Alex Hiles','alex.hiles.ags@gmail.com','admin','BlackBeltBootcamp','Manage James’s training platform, programmes and progress.',true
where not exists (select 1 from public.athlete_profiles where lower(email)='alex.hiles.ags@gmail.com');

update public.athlete_profiles set
  name = 'James Hiles', full_name = 'James Hiles', role = 'athlete', gym = 'FMA Chester',
  goal = 'Build complete MMA athleticism and long-term professional fighter habits.', is_active = true, updated_at = now()
where lower(email) = 'james.hiles@blackbeltbootcamp.app';

insert into public.athlete_profiles (name, full_name, email, role, gym, goal, is_active)
select 'James Hiles','James Hiles','james.hiles@blackbeltbootcamp.app','athlete','FMA Chester','Build complete MMA athleticism and long-term professional fighter habits.',true
where not exists (select 1 from public.athlete_profiles where lower(email)='james.hiles@blackbeltbootcamp.app');

delete from public.athlete_profiles where lower(email) = 'james@blackbeltbootcamp.app';

-- Link Supabase Auth users to app roles/profiles when Auth users already exist.
insert into public.user_profiles (auth_user_id, email, full_name, name, role, athlete_id)
select u.id, u.email,
       case when lower(u.email)='alex.hiles.ags@gmail.com' then 'Alex Hiles' when lower(u.email)='james.hiles@blackbeltbootcamp.app' then 'James Hiles' else coalesce(u.raw_user_meta_data->>'name', u.email) end,
       case when lower(u.email)='alex.hiles.ags@gmail.com' then 'Alex Hiles' when lower(u.email)='james.hiles@blackbeltbootcamp.app' then 'James Hiles' else coalesce(u.raw_user_meta_data->>'name', u.email) end,
       case when lower(u.email)='alex.hiles.ags@gmail.com' then 'admin' else 'athlete' end,
       ap.id
from auth.users u
left join public.athlete_profiles ap on lower(ap.email) = lower(u.email)
where lower(u.email) in ('alex.hiles.ags@gmail.com','james.hiles@blackbeltbootcamp.app')
on conflict (email) do update set
  auth_user_id = excluded.auth_user_id,
  full_name = excluded.full_name,
  name = excluded.name,
  role = excluded.role,
  athlete_id = excluded.athlete_id,
  updated_at = now();

-- RLS helper functions ------------------------------------------------------
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.user_profiles where auth_user_id = auth.uid() limit 1),'athlete')
$$;

create or replace function public.current_athlete_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select athlete_id from public.user_profiles where auth_user_id = auth.uid() limit 1),
    (select id from public.athlete_profiles where lower(email)=lower(auth.jwt()->>'email') limit 1)
  )
$$;

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_app_role() in ('admin','coach')
$$;

-- Row Level Security --------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['user_profiles','athlete_profiles','workout_programmes','workout_programme_exercises','training_sessions','workout_logs','athlete_metrics','fma_classes','app_settings','badges'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Drop older private beta policies where present.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname='public' and tablename in ('user_profiles','athlete_profiles','workout_programmes','workout_programme_exercises','training_sessions','workout_logs','athlete_metrics','fma_classes','app_settings','badges') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "profiles own or admin read" on public.user_profiles for select to authenticated using (public.is_app_admin() or auth_user_id = auth.uid() or lower(email)=lower(auth.jwt()->>'email'));
create policy "profiles admin write" on public.user_profiles for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

create policy "athletes own or admin read" on public.athlete_profiles for select to authenticated using (public.is_app_admin() or id = public.current_athlete_profile_id() or lower(email)=lower(auth.jwt()->>'email'));
create policy "athletes admin insert" on public.athlete_profiles for insert to authenticated with check (public.is_app_admin());
create policy "athletes own or admin update" on public.athlete_profiles for update to authenticated using (public.is_app_admin() or id = public.current_athlete_profile_id() or lower(email)=lower(auth.jwt()->>'email')) with check (public.is_app_admin() or id = public.current_athlete_profile_id() or lower(email)=lower(auth.jwt()->>'email'));
create policy "athletes admin delete" on public.athlete_profiles for delete to authenticated using (public.is_app_admin());

create policy "sessions own or admin read" on public.training_sessions for select to authenticated using (public.is_app_admin() or athlete_id = public.current_athlete_profile_id());
create policy "sessions own or admin write" on public.training_sessions for all to authenticated using (public.is_app_admin() or athlete_id = public.current_athlete_profile_id()) with check (public.is_app_admin() or athlete_id = public.current_athlete_profile_id());

create policy "logs own or admin read" on public.workout_logs for select to authenticated using (public.is_app_admin() or athlete_id = public.current_athlete_profile_id());
create policy "logs own or admin write" on public.workout_logs for all to authenticated using (public.is_app_admin() or athlete_id = public.current_athlete_profile_id()) with check (public.is_app_admin() or athlete_id = public.current_athlete_profile_id());

create policy "metrics own or admin read" on public.athlete_metrics for select to authenticated using (public.is_app_admin() or athlete_id = public.current_athlete_profile_id());
create policy "metrics own or admin write" on public.athlete_metrics for all to authenticated using (public.is_app_admin() or athlete_id = public.current_athlete_profile_id()) with check (public.is_app_admin() or athlete_id = public.current_athlete_profile_id());

create policy "programmes authenticated read" on public.workout_programmes for select to authenticated using (public.is_app_admin() or owner_athlete_id is null or owner_athlete_id = public.current_athlete_profile_id() or id in (select programme_id from public.training_sessions where athlete_id = public.current_athlete_profile_id()));
create policy "programmes authenticated write" on public.workout_programmes for all to authenticated using (public.is_app_admin() or owner_athlete_id = public.current_athlete_profile_id() or owner_athlete_id is null) with check (public.is_app_admin() or owner_athlete_id = public.current_athlete_profile_id() or owner_athlete_id is null);

create policy "programme exercises authenticated read" on public.workout_programme_exercises for select to authenticated using (true);
create policy "programme exercises authenticated write" on public.workout_programme_exercises for all to authenticated using (public.is_app_admin() or true) with check (public.is_app_admin() or true);

create policy "shared content read" on public.fma_classes for select to authenticated using (true);
create policy "shared content admin write" on public.fma_classes for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "settings read" on public.app_settings for select to authenticated using (true);
create policy "settings admin write" on public.app_settings for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "badges read" on public.badges for select to authenticated using (true);
create policy "badges admin write" on public.badges for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

-- Exercise library remains readable to authenticated users; admin/coach can manage/import.
alter table if exists public.exercises enable row level security;
alter table if exists public.exercise_instructions enable row level security;
drop policy if exists "exercises authenticated read" on public.exercises;
drop policy if exists "exercises admin write" on public.exercises;
drop policy if exists "instructions authenticated read" on public.exercise_instructions;
drop policy if exists "instructions admin write" on public.exercise_instructions;
create policy "exercises authenticated read" on public.exercises for select to authenticated using (true);
create policy "exercises admin write" on public.exercises for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "instructions authenticated read" on public.exercise_instructions for select to authenticated using (true);
create policy "instructions admin write" on public.exercise_instructions for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
