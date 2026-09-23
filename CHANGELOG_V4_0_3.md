# BlackBeltBootcamp V4.0.3 — Focused UI Cleanup

This release deliberately makes only three requested interface changes on top of V4.0.2.

## Changes

### Drawer athlete identity
- Keeps the initials/avatar circle fully inside the athlete identity card.
- Constrains the name, email and profile type to the available width.
- Keeps the chevron inside the card on narrow iPhone screens.

### Training Calendar
- Removes the duplicate larger session preview card below the compact selected-day session card.
- The compact session card remains the single route for opening a scheduled session.

### Workout Builder
- Removes the horizontally scrolling body-area pill selector.
- Uses a Body Area dropdown instead.
- Retains the Muscle / Target dropdown and exercise search.
- No changes to exercise preview, draft ordering, saving or scheduling behaviour.

## Unchanged
- V4.0.2 interaction fixes and controlled cloud sync.
- Dashboard, Today, Exercise Library, FMA Classes, Nutrition, Progress and Achievements.
- Supabase schema and authentication.

No Supabase SQL migration is required for V4.0.3.
