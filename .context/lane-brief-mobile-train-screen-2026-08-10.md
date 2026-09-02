# OpenCode lane brief — L4-2 mobile Train screen (view + log)
2026-08-10 · one lane, this worktree, sequential units

**Read this whole file before touching anything.**

## Why this exists

Second unit of L4 (`wo-eternalfitness-hub-mobile-session-pwa-2026-08-10`,
`.context/workorder-eternalfitness-hub-mobile-session-pwa-2026-08-10.md`). This is **the actual
deliverable Craig asked for** — a real session Esther can open on her phone and log. Lane 1 built
the mobile shell and Today screen (`app/hub/m/page.tsx`, `components/hub/MobileShell.tsx`) and a
`/hub/m/train` stub; this lane replaces that stub with the real screen at
`/hub/m/train/[sessionId]`.

The approved mockup is `D:\apps\design-systems\ef-control-hub\hub-m-train.html` — **read it in
full before writing any code, including its embedded `<script>`.** It has already been through two
rounds of correction this session (tap-target sizing fixed to 44px minimum; the superset rendering
was restructured from "all of exercise A's sets then all of exercise B's" to genuine round-by-round
interleaving with one shared rest control per round) — build against the file **as it exists on
disk right now**, not against any earlier description of it you might infer from context.

## Scope boundary for THIS lane — read this twice

This lane builds the **view + log** surface: reading the prescription, logging sets, the rest
timer, RPE/fatigue/notes, marking complete. It does **not** build:

- **Structural editing** (add exercise, add a set to the *prescription* count, create a new
  superset, add from a previous workout or a template) — that's the mid-session edit sheet
  (`hub-m-train-edit.html`), a **separate, later lane**. Where the mockup shows an "Edit workout"
  entry point, wire the link/button to navigate there but the destination doesn't need to exist yet
  (link to `/hub/m/train/${sessionId}/edit` — fine if it 404s for now, or stub it with one line
  like the Lane 1 stubs).
- **Concurrency / conflict handling** (the `rev` counter, 409 handling, the desktop lock banner) —
  separate lane. Just write normally; nothing about this lane needs to know a conflict is possible.
- **Offline** — separate lane (L5). This screen assumes a live connection; don't add any queueing.

**Do build "add a SET" (not add a prescription exercise)** — the mockup's "Add set" affordance
under each exercise (bumping e.g. 3 sets to 4 mid-session) is core to the view+log surface per
Craig's own explicit ask, and it's a small, self-contained addition, not structural editing in the
"add exercise/template/superset-create" sense above.

## The three real bugs this lane fixes

Read `app/hub/log/[sessionId]/LiveSessionLog.tsx` and `app/hub/log/[sessionId]/page.tsx` in full —
that's the existing desktop-adjacent live log screen this one supersedes, and it's the base for
almost everything here (API contracts, data shapes, the exact save-set-log flow). Three known,
real, currently-live bugs in it, all of which this new screen must fix rather than carry forward:

1. **Per-exercise notes are never persisted.** `handleNoteInput` (~line 334) writes only to local
   React state (`exStates[ref].note`); nothing in `handleComplete` (~line 342) or anywhere else
   ever sends it to the server. A note Esther types today is silently lost on unmount. Fix: notes
   go to `sessions.data.exercise_notes: Record<uid, string>` (a new field on the JSONB, no
   migration needed — same additive pattern as `Exercise.log_type`/`Exercise.uid`), saved via the
   same PATCH `/api/sessions/[id]` route the complete-flow already uses, on an ~800ms debounce
   after typing stops (not on every keystroke). Keyed by the exercise's persistent `uid`
   (`lib/exercise-ref.ts`'s `ensureUids` already guarantees every exercise has one — see below),
   **not** by `exercise_ref`, since a note keyed by position would misattribute after any reorder.
2. **`version` is hardcoded to `"studio"`** (~line 81: `const version = "studio";`). This means a
   home-training client's session can never be logged from this screen. Fix: read
   `clients.delivery_mode` (`'studio_1to1' | 'home_training'`, already on the `clients` table —
   check `db/migrations/20260725_session_set_logs.sql` for the exact column) and use
   `'home'` when `delivery_mode === 'home_training'`, else `'studio'`. You'll need to fetch the
   client's `delivery_mode` in the server component (`app/hub/m/train/[sessionId]/page.tsx`) the
   same way `app/hub/m/page.tsx` already fetches `clients` — reuse that query shape.
3. **No `started_at` is ever written**, so there's no way to know a session is "in progress." Fix:
   on this screen's first mount (or on the first set logged — your call, either is defensible, but
   document which you picked), if `data.session_log?.started_at` is not already set, PATCH it in.
   This is what makes the "In progress" pill Lane 1 already wired on the Today screen
   (`app/hub/m/TodayScreen.tsx`, reads `entry.sessionLogStartedAt`) actually light up — **that pill
   is dead code until this lane writes the field it reads.**

