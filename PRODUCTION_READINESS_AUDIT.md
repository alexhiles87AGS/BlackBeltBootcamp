# BlackBeltBootcamp V2.2.12 Local Calendar Date Fix

This package builds on V2.2.11 and fixes the calendar date offset issue where sessions assigned on iPhone/UK time could appear one day later in the athlete diary. Calendar day matching now uses local YYYY-MM-DD dates rather than UTC conversion.

# Production Readiness Audit — V2.2.11

## Build status

Production build completed successfully with `npm run build`.

## Change scope

This is a focused behavioural patch only. It does not alter the exercise library, FMA class session model, dashboard layout, or workout assignment structure from V2.2.10.

## Fixes added

1. Exercise cards collapse after the athlete saves an exercise log.
2. Exercise cards also collapse when the athlete uses Mark Complete Only.
3. Collapsed exercises show a saved confirmation and can be reopened.
4. Mark Session Completed closes the workout session and returns the athlete to Dashboard.
5. Session status update is attempted in Supabase for remotely assigned sessions.

## Supabase

No schema changes are required.
