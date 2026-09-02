# OpenCode lane brief — L1 shared prescription/grouping/units refactor
2026-08-10 · one lane, this worktree, sequential units

**Read this whole file before touching anything.**

## Why this exists

This is Lane 1 (`L1`) of `wo-eternalfitness-hub-mobile-session-pwa-2026-08-10`
(full Work Order: `.context/workorder-eternalfitness-hub-mobile-session-pwa-2026-08-10.md` — skim
its "L1" section for context, but this brief is self-contained and is the authority on scope).

Four different files each have their own copy of the same prescription-parsing and
exercise-grouping logic — `isTimeBased`, `parsePrescribedSeconds`, `parsePrescribedReps`,
and a superset-grouping walk. One copy (the client portal's) has actually drifted: it's
missing a parameter the others have, so it silently ignores data the hub screen honours.
This lane collapses all of them into three new shared modules under `lib/`, with **zero
intended behaviour change except the one drift fix**, which must be called out on its own
in the final commit message, separate from the mechanical moves.

This refactor has to land before two later lanes (uid stability, and a new mobile
session screen) touch the same code paths — doing it now means those lanes edit
one shared function instead of writing a fifth copy.

## Hard scope boundary — read this twice

**Do not touch anything related to `exercise_ref`, `exerciseRefKey`, or `parseExerciseName`.**
Those are explicitly out of scope for this lane — they belong to a *later* lane (uid
stability) that hasn't run yet and will introduce a new `lib/exercise-ref.ts` module. If
you see `exerciseRefKey` in `LiveSessionLog.tsx` or `parseExerciseName` in `lib/progress.ts`,
leave them exactly as they are, byte for byte. Moving them now would either collide with
or pre-empt work that isn't scoped yet — this is not an oversight, it's a deliberate boundary.

**Do not touch `withUids`/`stripUids` in `SessionEditor.tsx`.** Same reason — they become
persistent in the later uid-stability lane, not this one.

## Scope — three new modules, then the call-site collapse

### 1. `lib/prescription.ts` — new file

Pure functions, no DB/React imports:

```ts
export function isTimeBased(reps: string, logType?: 'reps' | 'time'): boolean
export function parsePrescribedSeconds(reps: string): number | null
export function parsePrescribedReps(reps: string): number | null
export function parseRestSeconds(rest: string): number | null   // NEW
export function formatPrescription(ex: Exercise): string        // NEW
```

- `isTimeBased`/`parsePrescribedSeconds`/`parsePrescribedReps`: lift the existing
  implementations verbatim from `app/hub/log/[sessionId]/LiveSessionLog.tsx` (currently
  named `isTimeBased`, `parsePrescribedSeconds`, `parsePrescribedReps` near the top of that
  file, alongside a `computeBlocks` function and a dead `parseLeadingNumber`). Do not change
  their logic — just relocate and export.
- `parseRestSeconds(rest: string): number | null` — new. Parses the free-text `rest` field
  the same style as `parsePrescribedSeconds` parses `reps`: handle `"60s"`, `"90 sec"`,
  `"2 min"`/`"2 mins"`/`"2 minutes"` (convert to seconds), `"60-90s"` (a range — return the
  **upper** bound), and `"—"` / `""` / unparseable → `null`. This feeds a rest-timer UI in a
  later lane; get the parsing right, it isn't cosmetic.
- `formatPrescription(ex: Exercise): string` — new. There is a "3 × 10 @ tempo 2-0-2 · 60s
  rest"-style string built inline in at least two places in
  `app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/page.tsx` (search
  for the pattern `× ' + ... + ' @ tempo'` or similar string concatenation building sets ×
  reps + tempo + rest into one display string). Extract the exact existing format into this
  function and call it from both places — don't invent a new format, just deduplicate the
  existing one.

### 2. `lib/exercise-groups.ts` — new file

```ts
export interface ExerciseGroup<T> {
  type: 'group' | 'single';
  label?: string;        // only present when type === 'group'
  items: T[];
  indices: number[];     // original positions in the input list
}

export function computeGroups<T extends { group_label?: string | null }>(
  list: T[],
  opts?: { allowGroups?: boolean }
): ExerciseGroup<T>[]

export function normalizeGroups<T extends { group_label?: string | null }>(
  list: T[]
): { list: T[]; dissolved: string[] }

export function nextGroupLabel<T extends { group_label?: string | null }>(
  list: T[]
): string   // NEW
```

- `computeGroups`: there are **three** existing near-duplicate implementations of "walk a
  list, group consecutive items sharing the same `group_label`" —
  `app/hub/log/[sessionId]/LiveSessionLog.tsx` (`computeBlocks`),
  `app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/SessionEditor.tsx`
  (`computeBlocks`, takes an `allowGroups` flag), and `components/hub/PrescriptionTable.tsx`
  (`groupExercises`/`isSuperset`). Write **one** generic version whose output shape is a
  superset of what all three current implementations need: each existing call site should be
  able to derive its old return shape from `computeGroups`'s output without behaviour change.
  A group of size 1 (an orphaned `group_label`) should resolve to `{ type: 'single', items:
  [item], indices: [i] }`, matching the existing "dissolve a lone group" behaviour already
  present in at least one of the three originals.
- `normalizeGroups`: lift the existing auto-dissolve-orphans logic from `SessionEditor.tsx`
  (currently called `normalizeGroupsList` or similar — grep for it). **Make it pure** — the
  original has a toast side-effect baked in; this version must not touch the DOM or call any
  UI function. Instead return `{ list, dissolved }` where `dissolved` is the list of group
  labels that got dissolved, so the caller (still in `SessionEditor.tsx`) can decide to toast
  using that return value. Update the `SessionEditor.tsx` call site to do the toast itself
  based on `dissolved`, preserving the exact same user-visible toast behaviour as today.
- `nextGroupLabel` — new. Scans a list for `group_label` values already in use and returns
  the next free letter from `"ABCDEFGH"` (8 letters is enough — if you need a fallback for a
  9th, use `"I"` onward, don't hard-crash). Must support being handed a selection of **3 or
  more** exercises to group at once, not just pairs — there is no pairwise limit anywhere in
  this function's contract.

### 3. `lib/units.ts` — new file

```ts
export const LB_TO_KG = 0.45359237;
export function toKg(value: number, unit: 'kg' | 'lb'): number
export function fromKg(valueKg: number, unit: 'kg' | 'lb'): number
export function formatWeight(valueKg: number, unit: 'kg' | 'lb'): string
```

- `LB_TO_KG` currently lives in `lib/calorie-calculator.ts`. Move the constant here, then
  have `lib/calorie-calculator.ts` do `export { LB_TO_KG } from './units';` so nothing that
  currently imports it from `calorie-calculator.ts` breaks.
- `toKg`/`fromKg`: trivial conversions using `LB_TO_KG`. `toKg(v, 'kg')` returns `v` unchanged;
  `toKg(v, 'lb')` returns `v * LB_TO_KG`. `fromKg` is the inverse.
- `formatWeight`: format a canonical kg value for display in the given unit, e.g.
  `formatWeight(20, 'lb')` → a sensible display string in lb (round to 1 decimal, your call
  on exact formatting — just be consistent). No call sites use this yet in this lane; it's
  being added now because a later lane needs it immediately and shouldn't have to touch this
  file again. Keep it simple and pure.

## Call-site collapse — do these after the three modules above exist and compile

For each file: import from the new modules, delete the local duplicate definition, and
**verify the app's runtime behaviour is unchanged** (same output shape, same call
signatures at each call site) — except the one deliberate fix below.

1. **`app/hub/log/[sessionId]/LiveSessionLog.tsx`**
   - Delete the local `computeBlocks`, `isTimeBased`, `parsePrescribedSeconds`,
     `parsePrescribedReps`. Import `computeGroups`, `isTimeBased`, `parsePrescribedSeconds`,
     `parsePrescribedReps` from the new modules instead.
   - **Delete `parseLeadingNumber` outright — it is dead code, never called anywhere in this
     file.** Confirm with a grep before deleting that it truly has zero call sites.
   - Leave `exerciseRefKey` untouched (see Hard scope boundary above).
   - If you find the inline `formatPrescription`-shaped string being built here too, use the
     new `formatPrescription` — but don't go hunting for it if it isn't obviously present;
     the two known locations are in `sessions/[sessionNum]/page.tsx`.

2. **`app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/page.tsx`**
   - There is a `groupExercisesWithIndex`-style function (grep for it) — replace its usage
     with `computeGroups(...).indices` from the new shared module, preserving the exact same
     data available to callers.
   - Delete the local copies of the three parse functions; import from `lib/prescription`.
   - Use `formatPrescription` at both inline-string-building locations mentioned above.

3. **`app/portal/(protected)/training/TrainingClient.tsx`**
   - Delete the local `isTimeBased`/`parsePrescribedSeconds`/`parsePrescribedReps`. Import
     from `lib/prescription`.
   - **This file's call to `isTimeBased` currently passes only the `reps` string, omitting
     the exercise's `log_type` — the hub's copy passes both.** Fix the call site to pass
     `(reps, exercise.log_type)` so the portal starts honouring `log_type` the same way the
     hub already does. This is the one intentional behaviour change in this whole lane —
     call it out as its own paragraph in the final commit message, not buried in "misc
     cleanup."

4. **`SessionEditor.tsx`**
   (`app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/SessionEditor.tsx`)
   - Replace the local `computeBlocks` with `computeGroups`.
   - Replace the local `normalizeGroupsList` (or whatever it's actually named — grep first)
     with `normalizeGroups`, and update the call site to fire the existing toast based on the
     returned `dissolved` array, preserving today's exact toast wording/behaviour.
   - **Do not touch `withUids`/`stripUids` in this file** (Hard scope boundary above).

5. **`components/hub/PrescriptionTable.tsx`**
   - Replace `groupExercises`/`isSuperset` with `computeGroups`.

6. **`lib/calorie-calculator.ts`**
   - Replace the local `LB_TO_KG` definition with a re-export from `./units` (see module 3
     above). Do not change any other function in this file.

**Do not touch `lib/progress.ts` at all in this lane** (Hard scope boundary above —
`parseExerciseName` is ref-parsing logic, out of scope here).

## Tests

Add `lib/__tests__/prescription.test.ts` covering `isTimeBased`, `parsePrescribedSeconds`,
`parsePrescribedReps`, and `parseRestSeconds` — at minimum: with and without an explicit
`logType`, a plain number (`"8-10"`), a time-based string (`"20s hold"`, `"2 min"`), a rest
range (`"60-90s"`), and an empty/dash value (`""`, `"—"`) returning `null`.

**No vitest config exists in this repo yet** — add a minimal `vitest.config.ts` at the repo
root (`test: { environment: 'node' }` is sufficient, no jsdom needed for pure functions), and
add a `"test": "vitest run"` script to `package.json`'s `scripts` block. Keep both minimal —
don't configure coverage thresholds, watch mode, or anything beyond what's needed to run this
one test file.

## Hard rules (standing, this repo)

1. Work only in this worktree
   (`D:\apps\worktrees\eternal-fitness-website\web-admin-pages-dashboard-5ccf37`,
   branch `claude/mobile-workout-features-6ddaba`). Never the shared checkout.
2. Never run a dev server, `next build`, Playwright, or any browser. Verification is
   `npx tsc --noEmit` and `npx vitest run` and reading your own diff. Live/visual checking is
   Claude's job after you hand back.
3. Never `npm install` / `pnpm install`. If `vitest`/`jsdom` aren't actually resolvable
   despite being in `package.json`'s devDependencies, that's a blocker to report, not a task
   to work around.
4. No new dependencies beyond what's already in `package.json`.
5. No DB migration in this lane. This is a pure code refactor — if you find yourself wanting
   to touch `db/migrations/`, stop, you've drifted into a later lane's scope.
6. Reuse existing types (`Exercise`, `SessionVersion` from `types/index.ts`) — don't redefine
   them in the new lib files, import them.
7. **Do not push to `main`, do not merge, do not push anywhere.** Commit to the current
   branch (`claude/mobile-workout-features-6ddaba`) only, in this worktree. One commit per
   numbered unit below is fine, or one combined commit — your call, but keep messages
   accurate to what each commit actually contains. Claude reviews and handles anything
   beyond a local commit.
8. If a call site turns out to need something outside this brief's scope, stop that unit and
   report it as a blocker — do not improvise past the Hard scope boundary above.

## Verification checklist (before considering this lane done)

```bash
npx tsc --noEmit
npx vitest run
git diff -U0 --stat
# confirm zero remaining local definitions of the moved functions:
grep -rn "function isTimeBased\|function parsePrescribedSeconds\|function parsePrescribedReps\|function computeBlocks\|function groupExercises\b" app/ components/ --include=*.tsx --include=*.ts
```
The last grep should return nothing outside the new `lib/` files.

## Report format

Append to `.context/loop-status.md` in this repo, and print the same block at the end of the
run:

```
LANE: shared-logic-refactor · BRANCH: claude/mobile-workout-features-6ddaba
UNITS DONE: <unit> (<commit sha>), ...
BLOCKERS: <unit> — <what stopped you and what you'd need>
TYPECHECK: clean | <error count>
TESTS: <pass count>/<total> | <error>
NOTE: the TrainingClient.tsx log_type fix (unit 3) is a real behaviour change — confirm you
called it out separately in your commit message(s), not folded into "refactor" generically.
```
