# Work Order — Hub Mobile / In-Session PWA + Outlook Integration

**Slug:** `wo-eternalfitness-hub-mobile-session-pwa-2026-08-10` (registered, status `planned`)
**Apps:** `eternal-fitness-website`
**Owner:** Claude (orchestrator) · OpenCode lanes for implementation
**Worktree:** `D:\apps\worktrees\eternal-fitness-website\web-admin-pages-dashboard-5ccf37` (branch `claude/mobile-workout-features-6ddaba`, currently level with `main`)
**Approved by Craig:** 2026-08-10

---

## Context

Esther runs the hub daily, but it was built desktop-first and the desktop/mobile split has never been designed. There is a real functional divide: **planning and admin happen at a desk; session delivery happens standing next to a client with a phone in hand.** Today the phone gets the same ~30-page desktop hub with the sidebar simply hidden below `lg`, which is why most of what she sees on a phone is redundant.

Esther's notes are all about the *in-session* moment — swapping exercises mid-set, adding a fourth set because the client had more in them, timing rest, checking a video, seeing only today's A or B workout rather than the whole block. Trainerize did these things and the hub currently doesn't. This Work Order carves out a dedicated mobile surface for that moment, installs it as a PWA so it behaves like an app on her Android home screen, and folds in the calendar integration that makes it the first thing she opens each day.

It also consolidates the genuinely-open items scattered across older Work Orders, and pays down two structural weaknesses that block all of it (`exercise_ref` positional keys; four duplicate copies of the prescription-parsing logic).

### Decisions already taken (Craig, 2026-08-10)

| Question | Decision |
|---|---|
| Delivery form | **Installable PWA** — manifest + hand-written service worker, offline set-logging. No APK, no store. |
| Outlook / booking calendar | **In scope for this WO**, as its own lane. Blocked on Craig completing an Azure app registration. |
| Structure | **Separate mobile app shell** at `/hub/m/*` with bottom-tab nav. Desktop `/hub/*` untouched. |
| Sequence | **Mockup first, then build.** New `hub-m-*.html` mockups in `ef-control-hub`, signed off before implementation. |
| Design scope | **Mobile mockups + the desktop screens this WO touches + clear the standing 2026-08-04 desktop mockup backlog.** Split into two lanes so the backlog doesn't block the mobile build. |

---

## What already exists (do not rebuild)

Verified in code this session — several things Esther's notes ask for are already built, just unreachable from the phone:

- **`app/hub/log/[sessionId]/LiveSessionLog.tsx` (970 lines) is already mobile-first** — deliberately outside `(protected)` so it renders full-bleed with no sidebar. 44px tap targets, sticky header, fixed bottom bar, `env(safe-area-inset-*)`, `inputMode` hints, RPE/fatigue, Web Speech dictation, live "New PB" pills. **This is the starting point, not a greenfield.**
- **Supersets** — `Exercise.group_label` on consecutive exercises, rendered as grouped cards. Read-only in the log screen.
- **Templates** — `workout_templates` table + `applyTemplate()` (`SessionEditor.tsx:481`).
- **Roll-forward** — `rollOverPreviousSession()` (`SessionEditor.tsx:375`) already copies a previous session's sets/reps/tempo/cues forward.
- **Exercise media** — `exercises.image_url` / `video_url`, seeded with **2,541 thumbnails and 283 video links** from the Trainerize export; `Exercise.media` carries them onto the prescription. Rendered in the exercise browser and desktop session view — **not in the live log screen**.
- **Estimated duration** — `lib/scheduling.ts` `sessionDurationMinutes(time_tier)` (45/60/75 min) already exists and is used by the schedule.
- **Archetype** — `sessions.archetype` is already an `'A'|'B'|'C'` column.
- **Mockup** — `D:\apps\design-systems\ef-control-hub\hub-session-log.html` is the one genuinely mobile-first design in the estate (`viewport-fit=cover`, safe-area insets, min-width scale-up).

Templates and roll-forward are trapped in the 1,148-line **desktop** `SessionEditor`. Much of Lane 3 is *routing existing capability to the phone*, not writing it from scratch.

### Genuine gaps (nothing in the repo does these)

Rest timer · stopwatch · kg↔lb · add-set-on-the-fly · create/break a superset · warm-up **sets** (vs the warm-up *section*) · video/thumbnail in-session · offline · any external calendar integration · any `started_at`/in-progress state.

### Live bugs found while scoping (fix in flight, all cheap)

1. `LiveSessionLog.tsx:394` — per-exercise notes are written to React state and **never persisted**. Notes Esther types today are lost on unmount.
2. `lib/personal-records.ts:84` — PB upsert is `DO UPDATE SET value = EXCLUDED.value`, not `GREATEST`. A later-saved *lower* value overwrites a higher PB. Benign today (writes are ordered); **acute the moment an offline replay queue exists**.
3. `app/portal/(protected)/training/TrainingClient.tsx:11` — its copy of `isTimeBased` **omits the `log_type` parameter**, so the client portal ignores a field the hub honours. A real behavioural divergence.
4. `LiveSessionLog.tsx:141` hard-codes `version = "studio"`, so home-training clients can't be logged by the trainer from this surface.
5. Warm-up singles currently register as 1-rep PBs.

