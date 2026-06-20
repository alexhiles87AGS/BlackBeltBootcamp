# BlackBeltBootcamp V2.2

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
