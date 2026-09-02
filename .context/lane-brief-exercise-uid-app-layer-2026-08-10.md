# OpenCode lane brief — L2 exercise-uid application layer
2026-08-10 · one lane, this worktree, sequential units

**Read this whole file before touching anything.**

## Why this exists

This is Lane 2 (`L2`) of `wo-eternalfitness-hub-mobile-session-pwa-2026-08-10`
(`.context/workorder-eternalfitness-hub-mobile-session-pwa-2026-08-10.md`). The DB half of
L2 is already done and live: `db/migrations/20260811_exercise_uid.sql` ran successfully
against production today — every `Exercise` object inside every session's `data.versions.*.*`
JSONB now carries a persistent `uid` field (verified: 3,094/3,094 exercises across all 86
sessions), and `set_logs.exercise_uid`/`exercise_name` are backfilled (verified: 92/92 rows).

This lane is the **application code** that has to exist so that persistent `uid` actually gets
*used* and *preserved* going forward, instead of the migration's work slowly eroding as sessions
get edited. Right now nothing in the app reads or writes the new `uid` field at all.

## The one bug this lane fixes, stated plainly

`SessionEditor.tsx` already has a `_uid` concept (`EditableExercise = Exercise & { _uid: string
}`), but it is **completely disconnected from the persistent DB field** — `withUids()` mints a
random throwaway `_uid` on every call, and `stripUids()` discards it before saving. Today, if
Esther opens ANY session in the desktop editor and hits Save, the persistent `uid`s the migration
just backfilled get silently dropped from that session's data, because nothing in the save path
knows they exist. This lane connects the two.

## Hard scope boundary — read this twice

**Do not touch `app/hub/log/[sessionId]/LiveSessionLog.tsx` or `app/hub/log/[sessionId]/page.tsx`
at all.** That screen is being fully superseded by a new mobile screen in a later lane (L4) — its
`exerciseRefKey`/`list.indexOf()` positional lookups stay exactly as they are today. Retrofitting
a screen that's about to be replaced wastes effort and risks destabilising the one screen
currently in daily production use, for zero near-term benefit. L4 will consume the new `uid`
field when it builds the replacement screen from scratch.

**Do not touch `lib/progress.ts` or `parseExerciseName`.** It has its own specific tolerant
fallback behaviour (returns the whole trimmed ref if the format doesn't match "4-part", defaults
to `"Unknown exercise"` only if truly empty) and is live in production PB/trend calculations right
now. Leave it completely alone — the new module below is separate and does not need to unify with
it.

**Do not run any migration.** The schema change is already done. If you find yourself wanting to
add a column or touch `db/migrations/`, stop — that's out of scope, the work here is
TypeScript only.

## Scope — one new module, four call sites, one API route

### 1. `types/index.ts` — add one optional field

```ts
export interface Exercise {
  // ...existing fields, unchanged...
  uid?: string;   // NEW — persistent identity, set by the migration/ensureUids. Optional
                  // so nothing that constructs an Exercise object elsewhere needs to change.
}
```

Same pattern as the existing `log_type?: 'reps' | 'time'` field on this interface — optional,
no migration needed (the DB already has it via JSONB), just declare it.

### 2. `lib/exercise-ref.ts` — new file

```ts
export interface ParsedExerciseRef {
  version: string;
  section: string;
  index: number;
  name: string;
}

export function buildExerciseRef(version: string, section: string, index: number, name: string): string
export function parseExerciseRef(ref: string): ParsedExerciseRef | null

export function ensureUids<T extends { uid?: string }>(
  exercises: T[],
  opts?: { forceNew?: boolean }
): (T & { uid: string })[]
```

- `buildExerciseRef`: `` `${version}:${section}:${index}:${name}` `` — this is the exact same
  logic that exists today as `exerciseRefKey` in `LiveSessionLog.tsx` and `exerciseRefFor` in
  `app/portal/(protected)/training/TrainingClient.tsx` (which hardcodes `"home"` as the version).
  **Do not touch either of those two existing functions or their call sites** — this new export
  exists for future callers (a later lane), it does not replace anything live yet. Just implement
  it correctly and move on.
