-- BlackBeltBootcamp V2.1 additive schema
-- Safe to run after V2. Adds V2.1 programme, calendar, logging, badge and profile structures.

create extension if not exists pgcrypto;

-- Exercise catalogue compatibility fields
alter table exercises add column if not exists body_parts text;
alter table exercises add column if not exists body_part text;
alter table exercises add column if not exists target text;
alter table exercises add column if not exists category text;
alter table exercises add column if not exists secondary_muscles jsonb default '[]'::jsonb;
alter table exercises add column if not exists video_path text;
alter table exercises add column if not exists source_file text;
alter table exercises add column if not exists source_label text;
alter table exercises add column if not exists sources jsonb default '[]'::jsonb;
alter table exercises add column if not exists has_video boolean default false;
alter table exercises add column if not exists video_storage_bucket text default 'exercise-videos';
alter table exercises add column if not exists import_batch text;
alter table exercises add column if not exists duplicate_group text;
alter table exercises add column if not exists raw_payload jsonb;
alter table exercises add column if not exists updated_at timestamptz default now();
alter table exercises alter column exercise_type drop not null;
alter table exercises alter column exercise_type set default 'general';
create unique index if not exists exercises_exercise_id_key on exercises(exercise_id);

create table if not exists exercise_instructions (
  id uuid primary key default gen_random_uuid(),
  exercise_id text not null,
  step_number integer not null,
  instruction text not null,
  created_at timestamptz default now(),
  unique(exercise_id, step_number)
);
create index if not exists idx_exercise_instructions_exercise_id on exercise_instructions(exercise_id);

create table if not exists athlete_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  name text not null,
  email text,
  role text default 'athlete' check (role in ('admin','coach','athlete')),
  age integer,
  height_cm numeric,
  weight_kg numeric,
  belt_rank text,
  gym text,
  goal text,
  competition_weight_kg numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists programmes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  focus text,
  created_by uuid,
  assigned_to uuid references athlete_profiles(id) on delete set null,
  start_date date,
  end_date date,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists programme_exercises (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid references programmes(id) on delete cascade,
  day_number integer default 1,
  exercise_id text references exercises(exercise_id) on delete set null,
  exercise_name text,
  planned_sets integer default 3,
  planned_reps text default '8-12',
  planned_weight text,
  notes text,
  sort_order integer default 0
);

create table if not exists training_calendar_events (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references athlete_profiles(id) on delete cascade,
  programme_id uuid references programmes(id) on delete set null,
  event_date date not null,
  event_time time,
  title text not null,
  event_type text not null,
  location text,
  status text default 'planned' check (status in ('planned','completed','missed','cancelled')),
  notes text,
  created_at timestamptz default now()
);

create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references athlete_profiles(id) on delete cascade,
  calendar_event_id uuid references training_calendar_events(id) on delete set null,
  exercise_id text references exercises(exercise_id) on delete set null,
  exercise_name text,
  log_date date default current_date,
  sets integer,
  reps text,
  weight text,
  rpe numeric,
  completed boolean default false,
  notes text,
  created_at timestamptz default now()
);

create table if not exists fma_classes (
  id uuid primary key default gen_random_uuid(),
  class_name text not null,
  class_type text,
  day_of_week text,
  start_time time,
  duration_minutes integer default 60,
  location text default 'FMA Chester',
  active boolean default true
);

create table if not exists athlete_metrics (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references athlete_profiles(id) on delete cascade,
  metric_date date default current_date,
  height_cm numeric,
  weight_kg numeric,
  body_fat_percent numeric,
  notes text,
  created_at timestamptz default now()
);

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  badge_type text,
  target_value integer,
  active boolean default true
);

create table if not exists athlete_badges (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references athlete_profiles(id) on delete cascade,
  badge_id uuid references badges(id) on delete cascade,
  progress integer default 0,
  unlocked boolean default false,
  unlocked_at timestamptz,
  unique(athlete_id, badge_id)
);

alter table exercise_instructions enable row level security;
alter table athlete_profiles enable row level security;
alter table programmes enable row level security;
alter table programme_exercises enable row level security;
alter table training_calendar_events enable row level security;
alter table workout_logs enable row level security;
alter table fma_classes enable row level security;
alter table athlete_metrics enable row level security;
alter table badges enable row level security;
alter table athlete_badges enable row level security;

-- Development-friendly policies. Tighten these when Supabase Auth roles are fully enabled.
do $$
declare t text;
begin
  foreach t in array array['exercise_instructions','athlete_profiles','programmes','programme_exercises','training_calendar_events','workout_logs','fma_classes','athlete_metrics','badges','athlete_badges'] loop
    execute format('drop policy if exists "public read %I" on %I', t, t);
    execute format('drop policy if exists "public insert %I" on %I', t, t);
    execute format('drop policy if exists "public update %I" on %I', t, t);
    execute format('create policy "public read %I" on %I for select using (true)', t, t);
    execute format('create policy "public insert %I" on %I for insert with check (true)', t, t);
    execute format('create policy "public update %I" on %I for update using (true) with check (true)', t, t);
  end loop;
end $$;

insert into badges (name, description, icon, badge_type, target_value)
values
('First Workout','Complete the first logged workout','🏁','workout_count',1),
('7 Day Streak','Train seven days in a row','🔥','streak',7),
('Footwork Focus','Complete 30 footwork sessions','⚡','footwork',30),
('FMA Regular','Attend 25 FMA classes','🥋','fma_attendance',25),
('Strength Builder','Log 50 strength exercises','💪','strength',50),
('Fight Camp Ready','Complete a full programme block','🏆','programme_completion',1)
on conflict do nothing;

insert into fma_classes (class_name, class_type, day_of_week, start_time, duration_minutes)
values
('Advanced MMA','MMA','Tuesday','19:00',60),
('Masters MMA','MMA','Thursday','19:00',60),
('Adult MMA','MMA','Saturday','10:00',60),
('BJJ / Grappling','BJJ','Wednesday','19:00',60),
('Kickboxing','Kickboxing','Friday','18:30',60)
on conflict do nothing;
