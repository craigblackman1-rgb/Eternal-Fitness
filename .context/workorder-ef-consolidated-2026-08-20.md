# Work Order: EF consolidated close-out — 2026-08-20

OWNER: (empty until claimed)
SCOPE: eternal-fitness-website (app/hub/(protected)/**, components/hub/**, app/api/parq/**,
       app/(marketing) schema/meta only for Lane B's SEO items — no other marketing-site scope)

GOAL: Every currently open eternal-fitness-website item — workout/training-block parity,
      compliance/SEO/security cleanup, infra decisions, and document-engine/hub housekeeping —
      closed under one Work Order, with the 6 predecessor WOs retired and their open items
      reparented here.

MUST:
- Mockups in D:\apps\design-systems\ef-control-hub\desktop\training\ are the target for Lane A;
  the app changes, not the mockups.
- Reuse SessionStatusPill / deriveSessionStatus / lib/session-status.ts for any status rendering;
  client_op_id idempotency on every write (per wo-hub-workout-parity's carried-over MUST).
- DO-SOP-010: own worktree per lane; staging → verify on development → main.
- No condition roll-calls in marketing copy (per project CLAUDE.md), except the Specialist
  Training section's existing explicit exception.

FORBIDDEN:
- app/(marketing)/** content changes beyond Lane B's schema/meta additions,
  app/portal/(client-facing UI)** beyond nothing in this WO, lib/planAgentPrompt.ts,
  supabase/migrations/** without a GATE, components/ds/**, app/design-system.css.

DECIDE YOURSELF:
- Component-internal structure; exact copy/microcopy (sentence case, British English);
  Est. duration estimator factoring (derived from prescription, per-section, amber over slot).

ASK FIRST (gates):
- G1 — WAL/PITR archiving: requires either a superuser DB role change or accepting
  archive_mode=off — infra decision, not code (carried from wo-eternalfitness-hub-mobile-
  session-pwa-2026-08-10).
- G2 — CR-EF-008 (HTTP→HTTPS 301 + HSTS): Coolify/Traefik domain config, not app code.
- G3 — Lane F rail-as-navigation IA: needs a fresh Open Design brief before any build.
- G4 — legacy /api/parq POST retirement: full scope of the §4.3 legacy-surface migration
  needs confirming with Craig before touching the unlinked-but-live route.
- G5 — any new migration or DB write outside listed scope.

## LEDGER
- 2026-08-20 — Work Order raised, consolidating 6 predecessor WOs per Craig's instruction
  ("I want one work order raised to cover everything"). Scope compiled from a full registry
  sweep (`wo active`, each predecessor's registry JSON, `wo deferred-list`) plus this project's
  `.context/handoff.md`, `workorder-hub-workout-parity-2026-08-19.md`, and
  `change-requests.md`. Two predecessor WOs' registry notes were found stale during the sweep
  and corrected here rather than carried forward verbatim:
  (1) wo-ef-hub-dashboard-client-training-parity-2026-08-19's "CR-EF-072 still on staging"
  note was wrong — verified via `git log` that commit a167e29 (CR-EF-072) is already on
  origin/main; that WO is being closed DONE, not folded into new lanes.
  (2) wo-ef-workout-consolidation-pwa-2026-08-15's CR-EF-037 Phases 2-3 were already completed
  via wo-ef-sessions-blocks-full-build-2026-08-19 since its last note was written — only the
  exercise_uid backfill/verify step and the Lane F IA concept remain open under it.
  Build-speed (dmt09elf10t) deliberately excluded — tracked under the separate cross-app
  wo-deploy-pipeline-speedup-2026-08-19, out of this single-app WO's scope.

## DONE
- [ ] wo-ef-hub-dashboard-client-training-parity-2026-08-19 confirmed closed (CR-EF-072
      verified on main) and marked done in the registry.
- [ ] Training-blocks list: Programme+Progress columns, block-status vocab, avatar,
      context-aware action link.
- [ ] Workout-templates browser: detail drawer + assign-from-browse, paste 3-step stepper,
      difficulty facet → Seated/Supported/Standing.
- [ ] Session screen: derived Est. duration estimator live from prescription.
- [ ] Minor styling sweep: back-link labels, avatar initials, cancelled-row dimming, single
      archetype label map.
- [ ] exercise_uid backfill run + verified against session-transitions logic on both DBs.
- [ ] CR-EF-047 (block module exercise-table / Next-session nav) scope confirmed with Craig
      and fixed.
- [ ] Legacy /api/parq POST retirement scoped and resolved (post-G4).
- [ ] CR-EF-006 AggregateRating schema added to /testimonials.
- [ ] CR-EF-048 "Create & send" button relabelled to reflect draft-only behaviour.
- [ ] Open Design project visibility issue for "EF Endurance Block Editor" resolved or
      confirmed as an OD-app limitation.
- [ ] Two exercises ("Long-Lever Plank", "Weighted Plank") added to the exercise library.
- [ ] Leftover empty worktree folder removed.
- [ ] tsc --noEmit clean; every lane's git diff --stat reviewed against FORBIDDEN/MUST.
- [ ] All 6 predecessor WOs marked done/abandoned in the registry with a note pointing here;
      their still-open deferred items reparented via `wo reparent`.

## LANES
- Lane A — Workout/training-block parity   · depends on: none
- Lane B — Compliance/SEO/security cleanup · depends on: none
- Lane C — Infra decisions (GATE-only)     · depends on: none
- Lane D — Document-engine/hub housekeeping · depends on: none
- Lane E — Registry housekeeping (close predecessor WOs, reparent items) · depends on: none,
  do first (cheap, unblocks accurate `wo active` reporting for the rest)

## UNITS
### Lane E (registry housekeeping — do first)
- [AUTO] Mark wo-ef-hub-dashboard-client-training-parity-2026-08-19 done (CR-EF-072 verified
  live on main) — `wo status ... done --note "..."`.
- [AUTO] Mark wo-ef-workout-consolidation-pwa-2026-08-15, wo-ef-hub-structure-consistency-
  2026-08-17, wo-ef-seo-speed-spam-2026-08-17, wo-ef-security-repo-quickwins-2026-08-15,
  wo-eternalfitness-hub-mobile-session-pwa-2026-08-10, wo-hub-workout-parity-2026-08-19 all
  `abandoned` with a note: "superseded by wo-ef-consolidated-2026-08-20".
- [AUTO] `wo reparent` each still-open deferred item listed in Lanes A/B/D below onto
  wo-ef-consolidated-2026-08-20.

### Lane A (workout/training-block parity — carried from wo-hub-workout-parity-2026-08-19)
- [AUTO] Training-blocks list Approval-column status map + Programme/Progress columns +
  avatar + action link — files: PlanScheduleTable.tsx, training-blocks/page.tsx — VERIFY:
  filter/row pills agree; two new columns render against real data.
- [AUTO] Workout-templates browser detail drawer + assign-from-browse + paste 3-step stepper
  + difficulty facet — files: workout-template-browser.tsx, TemplateEditorClient.tsx,
  TemplatePasteClient.tsx, new/page.tsx, page.tsx — VERIFY: assign without paste flow works;
  Paste→Review→Save/assign progression; no numeric 1–5 difficulty labels remain.
- [AUTO] Derived Est. duration estimator — files: SessionWorkoutLog.tsx, lib/prescription.ts
  — VERIFY: editing tempo/reps/rest moves the figure live; amber over slot.
- [AUTO] Minor styling sweep — files: blocks/[blockId]/page.tsx, sessions/[sessionNum]/page.tsx,
  PlanScheduleTable.tsx — VERIFY: single label map via grep; no bare chevron back-links.
- [AUTO] Run + verify exercise_uid backfill (scripts/backfill-exercise-uid.mjs) against
  session-transitions logic on prod + staging DBs — VERIFY: row counts match, no orphaned refs.
- [GATE] CR-EF-047 (block module exercise-table not in mockup, Next-session nav) — confirm
  scope with Craig first.

### Lane B (compliance/SEO/security)
- [GATE] G4 — legacy /api/parq POST retirement scope confirmation, then [AUTO] fix.
- [AUTO] CR-EF-006 — add Review/AggregateRating schema.org block to /testimonials — VERIFY:
  structured-data validator passes.
- [GATE] G2 — CR-EF-008 HSTS/301 redirect — Coolify/Traefik config, needs Craig.

### Lane C (infra — GATE only, no AUTO units)
- [GATE] G1 — WAL/PITR archiving decision.

### Lane D (document-engine/hub housekeeping)
- [AUTO] Relabel CR-EF-048 "Create & send" button to reflect draft-only behaviour — file:
  SendTemplateToClient.tsx or equivalent — VERIFY: label matches actual action.
- [AUTO] Investigate + resolve Open Design project visibility issue (or confirm as OD-app
  limitation and close the deferred item with that note).
- [AUTO] Add "Long-Lever Plank" and "Weighted Plank" to /hub/exercises with video links.
- [AUTO] Delete leftover empty worktree folder (worktrees/eternal-fitness-website/add-wo...).
- [BLOCKED] Blind-fitness/cancer-rehab specialist copy — waiting on: Specialist Training
  catalogue pages existing (currently redirected away, deferred to post-launch).
- [GATE] G3 — Lane F rail-as-navigation IA concept — needs a fresh Open Design brief before
  any build; raise the brief request as a GATE item, don't build speculatively.

## LEDGER (files)
Progress written to: eternal-fitness-website/.context/state.md + handoff.md as each unit ticks.
Live status: eternal-fitness-website/.context/loop-status.md

CONTEXT: Consolidates wo-hub-workout-parity-2026-08-19, wo-ef-hub-dashboard-client-training-
parity-2026-08-19, wo-ef-workout-consolidation-pwa-2026-08-15, wo-ef-hub-structure-
consistency-2026-08-17, wo-ef-seo-speed-spam-2026-08-17, wo-ef-security-repo-quickwins-
2026-08-15, wo-eternalfitness-hub-mobile-session-pwa-2026-08-10. Full source detail for each
carried-over unit lives in those WOs' original .context/ files (not rewritten here) and this
session's registry sweep. CRs referenced: CR-EF-006, 008, 037, 047, 048.
