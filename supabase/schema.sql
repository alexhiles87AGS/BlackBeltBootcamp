-- BlackBeltBootcamp Supabase schema
-- Run this in Supabase SQL Editor after creating a new project.

create extension if not exists "uuid-ossp";

create type app_role as enum ('super_admin','coach','athlete');
create type session_type as enum ('gym','strength','cardio','mma','boxing','kickboxing','bjj','physio','mobility','recovery','footwork','class','custom');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'athlete',
  first_name text,
  last_name text,
  display_name text,
  date_of_birth date,
  height_cm numeric,
  weight_kg numeric,
  bmi numeric generated always as (case when height_cm is null or height_cm = 0 or weight_kg is null then null else round(weight_kg / ((height_cm/100)*(height_cm/100)), 2) end) stored,
  primary_sport text,
  goals text,
  medical_notes text,
  injury_notes text,
  avatar_url text,
  created_at timestamptz default now()
);

create table public.exercises (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  instructions text,
  equipment text,
  difficulty text,
  exercise_type text not null,
  location text not null,
  video_url text,
  thumbnail_url text,
  source text default 'manual',
  is_archived boolean default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.muscle_groups (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null
);

create table public.exercise_muscle_groups (
  exercise_id uuid references public.exercises(id) on delete cascade,
  muscle_group_id uuid references public.muscle_groups(id) on delete cascade,
  primary key (exercise_id, muscle_group_id)
);

create table public.programmes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  duration_weeks int default 12,
  created_by uuid references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  programme_id uuid references public.programmes(id) on delete cascade,
  title text not null,
  session_type session_type not null,
  planned_day text,
  planned_date date,
  duration_minutes int,
  focus text,
  warmup jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz default now()
);

create table public.session_exercises (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.sessions(id) on delete cascade,
  exercise_id uuid references public.exercises(id),
  sort_order int not null default 0,
  prescribed_sets int,
  prescribed_reps text,
  prescribed_weight numeric,
  rest_seconds int,
  tempo text,
  rpe_target text,
  notes text
);

create table public.workout_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id uuid references public.sessions(id),
  started_at timestamptz default now(),
  completed_at timestamptz,
  completion_percent numeric default 0,
  notes text
);

create table public.workout_log_sets (
  id uuid primary key default uuid_generate_v4(),
  workout_log_id uuid references public.workout_logs(id) on delete cascade,
  session_exercise_id uuid references public.session_exercises(id),
  set_number int,
  weight numeric,
  reps int,
  time_seconds int,
  distance_m numeric,
  rpe numeric,
  completed boolean default false,
  notes text
);

create table public.body_metrics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  measured_at date default current_date,
  height_cm numeric,
  weight_kg numeric,
  body_fat_percent numeric,
  waist_cm numeric,
  chest_cm numeric,
  upper_arm_cm numeric,
  thigh_cm numeric,
  resting_energy int,
  notes text
);

create table public.classes (
  id uuid primary key default uuid_generate_v4(),
  class_name text not null,
  provider text default 'FMA Chester',
  day_of_week text,
  start_time time,
  duration_minutes int,
  instructor text,
  location text,
  skill_level text,
  source_url text,
  is_active boolean default true
);

create table public.class_attendance (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  class_date date not null,
  status text default 'planned',
  notes text
);

create table public.badges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  badge_type text,
  rule_key text,
  icon text
);

create table public.user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  badge_id uuid references public.badges(id) on delete cascade,
  awarded_at timestamptz default now(),
  unique(user_id,badge_id)
);

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.muscle_groups enable row level security;
alter table public.exercise_muscle_groups enable row level security;
alter table public.programmes enable row level security;
alter table public.sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.workout_log_sets enable row level security;
alter table public.body_metrics enable row level security;
alter table public.classes enable row level security;
alter table public.class_attendance enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create or replace function public.current_role()
returns app_role language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "profiles self or admin" on public.profiles for select using (id = auth.uid() or public.current_role() in ('super_admin','coach'));
create policy "profiles admin update" on public.profiles for update using (id = auth.uid() or public.current_role() = 'super_admin');

create policy "exercises readable" on public.exercises for select using (true);
create policy "exercises coach write" on public.exercises for all using (public.current_role() in ('super_admin','coach')) with check (public.current_role() in ('super_admin','coach'));

