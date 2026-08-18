# Blocks / Sessions / Workouts — full assessment + unified model proposal

**Date:** 2026-08-17 · **Raised by:** Craig (Esther field reports) · **Investigated by:** Claude
**Extends:** `wo-ef-workout-consolidation-pwa-2026-08-15` · **CRs:** CR-EF-029 – CR-EF-037

Every complaint Craig raised was reproduced against production data and traced to
specific code. This document is the evidence, the root causes, and the proposal.

---

## TL;DR

Every reported symptom is real and every one has a confirmed root cause. They are
not eight separate bugs — they are the surface of **three data models that never
agreed**:

1. **The Plan-Agent block model** (`sessions.week`, `phase`, `archetype`, 6-week
   generated blocks) — designed for AI-generated plans. Esther builds blocks
   manually, so `week` is garbage for every real client: **66 of 92 sessions in
   production sit in "week 1"**, including all 5 of Emma's block-2 sessions.
2. **The logging model** (`set_logs` + completion buried in
   `sessions.data.session_log` JSON) — no status column exists on `sessions`, so
   **every surface re-derives "completed" differently** and four of them disagree
   by construction.
3. **The calendar projection** (`scheduled_at` only) — knows nothing about blocks,
   weeks, or completion. A completed session and an unstarted one look identical
   on the schedule.

The duplicate-save bug is separate and worse: **the live logging path never sends
an idempotency key** — 0 of 247 `set_logs` rows in production carry a
`client_op_id`, so the entire idempotency layer shipped on 2026-08-13 has been
protecting nothing. Emma's triple-log on 2026-08-17 is confirmed in the data.

The fix is one unified model (Part 3), phased: **hotfixes this week** (stop the
data damage), then the **state-model migration**, then the **calendar-spine
redesign** that the in-flight Open Design mockups should be revised against —
with a Trainerize review pass first, since Craig now has access and Esther likes it.

---

## Part 1 — What Esther hit, symptom by symptom

### 1.1 "Logged the same workout ~3 times for Emma" — CONFIRMED, CR-EF-029

**Production evidence (Emma Atkinson, block 2, 2026-08-17):**

- Session 1 (`f4635373`): 32 `set_logs` rows in two clusters — a real morning
  workout 11:31–12:25, then a second pass 17:04–17:06 re-logging the same
  exercises with near-identical values plus blank placeholder rows. The session
  was then **cancelled at 17:10** — clearly an attempted undo.
- Session 2 (`dbd376d2`): 31 rows logged 16:54–17:02 the same afternoon
  (different exercise list — plausibly a backfill of the 14 Aug session it was
  scheduled for, but only Esther knows).
- `data.session_log.completed_at` on session 1 = 17:06 — the completion stamp
  landed during the *second* pass.

**Root causes (ranked):**

1. **Live writes carry no idempotency key.** `TrainScreen.tsx:399-401` and
   `SessionWorkoutLog.tsx:317-319` POST without `client_op_id`; only the offline
   *replay* path sends one (`TrainScreen.tsx:850-857`). The partial unique index
   (`20260813_set_logs_idempotency.sql`) only applies `WHERE client_op_id IS NOT
   NULL` — so it has never deduped a single production row. **Table-wide: 0 of
   247 rows have a key.**
2. **Retry-after-committed creates a second row.** If the POST commits
   server-side but the response is lost (backgrounded iOS PWA, gym wifi), the
   catch block enqueues the set with a **freshly minted** UUID
   (`TrainScreen.tsx:404`) — the replay can't match the keyless first row.
3. **No per-set in-flight guard.** `handleSetDone` (`TrainScreen.tsx:453-520`)
   has no pending flag; two taps inside one round-trip = two INSERTs.
4. **Two surfaces on one session don't see each other.** Each logger snapshots
   `set_logs` at page load and never refreshes; phone + desktop open together
   double-log freely.
5. **The portal write path has zero dedupe** — plain INSERT, doesn't even accept
   a key (`app/api/portal/sessions/[id]/set-logs/route.ts:102-118`).
6. **Nothing collapses duplicates on read**, so Esther can't even see she's done
   it from inside the logger — only the DB, progress trends, and PB detection see
   all three rows (and are silently corrupted by them).

### 1.2 "Open a block: 5 workouts in 1 week" — CONFIRMED, CR-EF-032

`sessions.week` is a **generation-time ordinal nobody maintains**, and the block
page trusts it (`blocks/[blockId]/page.tsx:63-67` groups by the raw integer).

