-- BlackBeltBootcamp Supabase schema
-- Run this in Supabase SQL Editor before using live persistence.

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete set null,
  email text unique not null,
  display_name text not null,
  role text not null default 'athlete' check (role in ('admin','coach','athlete')),
  height_cm numeric,
  weight_kg numeric,
  date_of_birth date,
  primary_sport text,
  goals text,
  injury_notes text,
  created_at timestamptz default now()
);

create table if not exists public.exercises (
  id uuid primary key default uuid_generate_v4(),
  import_uid text unique,
  source_id text,
  source_file text,
  name text not null,
  description text,
  instructions text,
  exercise_type text not null,
  location text not null,
  equipment text,
  difficulty text,
  body_parts text[] default '{}',
  muscles text[] default '{}',
  video_url text,
  video_path text,
  thumbnail_url text,
  source text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  archived boolean default false
);

create table if not exists public.training_sessions (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  session_date date not null,
  session_type text not null,
  location text not null,
  estimated_minutes integer default 60,
  coach_notes text,
  created_at timestamptz default now()
);

create table if not exists public.session_exercises (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.training_sessions(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete cascade,
  position integer default 1,
  sets integer,
  reps text,
  weight text,
  rest_sec integer,
  duration_min integer,
  notes text
);

create table if not exists public.workout_logs (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.training_sessions(id) on delete cascade,
  athlete_id uuid references public.profiles(id) on delete cascade,
  completed_at timestamptz default now(),
  completion integer default 0,
  notes text
);

create table if not exists public.workout_log_sets (
  id uuid primary key default uuid_generate_v4(),
  workout_log_id uuid references public.workout_logs(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete cascade,
  set_number integer,
  reps text,
  weight text,
  time text,
  distance text,
  rpe text,
  complete boolean default false
);

create table if not exists public.body_metrics (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references public.profiles(id) on delete cascade,
  metric_date date not null,
  weight_kg numeric,
  height_cm numeric,
  body_fat numeric,
  sleep numeric,
  energy numeric,
  notes text
);

create table if not exists public.badges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  icon text,
  rule text
);

create table if not exists public.user_badges (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references public.profiles(id) on delete cascade,
  badge_id uuid references public.badges(id) on delete cascade,
  awarded_at timestamptz default now(),
  unique(athlete_id,badge_id)
);

create table if not exists public.fma_classes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  day text not null,
  time text not null,
  duration_min integer default 60,
  level text,
  location text default 'FMA Chester',
  category text
);

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.training_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.workout_log_sets enable row level security;
alter table public.body_metrics enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.fma_classes enable row level security;

-- Simple authenticated policies for family/private use. Harden further before public SaaS launch.
do $$ begin
  create policy "authenticated read profiles" on public.profiles for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated write profiles" on public.profiles for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated read exercises" on public.exercises for select to authenticated using (not archived);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated write exercises" on public.exercises for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "authenticated all sessions" on public.training_sessions for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated all session exercises" on public.session_exercises for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated all logs" on public.workout_logs for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated all log sets" on public.workout_log_sets for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated all metrics" on public.body_metrics for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated all badges" on public.badges for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated all user badges" on public.user_badges for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated all fma classes" on public.fma_classes for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;


-- Exercise import upgrade: safe to run on an existing BlackBeltBootcamp database.
alter table public.exercises add column if not exists import_uid text unique;
alter table public.exercises add column if not exists source_id text;
alter table public.exercises add column if not exists source_file text;
alter table public.exercises add column if not exists video_path text;
create index if not exists exercises_import_uid_idx on public.exercises(import_uid);
create index if not exists exercises_source_id_idx on public.exercises(source_id);
create index if not exists exercises_body_parts_idx on public.exercises using gin(body_parts);
create index if not exists exercises_muscles_idx on public.exercises using gin(muscles);
