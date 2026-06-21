# BlackBeltBootcamp V2.2.11 — Completion Flow Fix

Focused patch built on top of V2.2.10 Remote Assignment + Calendar Fix.

## Included changes

- Keeps the V2.2.10 remote workout assignment and current/next week calendar fixes.
- On the complete workout screen, saving an exercise log collapses that exercise card into a compact saved state.
- Mark Complete Only also collapses that exercise card.
- The saved exercise card can be reopened if the athlete needs to amend it before finishing the session.
- When the athlete selects Mark Session Completed, the session is closed and the app returns to the Dashboard.
- Session completion status is also pushed to Supabase when the session has a remote session ID.

## Unchanged

- Exercise Library remains unchanged.
- Today’s Training layout remains unchanged apart from the linked completion flow behaviour.
- FMA class-session behaviour remains unchanged.
- Workout assignment/sync behaviour from V2.2.10 is retained.

## Deployment

```bash
npm install
npm run build
git add .
git commit -m "Polish workout completion flow"
git push
```

No new Supabase SQL is required for this patch.
