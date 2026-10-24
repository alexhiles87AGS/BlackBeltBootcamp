-- V4.3 only. Review and apply ONCE to the existing V4.1/V4 database before rollout.
-- No data reset, no historical migration replay, no Realtime subscription changes.
begin;

-- Targeted compatibility for the inspected live V4.1 schema. No historical replay.
alter table public.athlete_profiles add column if not exists weight_unit text not null default 'kg';
alter table public.workout_logs
 add column if not exists log_date date not null default current_date,
 add column if not exists session_type text,
 add column if not exists exercise_id text,
 add column if not exists exercise_name text,
 add column if not exists sets jsonb not null default '[]'::jsonb,
 add column if not exists reps text,
 add column if not exists weight text,
 add column if not exists rpe numeric,
 add column if not exists completed boolean not null default true,
 add column if not exists created_at timestamptz not null default now();
-- The original log table pointed at the obsolete sessions table. Refuse to
-- change that FK if any existing record cannot be preserved against training_sessions.
do $$ declare c record;begin
 for c in select conname from pg_constraint where conrelid='public.workout_logs'::regclass and contype='f'
 and conkey=array[(select attnum from pg_attribute where attrelid='public.workout_logs'::regclass and attname='session_id')]
 and confrelid<>'public.training_sessions'::regclass loop
  if exists(select 1 from public.workout_logs l where l.session_id is not null and not exists(select 1 from public.training_sessions s where s.id=l.session_id)) then raise exception 'Legacy session links need explicit review before V4.3';end if;
  execute format('alter table public.workout_logs drop constraint %I',c.conname);
 end loop;
 if not exists(select 1 from pg_constraint where conrelid='public.workout_logs'::regclass and contype='f' and confrelid='public.training_sessions'::regclass) then
  alter table public.workout_logs add constraint v43_logs_training_session_fk foreign key(session_id) references public.training_sessions(id) on delete set null;
 end if;
end $$;
create table if not exists public.nutrition_targets(
 id uuid primary key default gen_random_uuid(),athlete_id uuid not null references public.athlete_profiles(id) on delete cascade,
 effective_date date not null default current_date,calories numeric not null default 2400,protein_g numeric not null default 180,
 carbs_g numeric not null default 250,fats_g numeric not null default 70,water_ml numeric not null default 3000,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(athlete_id));
