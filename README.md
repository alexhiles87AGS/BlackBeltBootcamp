# BlackBeltBootcamp

Production-ready Netlify + Supabase React application for James's training programme.

## Local setup
1. Install Node.js LTS.
2. Open this folder in Command Prompt.
3. Run `npm install`.
4. Create `.env` from `.env.example` and add Supabase keys.
5. Run `npm run dev`.

## Supabase setup
1. Create a Supabase project called `blackbeltbootcamp`.
2. Open `supabase/schema.sql`.
3. Paste into Supabase SQL Editor and run.
4. Enable Email authentication in Supabase Auth.
5. Create users manually in Supabase Auth for Admin/James.
6. Set roles in `profiles` table as required: `super_admin`, `coach`, `athlete`.

## Netlify setup
Build command: `npm run build`
Publish directory: `dist`
Add environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Current features
- Supabase-ready authentication with demo/local mode fallback.
- Dashboard with streaks, badges and charts.
- Pre-loaded James 12-week 4-day gym programme.
- Pre-loaded 15-minute daily footwork routine.
- Workout execution and local logging.
- Exercise directory with filters.
- Workout builder.
- FMA Chester class diary.
- Admin exercise entry and future ExerciseDB Pro import staging.
- Athlete profile, BMI and Sunday review.
- Responsive mobile-first UI for Netlify deployment.
