# Lane: BUG-EF-111 — copied sessions must NOT share exercise uids

**WO:** wo-ef-full-grind-2026-09-02 · Model: opencode-go/mimo-v2.5 · branch `lane/ef-bug111-uids`

## Defect (confirmed on production data, not inferred)

Emma Atkinson block 2: sessions 2 and 4 (both "Workout A", 13 exercises) share all 13 exercise `uid`
values; sessions 1 and 3 (both "Workout B", 9 exercises) share all 9. 22 duplicated uids in one block.

`set_logs` rows are keyed on `exercise_uid` (see `lib/session-sets.ts`, migration
`db/migrations/20260811_exercise_uid.sql`). When two sessions share a uid, a set logged in one session
can surface as the other session's history and corrupt PB / last-session prefill (CR-EF-100).

**Cause:** when a session is created by copying another session's `data` (the rotation reuses the
same workout, clone, template assign, sub-session attach), the exercise `uid` values inside
`sessions.data.versions.{studio,home}.{warm_up,main_block,cooldown}[]` are copied verbatim instead of
being regenerated.

## Your job — CODE ONLY, no data writes, no migration, no scripts that touch the DB

`lib/exercise-ref.ts` already exports `ensureUids(exercises, { forceNew: true })` which regenerates
every uid. Use it (or an equivalent helper in the same file) at **every** server-side path that
creates a new session row by copying exercise content from an existing session or template. Known
candidates — trace each one, and grep for any others (`data:` inserts into `sessions`):

- `app/api/sessions/[id]/clone/route.ts` (explicit clone — `clonedData`)
- `app/api/blocks/[id]/sessions/route.ts` (two inserts around lines 138 and 175)
- `app/api/clients/[id]/add-workout/route.ts` (inserts around lines 276 and 306 — clone-from-block and template routes)
- `lib/supplementary-attach.ts` (CR-EF-125 auto-attach copies a supplementary workout)
- `lib/outlook-bookings.ts` ~line 284 (session created on confirm — check whether it copies content)
- `app/api/claude/generate-block/route.ts` / `lib/planGeneration.ts` (block generation: each session
  in a rotation must get its own uids even when the workout is identical)
- `app/api/sessions/[id]/route.ts` line ~172 already calls `ensureUids` WITHOUT forceNew on save —
  that is correct for edits (keeps existing uids); do not change it.

Rule: a uid is regenerated when content is **copied into a new session**; it is preserved when an
existing session is **edited**. Sub-session (`parent_session_id`) attach counts as a copy.

Also: `SessionEditor.tsx` line ~479 already uses `forceNew: true` for a client-side "roll forward" —
leave it.

## FORBIDDEN
- Any DB write, script, or migration. No data backfill (Claude owns that, separately).
- Any file under `app/hub/(protected)/clients/[id]/blocks/[blockId]/` (another lane owns it),
  `components/hub/ClientBookingPanel.tsx`, `app/hub/(protected)/schedule/**`.
- No dev server, no browser, no `pnpm install`.

## VERIFY
1. List every insert path you changed, file:line, and state which helper regenerates the uids.
2. State explicitly any copy path you found and deliberately did NOT change, and why.
3. `npx tsc --noEmit` if the toolchain is available; if not, say so plainly — never claim it passed.
4. Run the existing unit test if vitest is available: `npx vitest run lib/__tests__/exercise-ref.test.ts`.

## COMMIT — DO NOT SKIP (five lanes today edited correctly then exited without committing)
`git add -A && git commit -m "BUG-EF-111: regenerate exercise uids whenever session content is copied into a new session"`
Do not push.
