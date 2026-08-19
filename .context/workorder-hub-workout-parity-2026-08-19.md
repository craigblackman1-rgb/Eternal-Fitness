# Work Order: Hub workout parity close-out — 2026-08-19

OWNER: (empty until claimed)
SCOPE: eternal-fitness-website (app/hub/(protected)/** + components/hub/** —
       training-blocks list, workout-templates browser/editor/paste, session Est.
       duration, minor styling remnants. NOT the CR-EF-037 core — already built.)

## LEDGER
- 2026-08-19 — **G1 (promote staging → main) DONE.** Craig approved promotion.
  Merged staging (`4844c72`) into a fresh worktree branch and pushed to origin/main
  as `2c6c63d` (`ee1c21b..2c6c63d`). 44 files, +1597/−516. All 7 redesign lanes
  (SessionStatusPill wiring, Reopen, calendar spine, Sessions visibility, HubRail,
  screen sweep) now on main/live; Coolify webhook auto-deploys. tsc clean. Only
  conflict was the append-only `loop-status.md` ledger (resolved keeping both sides).
  Worktree + temp branch cleaned up. Remaining lanes (A–D below) now build off
  promoted main.

GOAL: Close the remaining design↔build deviance on the block/session/workout routes
      beyond what the CR-EF-037 redesign already delivers on staging — so that once
      staging is promoted to main/live, the hub matches the ef-control-hub mockups
      end to end.

## Why this WO exists (discovery made this session)

The user's report ("block/session/view workout route is nothing like the designs")
was cross-referenced against `D:\apps\design-systems\ef-control-hub\desktop\training\`.
Root finding: **the bulk of the deviance is NOT unbuilt work — it is the CR-EF-037
redesign, which is fully built and merged to staging (`4844c72`, 46 files, 1594
insertions) but was never promoted to main/live.** That promotion is the single
highest-value action and is Craig's GATE (below). This WO covers only what staging
does NOT already contain:

- **training-blocks list** (`PlanScheduleTable.tsx`) — untouched by staging.
- **workout-templates browser deeper parity** — staging only re-skinned the page
  header (`HubPageHeader`); the detail drawer + assign-from-browser, paste 3-step
  stepper, success pane, save dialog, start-blank entry and the difficulty facet
  change to Seated/Supported/Standing are NOT built.
- **Derived Est. duration** on the session screen — staging still renders the static
  `~N min · guide` chip from `estimated_minutes`; the mockup's live derived estimator
  is not built.
- **Minor styling remnants** — breadcrumb/back-link text labels, avatar initials,
  cancelled-row dimming, archetype label-map reconciliation.

MUST:
- Mockups in D:\apps\design-systems\ef-control-hub\desktop\training\ are the target;
  the app changes, not the mockups (all six mockups are already correct for this
  scope, incl. difficulty=Seated/Supported/Standing).
- Do NOT touch the CR-EF-037 core already on staging (SessionStatusPill wiring,
  Reopen, calendar spine, Sessions visibility) — it is correct and merely unpromoted.
- Style/structure only unless a unit explicitly carries a schema/API change.
- Reuse SessionStatusPill / deriveSessionStatus / lib/session-status.ts —
  never hand-pick a status colour. Keep client_op_id idempotency on every write.
- DO-SOP-010: own worktree per lane; staging → verify on development → main.
FORBIDDEN:
- app/(marketing)**, app/portal/(client-facing UI), public/site.webmanifest,
  lib/planAgentPrompt.ts, supabase/migrations/** (no new migration without GATE),
  components/ds/**, app/design-system.css.
- The CR-EF-037 core files listed under MUST — do not "improve" them in this WO.
DECIDE YOURSELF:
- Component-internal structure; exact copy/microcopy (sentence case, British English);
  how the Est. duration estimator is factored (must be derived from prescription:
  tempo×reps or held duration + one rest per set, shared rest per superset round,
  amber when over the slot, per-section estimates).
ASK FIRST (gates):
- **G1 — PROMOTE STAGING → MAIN/LIVE.** The CR-EF-037 redesign (`4844c72`) is
  deployed on development and verified, but main/live still runs the pre-redesign
  hub. Promoting it is a deploy = Craig's call (standing decision; open question
  qmszxi7xx6u). This should happen BEFORE or IN PARALLEL WITH the lanes below —
  without it the user's core complaint is unfixed regardless of these lanes.
- **G2 — difficulty→position/adaptation data source.** Lane E starts with the
  investigation: does Seated/Supported/Standing exist in the exercise library, or
  does it need a new workout_templates column (+ migration)? If no source exists,
  STOP and surface — schema decision, not a style fix.
- G3 — any new migration or DB write outside the above scope.

## DONE
- [ ] Staging promoted to main/live (G1) and the CR-EF-037 hub verified live.
- [ ] Training-blocks list has Programme + Progress columns, block-status vocab
      (incl. Do Not Train, via getBlockStatus not getScheduleStatus), avatar + a
      context-aware Open/Review/Continue action link.
- [ ] Workout-templates browser has a detail drawer + assign-to-client from browse
      (into-block selector); paste flow is the 3-step stepper (Paste → Review →
      Save/assign) with a success pane and save dialog; "Start blank" entry point
      exists; difficulty facet renders Seated/Supported/Standing (per G2).
- [ ] Session screen Est. duration is derived live from the prescription (per-section
      estimates, amber over slot) — no static `~N min · guide`.
- [ ] Minor sweep: back-link text labels, avatar initials, cancelled-row dimming,
      single archetype label map ("Mobility & Movement Quality" everywhere).
- [ ] tsc --noEmit clean; every lane's git diff --stat reviewed against FORBIDDEN/MUST.

## LANES
- Lane A — Training-blocks list            · depends on: none
- Lane B — Workout-templates browser parity · depends on: none (G2 investigated first)
- Lane C — Derived Est. duration estimator  · depends on: none
- Lane D — Minor styling sweep              · depends on: A, B, C (shared files)

## UNITS
### Lane A (training-blocks list)
- [AUTO] Fix Approval column status map: getScheduleStatus → block-status vocabulary
  (Active/Awaiting review/Draft/Completed/Do Not Train); reconcile with the filter
  dropdown — files: app/hub/(protected)/training-blocks/PlanScheduleTable.tsx — VERIFY:
  filter "Approved" pill matches the row pill; "Do Not Train" renders danger.
- [AUTO] Add Programme + Progress columns (progress bar + "X of Y", "Not started"/
  "Blocked" fallbacks); avatar initials in the client cell; context-aware
  Open/Review/Continue action link — files: PlanScheduleTable.tsx,
  training-blocks/page.tsx — VERIFY: two new columns render against real data.

### Lane B (workout-templates browser parity)
- [AUTO] Detail drawer + assign-to-client from browse (client select with condition
  descriptor, into-block selector: next available block / new block) — files:
  workout-templates/workout-template-browser.tsx, [id]/TemplateEditorClient.tsx —
  VERIFY: assign a saved template without the paste flow.
- [AUTO] Paste 3-step stepper + success pane + save dialog; assign available from
  review step; "Start blank" entry point — files: workout-templates/new/TemplatePasteClient.tsx,
  new/page.tsx, page.tsx (split new-template menu) — VERIFY: Paste → Review → Save/assign
  progression; blank creation reachable.
- [AUTO] Difficulty facet → Seated/Supported/Standing (per G2 resolution) — files:
  workout-template-browser.tsx, TemplateEditorClient.tsx — VERIFY: filter options and
  table pills agree; no numeric 1–5 labels remain.

### Lane C (derived Est. duration)
- [AUTO] Derived Est. duration estimator replacing static estimated_minutes — files:
  sessions/[sessionNum]/SessionWorkoutLog.tsx, lib/prescription.ts — VERIFY: editing
  tempo/reps/rest moves the figure live; per-section estimates; amber over the slot.

### Lane D (minor styling sweep)
- [AUTO] Breadcrumb/back-link text labels, avatar initials, cancelled-row dimming,
  archetype label-map reconciliation ("Mobility & Movement" → "Mobility & Movement
  Quality" everywhere) — files: blocks/[blockId]/page.tsx, sessions/[sessionNum]/page.tsx,
  training-blocks/PlanScheduleTable.tsx — VERIFY: grep proves a single label map; no
  bare chevron back-links on these routes.

CONTEXT: parity review of ef-control-hub/desktop/training/* vs live routes (this
session); assessment-workout-unification-2026-08-17.md Part 3–4; CR-EF-037 G2 signed
2026-08-19; G1 promotion landed on main as `2c6c63d` (see LEDGER above). Related:
wo-ef-sessions-blocks-full-build-2026-08-19 (done, now on main),
wo-ef-workout-consolidation-pwa-2026-08-15 (GATED; ledger merge conflict resolved this
session). CRs: CR-EF-011/031/032/036/037/039/040.