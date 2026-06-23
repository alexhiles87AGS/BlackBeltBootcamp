# BlackBeltBootcamp V3.0 — Cloud Sync + Supabase Auth

This V3 package upgrades BlackBeltBootcamp from a strong single-device/private-beta app into a cloud-synced training platform designed to work across Alex and James's devices.

## Major upgrades

- Supabase Auth login replaces the local/fallback password system.
- Password reset is available from the login screen.
- Profiles, diary sessions, saved workouts, workout logs, athlete metrics, FMA classes, badges and dashboard focus text are designed to sync via Supabase.
- Admin Console now has its own internal menu/tabs to reduce clutter.
- Admin can review athlete profiles, diary, missed sessions, completed exercises, weights/reps/sets and skipped sets.
- Dashboard shows nearest achievements to completion first.
- Achievement Manager saves to Supabase so changes can appear on James's device after reload/login.
- Training Calendar defaults to the current week and allows previous/next week navigation.
- Exercise Library now supports body-part and muscle/target filtering.
- Manual exercise creation includes Full Body as a body part/target focus.
- Workout Builder supports exercise demo preview, exercise reordering, saved workout editing, and athlete-specific copies.
- Athlete Profile now includes weight logging and Progress Stats displays weight trends.
- Profile is opened by clicking the user profile box in the hamburger menu.

## Required Supabase step

Run this file once in Supabase SQL Editor:

```text
supabase/schema_v3_cloud_sync_auth.sql
```

Then create Supabase Auth users for:

```text
alex.hiles.ags@gmail.com
james.hiles@blackbeltbootcamp.app
```

After the Auth users exist, run the same SQL file one more time. This links the Auth users to the app profiles and roles.

## Deployment

```bash
npm install
npm run build
git add .
git commit -m "Upgrade to BlackBeltBootcamp V3 cloud sync auth"
git push
```

## Notes

This version keeps a local cache for offline resilience, but Supabase is now the intended source of truth. New devices should load data from Supabase after login.
