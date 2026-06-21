# BlackBeltBootcamp V2.2.1

A polished private-beta athlete training platform for James Hiles.

## Major V2.2 Changes

- App now starts with a login screen.
- Includes James demo login and Alex admin login.
- Login persists until sign out.
- Removed the role switcher and replaced it with Auth-ready user roles.
- Hamburger menu / drawer navigation replaces the permanently visible sidebar.
- Dashboard focuses on the athlete: today, next session, completion, streaks and badges.
- Weekly training calendar with clickable sessions.
- Session completion page with date selector, exercise list, demo video modal, body-part details, set/reps/weight logging and quick complete.
- Cleaner exercise cards with title case, no exercise ID shown, no link text, no empty instruction placeholder.
- Instructions/descriptions live inside the Instructions panel only.
- Body-part-first workout builder with title-cased body parts.
- FMA classes can be added to the calendar with date and time.
- Stats include exercises completed, sessions completed, streak and this-week session type counters.
- Profile fields include labels and helper text.
- Admin can create athlete demo accounts.
- Admin/coach can manually add exercises and link demo URLs.
- Missing video manager allows specific replacement URLs.
- Exercise import system retained.

## Demo Credentials

James Athlete:
- Email: james@blackbeltbootcamp.app
- Password: james123

Alex Admin:
- Email: alex@blackbeltbootcamp.app
- Password: admin123

## Install

```bash
npm install
npm run build
```

## Supabase

Run:

```text
supabase/schema_v22.sql
```

The schema is migration-safe and adds the V2.2 tables/columns without deleting your existing exercise catalogue.

## Production Note

This is now suitable for James to start using as a private beta. Before sharing publicly, complete full Supabase Auth invitations, tighter RLS role policies, and server-side user creation for admin-created athletes.


## V2.2.1 focused update

This package uses the attached V2.2 app-like build as the base and applies only the requested focused changes from the later mobile/FMA polish work:

- Cleaner, more iPhone-optimised layout and touch spacing.
- Dashboard remains athlete-first: today, next session, weekly completion, streaks and progress.
- FMA classes are treated as class sessions, not exercise workouts.
- Clicking an FMA class opens an attendance/completion screen with class date/time and attended/missed controls only.
- Exercise workout completion, library, builder, importer, admin and profile features remain on the same V2.2 structure.

No Supabase schema rerun is required for this UI/FMA behaviour update unless your live site reports a specific missing table/column error.


## V2.2.2 Final Polish

This package is based on the V2.2 app-like build and adds the final requested polish:

- Login screen no longer shows demo/admin buttons.
- Login fields are blank by default; James’s details are no longer pre-populated.
- Clean local fallback profiles are included for Alex Hiles (Admin) and James Hiles (Athlete).
- Dashboard removes BMI, fixes the weekly completion ring text and uses two-wide KPI tiles.
- Training Calendar shows current week and next week.
- Add Session and FMA class date/time forms have been cleaned up for iPhone/mobile layouts.
- Today’s Training and Exercise Library were left unchanged.
- Progress Stats KPI tiles now display two-wide and stack instead of scrolling sideways.
- Initial calendar, programme and log data is reset so Alex can build James’s schedule from scratch.

### Local fallback login profiles

Alex Hiles Admin:
- Email: alex.hiles.ags@gmail.com
- Password: BlackBeltAdmin!2026

James Hiles Athlete:
- Email: james.hiles@blackbeltbootcamp.app
- Password: JamesTraining!2026

For a fully locked-down production deployment, replace these local fallback accounts with Supabase Auth users and role metadata.


## V2.2.3 Trainer Assignment Update

This build keeps the V2.2 app-like structure and final polish, then adds the requested trainer workflow:

- Admin/coach can create a workout in the Workout Builder.
- Admin Console includes **Assign Workout To Athlete**.
- Trainer selects a saved workout, athlete profile, session date and session time.
- The workout is pushed to the selected athlete calendar.
- Athlete opens the assigned session and follows the exact exercises from the saved workout.
- FMA classes remain class sessions only and do not require sets, reps or weights.
- Upgrade migration no longer wipes existing local workouts, schedules or logs.

No Supabase SQL rerun is required for this UI/workflow update.
