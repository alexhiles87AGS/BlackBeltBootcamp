# BlackBeltBootcamp V2.2.13 — GMT Calendar + Clean Start + Admin Deletion

This package builds on the working V2.2.12 app and applies the final operational fixes requested.

## Included

- GMT-safe date handling for assigned sessions and calendar display.
- Supabase session dates are saved at midday GMT to avoid day-shift issues on iPhone/UK devices.
- Training Calendar compares date-only values, not JavaScript local-time conversions.
- One-time clean start for the live programme build:
  - Clears existing local diary events.
  - Clears existing local saved workouts.
  - Clears existing local exercise logs.
  - Attempts to clear old Supabase sessions/workouts.
  - Ignores old remote sessions/workouts created before this patch cutoff.
- Admin Console maintenance section.
- Admin can delete all sessions and saved workouts.
- Admin can delete individual diary items, including classes and workout sessions.
- Admin can delete saved workouts.
- Existing working features retained:
  - Assignment to James.
  - Assignment to Alex.
  - James self-assignment.
  - Exercise Library.
  - FMA classes as class sessions only.
  - Workout completion collapse behaviour.

## Deploy

```bash
npm install
npm run build
git add .
git commit -m "Fix GMT calendar dates and add admin deletion tools"
git push
```

## Optional Supabase SQL

The app includes `supabase/schema_v2213_delete_policies.sql`.

Run it once in Supabase SQL Editor if the Admin Console delete buttons do not remove remote rows.

The full `supabase/schema_v22.sql` has also been updated to include delete policies for the private beta tables.