create policy "reference readable muscle" on public.muscle_groups for select using (true);
create policy "reference readable exercise muscles" on public.exercise_muscle_groups for select using (true);
create policy "reference coach muscle" on public.muscle_groups for all using (public.current_role() in ('super_admin','coach')) with check (public.current_role() in ('super_admin','coach'));
create policy "reference coach exercise muscles" on public.exercise_muscle_groups for all using (public.current_role() in ('super_admin','coach')) with check (public.current_role() in ('super_admin','coach'));

create policy "programmes visible" on public.programmes for select using (assigned_to = auth.uid() or created_by = auth.uid() or public.current_role() in ('super_admin','coach'));
create policy "programmes coach write" on public.programmes for all using (public.current_role() in ('super_admin','coach')) with check (public.current_role() in ('super_admin','coach'));

create policy "sessions visible" on public.sessions for select using (exists(select 1 from public.programmes p where p.id = programme_id and (p.assigned_to = auth.uid() or p.created_by = auth.uid() or public.current_role() in ('super_admin','coach'))));
create policy "sessions coach write" on public.sessions for all using (public.current_role() in ('super_admin','coach')) with check (public.current_role() in ('super_admin','coach'));

create policy "session exercises visible" on public.session_exercises for select using (true);
create policy "session exercises coach write" on public.session_exercises for all using (public.current_role() in ('super_admin','coach')) with check (public.current_role() in ('super_admin','coach'));

create policy "own logs" on public.workout_logs for all using (user_id = auth.uid() or public.current_role() in ('super_admin','coach')) with check (user_id = auth.uid() or public.current_role() in ('super_admin','coach'));
create policy "own sets" on public.workout_log_sets for all using (exists(select 1 from public.workout_logs wl where wl.id = workout_log_id and (wl.user_id = auth.uid() or public.current_role() in ('super_admin','coach')))) with check (exists(select 1 from public.workout_logs wl where wl.id = workout_log_id and (wl.user_id = auth.uid() or public.current_role() in ('super_admin','coach'))));
create policy "own metrics" on public.body_metrics for all using (user_id = auth.uid() or public.current_role() in ('super_admin','coach')) with check (user_id = auth.uid() or public.current_role() in ('super_admin','coach'));

create policy "classes readable" on public.classes for select using (true);
create policy "classes coach write" on public.classes for all using (public.current_role() in ('super_admin','coach')) with check (public.current_role() in ('super_admin','coach'));
create policy "own class attendance" on public.class_attendance for all using (user_id = auth.uid() or public.current_role() in ('super_admin','coach')) with check (user_id = auth.uid() or public.current_role() in ('super_admin','coach'));
create policy "badges readable" on public.badges for select using (true);
create policy "badges coach write" on public.badges for all using (public.current_role() in ('super_admin','coach')) with check (public.current_role() in ('super_admin','coach'));
create policy "own user badges" on public.user_badges for select using (user_id = auth.uid() or public.current_role() in ('super_admin','coach'));

-- After creating your first auth user, run this with their auth.users id to make them admin:
-- insert into public.profiles (id, role, first_name, last_name, display_name) values ('YOUR-AUTH-USER-ID','super_admin','Alex','H','Alex');

-- Seed reference data and starter programme/exercises for BlackBeltBootcamp demo/admin use.
insert into public.muscle_groups(name) values
('Chest'),('Back'),('Shoulders'),('Triceps'),('Biceps'),('Forearms'),('Core'),('Abs'),('Obliques'),('Glutes'),('Quadriceps'),('Hamstrings'),('Calves'),('Grip'),('Full Body'),('Cardio'),('Footwork'),('Coordination')
on conflict do nothing;

insert into public.badges(name,description,badge_type,rule_key,icon) values
('First Workout','Complete your first workout','milestone','first_workout','CheckCircle'),
('7-Day Streak','Train for seven consecutive days','streak','streak_7','Flame'),
('Footwork Starter','Complete the daily footwork routine','skill','footwork_1','Footprints'),
('100 Sessions','Complete 100 total sessions','milestone','sessions_100','Trophy'),
('12-Week Finisher','Complete the 12 week programme','programme','programme_12_week','Medal')
on conflict do nothing;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id, role, first_name, display_name)
  values (new.id, 'athlete', split_part(new.email,'@',1), split_part(new.email,'@',1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
