-- BlackBeltBootcamp V2.2 migration-safe schema additions
-- Run after the existing V2/V2.1 exercise schema.

create extension if not exists pgcrypto;

-- Profiles / roles for Supabase Auth users
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique,
  full_name text not null,
  role text not null default 'athlete' check (role in ('admin','coach','athlete')),
  athlete_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.athlete_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
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

-- Exercise table compatibility fields required by the V2.2 app/importer
alter table public.exercises add column if not exists exercise_id text;
alter table public.exercises add column if not exists body_part text;
alter table public.exercises add column if not exists body_parts text;
alter table public.exercises add column if not exists target text;
alter table public.exercises add column if not exists category text;
alter table public.exercises add column if not exists secondary_muscles jsonb default '[]'::jsonb;
alter table public.exercises add column if not exists video_path text;
alter table public.exercises add column if not exists source_file text;
alter table public.exercises add column if not exists source_label text;
alter table public.exercises add column if not exists sources jsonb default '[]'::jsonb;
alter table public.exercises add column if not exists has_video boolean default false;
alter table public.exercises add column if not exists video_storage_bucket text default 'exercise-videos';
alter table public.exercises add column if not exists raw_payload jsonb;
alter table public.exercises add column if not exists updated_at timestamptz default now();
alter table public.exercises alter column exercise_type drop not null;
alter table public.exercises alter column exercise_type set default 'general';
update public.exercises set exercise_id = id::text where exercise_id is null;
update public.exercises set has_video = true where coalesce(video_url,'') <> '' or coalesce(video_path,'') <> '';
create unique index if not exists exercises_exercise_id_key on public.exercises(exercise_id);

create table if not exists public.exercise_instructions (
  id uuid primary key default gen_random_uuid(),
  exercise_id text not null,
  step_number integer not null,
  instruction text not null,
  created_at timestamptz default now()
);
create unique index if not exists exercise_instructions_exercise_step_unique on public.exercise_instructions(exercise_id, step_number);
create index if not exists idx_exercise_instructions_exercise_id on public.exercise_instructions(exercise_id);

-- Programmes and scheduled sessions
create table if not exists public.workout_programmes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  focus text,
  session_type text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

create table if not exists public.fma_classes (
  id uuid primary key default gen_random_uuid(),
  class_name text not null,
  class_type text,
  focus text,
  default_duration_minutes integer default 60,
  is_active boolean default true,
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

-- Badges compatibility
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text default '🏅',
  badge_type text default 'general',
  target_value integer default 0,
  xp_value integer default 10,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.badges add column if not exists icon text default '🏅';
alter table public.badges add column if not exists badge_type text default 'general';
alter table public.badges add column if not exists target_value integer default 0;
alter table public.badges add column if not exists xp_value integer default 10;
alter table public.badges add column if not exists is_active boolean default true;
alter table public.badges add column if not exists created_at timestamptz default now();

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references public.athlete_profiles(id) on delete cascade,
  badge_id uuid references public.badges(id) on delete cascade,
  unlocked_at timestamptz default now(),
  progress integer default 0,
  unique (athlete_id, badge_id)
);

-- Helpful seed rows
insert into public.fma_classes (class_name, class_type, focus)
values
  ('Advanced MMA','MMA','High-level MMA skill development and live rounds.'),
  ('Masters MMA','MMA','Technical MMA class with controlled sparring and drilling.'),
  ('Adult MMA','MMA','Mixed martial arts class for adults.'),
  ('BJJ / Grappling','BJJ','Ground fighting, submissions and positional control.'),
  ('Kickboxing','Kickboxing','Striking mechanics, defence, combinations and footwork.')
on conflict do nothing;

insert into public.badges (name, description, icon, badge_type, target_value, xp_value)
values
  ('First Workout','Complete the first logged workout.','🏁','completion',1,10),
  ('7 Day Streak','Train seven days in a row.','🔥','streak',7,50),
  ('Footwork Focus','Complete 30 footwork sessions.','⚡','session_type',30,50),
  ('FMA Regular','Attend 25 FMA classes.','🥋','fma',25,75),
  ('Strength Builder','Log 50 strength exercises.','💪','strength',50,75),
  ('Fight Camp Ready','Complete a full programme block.','🏆','programme',1,100)
on conflict do nothing;

-- RLS: permissive for private beta. Tighten to role-based policies before public release.
alter table public.exercises enable row level security;
alter table public.exercise_instructions enable row level security;
alter table public.user_profiles enable row level security;
alter table public.athlete_profiles enable row level security;
alter table public.workout_programmes enable row level security;
alter table public.workout_programme_exercises enable row level security;
alter table public.training_sessions enable row level security;
alter table public.workout_logs enable row level security;
alter table public.fma_classes enable row level security;
alter table public.athlete_metrics enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname='public' and tablename in ('exercises','exercise_instructions','user_profiles','athlete_profiles','workout_programmes','workout_programme_exercises','training_sessions','workout_logs','fma_classes','athlete_metrics','badges','user_badges') loop
    execute format('drop policy if exists "Private beta read" on public.%I', r.tablename);
    execute format('drop policy if exists "Private beta insert" on public.%I', r.tablename);
    execute format('drop policy if exists "Private beta update" on public.%I', r.tablename);
    execute format('create policy "Private beta read" on public.%I for select using (true)', r.tablename);
    execute format('create policy "Private beta insert" on public.%I for insert with check (true)', r.tablename);
    execute format('create policy "Private beta update" on public.%I for update using (true) with check (true)', r.tablename);
  end loop;
end $$;
