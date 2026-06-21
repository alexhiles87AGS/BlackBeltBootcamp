# BlackBeltBootcamp V2.2.8 — Assignment/Profile/Today Fix

Focused patch applied on top of the latest V2.2.7 build.

## Included

- Removes the inactive `james@blackbeltbootcamp.app` demo/local profile from the app state on upgrade.
- Keeps the active James login as `james.hiles@blackbeltbootcamp.app`.
- Normalises any older duplicate James athlete records into one canonical `James Hiles` athlete profile.
- Repairs older assigned calendar events so James-targeted sessions point to the canonical James athlete profile.
- Strengthens the trainer-to-athlete assignment workflow so pushed workouts are immediately saved against the selected athlete ID, email and name.
- Admin Console athlete pick lists now show a single James profile.
- Removes the Quick Exercise Completion section from Today's Training.
- Retains the mobile calendar, FMA class session behaviour, exercise library, workout builder and admin diary features.

## Active local fallback logins

Admin:
- Email: `alex.hiles.ags@gmail.com`
- Password: `BlackBeltAdmin!2026`

Athlete:
- Email: `james.hiles@blackbeltbootcamp.app`
- Password: `JamesTraining!2026`

## Deploy

```bash
npm install
npm run build
git add .
git commit -m "Fix James profile assignment and remove quick completion"
git push
```

No Supabase SQL is required for this patch.
