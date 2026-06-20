# BlackBeltBootcamp V2

Supabase-first training platform for James's gym, MMA/BJJ, footwork, flexibility and FMA training.

## Deploy

```bash
npm install
npm run build
git add .
git commit -m "Install BlackBeltBootcamp V2"
git push
```

Netlify:
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `20`

Environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase setup

1. Open Supabase SQL Editor.
2. Run `supabase/schema_v2.sql`.
3. Confirm Storage bucket `exercise-videos` is public.
4. Open the app > Admin > Exercise Import.
5. Click **Load catalogue**, then **Import catalogue to Supabase**.

## Video paths

The V2 importer removes the local parent folder `Structured Workouts/` automatically and stores paths like:

`100 Gym Female/upper legs/glutes/strength/intermediate/1262 - barbell kickback.mp4`

The video player opens videos inside the app in a modal.


## V2.1.1 QA Polish

This package adds a user-focused dashboard, tighter exercise cards, and ensures written exercise instructions and descriptions stay inside the expandable Instructions tab. It keeps the body-part-first workout builder and Supabase-backed exercise catalogue from V2.1.

Production note: the schema still includes development-friendly RLS policies for rapid setup. Before sharing beyond family/friends, replace those policies with authenticated admin/coach/athlete policies.