---

## Mobile information architecture

Esther's rule — *"only things to see on a mobile are active training as the primary, then workouts and calendar"* — becomes three bottom tabs:

| Tab | Route | Contents |
|---|---|---|
| **Today** (default) | `/hub/m` | Day calendar: today's sessions in time order, tap to open. Below it, date-driven upcoming tasks. This is the first screen on launch. |
| **Train** | `/hub/m/train/[sessionId]` | The live session surface. The primary screen — everything else exists to get here. |
| **Clients** | `/hub/m/clients`, `/hub/m/clients/[id]` | Read-mostly: contact, medical flags, current block, recent sessions. No editing, no documents, no cashflow, no admin. |

Everything else in the hub (cashflow, documents, templates, site content, process & quality, settings, reports, tracker) is **desktop-only and not reachable from the mobile shell**. That is the simplification.

Small screens hitting `/hub` redirect to `/hub/m` with a persistent "Desktop site" escape hatch. Desktop routes are not modified.

---

## Lanes

Dependencies: **L0 → L1 → L2 → L3a → L4 → L5**, with **L3b ‖ L6 ‖ L7** running alongside. L3b (desktop mockup backlog) deliberately does **not** gate L4 — otherwise the mobile build waits behind a large desktop review. **L8 (registry clear-down) ran first, independently, 2026-08-10 — see below.**

### L0 — Scope confirmation with Esther `[GATE]` — DONE 2026-08-10 (answered directly by Craig, no separate Esther session needed)

1. **Warm-up sets = first N sets of a given exercise** (e.g. sets 1-2 of a 5-set exercise are warm-up), confirmed as the model. **The existing whole-section warm-up (dedicated warm-up exercises) stays as a separate, unchanged mechanism** — the two coexist: a session can have warm-up *exercises* in the warm-up section, and warm-up *sets* within any working exercise. No free-positioning needed. `Exercise.warmup_sets?: number` as planned.
2. **kg/lb auto-derives from equipment, not a manual toggle.** If `Exercise.equipment` tags the exercise as a resistance band, `weight_unit` defaults to `'lb'` automatically — no per-exercise manual sticky setting to maintain. Still allow a manual override (she can correct a wrongly-tagged exercise), but the default is derived, not chosen.
3. **"Add work from a previous workout" is two distinct things, both needed:**
   - (a) Reuse a workout from a **specific previous session or block for that client** — broader than the existing `rollOverPreviousSession()`, which only pulls the *latest completed* session. This needs a **session/block picker**, not just "most recent."
   - (b) Pick from the **Workout Templates library** (`workout_templates`). Craig flagged this system as **"still in development"** — verify its actual completeness (apply flow, facet coverage) before assuming it's mobile-ready; may need finishing work as part of this lane rather than a clean reuse.
4. **Rest control is manual-trigger only, with a mode switch — not two separate widgets.** One "Start Rest" control; once triggered, she picks countdown (from `Exercise.rest`) or stopwatch (count-up, open-ended). Simplifies the L3a mockup to a single control with a countdown/stopwatch toggle rather than two independent timer features.
5. **Supersets: full create + break, and generalised.** Not limited to 2-exercise pairs — applies to any grouping of joined exercises (tri-sets etc.), matching the existing generic `group_label` mechanism. Confirms `nextGroupLabel`/`normalizeGroups` need to support N-way groups, not just pairs.

**Correction added 2026-08-10 (Craig, after reviewing the L3a mockup draft): a superset must display round by round, not exercise by exercise.** A 2-exercise superset shows Set 1 of exercise one, log it, Set 1 of exercise two, log it, **one shared rest**, then Set 2 of both, and so on — never all of exercise one's sets followed by all of exercise two's sets independently. This is a real-time delivery correction, not a cosmetic one: a superset's whole point is the exercises are performed back-to-back within a round, and the original mockup draft (and the mental model up to this point) had grouped by exercise instead. Fixed directly in `hub-m-train.html` — each exercise's identity (thumbnail, cue, video, note, add-set) now renders once in a compact legend above the group, and the group's sets render as "Round 1 of N" / "Round 2 of N" blocks, each containing one set from every exercise still active at that round index, followed by one shared rest control. If exercises in a group have unequal set counts (e.g. after "Add set" on just one), later rounds simply show only the exercise still going. Verified live in-browser: warm-up badges and per-exercise kg/lb both stayed correctly independent per exercise within each round. **This structure — one shared rest per round, not per exercise — must carry through to L4's real implementation, not just the mockup.**

**VERIFY:** answered directly by Craig 2026-08-10, recorded above. No unresolved items — gate cleared.

### L1 — Shared-logic refactor `[AUTO]` — DONE 2026-08-10, commit `c583ca3`

No user-visible change except fix #3 above. **Must land first** or the mobile work writes a fifth copy of the parsing logic.

