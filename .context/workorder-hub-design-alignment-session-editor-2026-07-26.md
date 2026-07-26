# Work Order: Hub Design-System Alignment + Session/Workout Editor — 2026-07-26

OWNER: (empty — Lane H built 2026-07-26 by Claude Code, session closed before claiming formally; other
7 lanes untouched, not started)
SCOPE: `eternal-fitness-website` (`D:\apps\eternal-fitness-website` — every `/hub/*` route and the
client-detail tabs; new route `app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/page.tsx`
gets real new functionality, everything else is presentation-layer diff-and-merge only). Read-only
reference: `D:\apps\design-systems\brand-staging-2662e9`. No DB migration expected (session-editor
writes reuse the existing `sessions.data` JSONB shape — confirm before writing, see ASK FIRST).
Registry: `D:\apps\infrastructure\.context\active-workorders.md`. No scope overlap with the cleared
2026-07-20 hub-consolidation WO or the cleared 2026-07-25 session-logging WO in this same repo — both
are closed, different units of work, but log this WO in the registry before starting per SOP-008.

GOAL: Every hub route and the client-detail tabs visually match their approved Open Design mockup
(presentation-layer only — no data-flow changes to pages that already work), and the session page
gains a real, working session/workout editor per `hub-session-editor.html` and `.context/brief-session-editor-opendesign.md`.

MUST
- For every [EXISTS] route below: read the live component fully, read the matching mockup fully,
  apply ONLY presentation-layer refinements the mockup demonstrates that the live version lacks —
  layout, spacing, copy, icon choices, empty/error states, badge treatments. Keep every existing
  prop, data fetch, API call, and event handler untouched. If a mockup detail conflicts with
  something the live page already does correctly for a real reason, keep the live behaviour and log
  the conflict in the ledger rather than silently overriding it.
- Build the session/workout editor as real functionality, per the brief already written
  (`.context/brief-session-editor-opendesign.md`) and the mockup (`hub-session-editor.html`):
  - Edit mode is a toggle on the same page, not a separate route.
  - Studio and Home prescriptions edited independently; switching versions locked mid-edit.
  - Reorder within a section via drag-and-drop with up/down-arrow fallback.
  - Move an exercise between sections via drag across a section boundary OR a per-row
    "⋯ → Move to…" menu — support both.
  - Add exercise reuses the existing Swap-exercise library picker's component/pattern, with a
    position selector.
  - Remove exercise per row, confirm before removing.
  - Inline edit of sets/reps/tempo/rest directly in the row — no separate dialog.
  - Superset (`group_label`, Main Block only) drags as one atomic unit; the only way to break one is
    an explicit Move/Remove on a member, which must auto-clear `group_label` on the remaining
    member(s) and surface a visible toast/banner that the superset was resolved.
  - Do NOT build "create a new superset from scratch" — explicitly out of scope.
  - Existing Swap-exercise dialog, video-URL field, and per-set logging flow on this page keep
    working exactly as today — additive only.
  - No "apply to future weeks" propagation anywhere in this UI.
  - Before wiring state, read the real `sessions` table shape / `types.ts` for actual field names —
    match the real schema, not the mockup's placeholder variable names.
- Reuse the existing hub component library (HubCard, HubCardHeader, HubTable, HubDataGrid,
  StatusBadge, EmptyState, HubAlert, etc.) and existing CSS tokens — no new hex values, no new
  component pattern where an existing one already does the job.
- HubSidebar.tsx's nav is already correct (every mockup's sidebar was copied from it verbatim) — do
  not change the nav.
- Standing repo rules apply throughout: prod DB writes/migrations are `[GATE]`; work happens in an
  isolated git worktree per DO-SOP-010, never the shared checkout; verify before ticking done (real
  `tsc`/`next build`, diff review — not self-report).
- **Disk safety (2026-07-25 incident repeat-prevention):** a prior Work Order (`decoded-data-app`,
  2026-07-25) filled a drive to 0 bytes free from ~24 stale worktrees each carrying its own full
  `npm install`'d `node_modules` (~12–13GB apiece). D: has ~93GB free right now — 8 lanes × a fresh
  install each would repeat that failure. Every worktree in this Work Order MUST reuse the shared
  checkout's `node_modules` via a junction (`New-Item -ItemType Junction`) rather than running its
  own `npm`/`pnpm install` — installs are `[GATE]` anyway per standing rules, so this is also just
  the correct default, not a workaround. Remove the junction (not the real `node_modules`) and the
  worktree itself immediately after each lane merges — don't let them accumulate. Check `Get-PSDrive`
  free space before opening a new worktree if more than ~4 are open at once, and cap active worktrees
  for this Work Order at 4 concurrent to keep headroom regardless of the junction trick working as
  expected.

