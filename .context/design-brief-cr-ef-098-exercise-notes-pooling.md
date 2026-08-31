# Design brief — CR-EF-098: Pool per-exercise session notes into the client profile Notes section

**Status:** approved CR, Design stage (light mockup — same Open Design pass as CR-EF-099).
**Raised:** 2026-08-29, Craig. **WO:** wo-ef-session-save-band-notes-2026-08-29, unit u6.

## Craig's ask

> "Any notes that are saved against an exercise in a session need to be pooled into the notes on the client's profile notes section."

## Current state (explored 2026-08-29)

- Per-exercise notes live in `sessions.data.exercise_notes` (uid→text), written from both logging screens (mobile TrainScreen + desktop SessionWorkoutLog, incl. voice dictation on desktop). **Displayed nowhere except the logging screens themselves** — no read-only surface at all.
- The profile Notes section reads the `client_notes` table. Desktop and mobile renderers have diverged: desktop (`ClientNotesPanel`) shows only text + date — no session name, no author, no pin; mobile (`ClientNotesPane`) has session titles, author, pin/filter/search. `ClientModeView` still carries a dead hardcoded "Pinned note" placeholder.

## Approach (agreed in the approved plan)

Pure aggregator, no schema change: flatten `data.exercise_notes` from the client's sessions (already fetched whole on the profile page) into labeled entries — e.g. **"Band Pallof Press — Block 1 · Session 7 · 29 Aug"** — merged into the Notes list alongside `client_notes` rows. House pattern: `lib/exercise-history.ts` (pure functions, DB access stays in the server component).

## Design decisions for the mockup

1. How pooled exercise notes are distinguished from typed client notes in the list (badge/label treatment, exercise name prominence).
2. Filtering: All / Client notes / Exercise notes? (Mobile pane already has All/Pinned pills — extend that row?)
3. Desktop pane convergence: bring session titles, author, pin to desktop so both panes read identically.
4. Whether exercise notes are pinnable (they have no `client_notes` row — pin would need storage; simplest: not pinnable in v1, note it visibly in the design).
5. Remove the dead "Pinned note" placeholder panel from mobile client mode.

## Not in scope

Editing exercise notes from the profile (they belong to their session; completed sessions are read-only by design).
