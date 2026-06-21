# Production Readiness Audit — V2.2.9

## Status

Build tested successfully with `npm run build`.

## Fixed in this patch

- Workout assignment target mismatch.
- Duplicate/local profile confusion by continuing canonical Alex and James profiles.
- Admin assignment pick list now includes both Alex Hiles and James Hiles.
- Athlete self-scheduling from Workout Builder.
- Saved workout viewing and editing.
- Supabase sync for training sessions and programme assignments where the existing V2.2 schema is present.
- Quick Exercise Completion remains removed from Today's Training.

## Remaining future hardening

- Replace local fallback login with full Supabase Auth-only login.
- Tighten RLS policies before wider public use.
- Add automated tests for assignment and calendar visibility.