DECIDE YOURSELF
- Whether a given visual refinement is worth porting into an already-working page vs. leaving it
  as-is because the difference is cosmetic and not worth the diff/regression risk.
- Exact drag-and-drop implementation for the session editor (library vs. hand-rolled), as long as
  the required behaviour holds.
- Phasing/PR grouping — the LANES below are a starting split, not a mandate; merge or split lanes if
  a cleaner grouping emerges once the diffs are in hand.

ASK FIRST (`[GATE]`)
- Any change to the sessions/blocks data model (new columns, migrations) — confirm the session
  editor's actual requirements against the real schema before altering it; the brief's working
  assumption is that this is additive-in-place to the existing `sessions.data` JSONB, no migration
  needed, but confirm once the real shape is read.
- Anything that would change existing client-facing behaviour on pages already in production use
  (compliance status logic, payment/package fields, portal auth) — out of scope for a visual pass.
- Force-push, DB migrations, or anything Craig's standing rules already gate.
- Push/deploy of each lane once built and independently verified — standard pattern in this repo,
  confirm Coolify auto-deploy status for this app before assuming a push alone ships it live.

## DONE
- [ ] Lane A (Dashboard + Clients list) matches its mockup, live-behaviour preserved, pushed+deployed
- [ ] Lane B (Client detail — all 7 tabs) matches its mockup, live-behaviour preserved, pushed+deployed
- [ ] Lane C (Client edit + PAR-Q edit) matches its mockup, live-behaviour preserved, pushed+deployed
- [ ] Lane D (Exercise library + Site content + Site content editor) matches mockups, pushed+deployed
- [ ] Lane E (Process & Quality + Reports/Updates) matches mockups, pushed+deployed
- [ ] Lane F (Settings: studio-equipment, training-rules, plan-agent) matches mockups, pushed+deployed
- [ ] Lane G (Tasks + Schedule) matches mockups, pushed+deployed
- [~] Lane H (Session/workout editor) — built + PUSHED 2026-07-26 (`d105e29` on `origin/main`),
      `tsc`/lint/compile clean, real schema confirmed before wiring, superset resolve-on-break logic
      in place, confirm-before-remove added. **Not fully done**: not live-click-tested (no hub
      credentials available), built and committed directly in the shared checkout rather than an
      isolated worktree (DO-SOP-010 deviation — Craig confirmed push anyway), deploy status not
      independently confirmed (no Coolify MCP access this session). See `.context/handoff.md`
      2026-07-26 entry for full detail.
- [ ] Every lane independently verified (`tsc --noEmit` + `next build` + hand diff review, not
      self-report) before merge
- [ ] Craig has a per-route report for each landed lane (not one silent batched pass)