- The AI generator caps at 3/week and stamps weeks properly — but only Craig's
  and Tom Putnam's test blocks were generated. **Every real client block was
  built manually and has every session in week 1.**
- "Add workout from template" defaults the week picker to the *last* week
  (`AddWorkoutDialog.tsx:32,44`) — repeated adds stack one week.
- Clone copies `week` verbatim (`clone/route.ts:44`).
- `week` is **not editable** — `PATCH /api/sessions/[id]` whitelists only
  `data, scheduled_at, cancelled_at, cancel_reason` (`route.ts:11`).
- **No Monday–Sunday logic exists on any block surface.** `date-fns` is
  installed; `startOfWeek` is never imported. The dates shown against "Week 1"
  are just min–max of whatever `scheduled_at`s happen to share the integer —
  Emma's "week 1" spans 14–21 Aug.
- `blocks.scheduled_start` is **NULL on all 18 blocks** — no block has a date
  anchor at all.

### 1.3 "Session tab dates differ from mobile" — CONFIRMED, CR-EF-033

Two surfaces render **two different columns** for the same session:

- Client-detail Sessions tab shows **`session_log.completed_at` only** and `—`
  when unlogged (`TrainingTabContent.tsx:132-142,200`) — while *sorting* by
  `completed_at ?? scheduled_at`, a field it doesn't display.
- Mobile Today / Train / Schedule all show **`scheduled_at`**.

So a session booked Thursday but written up Friday shows Friday on the tab and
Thursday on the phone. Compounding: the client-page query orders
`scheduled_at DESC` with `.limit(50)` and the pg shim emits no `NULLS LAST` —
Postgres puts NULLs **first** on DESC, so undated sessions eat the 50-row window
and real logged sessions can fall off the tab entirely (`clients/[id]/page.tsx:133-140`).

Timezone handling was audited and is *not* the cause — the shared date helpers
are local-safe; deprioritise that theory.

### 1.4 "Session name not relevant to the block session name" — CONFIRMED, CR-EF-034

The only human-readable name is `data.focus_label` (e.g. "Workout A", or the
template name). The block page renders it — but the client-detail tab renders
**`Block {n} · S{n}`** and never reads `focus_label`
(`TrainingTabContent.tsx:377`), the session detail page renders `Session {n}`
plus a *third* variant of the archetype label, and there are **three independent
archetype name maps** in the codebase. Outlook events use a fourth format.

### 1.5 "Completed sessions can still be edited / logged against" — CONFIRMED, CR-EF-031

**There is no guard anywhere** — not in `POST/PATCH /api/sessions/[id]/set-logs`,
not in `PATCH /api/sessions/[id]`, not in the portal route, not in any UI.
"Complete" buttons are only disabled while the request is in flight. Pressing
Complete again re-stamps `completed_at` and **overwrites RPE / fatigue / notes**
from local state. Editing a completed session's prescription silently orphans its
logs (see 1.7). The `set_log_revisions` audit table (added after the 2026-08-10
incident of exactly this class) records the damage but prevents none of it.
The "live on phone" lock banner described in `types/index.ts:286-288` was never
built.

### 1.6 "Completed sessions show still in progress" — CONFIRMED, CR-EF-030

The DB is actually coherent (all 8 sessions with logs have `completed_at`) — the
lies are in the write path and the derivations:

1. **Mobile stale-blob clobber (the big one):** `TrainScreen` PATCHes the whole
   `data` blob from `dataRef.current` but **never updates the ref after
   completing** (`:747,756-766`; no equivalent of desktop's
   `onSessionLogChange`). Any later write from the same mounted screen — an
   exercise-note autosave (800 ms debounce) or an add-set — re-submits the
   **pre-completion** `session_log`, wiping `completed_at`. Complete a session,
   type one note, and it's "in progress" again everywhere.
2. **`started_at` is stamped by merely opening a screen** (both loggers, on
   mount). The desktop session page is the only surface that reads it — so an
   opened-and-abandoned session shows "In progress" there forever, "Not logged"
   on the block page.
3. **Four disagreeing definitions of done:** hub surfaces = `completed_at`;
   portal = `completed_at || has any set_logs`; desktop session page = 3-state
   with `started_at`; schedule calendar = **no completion concept at all**.
4. Six independent callers full-blob-PATCH `sessions.data` with no concurrency
   check — last write wins.

### 1.7 "Dropdown shows the session but not the logged data" — CONFIRMED, CR-EF-036

The client-page Sessions view is a pure `session_log` projection — **it never
reads `set_logs`** (`TrainingTabContent.tsx:365-407`; `set_logs` feed only the
Progress tab). So logged sets without a Complete press = a row of dashes. Even
where it *could* read them, two structural traps exist:

