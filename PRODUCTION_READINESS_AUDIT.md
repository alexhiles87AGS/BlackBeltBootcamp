# Production Readiness Audit — V2.2.14 Achievement Manager

Build target: private beta for Alex Hiles and James Hiles.

## Added in this patch

- Admin Console Achievement Manager.
- Supported achievement counters only, so badge progress can be calculated reliably.
- Supabase badge sync with local fallback.
- Optional RLS/policy SQL for remote badge management.

## Retained

- GMT/date-safe calendar logic.
- Workout assignment to athlete profiles.
- Workout completion flow.
- Admin diary and deletion tools.
- FMA class-session behaviour.


## V3.0.1 Badge + Weight Preference Patch

- Achievement Manager now treats Supabase as the source of truth, including inactive achievements, so deleted/deactivated badges should not immediately reappear from local seed data.
- Deleted badges are tombstoned locally to stop old seeded badges returning.
- Body weight can now be entered/displayed in kilograms or stone/pounds as a profile preference.
- Optional SQL: `supabase/schema_v301_badges_weight_preferences.sql` adds the `weight_unit` profile column and refreshes badge RLS/delete/update policies.