create table if not exists public.nutrition_entries(
 id uuid primary key default gen_random_uuid(),athlete_id uuid not null references public.athlete_profiles(id) on delete cascade,
 entry_date date not null default current_date,meal_type text not null default 'Snack' check(meal_type in ('Breakfast','Lunch','Dinner','Snack','Hydration')),
 name text not null,serving text,calories numeric not null default 0,protein_g numeric not null default 0,
 carbs_g numeric not null default 0,fats_g numeric not null default 0,water_ml numeric not null default 0,notes text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
do $$ declare t text;begin
 foreach t in array array['nutrition_targets','nutrition_entries'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists v43_nutrition_owner on public.%I',t);
  execute format('create policy v43_nutrition_owner on public.%I for all to authenticated using(public.is_app_admin() or athlete_id=public.current_athlete_profile_id()) with check(public.is_app_admin() or athlete_id=public.current_athlete_profile_id())',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
create index if not exists nutrition_entries_athlete_date_idx on public.nutrition_entries(athlete_id,entry_date desc);
create index if not exists workout_logs_athlete_exercise_date_idx on public.workout_logs(athlete_id,exercise_id,log_date desc);
create index if not exists training_sessions_athlete_date_idx on public.training_sessions(athlete_id,session_date desc);
-- Preserve the live FMA active flag when introducing the frontend's expected name.
do $$ begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='fma_classes' and column_name='is_active') then
  alter table public.fma_classes add column is_active boolean not null default true;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='fma_classes' and column_name='active') then update public.fma_classes set is_active=coalesce(active,true);end if;
 end if;
end $$;
-- Explicit table grants remain subject to existing ownership RLS.
grant select,insert,update,delete on public.workout_logs,public.athlete_metrics,public.training_sessions,public.athlete_profiles,public.workout_programmes,public.workout_programme_exercises to authenticated;
-- Scope programme details as well as their parent programmes.
drop policy if exists v43_programme_details_read on public.workout_programme_exercises;
create policy v43_programme_details_read on public.workout_programme_exercises as restrictive for select to authenticated using(exists(select 1 from public.workout_programmes p where p.id=programme_id));
-- Require a log's session to belong to its stated athlete, even for crafted API calls.
drop policy if exists v43_log_session_owner on public.workout_logs;
create policy v43_log_session_owner on public.workout_logs as restrictive for all to authenticated using(public.is_app_admin() or athlete_id=public.current_athlete_profile_id()) with check(public.is_app_admin() or (athlete_id=public.current_athlete_profile_id() and (session_id is null or exists(select 1 from public.training_sessions s where s.id=session_id and s.athlete_id=public.current_athlete_profile_id()))));

do $$ declare t text; begin
 foreach t in array array['workout_programmes','training_sessions','workout_logs','athlete_metrics','nutrition_entries','nutrition_targets','athlete_profiles'] loop
  execute format('alter table public.%I add column if not exists sync_version integer not null default 0',t);
  execute format('alter table public.%I add column if not exists last_mutation_id uuid',t);
 end loop;
end $$;
-- Older clients and direct permitted updates must also advance record versions.
create or replace function public.bbb_advance_version_v43() returns trigger
language plpgsql set search_path=public as $$ begin
 if new.sync_version=old.sync_version and new.last_mutation_id is not distinct from old.last_mutation_id then new.last_mutation_id:=null;end if;
 new.sync_version:=old.sync_version+1;return new;
end $$;
do $$ declare t text;begin
 foreach t in array array['workout_programmes','training_sessions','workout_logs','athlete_metrics','nutrition_entries','nutrition_targets','athlete_profiles'] loop
  execute format('drop trigger if exists bbb_advance_version_v43 on public.%I',t);
  execute format('create trigger bbb_advance_version_v43 before update on public.%I for each row execute function public.bbb_advance_version_v43()',t);
 end loop;
end $$;
alter table public.training_sessions add column if not exists effort_rating integer check(effort_rating between 1 and 10);
alter table public.training_sessions add column if not exists athlete_notes text;
alter table public.training_sessions add column if not exists skipped_exercises jsonb not null default '[]'::jsonb;

-- Restrictive policies also constrain any permissive policies retained from older schemas.
do $$ declare t text; own text; op text; begin
 foreach t in array array['workout_programmes','workout_programme_exercises'] loop
  own := case when t='workout_programmes' then
   '(public.is_app_admin() or owner_athlete_id = public.current_athlete_profile_id())'
  else '(public.is_app_admin() or exists(select 1 from public.workout_programmes p where p.id=programme_id and p.owner_athlete_id=public.current_athlete_profile_id()))' end;
  foreach op in array array['insert','update','delete'] loop
   execute format('drop policy if exists %I on public.%I','v43_owner_'||op,t);
   if op='insert' then execute format('create policy %I on public.%I as restrictive for insert to authenticated with check (%s)','v43_owner_'||op,t,own);
   elsif op='update' then execute format('create policy %I on public.%I as restrictive for update to authenticated using (%s) with check (%s)','v43_owner_'||op,t,own,own);
   else execute format('create policy %I on public.%I as restrictive for delete to authenticated using (%s)','v43_owner_'||op,t,own);end if;
  end loop;
 end loop;
end $$;

-- Stop an athlete changing their own identity/role through the profile editor/API.
create or replace function public.bbb_protect_profile_identity_v43() returns trigger
language plpgsql set search_path=public as $$ begin
 if auth.uid() is not null and not public.is_app_admin() and
   (new.role is distinct from old.role or new.email is distinct from old.email or new.auth_user_id is distinct from old.auth_user_id or new.id is distinct from old.id) then
  raise exception 'Profile identity and role changes require an administrator.' using errcode='42501';
 end if;return new;end $$;
drop trigger if exists bbb_protect_profile_identity_v43 on public.athlete_profiles;
create trigger bbb_protect_profile_identity_v43 before update on public.athlete_profiles for each row execute function public.bbb_protect_profile_identity_v43();

-- Reusable version-checked, idempotent write. SECURITY INVOKER preserves normal RLS.
create or replace function public.bbb_save_record_v43(p_table text,p_row jsonb,p_expected_version integer,p_mutation_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare allowed text[]; cols text; vals text; assignments text; current_row jsonb; result jsonb; row_id uuid; field text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 allowed:=case p_table
 when 'athlete_profiles' then array['id','name','age','height_cm','weight_kg','competition_weight_kg','belt_rank','gym','goal','profile_photo_url','weight_unit']
 when 'training_sessions' then array['id','athlete_id','programme_id','session_date','start_time','end_time','title','session_type','status','class_name','notes','effort_rating','athlete_notes','skipped_exercises']
 when 'workout_logs' then array['id','athlete_id','session_id','log_date','session_type','exercise_id','exercise_name','sets','reps','weight','rpe','notes','completed']
 when 'athlete_metrics' then array['id','athlete_id','metric_date','height_cm','weight_kg','body_fat_percent','notes']
 when 'nutrition_entries' then array['id','athlete_id','entry_date','meal_type','name','serving','calories','protein_g','carbs_g','fats_g','water_ml','notes']
 when 'nutrition_targets' then array['id','athlete_id','effective_date','calories','protein_g','carbs_g','fats_g','water_ml']
 else null end;
 if allowed is null then raise exception 'Unsupported record type';end if;
 if exists(select 1 from jsonb_object_keys(p_row) k where not(k=any(allowed))) then raise exception 'Unsupported record field';end if;
 row_id:=(p_row->>'id')::uuid;if row_id is null or p_mutation_id is null then raise exception 'Stable identifiers required';end if;
 -- Serialise new-row retries as well as updates.
 perform pg_advisory_xact_lock(hashtextextended(p_table||row_id::text,0));
 execute format('select to_jsonb(t) from public.%I t where id=$1 for update',p_table) into current_row using row_id;
 if current_row->>'last_mutation_id'=p_mutation_id::text then return current_row;end if;
 if p_table='workout_logs' and current_row is null and p_row->>'session_id' is not null then
  perform pg_advisory_xact_lock(hashtextextended('log:'||(p_row->>'session_id')||':'||(p_row->>'exercise_id'),0));
  if exists(select 1 from public.workout_logs where session_id=(p_row->>'session_id')::uuid and exercise_id=p_row->>'exercise_id') then raise exception 'BBB_CONFLICT: this session exercise was logged on another device';end if;
 end if;
 if current_row is not null and (p_expected_version is null or (current_row->>'sync_version')::integer<>p_expected_version) then raise exception 'BBB_CONFLICT: newer cloud record';end if;
 if current_row is null and p_expected_version is not null then raise exception 'BBB_CONFLICT: record is missing or unavailable';end if;
 if p_table in ('nutrition_entries','nutrition_targets') and exists(select 1 from jsonb_each_text(p_row) e where e.key=any(array['calories','protein_g','carbs_g','fats_g','water_ml']) and e.value::numeric<0) then raise exception 'Nutrition values cannot be negative';end if;
 foreach field in array allowed loop
  if p_row ? field then
   cols:=concat_ws(',',cols,format('%I',field));
   vals:=concat_ws(',',vals,format('(jsonb_populate_record(null::public.%I,$1)).%I',p_table,field));
   if field<>'id' then assignments:=concat_ws(',',assignments,format('%I=(jsonb_populate_record(null::public.%I,$1)).%I',field,p_table,field));end if;
  end if;
 end loop;
 if current_row is null then
  execute format('insert into public.%I as t (%s,sync_version,last_mutation_id) select %s,1,$2 returning to_jsonb(t)',p_table,cols,vals) into result using p_row,p_mutation_id;
 else
  execute format('update public.%I as t set %s,sync_version=sync_version+1,last_mutation_id=$2 where id=$3 returning to_jsonb(t)',p_table,assignments) into result using p_row,p_mutation_id,row_id;
 end if;
 if result is null then raise exception 'Write not permitted' using errcode='42501';end if;return result;
end $$;

create or replace function public.bbb_save_programme_v43(p_programme jsonb,p_exercises jsonb,p_expected_version integer,p_mutation_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare existing public.workout_programmes; result public.workout_programmes; programme_id uuid; item jsonb; ordinal bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 programme_id:=(p_programme->>'id')::uuid;
 if programme_id is null or p_mutation_id is null or length(trim(p_programme->>'name'))=0 then raise exception 'Workout name and stable identifiers required';end if;
 if jsonb_typeof(p_exercises)<>'array' or jsonb_array_length(p_exercises)=0 then raise exception 'At least one exercise required';end if;
 if (select count(*) from jsonb_array_elements(p_exercises))<>(select count(distinct e->>'exercise_id') from jsonb_array_elements(p_exercises) e) then raise exception 'Duplicate exercise';end if;
 perform pg_advisory_xact_lock(hashtextextended('workout_programmes'||programme_id::text,0));
 select * into existing from public.workout_programmes where id=programme_id for update;
 if found then
  if existing.last_mutation_id=p_mutation_id then return to_jsonb(existing);end if;
  if p_expected_version is null or existing.sync_version<>p_expected_version then raise exception 'BBB_CONFLICT: newer cloud workout';end if;
  update public.workout_programmes set name=p_programme->>'name',focus=p_programme->>'focus',session_type=p_programme->>'session_type',sync_version=sync_version+1,last_mutation_id=p_mutation_id,updated_at=now() where id=programme_id returning * into result;
 else
  if p_expected_version is not null then raise exception 'BBB_CONFLICT: workout is missing or unavailable';end if;
  insert into public.workout_programmes(id,name,focus,session_type,owner_athlete_id,is_template,sync_version,last_mutation_id)
  values(programme_id,p_programme->>'name',p_programme->>'focus',p_programme->>'session_type',(p_programme->>'owner_athlete_id')::uuid,coalesce((p_programme->>'is_template')::boolean,false),1,p_mutation_id) returning * into result;
 end if;
 if result.id is null then raise exception 'Workout write not permitted' using errcode='42501';end if;
 delete from public.workout_programme_exercises e where e.programme_id=result.id;
 for item,ordinal in select value,ordinality from jsonb_array_elements(p_exercises) with ordinality loop
  if coalesce((item->>'planned_sets')::integer,0)<1 then raise exception 'Sets must be at least one';end if;
  insert into public.workout_programme_exercises(programme_id,exercise_id,exercise_name,planned_sets,planned_reps,planned_weight,sort_order,notes)
  values(result.id,item->>'exercise_id',item->>'exercise_name',(item->>'planned_sets')::integer,item->>'planned_reps',item->>'planned_weight',ordinal,item->>'notes');
 end loop;
 return to_jsonb(result);
end $$;
revoke all on function public.bbb_save_record_v43(text,jsonb,integer,uuid) from public,anon;
revoke all on function public.bbb_save_programme_v43(jsonb,jsonb,integer,uuid) from public,anon;
grant execute on function public.bbb_save_record_v43(text,jsonb,integer,uuid) to authenticated;
grant execute on function public.bbb_save_programme_v43(jsonb,jsonb,integer,uuid) to authenticated;

-- Prevent legacy public write policies from bypassing catalogue role separation.
do $$ declare t text;op text;begin
 foreach t in array array['exercises','exercise_instructions'] loop
  if to_regclass('public.'||t) is not null then
   foreach op in array array['insert','update','delete'] loop
    execute format('drop policy if exists %I on public.%I','v43_catalogue_'||op,t);
    if op='insert' then execute format('create policy %I on public.%I as restrictive for insert to public with check(public.is_app_admin())','v43_catalogue_'||op,t);
    elsif op='update' then execute format('create policy %I on public.%I as restrictive for update to public using(public.is_app_admin()) with check(public.is_app_admin())','v43_catalogue_'||op,t);
    else execute format('create policy %I on public.%I as restrictive for delete to public using(public.is_app_admin())','v43_catalogue_'||op,t);end if;
   end loop;
  end if;
 end loop;
end $$;
-- Legacy profile roles are also permission-bearing; athletes cannot escalate them.
create or replace function public.bbb_protect_legacy_role_v43() returns trigger language plpgsql set search_path=public as $$ begin
 if auth.uid() is not null and not public.is_app_admin() and (new.role is distinct from old.role or new.id is distinct from old.id) then raise exception 'Profile identity and role changes require an administrator.' using errcode='42501';end if;return new;end $$;
do $$ begin
 if to_regclass('public.profiles') is not null then
  drop trigger if exists bbb_protect_legacy_role_v43 on public.profiles;
  create trigger bbb_protect_legacy_role_v43 before update on public.profiles for each row execute function public.bbb_protect_legacy_role_v43();
 end if;
 if to_regprocedure('public.current_role()') is not null then execute 'alter function public."current_role"() set search_path=public,pg_temp';end if;
 if to_regprocedure('public.handle_new_user()') is not null then execute 'alter function public.handle_new_user() set search_path=public,pg_temp';end if;
end $$;

-- Whole-training reset: archived server snapshot + delete in one transaction.
create table if not exists public.training_recovery_snapshots(id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),created_by uuid not null default auth.uid(),payload jsonb not null);
alter table public.training_recovery_snapshots enable row level security;
drop policy if exists "v43 recovery admins" on public.training_recovery_snapshots;
create policy "v43 recovery admins" on public.training_recovery_snapshots for all to authenticated using(public.is_app_admin()) with check(public.is_app_admin());
grant select,insert on public.training_recovery_snapshots to authenticated;
create or replace function public.bbb_archive_reset_v43(p_confirmation text) returns uuid language plpgsql security invoker set search_path=public as $$
declare snapshot uuid;begin
 if auth.uid() is null or not public.is_app_admin() or p_confirmation<>'RESET ALL TRAINING' then raise exception 'Confirmed administrator action required' using errcode='42501';end if;
 lock table public.workout_logs,public.training_sessions,public.workout_programme_exercises,public.workout_programmes in share row exclusive mode;
 insert into public.training_recovery_snapshots(payload) values(jsonb_build_object('workout_logs',(select coalesce(jsonb_agg(t),'[]'::jsonb) from public.workout_logs t),'training_sessions',(select coalesce(jsonb_agg(t),'[]'::jsonb) from public.training_sessions t),'workout_programme_exercises',(select coalesce(jsonb_agg(t),'[]'::jsonb) from public.workout_programme_exercises t),'workout_programmes',(select coalesce(jsonb_agg(t),'[]'::jsonb) from public.workout_programmes t))) returning id into snapshot;
 delete from public.workout_logs;delete from public.training_sessions;delete from public.workout_programme_exercises;delete from public.workout_programmes;
 return snapshot;end $$;
revoke all on function public.bbb_archive_reset_v43(text) from public,anon;
grant execute on function public.bbb_archive_reset_v43(text) to authenticated;

-- Recovery is explicit and allowed only when the training tables are empty.
create or replace function public.bbb_restore_training_v43(p_snapshot uuid,p_confirmation text) returns void
language plpgsql security invoker set search_path=public as $$
declare backup jsonb;begin
 if auth.uid() is null or not public.is_app_admin() or p_confirmation<>'RESTORE TRAINING' then raise exception 'Confirmed administrator action required' using errcode='42501';end if;
 lock table public.workout_logs,public.training_sessions,public.workout_programme_exercises,public.workout_programmes in share row exclusive mode;
 if exists(select 1 from public.training_sessions) or exists(select 1 from public.workout_logs) or exists(select 1 from public.workout_programmes) then raise exception 'Restore requires empty training tables. Export and review current data first.';end if;
 select payload into backup from public.training_recovery_snapshots where id=p_snapshot;
 if backup is null then raise exception 'Recovery snapshot is unavailable';end if;
 insert into public.workout_programmes select * from jsonb_populate_recordset(null::public.workout_programmes,backup->'workout_programmes');
 insert into public.workout_programme_exercises select * from jsonb_populate_recordset(null::public.workout_programme_exercises,backup->'workout_programme_exercises');
 insert into public.training_sessions select * from jsonb_populate_recordset(null::public.training_sessions,backup->'training_sessions');
 insert into public.workout_logs select * from jsonb_populate_recordset(null::public.workout_logs,backup->'workout_logs');
end $$;
revoke all on function public.bbb_restore_training_v43(uuid,text) from public,anon;
grant execute on function public.bbb_restore_training_v43(uuid,text) to authenticated;
commit;