- **`exercise_ref` is positional**: `{version}:{section}:{index}:{name}`. Desktop
  logs `studio:*`, mobile logs by delivery-mode, portal always logs `home:*` —
  for a home-training client the surfaces literally cannot see each other's rows.
- Any prescription edit (reorder / swap / remove) shifts indices and **orphans
  every existing log**. The stable per-exercise `uid` that already exists in the
  prescription JSON (and the `set_logs.exercise_uid` column, populated on only
  92/247 rows) is the obvious fix and is already half-shipped.

### 1.8 "How does this tie into the calendar?" — it doesn't, CR-EF-035 + design

- The calendar is a pure `scheduled_at IS NOT NULL AND cancelled_at IS NULL`
  projection — no block, week, or completion concept.
- The only way to date a whole block is `BlockScheduler`, buried on the block
  *review* sub-route, which assigns dates by `session_number` order and ignores
  `week` entirely — so grouping and scheduling diverge permanently after any
  clone/append.
- **Broken links:** the schedule day view and the retired `/hub/log` redirect
  build `/hub/clients/{UUID}/…` while every client route resolves by
  `client_number` — the back-link chain lands on `NaN` lookups
  (`ScheduleCalendar.tsx:244`, `hub/log/[sessionId]/page.tsx:31`).
- The mobile PWA is a separate route family keyed by session UUID; no link
  crosses desktop ↔ PWA in either direction.

---

## Part 2 — Why this keeps happening (the structural diagnosis)

The app grew three organs that each own a slice of "a workout happening":

| Organ | Owns | Blind to |
|---|---|---|
| Plan-Agent block model | `week`/`phase`/`archetype`, prescription JSON | real dates, manual workflows |
| Logging layer | `set_logs`, `session_log` JSON | session lifecycle, other surfaces' writes |
| Calendar projection | `scheduled_at` | blocks, weeks, completion |

Esther's actual working loop — *"book Emma Tuesday 11:30 → train her → tick it
off → see the week"* — crosses all three on every step, and each crossing is
where a symptom lives. No amount of screen-level design polish (the current
mockup pass included) fixes this, because the disagreements are in the data
model. This is exactly the "disjointed comms between modules" Craig named.

---

## Part 3 — The proposal: one unified model

### 3.1 Session state becomes first-class (the keystone)

Add real columns to `sessions` — migrate out of the JSON blob:

```
status        TEXT NOT NULL DEFAULT 'planned'
              CHECK (status IN ('planned','scheduled','in_progress','completed','cancelled'))
started_at    TIMESTAMPTZ
completed_at  TIMESTAMPTZ
```

- One transition function in one API route owns status changes. Backfill from
  `data.session_log` + `cancelled_at` (all 92 sessions map cleanly today —
  verified).
- **Every surface reads `status`. No surface re-derives.** Kills 1.6 entirely,
  makes the calendar completion-aware for free, and makes "completed" filterable
  and sortable at the DB level (which CR-EF-027 already needed and couldn't have).
- **Completed = read-only.** Set-log and prescription writes against a completed
  session are rejected by the API; the UI shows a deliberate "Reopen session"
  action (audited, status → `in_progress`) for genuine corrections. Kills 1.5.
- `started_at` set on the **first set logged**, not on screen mount.

### 3.2 The calendar becomes the spine (the Trainerize move)

Trainerize's model — which Esther already likes — is *date-first*: the calendar
is the home surface, workouts are things that happen on days, and a block is a
pattern that projects onto dates. Adopt that:

- **Weeks are derived from dates, not stored.** For a scheduled block, the block
  page groups by real Monday–Sunday calendar weeks computed from `scheduled_at`
  (`date-fns startOfWeek, weekStartsOn: 1` — finally). The stored `week` integer
  survives only as the *plan template* ordinal for not-yet-scheduled blocks and
  is relabelled "Plan week" in the UI. Kills 1.2 without a risky data rewrite.
- **Scheduling moves to the block page** (front and centre, not the review
  sub-route): pick a start date + weekday pattern → sessions get dates →
  `blocks.scheduled_start` gets set. Rescheduling one session just moves it to
  another day; the week view follows automatically because weeks are derived.
- The schedule calendar shows completion state (from `status`) and links
  correctly (fix the UUID/`client_number` mix as a hotfix now).
- Mobile PWA home stays "Today" (it already is) — same date spine, small screen.

### 3.3 One exercise identity

Key `set_logs` on the prescription's existing per-exercise **`uid`** (already in
the JSON, already a column, already half-populated) instead of the positional
`{version}:{section}:{index}:{name}` string. Logs survive reorders, swaps and
edits; studio/home stop being parallel universes (version becomes a column on
the log row, not part of the identity). Backfill existing rows by parsing the
old ref against the current prescription where it still resolves.

