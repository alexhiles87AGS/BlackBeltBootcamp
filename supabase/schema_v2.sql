-- BlackBeltBootcamp V2 Supabase schema
-- Run this in Supabase SQL Editor before using V2 imports.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  full_name text not null,
  email text,
  role text not null default 'athlete' check (role in ('admin','coach','athlete')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists athletes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  display_name text not null,
  date_of_birth date,
  height_cm numeric,
  weight_kg numeric,
  notes text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  exercise_id text unique not null,
  name text not null,
  description text,
  body_part text,
  target text,
  secondary_muscles text[] default '{}',
  equipment text,
  difficulty text,
  category text,
  location text,
  source_file text,
  source_label text,
  sources text[] default '{}',
  video_path text,
  video_url text,
  thumbnail_url text,
  has_video boolean default false,
  is_archived boolean default false,
  archived boolean default false,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists exercise_instructions (
  id uuid primary key default gen_random_uuid(),
  exercise_id text references exercises(exercise_id) on delete cascade,
  step_number int not null,
  instruction text not null,
  created_at timestamptz default now(),
  unique(exercise_id, step_number)
);

create table if not exists programmes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  goal text,
  owner_profile_id uuid references profiles(id) on delete set null,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists programme_days (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid references programmes(id) on delete cascade,
  day_number int not null,
  title text not null,
  focus text,
  notes text,
  unique(programme_id, day_number)
);

create table if not exists programme_exercises (
  id uuid primary key default gen_random_uuid(),
  programme_day_id uuid references programme_days(id) on delete cascade,
  exercise_id text references exercises(exercise_id) on delete set null,
  sort_order int default 0,
  prescription_type text default 'sets_reps',
  planned_sets int,
  planned_reps text,
  planned_weight text,
  planned_duration_minutes int,
  notes text
);

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references athletes(id) on delete cascade,
  programme_id uuid references programmes(id) on delete set null,
  programme_day_id uuid references programme_days(id) on delete set null,
  title text not null,
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  event_type text default 'training',
  status text default 'planned',
  notes text,
  created_at timestamptz default now()
);

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references athletes(id) on delete cascade,
  calendar_event_id uuid references calendar_events(id) on delete set null,
  session_date date not null default current_date,
  title text not null,
  status text default 'planned',
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid references workout_sessions(id) on delete cascade,
  exercise_id text references exercises(exercise_id) on delete set null,
  completed boolean default false,
  sets_completed int,
  reps_completed text,
  weight_used text,
  duration_minutes int,
  rpe int,
  notes text,
  created_at timestamptz default now()
);

create table if not exists user_metrics (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references athletes(id) on delete cascade,
  recorded_date date not null default current_date,
  height_cm numeric,
  weight_kg numeric,
  bmi numeric,
  resting_hr int,
  notes text,
  created_at timestamptz default now()
);

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  icon text,
  criteria jsonb default '{}'::jsonb,
  active boolean default true
);

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references athletes(id) on delete cascade,
  badge_id uuid references badges(id) on delete cascade,
  awarded_at timestamptz default now(),
  unique(athlete_id, badge_id)
);

create table if not exists fma_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  class_type text,
  day_of_week int,
  start_time time,
  end_time time,
  location text default 'FMA Chester',
  active boolean default true,
  notes text
);

-- helpful indexes
create index if not exists idx_exercises_search on exercises using gin (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(target,'')));
create index if not exists idx_exercises_body_part on exercises(body_part);
create index if not exists idx_exercises_target on exercises(target);
create index if not exists idx_exercises_category on exercises(category);
create index if not exists idx_workout_sessions_athlete_date on workout_sessions(athlete_id, session_date);
create index if not exists idx_calendar_events_athlete_date on calendar_events(athlete_id, event_date);

-- demo-friendly RLS. For a private family app this is simple; harden before wider release.
alter table profiles enable row level security;
alter table athletes enable row level security;
alter table exercises enable row level security;
alter table exercise_instructions enable row level security;
alter table programmes enable row level security;
alter table programme_days enable row level security;
alter table programme_exercises enable row level security;
alter table calendar_events enable row level security;
alter table workout_sessions enable row level security;
alter table workout_logs enable row level security;
alter table user_metrics enable row level security;
alter table badges enable row level security;
alter table user_badges enable row level security;
alter table fma_classes enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','athletes','exercises','exercise_instructions','programmes','programme_days','programme_exercises','calendar_events','workout_sessions','workout_logs','user_metrics','badges','user_badges','fma_classes'] loop
    execute format('drop policy if exists "anon read %I" on %I', t, t);
    execute format('drop policy if exists "anon write %I" on %I', t, t);
    execute format('create policy "anon read %I" on %I for select using (true)', t, t);
    execute format('create policy "anon write %I" on %I for all using (true) with check (true)', t, t);
  end loop;
end $$;

-- Storage public read for exercise videos
insert into storage.buckets (id, name, public)
values ('exercise-videos','exercise-videos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read exercise videos" on storage.objects;
create policy "Public read exercise videos"
on storage.objects for select
using (bucket_id = 'exercise-videos');
