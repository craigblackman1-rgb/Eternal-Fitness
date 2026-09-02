# Lane: BUG-EF-107 (high) — a note added to a workout on mobile does not stay on the workout

**WO:** wo-ef-full-grind-2026-09-02 · Model: opencode-go/mimo-v2.5 · branch `lane/ef-mobile-notes`

## Defect (reported live by Craig, 2026-09-02, during Nathan Wadey's session)
Esther added a note to a workout via the mobile app. It IS saved — it appears on the client profile —
but it does NOT remain visible against the workout it was written on. She was left unsure whether it
had saved at all. The cost is confidence: a trainer who cannot see her own note where she wrote it will
re-enter it or stop trusting the feature mid-session.

## Hypothesis to confirm or disprove FIRST — do not assume it
CR-EF-098 pooled per-exercise notes into a merged profile Notes view (`lib/exercise-notes.ts`). There are
two separate stores: the `client_notes` table (which has a nullable `session_id`) and
`sessions.data.exercise_notes`. If the mobile write lands in `client_notes` WITHOUT setting `session_id`,
while the workout view reads session-scoped notes, that produces exactly this symptom. Verify which
store the mobile add-note path writes to and which the workout view reads, then fix the mismatch so a
note written on a workout is readable back on that workout.

Reproduce against Nathan Wadey.

## Files
The mobile note path under `app/hub/m/`, `lib/exercise-notes.ts`, and the relevant note API route.

## FORBIDDEN
The block detail pages, the Outlook schedule pages, `components/hub/ClientBookingPanel.tsx`,
`lib/outlook-bookings.ts`, `lib/session-pot.ts` — other lanes own those. No dev server, browser, or install.
A migration is allowed ONLY if the fix genuinely requires a column; say so loudly if you add one.

## VERIFY
State plainly which store is written and which is read, before and after. Do not claim the note now
persists — you cannot run the app; Claude will drive it.

## COMMIT — DO NOT SKIP
`git add -A && git commit -m "BUG-EF-107: a note written on a workout is readable back on that workout"`
Do not push.
