# V4.3 release and acceptance

## Scope

V4.3 retains the approved V4.2 light performance interface built from V4.1, and addresses reliability and everyday training friction. Production has not been changed during development.

- Builder actions have immediate Added feedback, a selection dock, equipment filters and prescription-preserving substitutions. Personal workout editing keeps its identity; customising an assigned coach workout creates a personal copy.
- Focused training preserves the exercise, entries, extra sets and rest deadline across navigation and refresh. Athletes can copy last-session performance, correct completed sets, adjust rest and review unfinished work before finishing. Recaps show actual completed work, effort and notes.
- Nutrition supports entry editing, favourites, recent meals and previous-day repeats. Water actions and deletion give accurate success/failure feedback.
- Per-account durable writes expose pending/error states and explicit version-conflict review. Idempotent retries and atomic programme/exercise saves prevent partial templates and duplicate replay. Server versions detect stale writes instead of silently overwriting newer work.
- Coaching overview combines completion, skipped work, effort and notes. Admin maintenance exports backups and requires typed confirmation plus an atomic server snapshot before reset; restore requires empty training tables.
- Authentication is verified before displaying cached account data. Cache, queued writes, asynchronous callbacks and drafts are scoped to the authenticated account. Plaintext seed-password fields and unused legacy local-login seed/store modules are removed. Roles come from linked Supabase profiles.
- Workout, nutrition, progress, coaching and recovery components, helpers, cache and cloud services are extracted from the monolith. Progress charts and the exercise catalogue load separately to reduce initial JavaScript.

GMT/date-only handling, manual controlled Sync, FMA attendance, achievements and real Supabase Auth are retained. Writes retry in the background; reads do not poll or refresh on focus.

### Burgundy branding refinement

The reviewed palette uses burgundy `#95122c`, deep ink `#1c0909`, white cards and neutral surfaces. A shared vector belt emblem and two-line BlackBelt / BOOTCAMP wordmark replace the generic shield branding across the header, menu and login; the browser favicon matches. Charts and selected states use burgundy too. This refinement changes presentation only. Mobile fixture checks confirm Home, workout, builder Added feedback and header fit at 390×844 and 375×667 without horizontal overflow.

## Verification completed

- Node 20: TypeScript and production Vite build.
- 53 production-code assertions: account-scoped cache, signed-out cache access, exact deletion, pending merge, GMT/DST boundaries in three timezones, rest deadlines, durable write order/restart/idempotency, account-switch suppression and storage failures.
- 36 disposable PostgreSQL assertions: migration, authenticated RLS, atomic programme rollback, version conflicts, duplicate session/exercise logging, nutrition ownership/validation, profile role protection and transactional admin snapshot/reset/restore. Historical schemas were loaded only into this ephemeral test database.
- Browser fixtures at 390×844 and 375×667: separate Alex/James views; builder Added/substitution/personal editing; set correction; previous-performance copy; extra sets and refreshed draft; elapsed rest timer; finish review and notes visible to coach after manual Sync; nutrition edit/favourite/water/exact deletion; interrupted upload surviving refresh then replaying exactly once; signed-out login despite cached data; disabled reset until typed confirmation. No production records were used or reset.
- Neither mobile viewport had horizontal document overflow. Browser checks used an injected test client outside production source; no test Auth implementation is shipped.

These checks do not substitute for live Supabase Auth, production-policy inspection, two real devices or physical iPhone Safari acceptance. Live inspection found missing nutrition tables, an obsolete workout-log session foreign key and missing logger/profile/FMA fields. The single targeted V4.3 migration now repairs those gaps without replaying historical schemas or recreating profiles. The disposable test reproduces those exact gaps and verifies repeat application. A private database-side pre-release snapshot of all 26 public tables plus schema/policy/function metadata was saved before these changes. This snapshot is an application-data recovery checkpoint inside the same project, not an external full-project disaster-recovery backup.

## Rollout order

1. Preserve a current Supabase backup and inspect the actual deployed schema, profile links and policies. Run [V4_3_PREFLIGHT.sql](V4_3_PREFLIGHT.sql) as read-only inspection. Resolve unexpected linkage, duplicate or policy findings deliberately; do not automatically delete or rename profiles. The obsolete `james@blackbeltbootcamp.app` profile must not be recreated.
2. Review and apply **only** `supabase/migration_v43_reliability.sql` once to the existing production schema. It runs in one transaction, adds version/feedback metadata, hardens programme ownership and profile identity, and installs RLS-respecting save/recovery functions. It performs no reset or historical-data deduplication. If any statement fails, roll back and investigate the actual schema before retrying.
3. Review successful Node 20 CI. Use a Netlify Deploy Preview if the existing site is linked to this repository and permits previews. Check the intended Supabase URL and public anon key in preview environment settings. A preview using production Supabase changes real data: use deliberate, identifiable acceptance records and remove them through normal app actions afterwards.
4. Verify real Auth for Alex Admin and James Athlete with their established accounts. Confirm profile links and server roles; signed-out access must show login. Do not add fallback credentials.
5. On two devices/browsers, verify James cannot read Alex's private nutrition/logs/metrics or change coach templates, profile roles or recovery snapshots. Alex's intentional coaching access remains allowed. Switch account during a slow save and confirm no previous account's state appears. Server RLS must enforce the same boundary through API requests.
6. Complete a controlled-sync cycle: Alex assigns James a workout; James receives it on authenticated open or manual Sync. James logs a set, refreshes and finishes with notes; Alex receives the outcome on manual Sync. Test airplane mode/reconnect, refresh with pending writes, and stale edits on two devices with explicit conflict review. Unsaved draft fields stay local; queued saves must not claim cloud success until acknowledged.
7. On physical iPhone Safari, test keyboard, safe areas, rest after locking/unlocking, builder feedback, scrolling, nutrition and both orientations. Check GMT dates across devices, FMA attendance bypassing the set logger, achievements and progress with existing history.
8. Review unsynced work on old V4.1 devices before cutover. Deploy the reviewed frontend after migration and acceptance, then refresh both accounts/devices. Do not merge or trigger production solely to obtain a preview.

## Recovery and limitations

- Caches and queued writes contain personal app data on that device. Keep backup exports private. Clearing browser storage removes unsent drafts/queue entries; export before troubleshooting.
- Server reset stores its recovery snapshot transactionally. Restore refuses to overwrite nonempty training tables. Verify recovery in a nonproduction environment before relying on it operationally.
- Confirmed deletes wait for server success. The durable queue covers versioned training/nutrition/profile records; catalogue content, settings, badges and deletions surface failures for explicit retry rather than silently succeeding offline.
- A stale workout draft can be opened on another device; record versions prevent silent saved-record overwrite and require review. Web Locks serialize same-origin tabs where supported; server mutation/version checks remain authoritative.
- Existing duplicate exercise logs are not deleted. New conflicting session/exercise inserts require explicit review.
- The migration versions permitted legacy/direct writes too. Frontend rollback does not remove database protections; do not drop RLS or replay historical SQL as rollback. Keep the known-good frontend deploy and Supabase backup available, and investigate database rollback separately.
- No password seed, service key, database reset, real password or test-client alias belongs in the deployed build.
