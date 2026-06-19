# BlackBeltBootcamp

A mobile-first training tracker for James, built for Netlify + Supabase.

## What's included

- React + TypeScript + Vite app
- Professional dark fitness-app UI
- Pre-loaded James 4-day gym plan
- Pre-loaded 15-minute daily footwork routine
- Exercise directory with body-part filters
- Workout screen with video placeholders, set/reps/weight inputs and complete buttons
- Calendar planning view for the 12-week block
- Admin screen for future exercise entry and demo-video URLs
- Profile, body metrics and Sunday review screens
- Supabase SQL schema and RLS starter policies

## Local setup

```bash
npm install
npm run dev
```

## Netlify deployment

1. Create a GitHub repository and upload this folder.
2. In Netlify, choose **Add new site > Import an existing project**.
3. Select the repository.
4. Build command: `npm run build`.
5. Publish directory: `dist`.
6. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Deploy.

The `netlify.toml` file is already included.

## Supabase setup

1. Create a new Supabase project.
2. Go to **SQL Editor**.
3. Paste and run `supabase/schema.sql`.
4. Go to **Authentication > Users** and create your admin user.
5. Copy the user ID.
6. Run this SQL, replacing the ID:

```sql
insert into public.profiles (id, role, first_name, last_name, display_name)
values ('YOUR-AUTH-USER-ID','super_admin','Alex','H','Alex');
```

7. Create James as an auth user when ready and add a `profiles` row with role `athlete`.

## ExerciseDB Pro import plan

This prototype uses local seed data so you can approve the visuals first. In the next version, add an import page that:

1. Accepts the ExerciseDB Pro JSON file.
2. Maps exercise names, body parts, equipment, instructions, images and video URLs.
3. Inserts exercises into `public.exercises`.
4. Inserts muscle groups into `public.muscle_groups`.
5. Links them through `public.exercise_muscle_groups`.
6. Marks source as `ExerciseDB Pro`.

## Current limitation

This is a polished front-end prototype with Supabase-ready schema. The screens currently use local seed data. The next engineering step is wiring forms and workout logs to Supabase.
