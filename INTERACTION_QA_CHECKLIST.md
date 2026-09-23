# V4.0.2 Interaction QA Checklist

Run these checks before publishing to Netlify.

## Controlled sync
- [ ] Sign in and confirm the header briefly shows **Syncing…** once.
- [ ] Leave the app open for 1–2 minutes and confirm it does not continuously return to **Syncing…**.
- [ ] Press the cloud Sync control and confirm it performs one refresh.
- [ ] Navigate between Home, Calendar, Nutrition and Progress and confirm navigation alone does not trigger repeated syncing.

## Workout completion
- [ ] Open an assigned workout.
- [ ] Enter reps / weight and press **Save exercise log**.
- [ ] Confirm the exercise collapses immediately.
- [ ] Reopen it and confirm the UI remains usable.
- [ ] Press **Mark complete only** on another exercise and confirm immediate collapse.
- [ ] Press **Mark session completed** and confirm immediate return to Dashboard.

## Calendar
- [ ] Add a session from Training Calendar and confirm it appears immediately on the selected date.
- [ ] Add a saved workout from Workout Builder and confirm it appears immediately in the diary.
- [ ] Add an FMA class and confirm it appears immediately.

## Nutrition
- [ ] Add a meal and confirm it appears immediately in Meals & Entries.
- [ ] Add 250 ml water and then add the hydration entry.
- [ ] Change daily targets and save them.

## Cross-device
- [ ] On Alex's device, assign a test workout to James.
- [ ] On James's device, press **Sync** (or reopen/refresh the app).
- [ ] Confirm the new session appears without logging out.