- `parseExerciseRef`: splits on `:`, requires at least 4 parts (`version`, `section`, a numeric
  `index`, and the name — which may itself contain `:` and must be rejoined, same convention as
  `lib/progress.ts`'s `parseExerciseName` uses via `parts.slice(3).join(":")`, but implemented
  fresh here — **do not import from or modify `lib/progress.ts`**, per the hard boundary above).
  Return `null` if the ref doesn't have at least 4 colon-separated parts or the index segment
  isn't a plain non-negative integer — do not guess or return a partial result.
- `ensureUids`: the core of this lane.
  - Default (no `opts`, or `opts.forceNew` falsy): **preserve** `ex.uid` if it's already a
    non-empty string; only mint a fresh `crypto.randomUUID()` when `uid` is missing or empty.
    This is for loading a session's **own** existing data — the common case, where uids should
    already be present (the migration backfilled them) and must not be replaced.
  - `opts.forceNew: true`: **always** mint a fresh `crypto.randomUUID()`, ignoring whatever `uid`
    the input exercise already has. This is for **copying** exercises from somewhere else into
    the current session (a template, a rolled-forward previous session) — reusing the source's
    uid here would create a collision between two different sessions' exercises sharing an
    identity, which is exactly the bug this whole lane exists to prevent elsewhere.
  - Pure function, no DB/React imports, works in both Node (`crypto.randomUUID` is available
    globally in the Node/Next.js runtime this app targets — same assumption `SessionEditor.tsx`
    already makes at its own `crypto.randomUUID()` call sites) and the browser.

### 3. `SessionEditor.tsx` — four call sites
(`app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/SessionEditor.tsx`)

Import `ensureUids` from `@/lib/exercise-ref`. **Keep the existing `withUids`/`stripUids`
function names and the `_uid` field name on `EditableExercise` exactly as they are** — this file
has ~15 call sites reading `e._uid` for React keys, drag state, and edit targeting (`findIndex`,
`Set` membership, etc.); renaming the field is unnecessary churn and risk. Only change what these
two functions do **internally**:

```ts
function withUids(exercises: Exercise[], opts?: { forceNew?: boolean }): EditableExercise[] {
  return ensureUids(exercises, opts).map((ex) => ({ ...ex, _uid: ex.uid }));
}

function stripUids(exercises: EditableExercise[]): Exercise[] {
  return exercises.map(({ _uid, ...rest }) => ({ ...rest, uid: _uid }));
}
```

That's the shape — adapt as needed to satisfy the type checker, but the behavioural contract is:
`withUids` without `forceNew` preserves an existing `uid`; `stripUids` now **writes the uid back**
onto the saved `Exercise` instead of discarding it (today it drops `_uid` entirely — that's the
bug).

Then fix the four call sites so `forceNew` is set correctly per context — this is the part that
actually matters, get it exactly right:

