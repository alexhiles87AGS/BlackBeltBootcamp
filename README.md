# BlackBeltBootcamp V4.0

BlackBeltBootcamp V4 is the major mobile-first upgrade of the existing React/Vite/Netlify/Supabase training platform for Alex and James Hiles.

## What is new in V4

### Mobile-first visual overhaul

- New premium dark navy/teal design system.
- Cleaner iPhone-optimised top bar, profile chip, drawer menu and bottom navigation.
- Athlete-focused dashboard rather than a feature directory.
- Responsive training calendar, workout builder, nutrition and progress views.
- Five UI preview images are included in `docs/v4-ui-previews/`.

### Live cloud refresh

- Refreshes cloud data on login and when the relevant page opens.
- Refreshes when the browser/app regains focus or comes back online.
- Supabase Realtime subscriptions refresh assignments, sessions, workout logs, metrics, achievements, settings and nutrition records.
- Manual cloud refresh control and a visible last-synced indicator remain available.

### Workout Builder

- Preview an exercise and its video before adding it to a draft workout.
- Filter by body area and target muscle.
- Prevent accidental duplicate additions.
- Reorder draft exercises before saving.
- Edit sets, reps and planned weight.
- Retains saved workout editing, athlete-specific copies and calendar assignment.

### Nutrition tracking

- Athlete-specific daily targets for calories, protein, carbohydrates, fats and water.
- Meal categories for breakfast, lunch, dinner, snacks and hydration.
- Add and remove entries throughout the day.
- Daily totals and remaining-target dashboard.
- Cloud persistence across devices.

### Progress and strength analytics

- Body-weight trend over week/month/three-month ranges.
- Per-exercise working-weight history.
- Estimated one-rep max using the Epley calculation from completed sets.
- Recent sets, personal-record summaries and volume lifted.
- Dashboard achievements remain ordered by nearest completion.

### Retained V3 capabilities

- Supabase Auth, password reset and protected roles.
- Cross-device athlete profiles, programmes, sessions and workout logs.
- Admin athlete creation and invitation workflow.
- Admin athlete review, workout results and diary controls.
- FMA class sessions, badge manager, exercise importer and video library.

## Local setup

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Environment variables

Create `.env` locally and set the same values in Netlify:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

## Required V4 database update

Run this file once in Supabase SQL Editor after the existing V3 schema is in place:

```text
supabase/schema_v4_major_update.sql
```

It creates nutrition tables, RLS policies, indexes and Realtime publication entries.

## Athlete invitation function

For secure in-app creation of new Auth users, deploy:

```text
supabase/functions/invite-athlete/index.ts
```

Instructions are in `V4_DEPLOYMENT_GUIDE.md`.

## Notes

- Supabase is the source of truth; local storage is retained only as a fast cache/resilience layer.
- Existing exercises and videos are not re-imported or reset by this update.
- V4 does not deliberately wipe programmes, sessions, logs, profiles or achievement data.

## V4.0.1 iPhone optimisation patch

This package includes the focused V4.0.1 mobile visual patch requested after real-device testing:

- Training Calendar now fits a narrow iPhone viewport without pushing the seven-day strip outside the frame.
- Calendar session cards, selected-day heading and Add Session form are constrained to the available width.
- Workout Builder exercise picker, draft fields, action controls and saved-workout scheduler now use mobile-safe layouts and natural page scrolling.
- The top hamburger control, brand and compact profile/sync controls are aligned for iPhone safe areas.
- The drawer profile text truncates cleanly instead of overflowing its container.
- The drawer navigation is independently scrollable, so Admin Console and Exercise Import remain reachable on short screens.
- The top hamburger and bottom More button now open the same consistent, viewport-safe drawer.

No Supabase migration is required for V4.0.1. This is a visual and navigation patch only.

## V4.0.2 interaction and sync patch

V4.0.2 keeps the V4.0.1 iPhone layout patch and changes the interaction model so important actions respond immediately rather than waiting for a Supabase round trip.

Cloud reads are now controlled: the app refreshes once on authenticated open/refresh and when the user presses the Sync control. Saves still write to Supabase, so a second device can retrieve the new data by reopening/refreshing or pressing Sync.

See `CHANGELOG_V4_0_2.md` and `INTERACTION_QA_CHECKLIST.md` before deployment.