New pure modules: `lib/prescription.ts` (`isTimeBased`, `parsePrescribedSeconds`, `parsePrescribedReps`, new `parseRestSeconds` for the timer, `formatPrescription`), `lib/exercise-groups.ts` (one generic `computeGroups` + `normalizeGroups` + new `nextGroupLabel`), `lib/units.ts` (`LB_TO_KG` moved out of `lib/calorie-calculator.ts`, `toKg`/`fromKg`/`formatWeight`).

Call sites collapse: `LiveSessionLog.tsx:61-112` (also **delete dead `parseLeadingNumber:93`**), `sessions/[sessionNum]/page.tsx:503-519,846-863`, `TrainingClient.tsx:11-26`, `SessionEditor.tsx:74-131`, `components/hub/PrescriptionTable.tsx:15-27`.

**Scope correction made during dispatch (not in the original text above): `lib/progress.ts` was excluded.** `parseExerciseName` there is ref-parsing logic, not prescription/grouping logic — it belongs to L2's not-yet-built `lib/exercise-ref.ts`, alongside `exerciseRefKey` (`LiveSessionLog.tsx`) and `withUids`/`stripUids` (`SessionEditor.tsx`). All three were explicitly fenced off in the lane brief and confirmed untouched in review — moving them now would have pre-empted L2's uid-stability design before it exists.

**Dispatched to an OpenCode lane** (`opencode-go/deepseek-v4-pro`, inline), brief at
`.context/lane-brief-shared-logic-refactor-2026-08-10.md`. **Hand-reviewed line-by-line
after completion, not trusted on self-report** (standing project rule) — read all 3 new
lib files, the full diff on every call site, and re-ran `tsc --noEmit` / `vitest run`
independently rather than trusting the lane's own claimed-clean output. Findings:

