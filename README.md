# BlackBeltBootcamp

A production-ready React/Vite + Supabase + Netlify training platform for James's gym, MMA, BJJ, footwork, FMA Chester classes, workout logging, badges and progress tracking.

## Features included

- Supabase email/password authentication with demo mode fallback
- Admin/coach/athlete navigation
- Dashboard and athlete command centre
- 21-day training calendar
- Daily workout execution screen
- Set/reps/weight logging and mark-complete function
- Exercise directory filtered by body part/search
- Admin quick-add exercise with demo video URL field
- Workout builder from exercise database
- FMA Chester class schedule module
- Body metrics and BMI display
- Charts for bodyweight and session mix
- Badge/achievement system scaffold
- Seeded James 4-day gym plan and 15-minute daily footwork routine
- Supabase SQL schema with RLS starter policies
- Netlify-ready configuration

## Local setup

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Netlify settings

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `20`

## Environment variables

Create these in Netlify:

```text
NODE_VERSION=20
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

## Supabase setup

1. Create a Supabase project.
2. Go to SQL Editor.
3. Run `supabase/schema.sql`.
4. Go to Authentication > Providers > Email and enable email/password.
5. Create your first user under Authentication > Users, or create an account from the app login screen.

## Notes

The current app stores demo data locally in the browser so it is usable immediately. The Supabase schema is included so you can progressively wire each module to live database tables as the app matures. The structure is ready for ExerciseDB Pro JSON import later.

## Exercise importer update

This build includes the 1,659-record exercise catalogue generated from the supplied JSON exercise files and `video_sort_report.json`.

### Supabase storage requirement

Your videos must be in the public Supabase Storage bucket:

```text
exercise-videos
```

The importer uses the stored `video_path` values from the sort report, for example:

```text
Structured Workouts/100 Gym Female/waist/abs/strength/intermediate/1243 - ab-to-adduction slide straight arms.mp4
```

Subfolders are supported.

### Database upgrade

Run the latest `supabase/schema.sql` in Supabase SQL Editor. It safely adds:

- `import_uid`
- `source_id`
- `source_file`
- `video_path`
- import/search indexes

### App import steps

1. Deploy this build.
2. Open BlackBeltBootcamp.
3. Go to **Exercise Import** in the sidebar.
4. Click **Load catalogue**.
5. Review the import preview and missing video count.
6. Click **Import / upsert to Supabase**.
7. Use **Exercise Library** and **Workout Builder** with the full imported catalogue.

You can also click **Import to app demo data** for local testing without writing to Supabase.
