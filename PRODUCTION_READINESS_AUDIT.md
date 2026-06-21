# V2.2.13 Production Readiness Audit

## Status

Build passed with `npm run build`.

## Fixes verified

- Dates now use GMT-safe date-only handling.
- Session dates are written to Supabase as GMT midday timestamps/date-compatible values.
- Calendar view uses GMT/date-only comparison to avoid +1 day display shifts.
- Local diary, saved workouts and logs are reset once for a clean programme start.
- Remote historical sessions/workouts created before this patch are ignored by a clean-start cutoff.
- Admin Console now includes deletion controls for diary events/classes and saved workouts.

## Notes

Supabase deletion requires delete RLS policies. A helper SQL file is included:

`supabase/schema_v2213_delete_policies.sql`

Run this if delete actions do not remove remote Supabase rows.