- **Correct and faithful.** `computeGroups`/`normalizeGroups`/`nextGroupLabel` replicate all
  three original grouping implementations' behaviour exactly, including the `allowGroups:
  false` bypass and the orphan-group dissolve. `SessionEditor.tsx`'s block `key` generation
  (load-bearing for its drag-and-drop `dragBlockKey`/`overBlockKey` state) is byte-identical
  to the pre-refactor scheme. `LiveSessionLog.tsx`'s group-vs-single rendering branches both
  checked correct — a superset still renders every exercise in the group, not just the first
  (this was checked specifically, since the "single" branch's `block.ex` → `block.items[0]`
  rewrite could plausibly have been misapplied to the group branch too; it wasn't).
- **The one intentional fix (portal `log_type`) is real and complete end-to-end** — traced
  from `TrainingClient.tsx`'s corrected `isTimeBased(reps, exercise.log_type)` call back
  through `lib/portal-data.ts`, which needed (and got) `log_type` added to the `PortalExercise`
  interface and its mapping function — not just a call-site fix that would've silently no-op'd
  against an undefined field.
- **One undisclosed secondary behaviour change found, judged acceptable, flagged rather than
  silently passed:** `components/hub/PrescriptionTable.tsx`'s "— perform together, rest after
  the pair" caption and rose left-border styling used to gate on `isSuperset(label)` — a
  string-prefix heuristic true only for labels literally starting with "Superset". The
  refactor replaced it with `group.type === "group"` (any 2+-item `group_label`, regardless
  of text — covers "Tri-Set", "Metabolic Block" etc. too, per the type's own doc comment
  listing those as valid labels the old heuristic silently excluded). This widens when the
  caption/styling shows. Judged low-risk (cosmetic, not data-affecting) and consistent with
  Craig's own L0 answer #5 today ("applies for anything where there's multiple exercises that
  have been joined together") — kept rather than reverted, but it was not the explicit scope
  of this lane and wasn't mentioned in its own report, so recording it here for the record.
- Zero stale references to any of the 6 collapsed functions remain anywhere in `app/` or
  `components/` (grepped directly, not just trusted the lane's own grep claim).

**VERIFY:** `npx tsc --noEmit` clean (confirmed independently) · `npx vitest run` 17/17 pass
(confirmed independently) · portal `log_type` fix called out in its own commit paragraph ·
new `lib/__tests__/prescription.test.ts` + a first `vitest.config.ts` + `package.json`
`"test"` script (none existed before this lane, despite vitest already being a
devDependency).

### L2 — `exercise_ref` stability `[AUTO]`
**The load-bearing fix.** Today `exercise_ref` is a positional string `<version>:<section>:<index>:<name>` and `LiveSessionLog.tsx:509` derives the index via `list.indexOf(ex)` — which collides on duplicate exercises. **Any in-session reorder, insert or delete silently misattributes existing logs.** In-session editing (L3/L4) is impossible without this.

Approach: **persistent `uid` on each `Exercise` in the JSONB**, not normalisation. `sessions.data` is written whole by the AI generation path, the editor, roll-forward and template-apply; `workout_templates.data` stores the identical shape for zero-transform apply. Normalising rewrites the app's spine for one screen, and a single JSONB document is what makes offline (L5) tractable. `SessionEditor.tsx:74-80` already mints ephemeral uids via `withUids()`/`stripUids()` — make that persistent rather than inventing a new concept.

The uid **cannot** go in the ref string: `lib/progress.ts:43` does `parts.slice(3).join(":")`, so a fifth segment becomes part of the exercise name and poisons every PB and trend.

`supabase/migrations/20260811_exercise_uid.sql` — add `set_logs.exercise_uid` + index; idempotent JSONB walk adding a uid to every `Exercise`; backfill `exercise_uid` by matching `(version, section, index, name)` with `WITH ORDINALITY`, assigning **only on unambiguous match** and leaving NULL otherwise. Also add `set_logs.exercise_name` so readers stop string-parsing. New `lib/exercise-ref.ts` owns build/parse/`ensureUids`/`resolveLogUid`. Dual-read fallback lives in exactly one place — the `app/hub/log/[sessionId]/page.tsx` server component — so the client only ever sees uid-keyed data.

**Sharp edge:** `applyTemplate`, `rollOverPreviousSession` and the new add-from-previous-workout all *copy* Exercise objects and **must re-mint uids**. Enforce server-side in the sessions PATCH so no client path can forget.

**VERIFY:** backfill leaves zero unmatched rows on prod data (or the unmatched set is enumerated and explained); logging a set then reordering the session preserves attribution; existing PB/trend output is byte-identical before and after.

### L3a — Mobile mockups + the desktop screens this WO changes `[GATE]` — blocks L4

All in `D:\apps\design-systems\ef-control-hub\`.

**Mobile** — follow `hub-session-log.html`'s shortened token aliases (`--rose`, `--teal`, `--ink`, `--s-primary-*`) and its `data-action` delegation convention, **not** the desktop `--hub-*` / `.hs-*` naming:

- `hub-m-today.html` — day calendar + upcoming tasks + bottom tab bar (**no bottom nav exists anywhere in the estate today; this invents it**)
- `hub-m-train.html` — the live session screen: **one manual "Start Rest" control with a countdown/stopwatch mode switch** (not two separate widgets), exercise thumbnail/video, prescribed reps+tempo inline, weight unit auto-derived from equipment (band exercises default to lb, override available), add-set, warm-up-set badges on the first N sets of an exercise, superset group/ungroup **and create** (N-way, not just pairs), in-situ edit, estimated completion time. **Supersets render round by round** — each exercise's identity shown once, then "Round 1 of N" / "Round 2 of N" blocks each containing one set per exercise plus one shared rest control (see the L0 correction above). Done — built and verified in the mockup itself.
- `hub-m-train-edit.html` — the mid-session edit sheet: add exercise, **add from a specific previous session/block (session picker, not just "latest")**, add from the workout template library, create a new superset from multiple selected exercises
- `hub-m-clients.html` — reduced client list + detail

**Desktop screens this WO actually changes** — standard `--hub-*` / `.hs-*` naming:

- `hub-session-editor.html` — add two states it doesn't have: the **"live on Esther's phone right now"** lock banner (when `started_at` is set and `completed_at` is null) and the **409 conflict** refuse-and-reload treatment
- `hub-settings-integrations.html` — **new screen**, the Outlook connection: disconnected / connecting / connected+account / token-expired / calendar picker
- `hub-schedule.html` — the row's deep-link affordance into the installed PWA, and a "desktop site / open on phone" treatment

**VERIFY:** Craig signs off before L4 starts. Design Parity Gate (`/gate`) applies to the implementation that follows.

### L3b — Standing desktop mockup backlog `[GATE]` — parallel, does **not** block L4

Clears the 2026-08-04 open design brief (`.context/design-brief-hub-nav-cashflow-2026-08-04.md`), which is still entirely unactioned. Every screen below is **live in the app today with no mockup at all** — the Cashflow module was explicitly built without a design pass and flagged for exactly this follow-up.

- `hub-plan-schedule.html` (block list — note the brief recommends renaming it away from "Schedule" to kill the collision with the studio calendar)
- `hub-workout-templates.html`
- `hub-client-progress.html`, `hub-client-training-history.html`, `hub-client-resources.html` — 3 of the client-detail tabs; `hub-client-detail.html` covers only 6 of the live 9
- `hub-cashflow-{overview,invoices,reconciliation,transactions,tax,forecast}.html` — 6 screens (demo data is already seeded in prod, tagged `[DEMO DATA]`, so they can be reviewed populated)
- **Nav restructure decision** — `hub-nav-restructure.html` already presents Option A (minimal: merge two groups) vs Option B (consolidated: flatten). This lane picks one. Note it proposes **no mobile nav** in either option, so it needs reconciling with L3a's bottom-tab shell.
- **System-level fixes from Part 4 of the brief**, which are the real source of the "everything looks slightly different" impression: one canonical search+filter toolbar pattern (currently hand-rolled 6+ times, and Email Updates uses none of it), and one icon-badge scale per context (currently 4 different sizes in live use, plus 3 avatar sizes for the same affordance).

**VERIFY:** Craig signs off. Implementation of L3b is **out of scope for this WO** — it produces approved mockups that feed a follow-on build WO. Landing them as code here would balloon the scope past the mobile goal.

### L4 — Mobile shell + live session implementation `[AUTO]`
Build `/hub/m/*` against the L3a-approved mockups (plus the three desktop states from L3a). `LiveSessionLog.tsx` is the base; the new train screen supersedes it and the old route redirects.

Schema — mostly JSONB, following the `log_type` precedent (added with no migration):

| Need | Where | Migration? |
|---|---|---|
| In-progress state | `data.session_log.started_at` | No |
| Warm-up sets (prescribed) | `Exercise.warmup_sets?: number` — first N of `sets`. Coexists unchanged with the existing warm-up *section* — two separate mechanisms, confirmed by Craig 2026-08-10. | No |
| Estimated duration | `data.estimated_minutes?`, defaulting to `sessionDurationMinutes(time_tier)` | No |
| Per-exercise notes | `data.exercise_notes: Record<uid, string>` | No |
| Unit override | `Exercise.weight_unit?: 'kg'\|'lb'` — **only set when Esther manually overrides the auto-derived default.** Default is derived at read time from `Exercise.equipment` (band-tagged → `lb`), not stored. New `lib/units.ts` helper `defaultUnitForEquipment(equipment: string[])`. | No |
| Warm-up sets (logged) | `set_logs.is_warmup` | **Yes** |
| Unit as typed | `set_logs.weight_unit` | **Yes** |

`supabase/migrations/20260811_set_logs_warmup_units.sql`. **`weight_kg` stays the single canonical number** — `weight_unit` records only what she typed, converted on write. A parallel `weight_lb` column, or letting `weight_kg` hold pounds, would silently corrupt every PB in `personal_records` (all kg-denominated) with no error.

`is_warmup` needs a real column rather than derivation, because the prescription mutates mid-session — a historical log's warm-up status would otherwise become revisionist. Then gate it: `if (log.is_warmup) return false;` at the top of `checkAndUpsertPB`, and filter it out of `buildExerciseHistory`. Fix the `GREATEST` PB bug (#2) in the same commit.

Per-exercise notes go to `data.exercise_notes`, **not** `set_logs.notes` — the latter is per-*set*, so an exercise-level note would either duplicate across N rows or arbitrarily pin to set 1. Keep `set_logs.notes` for genuinely per-set remarks.

**Concurrency:** `data.rev` counter; sessions PATCH accepts `expected_rev` and does a conditional update via `getPool()` directly (the pg shim can't express it; `app/api/portal/sessions/[id]/set-logs/route.ts` already establishes that escape hatch). Zero rows → 409. **The phone wins:** desktop `SessionEditor` refuses the save and offers reload; mobile shows a non-blocking banner making clear logged sets are safe (they're separate rows, never at risk from a `sessions.data` conflict). Plus a pre-emptive guard — when `started_at` is set and `completed_at` is null, `SessionEditor` shows "This session is live on Esther's phone right now". Structural edits PATCH on explicit commit, debounced ~800ms, never per keystroke.

Also fixes #1 (notes never persisted) and #4 (`version` hard-coded to `"studio"` — read `clients.delivery_mode`).

**"Add from a previous workout" needs a new endpoint, not a reuse of `latest-completed`.** Craig confirmed (L0 #3) this must let Esther pick a *specific* past session/block, not just the most recent — extend `app/api/clients/[id]/sessions/latest-completed` into a real list endpoint (e.g. `GET /api/clients/[id]/sessions?completed=true`, block + date labelled) with a picker in `hub-m-train-edit.html`. Applying either that or a template must go through the same uid re-mint path as `applyTemplate`/`rollOverPreviousSession` (see L2 sharp edge).

**Workout Templates readiness check.** Craig flagged the template system as "still in development" — before wiring the mobile template picker, verify `applyTemplate()`'s actual behaviour (does it retain sets/reps/tempo correctly, are facet tags populated) rather than assuming it's finished; fix in place if it isn't, don't build the mobile picker against a known-broken apply path.

**Superset create is N-way, not pair-only.** `nextGroupLabel` (L1) must support grouping 3+ selected exercises in one action, matching the generalised ask ("anything where there's multiple exercises that have been joined together").

**Superset sets render round by round, with one shared rest per round — no schema change.** This is purely a client-side rendering/timer-state concern, same as the mockup's `restTimers` map keyed by `'grp:' + groupLabel + ':' + roundIndex` rather than by exercise id. Build it the same way: derive rounds by iterating `Math.max(...items.map(i => i.sets.length))`, render one set per exercise per round (skipping an exercise once its own set count is exhausted), and key the rest timer per round, not per exercise. Do not persist round state — it's ephemeral UI state exactly like the standalone rest timer.

**VERIFY:** real device, real client, a full session logged end to end. Rest timer counts down from `Exercise.rest`. Add a 4th set mid-session and confirm both the prescription and the logs stay attributed. Ungroup a superset and confirm the toast + `group_label` clearing matches desktop behaviour.

### L5 — PWA + offline `[AUTO]`
`public/hub.webmanifest` (`start_url: "/hub/m"`, `scope: "/hub/"`, `display: "standalone"`, its own maskable icon so it isn't visually identical to the marketing PWA), declared in `app/hub/layout.tsx` metadata — Next merges nested metadata so it overrides for `/hub` only. **Do not touch `public/site.webmanifest`**, which is the marketing site's.

Hand-write `public/hub/sw.js` (~150 lines), registered with `{ scope: '/hub/' }` so it never intercepts the marketing site. **Not `next-pwa`** — this repo already carries `output: standalone`, `ignoreBuildErrors`, `ignoreDuringBuilds` and `patch-package`; another webpack-patching plugin buys little over code we control.

`supabase/migrations/20260811_set_logs_idempotency.sql` — `client_op_id UUID` + partial unique index. Replay does `ON CONFLICT (client_op_id) DO NOTHING` then returns the existing row, so a replayed request produces byte-identical output. The natural key `(session_id, exercise_uid, set_number)` is the better long-term index but **ships in a follow-up**, after a duplicate audit returns zero rows — hub and portal may both have logged the same set with different `logged_by`.

Two traps that will otherwise bite:
- **`logged_at`** is stamped `NOW()` server-side today. A set performed at 09:15 and replayed at 11:00 gets stamped 11:00, corrupting `lastPerformed` ordering and every trend. The queued payload must carry a client `logged_at`; routes accept it with guards (reject future, clamp to a sane window). Required API change.
- **Auth expiry** — the better-auth cookie can expire while offline, so replays 401. The SW must **park** the queue, not discard it, and surface "Sign in to sync 6 logged sets."

PB badges become **advisory and deferred**: sets saved offline show no PB pill; when the queue drains, replay responses feed one consolidated toast. Never compute PBs client-side offline — the client lacks cross-session history and would confidently lie.

**Scope limitation, stated up front rather than discovered later: offline is logging-only.** Structural edits are whole-blob `sessions.data` writes; replaying a stale blob after reconnect would silently revert everything else. Editing the plan requires a connection, with an explicit UI state saying so.

**VERIFY:** install to a real Android home screen. Airplane mode mid-session, log 6 sets, restore connectivity, confirm exactly 6 rows land and none double-insert on a forced replay.

### L6 — Microsoft Graph / Outlook `[GATE — blocked on Craig]`
**One-way push first** (hub → Outlook). `sessions.scheduled_at` is derived from a block pattern and belongs to the training plan; Outlook is a *view* of it. Two-way means reconciling "she dragged the event" against "session 7 of block 3", and the failure mode is a sync loop rewriting `scheduled_at`. Add a delta-query pull for moves and cancellations only if she asks for it.

`supabase/migrations/20260812_microsoft_graph_integration.sql` — `integration_tokens` (generic `provider`, unique index enforcing one connection) and `session_calendar_events` (`sync_hash` so the recurring job is a cheap no-op when nothing changed).

Routes: `app/api/integrations/microsoft/{authorize,callback,disconnect}`, `app/api/cron/sync-calendar` (reusing the `CRON_SECRET` bearer pattern from `app/api/cron/check-updates-due/route.ts:20-30`, every 15 min over `scheduled_at` in −1d…+60d), plus an on-demand fire from the sessions PATCH so rescheduling updates the calendar immediately. Settings UI at `app/hub/(protected)/settings/integrations/`.

Event body carries a deep link to `/hub/m/train/[sessionId]` — tapping the calendar event on her phone opens the installed PWA straight into the live session. Send UTC with `timeZone: "UTC"`; BST/GMT drift is the classic failure here. Set Graph's `transactionId` on create so cron and on-demand can't race into a duplicate.

**Craig's external actions — these block the lane:**
1. Entra ID → App registrations → New registration. **Confirm single-tenant (her own M365) vs "any org + personal Microsoft accounts" (an `outlook.com` address)** — it changes the authority URL and whether personal calendars work at all.
2. Redirect URI: `https://eternal-fitness.co.uk/api/integrations/microsoft/callback` + a localhost URI for dev.
3. Delegated Graph permissions: `Calendars.ReadWrite`, `offline_access`, `User.Read`. Grant admin consent. **Not Application permissions** — app-scoped `Calendars.ReadWrite` grants access to every mailbox in the tenant.
4. Client secret (max 24-month expiry — **diary the renewal**; expiry kills the sync silently).
5. Esther creates a dedicated "Eternal Fitness" calendar (deletable and re-syncable without touching personal events); store its `calendarId`.
6. Coolify env: `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, `MS_GRAPH_TENANT_ID`, `MS_GRAPH_REDIRECT_URI`.

**Two flags:** (a) Microsoft **rotates refresh tokens on use** — persist the new one on every refresh or the integration dies after the first. (b) These are bearer credentials to her whole calendar, in plaintext in the same Postgres as client PII and PAR-Q data; the pg shim's ubiquitous `select("*")` makes accidental exposure easy. Constrain reads to a server-only `lib/graph-client.ts`; no API route may return an `integration_tokens` row.

**De-risking option if the Azure registration stalls:** a read-only ICS feed at `/api/calendar/[token].ics` is ~5% of the work, needs no OAuth, and works in Google and Apple Calendar too. Downside: Outlook refreshes subscriptions on its own schedule (can lag hours) and events aren't editable. Ship it as a stopgap rather than letting the whole WO wait.

### L7 — Consolidation of genuinely-open items `[AUTO]` / `[GATE]`
Folded in from the registry sweep. **Highest-risk item first:**

- `[GATE]` **`eternal-fitness-staging` shares live SMTP/SendGrid/Resend credentials with production, and its DB is a real clone containing real client email addresses.** Testing any document or notification flow there could email an actual client. Needs scrubbing or credential separation. *(deferred `dmsm7yawu20`, still open)*
- `[AUTO]` `staging` branch is missing the INVALID_ORIGIN hotfix `5900785`. *(deferred `dmsncjmh0m8`, still open)*
- `[AUTO]` No canonical redirect between `www.` and apex — both serve 200 independently. *(deferred `dmsncjkumpj`, still open)*
- `[AUTO]` `app/blog/page.tsx` does `posts ?? []`, silently swallowing a failed DB query. *(surfaced in `dmsn3rmh3a4`, still open)*
- `[GATE]` GDPR WO (`wo-eternalfitness-gdpr-hub-documentation-2026-08-07`) is gated solely on DPA signatures + confirming Esther's ICO registration. **Left open per Craig 2026-08-10** — compliance gate, not engineering.
- `[GATE]` Blog migration decision `qmsn3c2purx` — `session_2` deletes rows, so it needs explicit sign-off. **Left open.**
- `[AUTO]` `.context/loop-status.md` has no entries since 2026-08-08 — three sessions of work are missing from the ledger.

Explicitly **not** folded in (different domain, would blow the scope): the ~10 design-reconciliation GATEs on the **marketing site** (distinct from L3b, which is hub-only), the HSBC bank-import lane (still blocked on a real statement sample), and the Trainerize-import questions (already answered/overtaken, see L8).

---

## L8 — Registry clear-down — DONE 2026-08-10

Per Craig: close everything except **new landing pages**, **blog post updates**, and **outstanding hub / client-portal work**. Executed directly against the registry (`wo resolve`, `wo status`, `wo new ... --status done`).

**Correction to the initial audit:** the first-pass scan of `deferred.jsonl` read only the earliest row per id and missed later append-only `"status":"resolved"` rows for the same id. Re-checked every candidate via `wo deferred-list` / `wo questions` (which correctly read latest-status-per-id) before acting. Five items I'd flagged as "keep open" turned out to be **already resolved in prior sessions** — no action needed, listed below for the record.

### Already resolved before this session (found during re-verification, no action taken)

| Item | Resolution on file |
|---|---|
| `dmsa7lse4ti` — EF portfolio page | Resolved 2026-08-02: "Craig decided 2026-08-01 EF stays at /case-studies/eternal-fitness, no portfolio move needed." |
| `dmsagoxpozw` — reusable warm-up/cooldown templates | Resolved 2026-08-04: confirmed delivered via `workout_templates` table + `workout-template-browser.tsx`. |
| `dmsbjks4t9h` — Tom plan, no description | Resolved 2026-08-02: "Craig confirmed Tom plan is done." |
| `dmsbjks98gs` — PB metric definition | Resolved 2026-08-02: Craig scoped PB = heaviest weight for reps / longest duration; build dispatched, Trainerize backfill split out separately. |
| `dmsbjksdy2q` — historical weights scope | Resolved 2026-08-02: scoped and combined into the same Exercise History build unit as PB records. |

### Closed this session

| Item | Action | Note |
|---|---|---|
| `dms93wflpqp` — EF case-study placement | `wo resolve` | Confirmed fine as-is by Craig, 2026-07-31 |
| `dmsd9zcg0ur` — hero "L4 QUALIFIED" badge clipping | `wo resolve` | Re-checked 2026-08-04, not reproducing |
| `dmsd9zckk4i` — marketing live-verification pass | `wo resolve` | Site live and in daily use |
| `dmsd9zcnv1x` — Lane C copy/content decisions | `wo resolve` | Resolved by Craig's 2026-08-04 decisions |
| `dmsiuq6y68l` — homepage "as featured in" banner | `wo resolve` | Shipped as the Featured & Reviewed band, `7b607bc`, 2026-08-09 |
| `dmslr240ebm` — homepage CTA band photo | `wo resolve` | Fixed in `d13edda`, 2026-08-09 |
| `dmsm7yatgwp` — `log_statement=ddl` on db-vps | `wo resolve` | Standing infra recommendation, not EF-specific — belongs on the infrastructure WO |
| `wo-eternalfitness-marketing-hub-followups-2026-08-07` | `wo status done` | All genuinely-open children individually resolved or moved to L7/open buckets above |
| 6 unregistered local WO files (`hub-consolidation-2026-07-20`, `design-reconciliation-2026-07-28`, `session-logging-2026-07-25`, `hub-design-alignment-session-editor-2026-07-26`, `hub-portal-mockup-audit-2026-07-30`, `template-deployment-audit-2026-07-29`) | `wo new ... --status done` | Registered retroactively so they stop reading as live; checkbox debt is bookkeeping, the work landed |

### Left open — falls inside Craig's three categories

| Item | Category |
|---|---|
| `dmsiv5xw7ok` — blind-fitness / cancer-rehab specialist copy (blocked on "no page exists yet to host this copy") | Landing pages |
| 5 unbuilt `exercise-for-health` sub-pages + the Specialist Training catalogue | Landing pages |
| `dmsn3rmh3a4` — `development.eternal-fitness.co.uk` blog lists 0 posts | Blog |
| `qmsn3c2purx` — apply the two unapplied blog migrations (`session_2` deletes rows — needs sign-off) | Blog |
| 27 unedited legacy WordPress posts pending Esther's voice review | Blog |
| `dmsbpoaa37f` — Resources module (calorie calculator + Soundboard toggle) never reviewed live | Client portal |
| `qmsj5fhxhs2` — verify template-grounded AI block generation live | Hub |

### Left open — real unresolved risks, flagged rather than closed per Craig's explicit call

| Item | Why it stays open |
|---|---|
| `dmsne8f7y99` — **EF database has no usable WAL archive** (`archive_mode=on`, `archive_command=/bin/true` — a no-op; no point-in-time recovery). Highest-consequence item in the registry given the 2h47m outage on 2026-08-08. | Craig to decide: set `archive_mode=off` to stop the false signal, or actually configure archiving. |
| `dmslr2efph1` — `CTABand.imagePosition` silent no-op on wide/short bands, affecting ~11 live pages | Real unfixed bug, not a decision — needs a code fix, not a close |
| `wo-eternalfitness-gdpr-hub-documentation-2026-08-07` | Gated on DPA signatures + Esther's ICO registration — compliance gate, not engineering |
| `dmsm7yawu20` — staging shares live email credentials | Absorbed as an `[AUTO]` fix in L7 — closes by being *done*, not dismissed |
| `dmsncjmh0m8` — staging missing hotfix `5900785` | Absorbed as an `[AUTO]` fix in L7 — closes by being *done*, not dismissed |
| `dmsncjkumpj` — no canonical www/apex redirect | Absorbed as an `[AUTO]` fix in L7 |

**VERIFY:** `wo active` returns only genuinely open work. Confirmed 2026-08-10.

---

## Migrations

| File | Lane | Contents |
|---|---|---|
| `20260811_exercise_uid.sql` | L2 | `set_logs.exercise_uid` + `exercise_name`; idempotent JSONB uid walk; ref→uid backfill |
| `20260811_set_logs_warmup_units.sql` | L4 | `is_warmup`, `weight_unit` |
| `20260811_set_logs_idempotency.sql` | L5 | `client_op_id` + partial unique index |
| `20260812_microsoft_graph_integration.sql` | L6 | `integration_tokens`, `session_calendar_events` |

No `CREATE POLICY` in any of them — the `authenticated` role doesn't exist on this instance and those statements fail.

---

## Verification

Per-lane VERIFY steps are inline above. Overall:

1. `npx tsc --noEmit` clean after every lane.
2. **Real-device pass** — install the PWA to an Android home screen, run a full session with a real client end to end. Not a desktop browser at 375px; the studio is the test environment.
3. **Migration safety** — every migration runs against a snapshot of prod data first, with the L2 backfill's unmatched-row count enumerated and explained before it runs for real.
4. **PB regression** — capture `personal_records` and a sample of `lib/progress.ts` trend output before L2 and after L4; they must be identical apart from the intended warm-up exclusions.
5. **Desktop non-regression** — the whole point of `/hub/m` is that `/hub/*` is untouched. Click-through the session editor, block detail, schedule and client detail after L2 and L4, since those share the refactored libs.
6. `/gate` before any push or merge; Design Parity Gate against the L3a mockups. L3b produces approved mockups only — its parity gate falls to the follow-on build WO.

---

## Open items for Craig

Not blocking the plan, but needed before the lanes they gate:

1. **L0 session with Esther** — five interaction questions a mockup can't answer.
2. **Azure app registration** (L6) — the six steps above; item 1 (tenant type) is the one that needs deciding first.
3. **Staging credential separation** (L7) — decision on scrub vs separate creds.
4. **Blog migration** `qmsn3c2purx` — `session_2` deletes rows.
5. Whether the ICS stopgap should ship regardless, as insurance against the Azure registration slipping.
6. **Two design sign-offs, not one** — L3a (mobile + 3 desktop states) gates the build and should come first; L3b (11 backlog screens + nav option A/B + the toolbar/icon system fixes) is a larger review that can follow at your own pace.
7. **L3b's nav decision needs reconciling with mobile** — `hub-nav-restructure.html` proposes no mobile nav in either option, and L3a introduces a bottom-tab shell. Whichever option you pick should account for both.
8. **WAL archive** (`dmsne8f7y99`) — decide whether to disable the false `archive_mode=on` signal or actually configure archiving. No point-in-time recovery exists on the EF database today.
