# BlackBeltBootcamp V2.2.14 — Achievement Manager

This package builds on the final working V2.2.13 app and adds the Admin Console Achievement Manager.

## Included

- Achievement Manager added to Admin Console.
- Create, edit, deactivate and delete badges from the app.
- Fixed achievement type list so counters work automatically.
- Badges can sync to Supabase when the `badges` table and policies allow insert/update/delete.
- Local fallback remains available if Supabase badge write is blocked.
- Existing workout assignment, GMT calendar, clean-start and admin deletion fixes retained.

## Deployment

```bash
npm install
npm run build
git add .
git commit -m "Add admin achievement manager"
git push
```

## Optional Supabase SQL

Run `supabase/schema_v2214_badge_manager.sql` only if Achievement Manager changes do not persist to Supabase.


## V3.0.1 Badge + Weight Preference Patch

- Achievement Manager now treats Supabase as the source of truth, including inactive achievements, so deleted/deactivated badges should not immediately reappear from local seed data.
- Deleted badges are tombstoned locally to stop old seeded badges returning.
- Body weight can now be entered/displayed in kilograms or stone/pounds as a profile preference.
- Optional SQL: `supabase/schema_v301_badges_weight_preferences.sql` adds the `weight_unit` profile column and refreshes badge RLS/delete/update policies.
