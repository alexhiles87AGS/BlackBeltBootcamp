# Production Readiness Audit — BlackBeltBootcamp V4.0

## Validation completed

- TypeScript/JSX source validation completed with strict syntax/module stubs.
- Existing V3 cloud/Auth architecture retained.
- Portable npm lockfile URLs restored to the public npm registry.
- V4 schema is written to be repeatable where practical.
- Nutrition RLS policies restrict athlete records to the owner or an app admin.
- Realtime subscriptions and lifecycle refresh paths are implemented.
- Mobile responsive rules cover dashboard, calendar, builder, nutrition and progress views.

## Deployment requirements

- Run `supabase/schema_v4_major_update.sql` after the V3 cloud/Auth schema.
- Confirm Alex and James `athlete_profiles.auth_user_id` values are linked to `auth.users`.
- Deploy the `invite-athlete` Edge Function for secure admin-created Auth invitations.
- Preserve only the publishable/anon key in the browser; never expose the service-role key.
- Run `npm install` and `npm run build` in the deployment environment.

## Manual acceptance testing still required

- iPhone Safari and Android Chrome layouts.
- Realtime assignment arrival on a second logged-in device.
- RLS separation with at least two athlete test accounts.
- Password-reset redirect behaviour on the production domain.
- Nutrition persistence and deletion across devices.
- Weighted-set logs, 1RM calculations and chart behaviour with real workout data.
- Edge Function invitation email and new-athlete onboarding.

## Scope note

V4 is designed as a production-capable family/private-coaching release. Wider commercial use should additionally include automated end-to-end tests, error telemetry, database backups, consent/privacy notices, rate limiting and a formal data-retention policy.
