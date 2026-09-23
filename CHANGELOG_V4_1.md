# BlackBeltBootcamp V4.1 — Compact Workout UX

## Home
- Replaced the large greeting hero with a compact athlete/date greeting.
- Today/next workout and weekly completion are the first two dashboard surfaces.
- Workout CTA changes between Start and Resume where appropriate.
- Reduced dashboard nutrition to the most useful at-a-glance values.
- Retained nearest-to-completion achievements and Today’s Focus.

## Focused workout mode
- One current exercise expanded at a time.
- Compact workout queue with exercise position and completion state.
- Previous logged performance shown beside the current exercise.
- Per-set reps/weight inputs with numeric mobile keyboard hints and visible kg units.
- Complete Set autosaves the exercise log.
- Completing all sets marks the exercise complete.
- Secondary Complete without numbers action retained.
- Rest timer, Next exercise and persistent Finish workout controls added.
- Finishing the session returns to Dashboard.

## Exercise Library / Builder
- Library converted from tall cards to compact rows.
- Body part, target muscle and category filtering retained.
- Added Favourites and Recent views.
- Exercise details, muscles, instructions and demo are revealed on selection.
- Duplicate names are labelled with equipment/variant information.
- Builder retains preview-before-add and reordering; numeric plan fields now request appropriate mobile keyboards.

## Nutrition
- Today summary first, then Add meal / Add water actions, then entries.
- Daily targets moved behind Edit targets.
- Recent meal shortcuts added.
- Large ring-heavy layout replaced with compact progress bars.
- Empty day states explicitly say Nothing logged yet.

## Progress
- Latest body weight/date shown compactly.
- Trend chart appears only when enough measurements exist.
- Weighted-training empty states consolidated.
- Weekly consistency used as the main consistency measure.
- Existing strength, 1RM, PR and volume views retained when data exists.

## Mobile / accessibility
- Demo modal constrained to the viewport.
- 44px minimum target sizing added to frequent controls.
- Clearer aria labels added to key close/navigation/logging controls.
- Secondary text contrast increased and decorative gradients/shadows reduced.
- Bottom More shortcut removed so hamburger navigation is the single secondary menu.

No Supabase migration is required for V4.1.