## Data model — what's already there vs. what's new

Already real and working (reuse, don't rebuild):
- `GET/POST/PATCH /api/sessions/[id]/set-logs` — exact contract in `LiveSessionLog.tsx`'s
  `saveSetLog` (~line 211): `POST` when no existing log for that `exercise_ref`+`set_number`,
  `PATCH` (with `{id, ...}`) when one exists. Body: `{reps, weight_kg, duration_seconds, completed}`
  (plus `exercise_ref`/`set_number` on POST). Response includes `is_new_pb` — render the same "New
  PB" pill the mockup already has a slot for.
- `PATCH /api/sessions/[id]` with `{data: {...}}` — whole-blob write, already used by the complete
  flow. Use this same route for the `exercise_notes` debounced save and the `started_at` write —
  don't invent a new endpoint.
- `lib/exercise-ref.ts` — `ensureUids` (L2, already shipped). The session's exercises **already
  have a persistent `uid`** on every `Exercise` object (migration ran 2026-08-10, verified
  3,094/3,094 coverage) — use `exercise.uid` as your React key and as the key into
  `exercise_notes`, not `exercise_ref`/array-index like the old screen does.
- `lib/prescription.ts` (L1) — `isTimeBased`, `parsePrescribedSeconds`, `parsePrescribedReps`,
  `parseRestSeconds`, `formatPrescription`. Use these; do not write a 6th copy.
- `lib/exercise-groups.ts` (L1) — `computeGroups`. Use it for the section rendering; a group with
  2+ items renders round-by-round per the mockup (see below), a single stays as today.
- `lib/units.ts` (L1) — `toKg`/`fromKg`/`formatWeight`, `LB_TO_KG`. For the kg/lb default-derive
  logic below, write a new small helper (see "New, small" list) rather than overloading these.

New, small, no migration needed (same additive-JSONB pattern as everything above):
- `Exercise.warmup_sets?: number` — first N of `sets` are warm-up. Not written by this lane (no UI
  to set it exists yet — that's desktop `SessionEditor`, a different lane), but **read** it here to
  render the warm-up badge on sets `0..warmup_sets-1`. Absent on all current data — the badge
  simply won't show on existing sessions, which is correct.
- `Exercise.weight_unit?: 'kg' | 'lb'` — **only set when Esther manually corrects it**, never by
  default. The *default* is derived at read time: write a small `defaultUnitForEquipment(equipment:
  string[]): 'kg' | 'lb'` in `lib/units.ts` — returns `'lb'` if any equipment string
  case-insensitively contains "band" (matches the real data you can check via the DB tunnel —
  `equipment` arrays include values like `"Resistance band"`), else `'kg'`. Effective unit for
  display = `exercise.weight_unit ?? defaultUnitForEquipment(exercise.equipment)`. When Esther taps
  the small "switch" correction link (mockup: `.unit-swap`), that's a **local, session-scoped**
  toggle — the mockup's own note is explicit about this ("for this session only"), so do **not**
  PATCH `weight_unit` back into `sessions.data` from this lane; keep it as client React state for
  the current screen visit. (Persisting the override durably is a reasonable follow-up, not this
  lane's job — don't scope-creep into it.)
- `sessions.data.exercise_notes: Record<string, string>` — per-exercise notes keyed by `uid` (bug
  fix #1 above).
- `sessions.data.session_log.started_at?: string` — already added to the `SessionLog` TypeScript
  type in Lane 1 (`types/index.ts`) in anticipation of this lane; just start writing it.
- `sessions.data.estimated_minutes?: number` — optional override; when absent, default display to
  `sessionDurationMinutes(data.time_tier)` from `lib/scheduling.ts` (already exists, already used
  elsewhere). Render as a small "~N min · guide" label per the mockup — **explicitly not a live
  countdown**, the mockup's own tooltip text makes this clear ("A guide from the prescription — not
  a live countdown") — keep that exact framing.

## The rest control — one control, not two

Per Craig's explicit correction earlier this session: **manual trigger only** (a "Rest 60s" button,
never auto-starts), and once triggered it becomes **one panel with a countdown/stopwatch mode
switch inside it** — not two separate timer widgets. The mockup (`hub-m-train.html`) already
implements this exactly as `.rest-start`/`.rest-panel`/`.rest-modes` — copy its behaviour precisely,
including the `restTimers` keying scheme described next.

**Superset rest is shared per round, not per exercise.** This is the structural correction Craig
gave mid-session — read the mockup's `groupRoundHtml`/`restTimers` logic closely (search for
`'grp:' + b.label + ':' + roundIdx` in its script) and reproduce the same keying in React state:
one rest-timer entry per **round** of a superset (not one per exercise), one per **set** of a
standalone exercise. Do not persist timer state anywhere — it's ephemeral UI state, gone on
navigation away, exactly like the mockup.

**Superset sets render round by round.** A 2-exercise superset shows Set 1 of exercise one, Set 1
of exercise two, one shared rest, then Set 2 of both, and so on — **never** all of one exercise's
sets followed by all of the other's. The mockup's `groupBlockHtml`/`groupLegendHtml`/
`groupRoundHtml` functions are the exact reference implementation for this — each exercise's
identity (thumbnail, cue, video, note, add-set) renders once above the rounds; only the sets
themselves interleave. **Ungroup** works (mockup: `.grp-ungroup`) — reuse `normalizeGroups`
semantics from `lib/exercise-groups.ts` for what happens to the freed exercises. **Do not build
"create a new superset"** here — deferred, see Scope boundary above.

## Route structure

`app/hub/m/train/[sessionId]/page.tsx` — server component, replaces the current
`app/hub/m/train/page.tsx` stub (that file's route becomes obsolete once `[sessionId]` exists
alongside it — Next allows a static `train/page.tsx` and a dynamic `train/[sessionId]/page.tsx` to
coexist; leave the static stub as-is, it still serves the bare `/hub/m/train` tab-tap case with no
session selected — check what the mockup's Train tab link actually points to when tapped with no
active session and match that, don't guess). Mirror the fetch pattern of the existing
`app/hub/log/[sessionId]/page.tsx` (session → block → client, three queries, pg-shim can't do
nested embeds) but also fetch the client's `delivery_mode` (bug fix #2) and pass everything to a
new `app/hub/m/train/[sessionId]/TrainScreen.tsx` client component, which is where the bulk of the
mockup's interactive logic lives (mirroring how Lane 1 split `page.tsx` / `TodayScreen.tsx`).

Reuse the mobile shell's CSS token approach from Lane 1 — `app/hub/m/mobile.css` already defines
every mobile alias (`--rose`, `--card`, `--s-primary-bg`, etc.) as `var()` wrappers around the real
`globals.css` tokens. **Add to that same file** (don't create a second stylesheet) — the mockup's
`.sec`/`.ex`/`.set-row`/`.rest-*`/`.grp-*` classes etc. all need to land there, using the same
token names already established. Verify every new `var(--x)` you introduce actually resolves
(either defined in `.mobile-shell{}` already, or falls back to one already in `globals.css`) —
Lane 1 shipped with every var resolving; keep that clean, don't introduce a dangling reference.

## Hard rules (standing, this repo)

1. Work only in this worktree
   (`D:\apps\worktrees\eternal-fitness-website\web-admin-pages-dashboard-5ccf37`,
   branch `claude/mobile-workout-features-6ddaba`). Never the shared checkout.
2. Never run a dev server, `next build`, Playwright, or any browser. Verification is `npx tsc
   --noEmit` and reading your own diff.
3. Never `npm install` / `pnpm install`. No new dependencies.
4. **No DB migration.** Everything new in this lane is additive JSONB (no schema change) or reuses
   existing columns (`clients.delivery_mode`). If you find yourself wanting a new column
   (`is_warmup` on `set_logs`, `weight_unit` on `set_logs`), stop — that's a separate lane's
   migration, already scoped and not yet run; this lane's kg/lb correction is session-local only,
   per the "New, small" section above, precisely to avoid needing that migration yet.
5. No raw hex colours — everything traces to `app/hub/m/mobile.css`'s existing tokens or
   `app/globals.css`.
6. **Do not touch** `app/hub/log/[sessionId]/*` (the screen this supersedes — read-only reference,
   L4's later work retires it, not this lane) or `app/hub/(protected)/clients/[id]/blocks/[blockId]
   /sessions/[sessionNum]/SessionEditor.tsx` (the desktop editor — separate concern).
7. Do not push to `main`, do not merge, do not push anywhere. Commit to the current branch
   (`claude/mobile-workout-features-6ddaba`) only, in this worktree.
8. If something here turns out to need a real product decision you can't infer from the mockup or
   this brief, stop that specific piece and report it as a blocker — ship the rest.

## Verification checklist (before considering this lane done)

```bash
npx tsc --noEmit
git diff -U0 | grep '^+' | grep -E '#[0-9a-fA-F]{3,8}\b'   # should be empty
git diff --name-only | grep -E "log/\[sessionId\]|SessionEditor"   # should be empty — scope boundary
```

## Report format

Append to `.context/loop-status.md`, and print the same block at the end of the run:

```
LANE: mobile-train-screen · BRANCH: claude/mobile-workout-features-6ddaba
UNITS DONE: <unit> (<commit sha>), ...
BLOCKERS: <unit> — <what stopped you and what you'd need>
TYPECHECK: clean | <error count>
NOTE: confirm all three bug fixes (notes persistence, delivery_mode-driven version, started_at
write) are real and testable, not just present in code — state exactly what each one now does.
NOTE: confirm superset rounds render exactly per the mockup's groupRoundHtml (one shared rest per
round, not per exercise) — this was a real correction Craig gave mid-session and getting it wrong
silently regresses it.
```
