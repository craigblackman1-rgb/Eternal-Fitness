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
NOTE: the numbering below was corrected 2026-08-20 to match the actual `wo ask`
queue Craig answered against (the original draft's G2/G5 were swapped, and G2
below didn't exist in the first draft — it surfaced mid-build). Treat this list,
not the first commit's, as authoritative.

- G1 — WAL/PITR archiving: requires either a superuser DB role change or accepting
  archive_mode=off — infra decision, not code (carried from wo-eternalfitness-hub-mobile-
  session-pwa-2026-08-10). **ANSWERED + FIXED + VERIFIED 2026-08-20.** archive_mode was
  already 'on' but archive_command was '/bin/true' -- a no-op reporting fake success on
  13984 "archived" segments that never existed on disk. ef_app (the app's DB role) can't
  ALTER SYSTEM and pg_hba.conf blocks postgres-role connections from the tunnel's source
  IP entirely (confirmed by testing, not assumed) -- Claude has no path to superuser via
  any available tool. Craig ran it himself via direct psql access: set a real cp-based
  archive_command to /var/lib/postgresql/wal_archive/, reloaded config (no restart
  needed). Verified end-to-end over the ef_app tunnel + Craig's psql session together:
  forced pg_switch_wal(), pg_stat_archiver showed a genuinely new segment
  (000000010000003E000000C6) archived with 0 failures, and `ls -la` on the target
  directory confirmed a real 16MB file, correct owner (postgres:postgres) and perms.
  See dmsne8f7y99.
- G2 — workout-templates difficulty facet → Seated/Supported/Standing: surfaced during
  Lane B's build, not in the original gate list. **ANSWERED 2026-08-20: "confirmed
  Seated/Supported/Standing, add whatever's needed." BUILT** — see DONE checklist,
  2026-08-20 ab4c765.
- G3 — Lane F rail-as-navigation IA: needs a fresh Open Design brief before any build.
  **ANSWERED 2026-08-20: Craig will write/submit the brief himself — no action from
  Claude.**
- G4 — legacy /api/parq POST retirement: full scope of the §4.3 legacy-surface migration
  needs confirming with Craig before touching the unlinked-but-live route. **ANSWERED
  2026-08-20: "retire it." BUILT** — see DONE checklist, 2026-08-20 9d2db8a (real fix
  was deeper than described — see note there).
- G5 — CR-EF-008 (HTTP→HTTPS 301 + HSTS): Coolify/Traefik domain config, not app code.
  **ANSWERED 2026-08-20: "go ahead." DONE** — Craig unchecked Readonly labels himself
  (only reachable via the Coolify UI, not any available tool), pasted the updated
  Traefik label set Claude gave him (redirectscheme.permanent=true + a new
  security-headers middleware for HSTS), restarted the app. Verified: HTTPS response
  now carries `Strict-Transport-Security: max-age=31536000; includeSubDomains` on all
  3 domains. **False alarm during verification, named so it isn't repeated:** Claude's
  sandboxed environment can't reach outbound port 80 at all, got a 404 on
  `http://eternal-fitness.co.uk` AND on an unrelated site (`decodedops.co.uk`) it never
  touched, and misread that as a server-wide Traefik outage. Traefik was never down —
  confirmed via the Coolify proxy screen ("Running", "Saved and running configuration
  are synchronized") and by Craig checking both URLs from his own machine (both
  redirect fine). Exact 301-vs-307 status code not independently re-confirmed after the
  false alarm, but the redirect and HSTS are both live. Deferred item dmt1jcxvkh5
  resolved.
- G6 — any new migration or DB write outside listed scope (generic, not yet triggered
  beyond G2's own migration, which was covered by G2's own answer).

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
- [x] wo-ef-hub-dashboard-client-training-parity-2026-08-19 confirmed closed (CR-EF-072
      verified on main) and marked done in the registry. (2026-08-20, done during Lane E)
- [x] Training-blocks list: Programme+Progress columns, block-status vocab, avatar,
      context-aware action link. (2026-08-20, c77ebcd — merged unmodified real work found
      already built on branch lane-a-training-blocks)
- [x] Workout-templates browser: detail drawer + assign-from-browse, paste 3-step stepper.
      (2026-08-20, 1bda9a1 — reconciled against a competing assign-to-client flow already
      on main; also caught and removed a decorative "next available block / new block"
      selector with no backend support)
- [x] Difficulty facet → Seated/Supported/Standing (G2). Built as a new, separate
      `position` facet (exercises.position + derived workout_templates.position) rather
      than repurposing the genuine 1-5 difficulty scale, which stays live on the exercise
      library's own filter. No values backfilled — no existing signal to derive
      Seated/Supported/Standing from; all exercises start untagged, Esther tags them via a
      new Position field on the exercise editor. Migration run on prod + staging, verified.
      (2026-08-20, ab4c765)
- [x] Session screen: derived Est. duration estimator live from prescription. (2026-08-20,
      7c6d762 — reconciled against the CR-EF-062 header restructure, extended to
      per-section chips, fixed a Rules-of-Hooks bug found in the original attempt)
- [x] Minor styling sweep: back-link labels, avatar initials, cancelled-row dimming, single
      archetype label map. (2026-08-20, d8a254e — reconciled lane-d-minor-sweep onto
      current main; avatar initials were already covered by a later lane)
- [ ] exercise_uid backfill run + verified against session-transitions logic on both DBs.
- [x] CR-EF-047 — Craig confirmed 2026-08-20 this was already fixed (the label was a
      register mismatch; CR-EF-047 is actually the rejected Docker build-cache CR). No
      build needed.
- [x] Legacy /api/parq POST retirement scoped and resolved (G4). Real fix was deeper than
      the deferred item described: POST never verified the signed exp/sig link at all —
      only the page render did — so anyone with a signed_parq id could write to it,
      signature or not. First-draft fix (hub-session-only + delete /parq/edit/[id]) would
      have broken the Agreement page's live "Copy PAR-Q edit link" feature; corrected to
      require a hub session OR a valid unexpired signature. Only the dead blank /parq form
      was deleted. (2026-08-20, 9d2db8a)
- [x] CR-EF-006 Review schema added to /testimonials. AggregateRating deliberately NOT
      added — no real rating data exists anywhere on the site; the first OpenCode draft
      fabricated ratingValue 5.0/reviewCount 4, caught on review and removed before merge.
      (2026-08-20, 13d7317)
- [x] CR-EF-048 "Create & send" button relabelled to reflect draft-only behaviour.
      (2026-08-20, 24828e8)
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