- **Initial load** (~line 133-137, `useState(() => ({ warm_up: withUids(data.warm_up ||
  []), ... }))`): this is loading **this session's own** data. Call `withUids(data.warm_up ||
  [])` with **no** `forceNew` — preserve existing uids.
- **Roll-forward result** (~line 351-355, inside `rollOverPreviousSession`, `setSections({
  warm_up: withUids(rolled.warm_up || []), ... })`): `rolled` comes from a **different, previous**
  session (`GET /api/clients/[id]/sessions/latest-completed`). Call `withUids(rolled.warm_up ||
  [], { forceNew: true })` — every exercise here must get a brand-new uid, never the source
  session's.
- **Template apply result** (~line 440-444, inside `applyTemplate`, `setSections({ warm_up:
  withUids(tmpl.data.warm_up || []), ... })`): `tmpl.data` comes from `workout_templates`, a
  completely different source with its own (or no) uids. Call `withUids(tmpl.data.warm_up || [],
  { forceNew: true })` — same reasoning as roll-forward.
- **Save** (~line 415-419, inside `handleSave`, `const updated: SessionVersion = { warm_up:
  stripUids(sections.warm_up), ... }`): no change needed here beyond `stripUids`'s new internal
  behaviour above — the call site itself stays the same, it now just produces `Exercise[]` that
  carry `uid` forward instead of losing it.

Line numbers are from this session's exploration and may have drifted slightly — grep for
`withUids(` and `stripUids(` to find the real four call sites and confirm which is which by
context (the `rolled.` / `tmpl.data.` / `data.` / `sections.` prefix on each tells you which is
which).

**Do not touch** the `addExercise` function's own `_uid: crypto.randomUUID()` (around line 305)
— that's a genuinely new exercise being added from the exercise library, never had a prior uid to
preserve, and already mints one correctly. Leave it exactly as is.

### 4. `app/api/sessions/[id]/route.ts` — server-side enforcement

This PATCH route does a blind `supabase.from("sessions").update(update)` where `update.data` may
be a full `SessionVersion`-shaped `data` object. Add a defense-in-depth pass: if `update.data` is
present in the request body, walk `update.data.versions.{home,studio}.{warm_up,main_block,
cooldown}` and run each array through `ensureUids` (no `forceNew` — preserve mode) before the
`.update()` call, so **any** write path — not just the desktop editor — leaves this session with
every exercise carrying a uid, even a client you haven't audited yet.

Concretely: import `ensureUids` from `@/lib/exercise-ref`, and before the existing `const { data,
error } = await supabase.from("sessions").update(update)...` line, if `update.data` has a
`versions` object, map over whichever `version`/`section` keys are actually present (don't
hardcode "must have all 6" — some sessions may lack a `home` version, for instance) and replace
each array with `ensureUids(arr)`. Keep this defensive and non-throwing — if `update.data` doesn't
look like the expected shape (e.g. it's some other partial update this route wasn't expecting),
leave it untouched rather than erroring the whole PATCH.

## Tests

Add `lib/__tests__/exercise-ref.test.ts` covering:
- `buildExerciseRef` round-trips with `parseExerciseRef` for a normal case and a name containing
  a colon (e.g. `"Ratio 2:1 Interval"`).
- `parseExerciseRef` returns `null` for fewer than 4 parts and for a non-numeric index segment.
- `ensureUids` without `forceNew`: preserves an existing `uid`, mints one when missing, leaves
  everything else on the object unchanged.
- `ensureUids` with `forceNew: true`: always mints a new uid even when one is already present, and
  two calls on the same input produce **different** uids each time (proves it's not memoized/
  deterministic in a way that would recreate the collision this exists to prevent).

Run `npx vitest run` before finishing — this repo now has a working `vitest.config.ts` and `"test"`
script from a prior lane; use them, don't reconfigure.

## Hard rules (standing, this repo)

1. Work only in this worktree
   (`D:\apps\worktrees\eternal-fitness-website\web-admin-pages-dashboard-5ccf37`,
   branch `claude/mobile-workout-features-6ddaba`). Never the shared checkout.
2. Never run a dev server, `next build`, Playwright, or any browser. Verification is
   `npx tsc --noEmit` and `npx vitest run` and reading your own diff.
3. Never `npm install` / `pnpm install`. No new dependencies.
4. **No DB migration, no `db/migrations/` changes of any kind** — the schema work for this
   lane is already done and live.
5. Reuse existing types (`Exercise`, `SessionVersion` from `types/index.ts`) — extend the
   `Exercise` interface in place, don't redefine it elsewhere.
6. **Do not touch** `app/hub/log/[sessionId]/LiveSessionLog.tsx`, `app/hub/log/[sessionId]/
   page.tsx`, or `lib/progress.ts` — see Hard scope boundary above.
7. Do not push to `main`, do not merge, do not push anywhere. Commit to the current branch
   (`claude/mobile-workout-features-6ddaba`) only, in this worktree.
8. If a call site turns out to need something outside this brief's scope, stop that unit and
   report it as a blocker — do not improvise past the Hard scope boundary above.

## Verification checklist (before considering this lane done)

```bash
npx tsc --noEmit
npx vitest run
git diff -U0 --stat
# confirm LiveSessionLog.tsx / page.tsx / lib/progress.ts were NOT touched:
git diff --name-only | grep -E "LiveSessionLog|log/\[sessionId\]/page|lib/progress"
```
The last command should return nothing. If it returns anything, that's a scope violation — undo
it before reporting done.

## Report format

Append to `.context/loop-status.md`, and print the same block at the end of the run:

```
LANE: exercise-uid-app-layer · BRANCH: claude/mobile-workout-features-6ddaba
UNITS DONE: <unit> (<commit sha>), ...
BLOCKERS: <unit> — <what stopped you and what you'd need>
TYPECHECK: clean | <error count>
TESTS: <pass count>/<total> | <error>
NOTE: confirm the four SessionEditor.tsx call sites got the correct forceNew value each —
initial load = preserve, roll-forward = forceNew, template apply = forceNew, save = n/a
(stripUids change only). Getting one of these backwards silently reintroduces a uid-collision
bug that's hard to notice until two exercises' logs merge.
```
