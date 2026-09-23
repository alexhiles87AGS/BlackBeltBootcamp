# BlackBeltBootcamp V4.0 Deployment Guide

This is a major code and database upgrade. Back up the current working project before replacing files.

## 1. Back up the current project

Copy the existing `blackbeltbootcamp` folder and rename the copy, for example:

```text
blackbeltbootcamp-v3-backup
```

Do not delete the original until V4 has been fully tested.

## 2. Replace the application files

Copy the contents of this package into the existing Git-connected `blackbeltbootcamp` folder and choose **Replace files in destination**.

Keep the existing hidden `.git` folder and the local `.env` file.

## 3. Install and test locally

Open Command Prompt in the project folder:

```bash
npm install
npm run build
npm run dev
```

Test at the local URL before pushing to GitHub.

## 4. Apply the V4 Supabase migration

Open **Supabase → SQL Editor → New query**. Paste and run:

```text
supabase/schema_v4_major_update.sql
```

When Supabase warns about security, choose the option that runs the query with RLS enabled.

The migration expects the V3 Auth helper functions and cloud tables already to exist. If the V3 migration was never completed, run `supabase/schema_v3_cloud_sync_auth.sql` first and ensure Alex and James are linked to their Auth users.

## 5. Confirm Realtime is enabled

The V4 SQL adds these tables to `supabase_realtime`:

- `training_sessions`
- `workout_programmes`
- `workout_programme_exercises`
- `workout_logs`
- `athlete_metrics`
- `badges`
- `app_settings`
- `nutrition_targets`
- `nutrition_entries`

The SQL is idempotent and skips tables already published.

## 6. Deploy the secure athlete invitation function

This is needed for **Admin Console → Create Athlete** to create/invite a real Supabase Auth user.

Using the Supabase CLI:

```bash
supabase login
supabase link --project-ref stuxkictgjeascqcsvzi
supabase functions deploy invite-athlete
```

The function uses the server-side service role automatically inside Supabase. Never place a service-role key in the browser or Netlify Vite variables.

If the Edge Function is not deployed, V4 still creates the athlete profile and tells the admin to create the matching Auth user manually.

## 7. Push to GitHub

```bash
git status
git add .
git commit -m "Upgrade BlackBeltBootcamp to V4"
git push
```

Netlify should deploy automatically.

## 8. Netlify settings

Confirm:

```text
Build command: npm run build
Publish directory: dist
NODE_VERSION: 20
VITE_SUPABASE_URL: your Supabase project URL
VITE_SUPABASE_ANON_KEY: your publishable/anon key
```

## 9. Authentication settings

In **Supabase → Authentication → URL Configuration** ensure the production URL is included:

```text
https://blackbeltbootcamp.netlify.app
```

Add the corresponding password-reset redirect URL if Supabase requires an explicit redirect allow-list entry.

## 10. Acceptance tests

### Cross-device refresh

1. Keep James logged in on one device with the calendar open.
2. Assign a fresh session to James from Alex's admin profile on another device.
3. Confirm the session appears automatically or when James returns to the tab/app.
4. Test the visible refresh control without signing out.

### Workout Builder

1. Select a body area and muscle.
2. Preview an exercise before adding it.
3. Play its demo video.
4. Add it, reorder the draft and save the workout.

### Nutrition

1. Set daily targets.
2. Add breakfast and hydration entries.
3. Confirm totals update and persist on another device.

### Progress

1. Complete weighted sets.
2. Confirm recent sets, volume and estimated 1RM appear.
3. Log a body-weight entry and confirm the trend chart updates.

### Security

1. James cannot see another athlete's private records.
2. Alex can review assigned athlete data as admin.
3. Password reset email can be requested from the login screen.