### 3.4 One write path

A single set-log API contract used by desktop, mobile and portal:

- `client_op_id` **required** — server rejects keyless writes; unique index does
  its job at last. The client mints the id **when the set is tapped**, before
  the first POST, and reuses it across every retry/queue replay (today it's
  minted only on enqueue — that's the duplicate factory).
- PATCH becomes idempotency-keyed too (it accepts the field today and ignores it).
- Per-set in-flight guard in both loggers; portal route joins the same code path.
- Completed-session rejection (3.1) enforced here.

### 3.5 One name

`focus_label` (falling back to "Session {n}") is **the** session name on every
surface — client tabs, session page, calendar, Outlook subject, portal, print.
One shared archetype label map (it's already configurable in Plan Agent
settings) replaces the three hardcoded ones.

### 3.6 What this means for the in-flight mockups

`hub-session.html` and `hub-workout-templates.html` are already back with Open
Design for revision. **Before build starts**, `hub-block-module.html` and
`hub-schedule.html` (approved on visuals) need a *functional* revision pass
against this model: derived Mon–Sun weeks, scheduling on the block page, status
pills from the real state machine, completion on the calendar. And the mobile
flow deserves a **Trainerize review session first** — Craig has app access,
Esther can point at what she likes — so the PWA revision borrows its calendar-
first navigation deliberately rather than by rumour. That output feeds the
revised Open Design briefs.

---

## Part 4 — Sequencing

**Phase 0 — hotfixes (this week, small lanes, no design dependency):**

| # | Fix | Kills |
|---|---|---|
| H1 | Mint `client_op_id` at tap-time on both live logging paths; reuse across retries; portal dedupe | 1.1 (new damage stops) |
| H2 | Update `dataRef`/`sessionLogRef` after complete on mobile (mirror desktop's state lift) | 1.6 clobber |
| H3 | API-level guard: reject set-log + prescription writes on completed sessions (UI reopen comes later with 3.1) | 1.5 worst case |
| H4 | Session tab: show `scheduled_at` as the date (completed date secondary); `NULLS LAST` on the query | 1.3 |
| H5 | Fix UUID vs `client_number` links (ScheduleCalendar + `/hub/log` redirect) | 1.8 nav |
| H6 | Client tabs + session page render `focus_label` | 1.4 |

**Phase 1 — state model:** migration (status/started_at/completed_at + backfill),
transition API, all surfaces read `status`, completed read-only + reopen.

**Phase 2 — identity + write path:** uid-keyed logs + backfill, unified set-log
API, portal on the same path.

**Phase 3 — calendar spine:** derived weeks, block-page scheduling, calendar
completion, per revised mockups (after the Trainerize review).

**Data cleanup (gated, any time):** Emma's 2026-08-17 duplicates. Needs Esther's
account of what actually happened before anything is deleted — proposal queued as
a `wo ask` decision, not actioned.

---

## Part 5 — Open questions for Craig (batched, on the board)

1. **Emma cleanup** (`wo ask`, destructive): which log is the real workout?
   Best reconstruction: morning log in block-2 session 1 (11:31–12:25) = today's
   real session; the 16:54–17:02 log in session 2 = possibly a backfill of the
   14 Aug session; the 17:04–17:06 second pass in session 1 = accidental, delete;
   session 1's cancellation at 17:10 = an undo attempt, probably wants reversing.
   Confirm with Esther before any row is touched.
2. **Adopt the Part 3 model** as the revised basis for
   `wo-ef-workout-consolidation-pwa-2026-08-15` (it grows the WO's scope from
   surface consolidation to data-model unification — Phases 1–3 above become
   lanes). Or split data-model work into its own WO if you'd rather keep the
   design WO pure.
3. **Trainerize review session** — 30 minutes with the app (you + ideally
   Esther) to capture what "like that but better" means concretely, before the
   PWA mockup revision. I can drive a structured capture if you screen-share or
   lend access.
4. **Phase 0 hotfixes** — pre-authorised as [AUTO] bug-fix lanes, or do you want
   the H1/H3 behaviour changes (rejecting keyless writes, blocking writes to
   completed sessions) reviewed first? H3 in particular changes what Esther can
   do mid-session if she genuinely needs to amend a finished log before Phase 1's
   reopen button exists.
