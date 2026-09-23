# BlackBeltBootcamp V4.0.2 — Interaction & Controlled Sync Fix

This patch is built on top of V4.0.1 and keeps the iPhone layout improvements intact.

## Interaction fixes
- Exercise logging is now optimistic: tapping **Save exercise log** immediately collapses the exercise and records the local result while the cloud write completes.
- **Mark complete only** now responds immediately and collapses the exercise.
- **Mark session completed** now closes the workout immediately and returns to the dashboard without waiting on a network round trip.
- Training Calendar **Add to calendar** now inserts the session immediately and shows a clear save/sync status.
- Workout Builder **Add to calendar** now inserts the session immediately and confirms whether the cloud save completed.
- FMA **Add class to calendar** now inserts immediately and reports cloud-save status.
- Nutrition targets and meal entries update immediately, then persist to Supabase.
- Admin workout assignment now appears immediately on the assigning device and reports whether the remote assignment was confirmed.
- Mobile buttons use `touch-action: manipulation` for more reliable iPhone taps.

## Sync behaviour
The V4.0 realtime/page/focus refresh loop has been removed from the client.

The app now performs a cloud read:
1. once when the authenticated user opens or refreshes the app; and
2. when the user explicitly presses the cloud **Sync** control.

Normal save actions still write to Supabase. Other devices see those changes the next time they open/refresh the app or press Sync.

This prevents background reads from repeatedly resetting an in-progress form or making a successful button press appear to do nothing.

## Database
No new Supabase SQL migration is required for V4.0.2.