## LANES
(Independent — no shared files between lanes below except HubSidebar.tsx, which nobody touches. Run
in parallel, one worktree per lane per DO-SOP-010. Lane H is the only one with real new logic; do it
either first — to surface schema/API questions early — or last, Craig's call, no dependency either way.)

- Lane A — Dashboard + Clients list · depends on: none
- Lane B — Client detail (7 tabs) · depends on: none
- Lane C — Client edit + PAR-Q edit · depends on: none
- Lane D — Exercise library + Site content (+ editor) · depends on: none
- Lane E — Process & Quality + Reports/Updates · depends on: none
- Lane F — Settings (studio-equipment, training-rules, plan-agent) · depends on: none
- Lane G — Tasks + Schedule · depends on: none
- Lane H — Session/workout editor (new build) · depends on: none (independent file, only reads
  existing swap/video/logging code, doesn't modify it)

## UNITS

### Lane A — Dashboard + Clients list
- [AUTO] Diff `hub-dashboard.html` against `app/hub/(protected)/page.tsx`; merge presentation-only
  changes — files: `app/hub/(protected)/page.tsx` (+ any dashboard-only subcomponents) — VERIFY:
  `tsc --noEmit` clean, `next build` clean, hand diff confirms every existing data fetch/prop/handler
  untouched, Craig gets a before/after note on what changed
- [AUTO] Diff `hub-clients.html` against `app/hub/(protected)/clients/page.tsx`; merge
  presentation-only changes — files: `app/hub/(protected)/clients/page.tsx` — VERIFY: same as above

### Lane B — Client detail (Overview/Profile/Compliance/Training/Progress/Plan Agent/Updates)
- [AUTO] Diff `hub-client-detail.html` against `app/hub/(protected)/clients/[id]/page.tsx` and its
  tab subcomponents (Training/Progress are already server-side via `ExerciseTrendsPanel`/
  `buildExerciseTrends` — do not re-fetch or re-architect, presentation only); merge per-tab —
  files: `app/hub/(protected)/clients/[id]/page.tsx` + tab components — VERIFY: `tsc --noEmit` +
  `next build` clean, each of the 7 tabs hand-diffed individually (this is the largest/highest-risk
  lane — go tab by tab, not one giant diff), existing compliance-status logic and payment/package
  fields confirmed byte-identical (ASK FIRST item — ping Craig if the mockup implies a change here)

### Lane C — Client edit + PAR-Q edit
- [AUTO] Diff `hub-client-edit.html` against `app/hub/(protected)/clients/[id]/edit/page.tsx`; merge
  presentation-only — files: that page — VERIFY: `tsc --noEmit` + `next build` clean, existing form
  fields/validation/submit handler untouched
- [AUTO] Diff `hub-parq-edit.html` against `app/hub/(protected)/clients/[id]/parq/[parqId]/edit/page.tsx`;
  merge presentation-only — files: that page — VERIFY: same as above

### Lane D — Exercise library + Site content
- [AUTO] Diff `hub-exercise-library.html` against `app/hub/(protected)/exercises/page.tsx`; merge
  presentation-only — VERIFY: `tsc --noEmit` + `next build` clean, existing search/filter/swap-picker
  behaviour untouched (Lane H's Add-exercise picker reuses this component — check it still matches
  after this lane lands)
- [AUTO] Diff `hub-site-content.html` against `app/hub/(protected)/site-content/page.tsx`; merge
  presentation-only — VERIFY: same pattern
- [AUTO] Diff `hub-site-content-editor.html` against `app/hub/(protected)/site-content/[slug]/page.tsx`;
  merge presentation-only — VERIFY: same pattern, existing save/publish flow untouched

### Lane E — Process & Quality + Reports/Updates
- [AUTO] Diff `hub-process-quality.html` against `app/hub/(protected)/process-quality/page.tsx`;
  merge presentation-only — VERIFY: `tsc --noEmit` + `next build` clean, existing DB-backed CRUD
  untouched
- [AUTO] Diff `hub-reports-updates.html` against `app/hub/(protected)/reports/updates/page.tsx`;
  merge presentation-only — VERIFY: same pattern, existing email-draft generation untouched

### Lane F — Settings
- [AUTO] Diff `hub-studio-equipment.html` against `app/hub/(protected)/settings/studio-equipment/*`;
  merge presentation-only — VERIFY: `tsc --noEmit` + `next build` clean
- [AUTO] Diff `hub-training-rules.html` against `app/hub/(protected)/settings/training-rules/*`;
  merge presentation-only — VERIFY: same, existing collapsible-chevron behaviour preserved
- [AUTO] Diff `hub-plan-agent-settings.html` against `app/hub/(protected)/settings/plan-agent/*`;
  merge presentation-only — VERIFY: same pattern

### Lane G — Tasks + Schedule
- [AUTO] Diff `hub-tasks.html` against `app/hub/(protected)/tasks/*` (`TasksManager.tsx` incl.);
  merge presentation-only — VERIFY: `tsc --noEmit` + `next build` clean, kanban drag/bucket-filter/
  My-Tasks toggle all still functional
- [AUTO] Diff `hub-schedule.html` against `app/hub/(protected)/schedule/*` (`BlockScheduler.tsx`,
  studio calendar); merge presentation-only — VERIFY: same, existing pattern-apply/reschedule/cancel
  and conflict-warning logic untouched

### Lane H — Session/workout editor (new build)
- [AUTO] Read the real `sessions` table shape / `types.ts` for actual field names (exercise list
  shape, `group_label` or equivalent, sets/reps/tempo/rest field names, studio vs. home version
  keys) before writing any state — files: `types.ts` / wherever `Session`/`SessionData` is defined,
  the `sessions` table's migration file — VERIFY: field names used in the editor match confirmed
  real names, not the mockup's placeholder JS variable names; if the shape implies any schema change
  is needed, stop and surface to Craig (ASK FIRST) before proceeding
- [AUTO] Build edit-mode toggle on the existing session page — files:
  `app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/page.tsx` (+ new
  subcomponents as needed) — VERIFY: toggling edit mode reveals drag handles/arrows/inline
  fields/section actions without disturbing the page's existing read-only rendering when off
- [AUTO] Studio/Home version lock during edit — VERIFY: attempting to switch version mid-edit is
  blocked with a visible reason; edits to one version never touch the other's data
- [AUTO] Reorder within a section (drag-and-drop + up/down arrow fallback) — VERIFY: reordering
  updates local state correctly for all three sections, arrow fallback produces identical results to
  drag
- [AUTO] Move exercise between sections (drag across boundary + "⋯ → Move to…" menu) — VERIFY: both
  paths produce the same resulting state; moving into/out of Main Block correctly
  applies/removes group eligibility
- [AUTO] Add exercise via the existing Swap-exercise library picker pattern, with a position selector
  — files: reuse picker component from the swap flow — VERIFY: search/filter behave identically to
  the existing swap dialog, added exercise lands at the chosen position
- [AUTO] Remove exercise per row with confirm-before-remove — VERIFY: confirmation dialog blocks
  accidental removal; removing a superset member triggers the group-resolution path below — **fixed
  2026-07-26, same session, after being caught missing on a re-read of this WO's own MUST list**:
  `AlertDialog` added around the kebab menu's "Remove from session" action, matching the existing
  `delete-block-button.tsx` pattern.
- [AUTO] Inline edit of sets/reps/tempo/rest directly in the row — VERIFY: edits persist in local
  state without opening any dialog, existing swap/video-URL/logging controls on the same row still
  render and function
- [AUTO] Superset atomic-drag + auto-resolve — VERIFY: a group_label'd superset moves as one unit
  during ordinary reordering (cannot be silently split); an explicit Move or Remove on one member
  clears `group_label` on the remaining member(s) and shows a toast/banner confirming the resolution;
  write a quick manual test case (2-exercise superset, 3-exercise superset) and confirm both
- [AUTO] Save/persist edits scoped to this session only — VERIFY: no code path writes to sibling
  sessions or the block; saved state round-trips correctly on page reload; existing Swap-exercise
  dialog, video-URL field, and per-set logging flow all still work unchanged after this lands
- [AUTO] Visual pass against `hub-session-editor.html` for the editor UI itself (reusing HubCard/
  HubTable/StatusBadge/etc., existing tokens) — VERIFY: `tsc --noEmit` + `next build` clean, hand
  diff against mockup

## LEDGER
Progress written to this repo's `.context/state.md` + `.context/handoff.md` as each lane lands, plus
one line per unit to `.context/loop-status.md` (`<ISO timestamp> | <lane> | <file> | <outcome>`).
Craig gets a per-route report as each lane is confirmed done — not one batched pass at the end.

## CONTEXT
- Mockup → real route map (from Craig's brief) — all [EXISTS] except the session editor:
  - hub-dashboard.html → `app/hub/(protected)/page.tsx`
  - hub-clients.html → `app/hub/(protected)/clients/page.tsx`
  - hub-client-detail.html → `app/hub/(protected)/clients/[id]/page.tsx` (Training + Progress tabs
    already server-side via `ExerciseTrendsPanel`/`buildExerciseTrends` — built in the
    2026-07-25 session-logging Work Order, Lane C)
  - hub-client-edit.html → `app/hub/(protected)/clients/[id]/edit/page.tsx`
  - hub-parq-edit.html → `app/hub/(protected)/clients/[id]/parq/[parqId]/edit/page.tsx`
  - hub-exercise-library.html → `app/hub/(protected)/exercises/page.tsx`
  - hub-site-content.html → `app/hub/(protected)/site-content/page.tsx`
  - hub-site-content-editor.html → `app/hub/(protected)/site-content/[slug]/page.tsx`
  - hub-process-quality.html → `app/hub/(protected)/process-quality/page.tsx`
  - hub-reports-updates.html → `app/hub/(protected)/reports/updates/page.tsx`
  - hub-studio-equipment.html → `app/hub/(protected)/settings/studio-equipment/*`
  - hub-training-rules.html → `app/hub/(protected)/settings/training-rules/*`
  - hub-plan-agent-settings.html → `app/hub/(protected)/settings/plan-agent/*`
  - hub-tasks.html → `app/hub/(protected)/tasks/*` (built 2026-07-25, same-day 3-increment build)
  - hub-schedule.html → `app/hub/(protected)/schedule/*` (built 2026-07-25, session-logging WO Lane D)
  - hub-session-editor.html → NEW: `app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/page.tsx`
  - Also real, not mocked in Open Design — leave untouched, no gap: `/hub/documents`,
    `/hub/templates`, `/hub/tracker`, `/hub/site-review`, `/hub/agreements`.
- Full functionality brief for the session editor already written and available at
  `.context/brief-session-editor-opendesign.md` — read it before starting Lane H, it has more detail
  than this WO restates (data-shape notes, out-of-scope callouts, constraint rationale).
- The mockups were built by reading the real source for every corresponding page first — this is a
  visual/UX refinement pass on working pages, not a rebuild. Treat any apparent behavioural
  difference in a mockup as a design suggestion to evaluate, not an instruction to blindly implement.
- Related prior Work Orders in this repo (both cleared/closed, no scope overlap, useful precedent for
  patterns/conventions): `workorder-eternal-fitness-hub-consolidation-2026-07-20.md` (first design
  rollout pass, established the HubCard/HubTable/StatusBadge component idiom this WO must reuse),
  `workorder-session-logging-2026-07-25.md` (built Training/Progress tabs' data layer and the
  Tasks/Schedule pages this WO is now doing a visual pass on).
