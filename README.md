# BlackBeltBootcamp V2.2.9 — Workout Assignment Sync

Focused patch built on top of V2.2.8.

## What changed

- Fixed the trainer-to-athlete assignment workflow so assigned workouts are saved against the selected profile using `athlete_id`, `athlete_email` and `athlete_name`.
- Added Supabase sync for assigned sessions and workout programmes when Supabase tables are available.
- Kept localStorage fallback so the app still works if Supabase training tables are not available.
- James can now create a workout in Workout Builder and add it to his own calendar.
- Alex can now assign workouts to his own profile from the Admin Console.
- The Admin Console profile pick list now includes Alex Hiles and James Hiles.
- Saved workouts can now be viewed, edited, updated and deleted in Workout Builder.
- Saved workout exercises now allow planned sets, reps and weight to be edited.
- The Quick Exercise Completion section remains removed from Today's Training.

## Deployment

Install over the existing project folder, then run:

```bash
npm install
npm run build
git add .
git commit -m "Fix workout assignment sync and editable workouts"
git push
```

## Supabase note

No new SQL is required if the V2.2 schema has already been run. The patch uses the existing V2.2 tables:

- `athlete_profiles`
- `workout_programmes`
- `workout_programme_exercises`
- `training_sessions`

If those tables do not exist, the app falls back to local device storage.
