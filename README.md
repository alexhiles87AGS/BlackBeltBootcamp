# BlackBeltBootcamp V2.2.5 — Mobile Calendar, FMA Class Types and Badge Counter Fix

Focused patch built on V2.2.4 assignment filter fix.

## Changes included

- Training Calendar mobile layout changed from sideways scrolling cards to a clean stacked iPhone layout.
- Training Calendar Add Session form fixed so date/time/title controls stay inside the container.
- FMA Classes card alignment fixed, including Adult MMA text alignment.
- FMA date/time inputs and add button layout hardened for iPhone Safari.
- Added ability to manually add a new FMA class type from the FMA Classes page.
- Badge counters reset to zero by default and now calculate from real completed sessions, FMA attendance and exercise logs.
- No changes to Today’s Training, Exercise Library or workout completion flow.

## Install

Copy this package over the existing app, then run:

```bash
npm install
npm run build
git add .
git commit -m "Polish mobile calendar FMA classes and badge counters"
git push
```

No Supabase SQL is required for this patch.
