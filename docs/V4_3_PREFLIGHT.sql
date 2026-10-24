-- Read only. Inspect results before applying the V4.3 migration.
-- Do not automatically rename, relink or delete profiles.
select id, name, email, role, auth_user_id
from public.athlete_profiles order by name;

select id, email, email_confirmed_at, last_sign_in_at
from auth.users
where lower(email) in ('alex.hiles.ags@gmail.com', 'james.hiles@blackbeltbootcamp.app', 'james@blackbeltbootcamp.app');

select auth_user_id, count(*) as linked_profiles
from public.athlete_profiles where auth_user_id is not null
group by auth_user_id having count(*) > 1;

select session_id, exercise_id, count(*) as historical_log_count
from public.workout_logs where session_id is not null
group by session_id, exercise_id having count(*) > 1;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
and tablename in ('athlete_profiles','user_profiles','workout_programmes','workout_programme_exercises','training_sessions','workout_logs','athlete_metrics','nutrition_entries','nutrition_targets')
order by tablename, policyname;

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('athlete_profiles','user_profiles','workout_programmes','workout_programme_exercises','training_sessions','workout_logs','athlete_metrics','nutrition_entries','nutrition_targets');

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name in ('athlete_profiles','training_sessions','workout_programmes','workout_logs','nutrition_entries','nutrition_targets')
order by table_name, ordinal_position;
