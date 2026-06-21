-- BlackBeltBootcamp V2.2.13 admin delete permissions
-- Run this once if the Admin Console delete buttons cannot remove remote Supabase rows.

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname='public' and tablename in (
    'workout_programmes',
    'workout_programme_exercises',
    'training_sessions',
    'workout_logs',
    'fma_classes',
    'athlete_metrics',
    'user_badges'
  ) loop
    execute format('drop policy if exists "Private beta delete" on public.%I', r.tablename);
    execute format('create policy "Private beta delete" on public.%I for delete using (true)', r.tablename);
  end loop;
end $$;
