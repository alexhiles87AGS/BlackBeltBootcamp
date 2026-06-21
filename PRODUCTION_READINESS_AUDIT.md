# Production Readiness Audit — V2.2.5

Build tested successfully with `npm run build`.

## Scope of this patch

This is a focused UI and behaviour patch only. It preserves the working V2.2.4 app structure and assignment filtering.

## Verified changes

- Calendar now stacks day cards on mobile instead of requiring horizontal scrolling.
- Date and time inputs are constrained inside panels on iPhone/mobile widths.
- FMA class list text alignment is fixed.
- Manual FMA class type creation is available and stored locally.
- Badge counters start from zero and update from app completion data.

## Not changed

- Today’s Training.
- Exercise Library.
- Exercise video modal.
- Workout completion flow.
- Trainer-to-athlete assignment filtering.
- Supabase schema.
