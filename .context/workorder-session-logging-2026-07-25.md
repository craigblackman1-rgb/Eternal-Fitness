# Work Order: Eternal Fitness — Session Logging (Trainerize Replacement) — 2026-07-25

OWNER: (cleared — Lanes A, B, C, D all DONE + DEPLOYED 2026-07-25; only Craig-decision GATE items remain open, no further build work pending on this Work Order.) **Lanes A, B, C all DONE + DEPLOYED same day** (commits `b67163c`/`deed2d4`/`da21c2c`, live on `staging.eternal-fitness.co.uk`, Coolify confirmed `running:healthy`). `delivery_mode` toggle added to client edit page same day (`f6cf896`). **Lane D (session scheduling & calendar) also DONE + DEPLOYED 2026-07-25** (`1f057d0`/`dd15bb3`) — see below. **Follow-up fix 2026-07-25 (later, separate session, commit `77f5861`, live via `f25b98c`):** Lane D's "Review & Approve" link on the block page only rendered for draft blocks, orphaning the `/review` route's scheduler entirely once a block was approved — the block page now shows a persistent "Schedule" link post-approval, and the review page hides the Approve action (which would otherwise hit the API's existing 400-on-re-approve guard) once a block is no longer draft. Not yet click-tested live.
**Remaining open, not build work — all genuine GATE decisions for Craig:**
- Whether the "haven't logged in N days" nudge auto-sends to the client or generates an Esther-reviewed draft (detection/flagging is built either way).
- Assigning any real client to `delivery_mode='home_training'` and inviting them to self-log — currently SQL-only, no hub UI toggle exists yet (flagged, not built, in Lane B).
- A live, logged-in click-test of Lanes A–D and the follow-up fix above — nothing in this Work Order has been walked through in a real browser session yet.
SCOPE: `eternal-fitness-website` (`D:\apps\eternal-fitness-website` — new DB schema for logged sets, hub session-detail page, client portal, Plan Agent output shape); Eternal Fitness production Postgres (`eternal_fitness` DB, via Coolify SSH tunnel `127.0.0.1:5433`). No other repo touched. Registry: `infrastructure/.context/active-workorders.md` (no scope overlap with the current cleared hub-consolidation Work Order at this repo — same repo, different tables/pages, safe to run as its own Work Order per that registry's own guidance).

GOAL: Replace Trainerize as the client-delivery/progress-tracking layer, in two tracks that ship together:
1. **Esther-side live logging (primary, day-one use case)** — during a 1:1 studio session, Esther logs each set (reps, weight, done/skipped) against the prescribed plan, fast enough to use mid-session on a phone/tablet.
2. **Home-training client self-logging (a real, planned subscription tier, not hypothetical)** — a client on this tier follows their plan in the portal without Esther present and logs their own sets the same way.

Both feed the same underlying data so a **progress/trend view** can be shown to **both Esther (hub) and the client (portal)** — working weight/reps per exercise over the block, not just a compliance tick.

Source docs: `EF_Trainerize_Accessibility_Scope_Jul2026.md` (OneDrive workspace repo — this Work Order executes that charter's Phase 1, "Client portal MVP," but scoped tighter per Craig's answers below — no e-sign, no messaging, no accessibility-first pass yet, those stay parked as later phases). `workorder-eternal-fitness-hub-consolidation-2026-07-20.md` (this repo — Lane D built the portal as read-only; this Work Order is the first thing to add write capability to it).

## Decisions already made (2026-07-25, Craig, via clarifying questions — do not re-litigate)
- **Logging granularity: per set.** Each set is its own logged record (reps, weight_kg, completed/skipped) — not one record per exercise, not one per whole session. This is the only granularity that supports a real progress view later.
- **Weight units: kg only.** No lbs toggle.
- **Non-weight exercises are real**: bodyweight/time-based exercises (planks, cardio intervals) need a duration or reps-only logging path — the schema must not force a meaningless weight field on every exercise.
- **Esther logs live, during the session**, on a phone/tablet in the studio — the UI's primary design constraint is speed/thumb-friendliness, not completeness. A written-up-afterward correction path must also exist (editable, not append-only).
- **Home-training tier is real and must be built now**, not deferred — a client on this tier gets their own logging UI in the portal, following the plan without Esther present.
- **Progress/trend view is in scope now**, shown to both Esther (hub, per client) and the client (portal, their own data only).
- **Out of scope for this Work Order** (stay parked in the charter's later phases): two-way messaging/check-in, e-sign agreements, accessibility-first pass (voice-input logging, high-contrast mode, SR-tested read order — the charter frames this as a distinct commercial phase, deliberately not bundled in here), push/reminder notifications.

## MUST
- Prod DB writes (new tables, migration run) need Craig's explicit per-session go-ahead — same standing pattern as every prior lane in this repo.
- No weight/reps/duration data lost or silently dropped when converting the existing `session_log` (whole-session RPE/fatigue/notes) — that record stays; per-set logging is additive, not a replacement of it.
- A client's delivery mode (1:1 studio vs. home-training) must be an explicit field on their record, not inferred — gates whether the portal shows a "log your session" UI at all. Every existing client defaults to 1:1 studio (no behaviour change for current clients) unless Craig/Esther flip a client to the home-training tier.
- Client-side logging writes are scoped to the client's own data only (same pattern as the existing document-portal read access) — this is a new write surface on the portal, not just a new read view, so it gets the same access-control scrutiny Lane D's auth got.
- Progress view must not rely on parsing the `sessions.data` JSON blob at query time for trend charts — the new logged-set data should be stored in a way that's directly queryable (normalized rows), even though the *prescription* stays as-is in the JSON blob.
- Hard rules from the project `CLAUDE.md` apply throughout — no clinical-language drift in any client-facing logging UI, verify equipment before any exercise-cueing text.
- Exercise-media gap (only ~365 of ~2,591 exercises are tagged/have video) is a known, accepted risk for home-training — Craig's call 2026-07-25: use the full library as-is, link to video where present, backfill missing videos as a separate ongoing content task. Does not block this Work Order.
- A "haven't logged in N days" nudge is in scope (Craig confirmed 2026-07-25) but is automated, client-facing communication — this conflicts with the standing hard rule elsewhere in this repo that client-facing comms are generated → reviewed by Esther → sent, never auto-sent. Do not build this as a silently-auto-sent email/notification without resolving that conflict first — see ASK FIRST.

DECIDE YOURSELF: exact schema/table names for logged sets (must satisfy: per-set granularity, weight_kg nullable, duration_seconds or reps-only path for non-weight exercises, completed/skipped flag, logged_by trainer/client, timestamp); UI layout for the live quick-log flow (must satisfy: usable one-handed, defaults pre-filled from the prescribed sets/reps so Esther is confirming not retyping); where the progress/trend view lives in the hub (Tracker tab is the natural home per the existing pattern, but confirm it doesn't further conflate with the medical-compliance meaning that tab already has — consider a distinct tab/section if it would collide); exact portal UI for home-training client logging, reusing existing portal component patterns.

ASK FIRST (`[GATE]`):
- Craig's sign-off to start this Work Order at all.
- Any migration run against production Postgres (new logged-set tables, `clients` delivery-mode field).
- Adding write capability to the client portal for the first time (new attack surface — portal has been read-only since Lane D).
- Assigning any real client to the home-training tier / inviting them to self-log (first real use of the new client-write surface).
- Any decision to pull the accessibility-first pass or messaging/e-sign phases forward into this Work Order's scope.
- Whether the "haven't logged in N days" nudge auto-sends to the client, or generates a draft Esther reviews/sends — a real decision, not a default, given the standing no-auto-send pattern elsewhere in this repo. Build the detection/flagging logic regardless (Lane C), but gate the actual send mechanism on this answer.

## Open items — resolved 2026-07-25
- **Exercise scope for home-training**: use the existing hub exercise library as-is (all ~2,591 exercises, not restricted to the ~365 tagged/video ones) — each exercise links out to its video where one exists; missing videos get added to the library over time as a separate, ongoing content task, not a blocker for this build. Plan Agent does **not** need a home-training-specific exercise filter.
- **Adherence nudge: in scope.** A home-training client who hasn't logged in N days gets a nudge (exact channel/threshold — DECIDE YOURSELF, see below). Esther-side visibility of "this home-training client's gone quiet" also belongs in Lane C's hub view, not just a client-facing notification.

## LANES (dependency graph)
- **Lane A — Data model & Esther-side live logging** — no dependencies, start first. New `set_logs` (or equivalent) table, `clients.delivery_mode` field, hub session-detail page gets a per-set quick-log UI alongside the existing prescription table, existing `session_log` (RPE/fatigue/notes) untouched.
- **Lane B — Home-training client self-logging** — depends on Lane A's schema (reuses the same `set_logs` table with `logged_by='client'`); adds portal write UI, scoped to clients flagged `delivery_mode='home_training'`.
- **Lane C — Progress/trend view** — depends on Lane A + B landing (needs real logged data to query); one view surfaced in both the hub (per client) and the portal (client's own data).

## UNITS

### Lane A — Data model & Esther-side live logging — **DONE + DEPLOYED 2026-07-25**
- [x] `set_logs` schema built (`supabase/migrations/20260725_session_set_logs.sql`): `id, session_id (FK sessions, ON DELETE CASCADE), exercise_ref, set_number, reps, weight_kg, duration_seconds, completed, logged_by ('trainer'|'client'), logged_at, notes, created_at`. `exercise_ref` convention: `<version>:<section>:<index>:<exercise_name>` (documented in the migration). Real bug caught on review before migrating: OpenCode's first draft added `CREATE POLICY ... TO authenticated` — the exact Supabase-role bug already found twice in this repo (Lane I/K) — fixed to the confirmed no-RLS/app-layer-auth pattern.
- [x] `clients.delivery_mode` added (`'studio_1to1'` default | `'home_training'`), additive, no existing client's behaviour changed. **Migrated to prod and verified** — 0 non-default rows, `set_logs` table live with 0 rows.
- [x] Live quick-log UI on the session-detail page — per-exercise "Log" button opens a per-set panel (one row per prescribed set, defaults pre-filled, empty-tap ✓ logs as prescribed, 44px targets). Existing prescription tables/Session Log card untouched.
- [x] `app/api/sessions/[id]/set-logs/route.ts` (GET/POST/PATCH), staff-auth-gated, matches the existing sessions route's pattern. Edits after the fact supported (PATCH), not append-only.
- [x] Migration run against production Postgres — verified live (schema + row counts), Craig's go-ahead.
- [x] Pushed to `main` (`b67163c`, fast-forward from an isolated worktree per DO-SOP-010), Coolify deployment confirmed `finished`/`running:healthy`.

### Lane B — Home-training client self-logging — **DONE + DEPLOYED 2026-07-25**
- [x] Portal UI (`/portal/training`) for a `delivery_mode='home_training'` client to view their current block/session and log sets — gated end-to-end: nav link only rendered for `home_training` clients, server-side `redirect("/portal")` for anyone else. `studio_1to1` clients see nothing.
- [x] Security boundary independently verified (not just self-reported): every read/write re-checks `sessions → blocks → clients` ownership against the authenticated portal `clientId` server-side; `logged_by` hardcoded `'client'` (never trusts client input); PATCH restricted to `logged_by='client'` rows so a client can never edit Esther's logs.
- [x] Exercise display links to `video_url` where present (`Exercise.media` first, falls back to a by-name match against the `exercises` library); no video → coaching-cue text only, no broken video element. Full library in scope, per Craig's 2026-07-25 call — no Plan Agent filtering.
- [x] Pushed to `main` (`deed2d4`, rebased onto an unrelated same-day push first). No migration needed (reuses Lane A's schema).
- Gap flagged, not fixed: no hub UI yet to flip a client to `delivery_mode='home_training'` — SQL only for now.
- [ ] Flipping any real client to `delivery_mode='home_training'` / first real self-logging use — still `[GATE]`, not done.

### Lane C — Progress/trend view — **DONE + DEPLOYED 2026-07-25**
- [x] Per-exercise trend view (`lib/progress.ts` pure aggregation, `components/progress/ExerciseTrendsPanel.tsx`) — hub version (new "Progress" tab on client detail, deliberately separate from Compliance/Tracker's medical-compliance meaning) and portal version (client's own data, dashboard section). Exercise identity aggregates by name only, so studio- and home-logged sets against the same exercise combine correctly. Empty/sparse-safe throughout.
- [x] Placement decision made and documented in-code: a brand-new "Progress" tab, not the Tracker page — confirmed by reading Tracker's actual content first (medical-compliance only) rather than assuming.
- [x] "Gone quiet" detection (`lib/progress-db.ts`, `HOME_TRAINING_QUIET_DAYS = 7`, named constant) — surfaces as a `HubAlert` on both the hub dashboard and the client detail page for `home_training` clients with no self-logged set in 7 days. Esther-facing only.
- [ ] Client-facing nudge send mechanism — still `[GATE]`, not built, per the ASK FIRST item below. Detection/flagging only, as scoped.
- [x] Pushed to `main` (`da21c2c`, rebased onto Lane B — one real merge conflict in `lib/portal-data.ts`, both lanes' methods kept, resolved and re-verified). Real environmental finding during verification, not a regression: a build-time `ECONNREFUSED` appeared because no worktree has `.env.local` (gitignored) — confirmed via `git stash` that the baseline has the same gap, and the new code degrades to `[]` exactly as designed rather than crashing. Production has real env vars via Coolify, so this doesn't occur live.

### Lane D — Session scheduling & calendar (added 2026-07-25, Craig-directed, not in original scope)
Craig: there is currently no way to see when a block's sessions are actually booked for — the hub tracks `session_number`/`week`/`phase` only, real booking happens entirely in Outlook today, separate from this app. Ask: a studio-wide calendar showing who's training when, plus a per-client list of their sessions with dates, both editable (move/cancel/reschedule) — to prove out the method before any longer-term Outlook sync. Confirmed via investigation: **zero scheduling data exists anywhere in this codebase** — no date field on `sessions`/`blocks`, no calendar UI, no calendar library in `package.json`, no Outlook/Graph/ICS integration of any kind. This is genuinely new capability, not an extension.

**Decisions locked (2026-07-25, Craig, via clarifying questions):**
- **Bulk repeating pattern for initial scheduling.** Esther sets a pattern once per block (days of week + time, start date) and every session in that block gets a `scheduled_at` assigned in sequence automatically; she adjusts individual sessions afterward as needed. Not one-at-a-time manual entry for every session.
- **Double-booking: warn, don't block.** Overlapping sessions across different clients are flagged visually but still savable — no hard validation error.
- **Cancel/reschedule: no automatic side effects.** Cancelling sets a status + optional free-text reason; rescheduling just changes `scheduled_at`. No renumbering, no auto-generated makeup session, no client-facing email triggered by this lane.

MUST (Lane D specific, in addition to the standing MUST list above):
- Additive schema only — `scheduled_at`/cancellation fields on `sessions`, no change to the existing prescription (`data` JSONB) or the existing `session_log` (RPE/fatigue/notes/`completed_at`) concept. A session's "scheduled for" date and its "actually completed" record are two different things — don't conflate them.
- Every existing session row defaults to unscheduled (`scheduled_at IS NULL`) — no existing block/session's behaviour changes until Esther actually applies a pattern to it.
- Conflict detection compares a session's `scheduled_at` + an estimated duration (derive from `time_tier`: compact ~45m / standard ~60m / extended ~75–90m — reuse whatever the existing print/review pages already use for that mapping, don't invent new numbers) against every other client's scheduled sessions on the same day.
- Studio-wide calendar and per-client list are both required (not one or the other) — Craig asked for both explicitly.

DECIDE YOURSELF: exact new column names/types on `sessions` (must satisfy: nullable `scheduled_at`, a cancelled flag + optional reason, no loss of existing data); calendar view granularity (day/week) and layout — no existing calendar library in this repo, so build a simple grid/list view with existing hub design tokens rather than pulling in a new dependency unless there's a strong reason; where in the hub nav the calendar lives (a new top-level route seems right, e.g. `/hub/schedule` — check `HubSidebar.tsx` for the existing nav-item pattern before adding one); exact UI for the "apply a repeating pattern to this block" action (a button on the block review/detail page is the natural home — check what's already there before adding a new page).

ASK FIRST (`[GATE]`, in addition to the standing list above):
- Any migration run against production Postgres for the new scheduling fields.

## UNITS — Lane D — **DONE + DEPLOYED 2026-07-25**

- [x] Added `scheduled_at TIMESTAMPTZ NULL`, `cancelled_at TIMESTAMPTZ NULL`, `cancel_reason TEXT NULL` to `sessions` (`supabase/migrations/20260725_session_scheduling.sql`) — additive, no backfill, every existing row NULL/unscheduled. **Migrated to prod and verified**: 0 non-null scheduling rows. No RLS policies added (follows the confirmed app-layer-auth pattern — correctly avoided the authenticated-role bug this time).
- [x] "Apply a repeating pattern to this block" (`BlockScheduler.tsx` on the block review page) — day-of-week multi-select + time + start date, assigns `scheduled_at` across all of a block's sessions in `session_number` order via a pure `generatePatternDates()` algorithm (`lib/scheduling.ts`). Re-applying overwrites. Verified: cycles weekdays correctly, terminates via a guard cap, rejects 0-day selection.
- [x] Per-block session list with reschedule (date+time), cancel (optional reason), and un-cancel (reversible) — same `BlockScheduler.tsx`, reusing the extended `sessions` PATCH route (field whitelist: `data`, `scheduled_at`, `cancelled_at`, `cancel_reason` — tightens what was previously a wide-open `update(body)`).
- [x] Studio-wide calendar (`/hub/schedule`, new nav entry under Overview) — day view with prev/next/date-picker, every client's scheduled (non-cancelled) sessions joined through `blocks`→`clients`, duration from `sessionDurationMinutes(time_tier)` (shared constant, reused from the per-block lane). Pairwise conflict detection flags overlapping time ranges across different clients (warn only, matches the locked decision) using existing `HubAlert`/status-warning tokens.
- [x] Migration run against production Postgres — verified live, Craig's go-ahead (standing per-Work-Order approval).
- [x] Pushed to `main` in two commits: `1f057d0` (schema + per-block scheduler), `dd15bb3` (studio calendar, built on top). Both independently verified (`tsc`/build, diff review) before push — no fixes needed this time (the RLS-authenticated-role mistake from earlier lanes was correctly avoided).
- [x] **Follow-up, 2026-07-25 (later):** Craig reported he couldn't find the "Review" button on an already-approved block. Root cause: the link to `/review` (where `BlockScheduler.tsx` lives) only rendered for `status === "draft"`; the review page's "Approve Block" button also had no draft guard, so it would have thrown against the API's existing `400 "Block is already X"` check if clicked post-approval. Fixed both (`77f5861`, deployed via `f25b98c` after an unrelated same-day commit landed first): block page now always links through, labelled "Schedule" once approved; review page hides the Approve action and shows the block's real status once it's no longer draft. `tsc --noEmit` clean, built in worktree `D:\apps\worktrees\eternal-fitness-website-fix-schedule-link` (branch `fix/block-schedule-link`, off fresh `origin/main`), fast-forward pushed. First deploy attempt hit a one-off infra failure (SSH exec dropped mid-`next build`, exit 255, no compiler error) — retried and it built/deployed clean, confirmed `running:healthy`. **Not click-tested live.**

## LEDGER
Progress written to this repo's `.context/handoff.md` and this file's DONE checklist as units complete.

## CONTEXT
- **Reality check on today's data model**: plans are prescribed sets/reps/tempo/rest inside a JSON blob per session row (`sessions.data`); there is currently zero "actually performed" data at set/exercise granularity anywhere — the only existing "actual" record is a whole-session RPE/fatigue/notes field Esther fills in herself in the hub. This Work Order is genuinely new capability, not an extension of an existing logging path.
- **Portal reality check**: the client portal (`app/portal/(protected)/*`) currently shows only signed/outstanding documents and update-email history — zero plan/session content. Lane B is the first time any plan/session data reaches the portal at all.
- **Exercise media reality check**: ~365 of ~2,591 exercises (14%) have video and full tagging; the rest are thumbnail-only or completely untagged. This matters more for home-training (no trainer present to demo/cue) than for Esther's live logging.
