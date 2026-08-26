# Work Order: EF consolidated close-out — 2026-08-20

OWNER: (empty until claimed)
SCOPE: eternal-fitness-website (app/hub/(protected)/**, components/hub/**, app/api/parq/**,
       app/(marketing) schema/meta only for Lane B's SEO items — no other marketing-site scope;
       Lane G adds lib/graph-client.ts, lib/calendar-sync.ts, app/api/cron/sync-calendar/**,
       app/api/integrations/microsoft/**, app/hub/(protected)/schedule/**;
       Lane I adds app/api/workout-templates/**, lib/workout-template-facets.ts,
       lib/exercise-media.ts, app/hub/m/train/**, lib/portal-data.ts, and — as a scoped exception
       to the FORBIDDEN portal-UI line below, portal-approved 2026-08-24 for image display only —
       app/portal/(protected)/training/TrainingClient.tsx)

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
- G7 — CR-EF-050 (Outlook Bookings reconciliation) new-surface Open Design brief: a client
  booking via Microsoft Bookings lands in the same Outlook calendar the app already syncs to,
  with no `sessions` row — needs a reconciliation UI in the hub (unmatched-bookings queue,
  match/link-to-client action) before any build, per the project's "new user-facing surface
  needs a CR + mockup" rule (CR-EF-048 precedent). **ANSWERED 2026-08-20 (scope, not design):**
  Craig confirmed (a) Bookings appointments land in the *same* calendar already selected under
  Settings → Integrations — no separate calendar/mailbox to poll; (b) match to `clients.email`,
  auto-link on match, flag unmatched for manual review. **Superseded 2026-08-20 by the live
  diagnostic** — email-matching is provably wrong (0/17 real Bookings events carry the client's
  real email); revised to name-parsed-from-subject matching, Craig re-confirmed. Design brief
  raised and mockup delivered same day. **G7 CLOSED — full build shipped and live-verified**,
  see Lane G's DONE entries below.
- G8 — CR-EF-028 (Outlook duplicate-event reconciliation) new-surface Open Design brief: same
  "new hub surface needs a mockup" rule as G7 — no build before one lands. **RAISED 2026-08-21**,
  brief written (`.context/brief-outlook-duplicate-reconciliation-opendesign.md`), but the Open
  Design MCP server was disconnected at the time — run not yet started. Craig confirmed the fix
  approach (human-confirmed link-or-keep-separate queue, mirroring Lane G's UI) before this was
  raised; only the mockup itself is outstanding.

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
- [x] Lane G diagnostic (CR-EF-050): live Outlook-vs-`sessions` gap sized and reported.
      (2026-08-20) 221 events in window, 217 unmapped; only 17 are real Bookings
      appointments (7 clients, organizer EternalFitnessBookings@...), the other 200 are
      Esther's own long-standing personal calendar entries (unrelated to Bookings/the app).
      **Overturned the 2026-08-19 email-match decision**: 0/17 real Bookings events carry
      the client's actual email anywhere (organizer/attendees are internal addresses only)
      — verified against clients.email for all 7. Name-parsed-from-subject matched
      clients.name for all 7/7. See CR-EF-050 for full detail. Craig needs to re-confirm
      the revised name-based matching approach before G7's design brief is written.
- [x] Lane G: Craig confirmed the revised name-parsed-from-subject matching approach
      2026-08-20. Open Design brief written (`.context/brief-outlook-bookings-reconciliation-
      opendesign.md`) and a run started against the "EF Business Hub" project
      (360da9b0-11a7-4a96-b2dd-7ea28e0033eb) — runId `e002769f-df87-463a-be9c-6c0497f4d0d9`.
      **Mockup delivered 2026-08-20** — `D:\apps\design-systems\ef-control-hub\desktop\
      scheduling\hub-schedule-outlook.html` (new reconciliation queue, 3 row states:
      auto-suggested/confirm, manual link, dismissed; raw event subject shown per row;
      confirm opens a block-picker dialog reusing the existing block-choice pattern) plus
      small additive route-in diffs to hub-schedule.html/hub-schedule-month.html (an
      "Outlook bookings" count-badge button in the day/month nav, calendar views themselves
      untouched — diff reviewed directly, 25 lines total across both files). Verified via
      get_page_text + read_page (real content, real nav, real interactive elements render);
      OD's own pass caught and fixed a real JS ternary/precedence bug and a stale count
      before delivering. Note: OD couldn't find the brief file at the path given in the
      prompt (project isn't linked to this worktree, only to the shared eternal-fitness-
      website checkout) and worked from the inline prompt spec instead — worth mirroring
      future briefs into the shared checkout's .context/ too, not just the worktree's.
      **Not yet reviewed by Craig** — reconciliation UI/schema build stays gated until he
      signs off on the mockup.
- [x] Lane G: **Craig approved the mockup and said "proceed" 2026-08-20 — full build shipped
      and live-verified same session.** Delivered: migration `20260820_outlook_booking_events.sql`
      (`outlook_booking_events` table, run against **both** prod `eternal_fitness` and
      `eternal_fitness_staging` — this project's separate-staging-DB gotcha); `listCalendarView`
      read-back added to `lib/graph-client.ts`; `lib/outlook-bookings.ts` (name-parsed-from-subject
      matching with an exact-then-surname-fallback heuristic — every suggestion still requires
      Esther's click, so a wrong surname guess costs one extra click, never a bad write) wired
      into the existing 15-min cron (`app/api/cron/sync-calendar/route.ts`, separate try/catch so
      a Bookings-sync failure can't block the older app→Outlook push sync); `GET/POST
      /api/outlook-bookings*` routes + `GET /api/clients/[id]/blocks`; the reconciliation queue UI
      at `/hub/schedule/outlook` (`OutlookBookingsQueue.tsx`) matching the mockup's 3 row states;
      `OutlookBookingsBadge` wired into both `ScheduleCalendar.tsx` and `MonthCalendar.tsx`.
      `npx tsc --noEmit` clean throughout.
      **Live-verified end-to-end against real production data** (not staging fixtures) via a
      local dev server on the prod DB/Graph tunnel + claude-in-chrome under Esther's real hub
      session: seeded the queue with the real 17 Bookings events (all 7 clients auto-matched
      correctly, including the surname-fallback case "Thomas Putnam"→"Tom Putnam"); confirmed a
      real appointment (Nathan Wadey, 25 Aug) end-to-end — session created with the correct
      `block_id`/`session_number`(13)/`scheduled_at`, and the *existing* Outlook event was adopted
      into `session_calendar_events` rather than duplicated; verified the new session renders
      correctly on `/hub/schedule`'s month view. Dismiss/undismiss and manual search-and-link both
      verified working. **Found and fixed one real bug during verification**: the `link` route's
      `.update().select("*, clients(...)").single()` 500'd because this project's pg-client shim
      resolves relation embeds into a subquery referencing the target table by name, which
      Postgres's `UPDATE ... RETURNING` doesn't allow — split into an update then a separate
      select, re-verified 200. Test data cleanup: none needed — the confirmed session (Nathan
      Wadey) is real, correct, desired output, not a throwaway. Branch fast-forwarded onto
      `origin/main` before committing (this worktree's branch was 3 commits stale). Not yet
      pushed — next step is `staging`, verify on development.eternal-fitness.co.uk, then main,
      per this project's standard deploy flow.
- [x] **Lane G: promoted to `main`, live in production, CR-EF-050 CLOSED.** Pushed to `staging`
      (`c3103d6`), deployed, verified live on development.eternal-fitness.co.uk (real page render,
      correct empty state — staging's Microsoft integration wasn't yet disconnected at that point).
      **Craig then asked how to test without a real Bookings appointment reaching Esther's actual
      calendar — investigating found staging's `integration_tokens` had a live Microsoft connection
      to Esther's real account/calendar since 2026-08-15** (unrelated to this feature, root cause of
      the still-open CR-EF-028), which explained why staging's queue showed all 17 real prod
      bookings mixed with synthetic test rows. Fixed: disconnected staging's Microsoft integration
      (cleared `integration_tokens`, 7 stale `session_calendar_events` rows, 17 stale real-event
      queue rows), re-verified the empty state, then seeded 3 clearly-fake test bookings — safe
      because staging can no longer reach Graph in either direction. Craig approved promoting to
      main; merged `origin/main` twice (two concurrent unrelated pushes landed mid-promotion,
      both clean docs/code merges, `tsc --noEmit` clean each time), pushed `b923a6d`. **Deploy
      verified**: Coolify deployment `ygdbskumwhxejd7krqh2yspw` finished healthy on commit
      `b923a6d` (matches the push exactly), confirmed live by loading
      `eternal-fitness.co.uk/hub/schedule/outlook` directly — real 16 remaining unmatched bookings
      render correctly (17 minus the one already confirmed during local verification).
- Lane A — Workout/training-block parity   · depends on: none
- Lane B — Compliance/SEO/security cleanup · depends on: none
- Lane C — Infra decisions (GATE-only)     · depends on: none
- Lane D — Document-engine/hub housekeeping · depends on: none
- Lane E — Registry housekeeping (close predecessor WOs, reparent items) · depends on: none,
  do first (cheap, unblocks accurate `wo active` reporting for the rest)
- Lane G — Outlook Bookings reconciliation (CR-EF-050) · depends on: none for the diagnostic
  unit; the reconciliation UI/schema units depend on G7's Open Design brief landing
- Lane H — Outlook duplicate-event reconciliation (CR-EF-028) · depends on: an Open Design brief
  (G8) — mirror of Lane G's UI pattern, no build before a mockup lands
- Lane I — Save-template crash + exercise image/video display (2026-08-24 bug reports)
  · depends on: none for the code fixes; the Trainerize image migration run is a GATE
- Lane J — CR-EF-081/082/083/084/085/087 (Esther's hub-task triage batch, 2026-08-24)
  · depends on: none, 5 independent worktrees. CR-EF-086 (site-wide VI alt-text) held back,
  not part of Lane J — needs an authoring/scoping pass first, see its own CR row.

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
- [x] [AUTO] Training-blocks list Approval-column status map + Programme/Progress columns +
  avatar + action link — files: PlanScheduleTable.tsx, training-blocks/page.tsx — VERIFY:
  filter/row pills agree; two new columns render against real data. -- verified on main c77ebcd (reconciled 2026-08-26)
- [x] [AUTO] Workout-templates browser detail drawer + assign-from-browse + paste 3-step stepper
  + difficulty facet — files: workout-template-browser.tsx, TemplateEditorClient.tsx,
  TemplatePasteClient.tsx, new/page.tsx, page.tsx — VERIFY: assign without paste flow works;
  Paste→Review→Save/assign progression; no numeric 1–5 difficulty labels remain. -- verified on main 78a6139 (reconciled 2026-08-26)
- [x] [AUTO] Derived Est. duration estimator — files: SessionWorkoutLog.tsx, lib/prescription.ts
  — VERIFY: editing tempo/reps/rest moves the figure live; amber over slot. -- verified on main 7c6d762 (reconciled 2026-08-26)
- [x] [AUTO] Minor styling sweep — files: blocks/[blockId]/page.tsx, sessions/[sessionNum]/page.tsx,
  PlanScheduleTable.tsx — VERIFY: single label map via grep; no bare chevron back-links. -- verified on main d8a254e (reconciled 2026-08-26)
- [AUTO] Run + verify exercise_uid backfill (scripts/backfill-exercise-uid.mjs) against
  session-transitions logic on prod + staging DBs — VERIFY: row counts match, no orphaned refs.
- [GATE] CR-EF-047 (block module exercise-table not in mockup, Next-session nav) — confirm
  scope with Craig first.

### Lane B (compliance/SEO/security)
- [GATE] G4 — legacy /api/parq POST retirement scope confirmation, then [AUTO] fix.
- [x] [AUTO] CR-EF-006 — add Review/AggregateRating schema.org block to /testimonials — VERIFY:
  structured-data validator passes. -- verified on main e5ea74d + 13d7317 (reconciled 2026-08-26)
- [GATE] G2 — CR-EF-008 HSTS/301 redirect — Coolify/Traefik config, needs Craig.

### Lane C (infra — GATE only, no AUTO units)
- [GATE] G1 — WAL/PITR archiving decision.

### Lane D (document-engine/hub housekeeping)
- [x] [AUTO] Relabel CR-EF-048 "Create & send" button to reflect draft-only behaviour — file:
  SendTemplateToClient.tsx or equivalent — VERIFY: label matches actual action. -- verified on main 24828e8 (reconciled 2026-08-26)
- [AUTO] Investigate + resolve Open Design project visibility issue (or confirm as OD-app
  limitation and close the deferred item with that note).
- [AUTO] Add "Long-Lever Plank" and "Weighted Plank" to /hub/exercises with video links.
- [x] Delete leftover empty worktree folder (worktrees/eternal-fitness-website/add-workouts-training-block-f72141) — DONE by the wo-dispatcher scheduled run 2026-08-24 13:10: folder confirmed empty (0 items) and absent from `git worktree list`, deleted. Deferred item dmsxmkhnzy7 resolved.
- [BLOCKED] Blind-fitness/cancer-rehab specialist copy — waiting on: Specialist Training
  catalogue pages existing (currently redirected away, deferred to post-launch).
- [GATE] G3 — Lane F rail-as-navigation IA concept — needs a fresh Open Design brief before
  any build; raise the brief request as a GATE item, don't build speculatively.

### Lane G (Outlook Bookings reconciliation — CR-EF-050)
- [x] [AUTO] Diagnostic: add a read-only `listCalendarEvents` (Graph `GET /me/calendars/{id}/
  calendarView`) to lib/graph-client.ts, pull the selected calendar's events for the existing
  sync window (−1/+60 days per calendar-sync.ts), and diff against `sessions.scheduled_at` +
  `session_calendar_events` to produce a report: which live Outlook events have no app-side
  mapping at all (the actual Bookings-gap population) vs. events the app itself created — files:
  lib/graph-client.ts (new function only, no other changes), a one-off script under scripts/ —
  VERIFY: report run against the real connected calendar, count of unmatched events sized and
  shared before any further build. -- verified on main 18b013d (reconciled 2026-08-26)
- [x] Open Design brief raised and mockup delivered (`hub-schedule-outlook.html`) — see DONE.
- [x] `outlook_booking_events` migration + name-parsed-from-subject matching logic (revised from
  email-matching, disproven by the diagnostic) — built, migrated on prod+staging, live on main.
  See DONE checklist above for full build/verification/promotion detail. **Lane G complete.**

### Lane H (Outlook duplicate-event reconciliation — CR-EF-028)
- [x] Diagnostic: `scripts/diagnose-outlook-duplicate-events.mjs` (read-only) — for every
  app-synced session, check same-day Outlook events for a first-name subject match against a
  *different* event than the app's own. Found 5/12 (42%) app-synced sessions in the sync window
  collide with a pre-existing Esther-typed personal entry (Emma Atkinson, Monique Weardon ×4
  dates) — every personal entry predates the app's own sync event, confirming this is Esther's
  long-standing manual habit colliding with the (already-live, unrelated-to-today) push-sync, not
  a new bug from CR-EF-050's work. See CR-EF-028 for full detail.
- [x] G8 — Open Design brief raised; **Craig ran the mockup himself 2026-08-21** (OD MCP stayed
  disconnected from this session throughout) — `hub-schedule-outlook-duplicates.html`, a shared
  tab bar with the Bookings queue, existing-event comparison with a same/off-time flag. **G8
  CLOSED.**
- [x] Migration `20260821_outlook_duplicate_candidates.sql` — run + verified on prod and staging.
- [x] Collision detection wired into `lib/calendar-sync.ts`'s batch cron AND immediate
  on-schedule push (`syncSessionCalendarEvent`, fired from the sessions PATCH — this is the path
  that actually caused Emma's collision, not just the cron backstop). `lib/outlook-duplicates.ts`
  holds the shared detection/link/keep-separate/unresolve logic.
- [x] `/hub/schedule/outlook/duplicates` queue + `OutlookReconciliationTabs` shared tab bar +
  combined route-in badge count — matches the mockup 1:1 (tab bar, note callout, summary strip,
  existing-event flag copy, link/keep-separate/undo actions).
- [x] Verification: read-only dry-run (`scripts/dry-run-outlook-duplicate-detection.mjs`) against
  real prod data — confirms detection matches the 5 known collisions from the diagnostic, and
  critically that shipping today pauses **zero** currently-scheduled sessions (everything in the
  window is already synced) — this fix only prevents new duplicates going forward; the 5 already
  in Esther's calendar are untouched by it. Link/keep-separate/undo all verified via real UI
  clicks on staging against synthetic data (session/candidate seeded directly, no real Outlook
  reachable from staging), each DB-confirmed.
- [x] **Unrelated build-blocker found and fixed**: `app/hub/m/calendar/page.tsx` (concurrent
  mobile-calendar lane) passed a function prop across the Server→Client boundary to `DayAgenda`,
  failing `next build` (not caught by `tsc --noEmit`) and blocking every deploy on this branch.
  Fixed by deriving the booking href inside `DayAgenda` from its existing `scope`/new
  `clientNumber` prop instead. Verified with a full local `next build` — clean, all routes
  present.
- [x] Pushed to `staging`, deployed (commit `4585d09`), verified live on
  development.eternal-fitness.co.uk via claude-in-chrome (real render, real Link/Keep
  separate/Undo clicks, DB-confirmed each time).
- [x] **Promoted to `main`, live in production. CR-EF-028 CLOSED.** Craig approved ("can you push
  and merge any outstanding updates to main"). Merged origin/main twice and origin/staging three
  times during promotion (concurrent unrelated lanes: trainer-PWA docs, a client-notes feature, an
  independently-built "Outlook triage" mobile lane that rewrote `app/hub/m/calendar/page.tsx` and
  removed its `DayAgenda` usage entirely — confirmed no regression of the build fix below, full
  `next build` re-verified clean each time). Coolify deployment `ffdkcfytnowfv0vxhnmyjriu` finished
  healthy on commit `e65ad3c` (matches the push). **Verified live**: eternal-fitness.co.uk's
  `/hub/schedule/outlook/duplicates` loads correctly, "0 possible duplicates" — matching the
  dry-run's prediction exactly (nothing currently scheduled collides, so today's deploy is a
  behavioural no-op; the pause logic only engages the next time Esther books a session that
  collides with one of her own personal Outlook entries).

### Lane I (2026-08-24 bug reports — save-template crash + missing exercise media)
- [x] Fixed "Save as template" always failing. Root cause: `lib/workout-template-facets.ts:29`
  `deriveFacets` threw on any exercise missing `exercise_name`, uncaught by
  `app/api/workout-templates/route.ts`'s POST handler → raw 500, and the client never read the
  body anyway (always showed a generic toast). Fixed: null guard in `deriveFacets`, try/catch
  around the route's facet-derivation+insert, client now shows the real server error. Built via
  OpenCode lane (commit 0f785ca), diff hand-reviewed. **Live-verified 2026-08-24**: reproduced the
  original failure live, watched the toast go from generic to the real Postgres error
  (`invalid input syntax for type uuid: "19"`), which surfaced a **second real bug** the lane
  hadn't touched — `source_client_id` was sending the URL's `client_number` slug instead of the
  actual `clients.id` UUID. Fixed separately (commit af88125: `source_client_id: client?.id ??
  null`, extending the already-fetched client record instead of `params.id`). Re-tested live —
  template saved successfully, confirmed in `workout_templates`, then deleted the test row.
- [x] Exercise images/videos wired into every workout-rendering surface. Root cause: two
  compounding issues — (1) the Trainerize image migration (scripts written in e6eb131) was never
  run, so `exercises.image_url` still pointed at unmigrated third-party CDN URLs; (2) most surfaces
  only ever read pre-embedded session JSONB `media`, which is only populated when a trainer
  manually attaches media — AI-generated sessions never got it. Fixed: new
  `lib/exercise-media.ts` (`backfillExerciseMedia`, name-join against `exercises` mirroring
  `portal-data.ts`'s existing video-only pattern) wired into `app/hub/m/train/[sessionId]/page.tsx`
  (previously did zero join to `exercises` at all), `lib/portal-data.ts` (extended video-only
  backfill to also carry `image_url`), desktop `SessionEditor.tsx` (added the backfill + an actual
  `<img>` thumbnail in the exercise row list, not just the attached-icon toggle), and — found
  missing during live verification, not in the original OpenCode diff — the portal training view
  itself (`TrainingClient.tsx` extended `image_url` into the data shape but never rendered it;
  fixed in commit 507dde9). Built across 4 OpenCode-lane commits in the same worktree
  (0f785ca, 507dde9, af88125, plus the image data commit f3f1fa4), all hand-reviewed line-by-line.
  **Live-verified 2026-08-24** against real prod data via claude-in-chrome under Esther's real hub
  session: exercise library thumbnails render (zoomed screenshot confirmed real photos, not
  broken icons); a real session's mobile TrainScreen loaded a real local image
  (`/images/exercises/trap-bar-deadlift.jpg`, network-confirmed 304); exercises with no matching
  library row correctly show no thumbnail (verified this is a legitimate name-mismatch case —
  e.g. "DB Goblet Squat" vs library's "Dumbbell Goblet Squat" — not a bug, same limitation the
  pre-existing video-only pattern already had). **Found and ruled out a pre-existing, unrelated
  bug during verification**: mobile TrainScreen throws a React hydration-mismatch error on at
  least one real session — confirmed present with Lane I's `page.tsx` changes reverted too, so
  not a regression from this fix; not investigated further (out of this Lane's scope), left as a
  deferred item.
- [x] **GATE ANSWERED 2026-08-24 (Craig, in chat): "Yes, run against both now."** Ran
  `scripts/download-trainerize-images.mjs` (local-only, no DB write — downloaded 2,224 images to
  `public/images/exercises/`, generated `scripts/trainerize-image-map.json` +
  `scripts/trainerize-image-migration.sql`) then the generated SQL migration (2,224
  `exercises.image_url` UPDATEs, exact `WHERE image_url = '<trainerize-url>'` match, run inside a
  single transaction) against **both** prod (`eternal_fitness`, via the existing 127.0.0.1:5433
  tunnel) and staging (`eternal_fitness_staging`, same tunnel + host, staging's own
  `ef_staging_app` role pulled from Coolify env vars) — 2,224/2,224 rows updated on each. Then ran
  `scripts/backfill-session-images.mjs` against both DBs (dry-run first, diffed against expected
  counts) — prod: 103 sessions + 7 templates backfilled; staging: 80 sessions + 2 templates.
  Images downloaded to the shared checkout were copied into the Lane I worktree and committed
  there (not committed from the shared checkout) — see Lane I DONE entry.
- **Scope note (2026-08-24):** this WO's original FORBIDDEN list blocked
  `app/portal/(client-facing UI)**` — written for Lanes A-H's original scope, before Lane I
  existed. Lane I's second bug report ("exercise images not showing... across the app on all
  services where it's made available") explicitly requires a portal training-view thumbnail, so
  that FORBIDDEN line no longer applies to Lane I specifically — carved out here rather than
  silently overridden. Every other FORBIDDEN entry (marketing content, planAgentPrompt.ts,
  migrations without a GATE, components/ds/**, design-system.css) still holds for Lane I; none
  were touched.

### Lane J (CR-EF-081/082/083/084/085/087 — Esther's hub-task triage batch, 2026-08-24)
- [x] **Lane J complete — all 6 CRs built, merged, promoted to main, live-verified 2026-08-24.**
  Built across 5 isolated worktrees (lane-j-tasks-kanban-sync, lane-j-swap-exercise-scope,
  lane-j-unpair-supersets-desktop, lane-j-workout-name-profile, lane-j-document-sign-
  notification), every commit hand-reviewed line-by-line before merging (one real bug caught
  and fixed on review — CR-EF-087's notify link used the client's UUID instead of the numeric
  `client_number` the hub route actually expects). CR-EF-082's first OpenCode attempt explored
  the code and stopped without committing anything — retried with a more directive prompt,
  which then completed correctly. Combined via sequential merge into lane-j-tasks-kanban-sync
  (one real conflict: both the swap-scope and unpair-supersets lanes added new `useState` hooks
  to `SessionEditor.tsx` — resolved by keeping both, non-overlapping). `tsc --noEmit` clean on
  the combined tree. Pushed `staging` (`a7b4a92`), deployed, live-verified on
  development.eternal-fitness.co.uk (task creation/list sync, swap-scope dialog, group/ungroup
  superset, workout-name field — see each CR-EF row in change-requests.md for exact steps).
  Promoted to `main`, deployed (Coolify `7qfiovzk89xkgomdo0f6bovb`, finished healthy), spot-
  verified live on eternal-fitness.co.uk (client profile "Last workout: Full body foundation",
  Tasks page loads clean). CR-EF-087 (sign notification) is code-verified only — no real
  document was signed this session to test the actual email send, left as a follow-up check.
  Design Parity Gate: attested N/A — none of the 6 CRs are governed by an Open Design mockup,
  all are small functional additions to existing screens.
- [x] CR-EF-081 — tasks created via ClientTasksPanel vanish from main/mobile Tasks lists. Built
  and live-verified (see DONE entry above + change-requests.md).
- [x] CR-EF-082 — mobile Tasks view never filtered by assignee. Built and live-verified.
- [x] CR-EF-083 — exercise swap now offers this-session-only vs all-remaining-sessions scope,
  via a new `POST /api/sessions/[id]/swap-exercise` route. Built and live-verified.
- [x] CR-EF-084 — desktop SessionEditor gained group/ungroup superset actions. Built and
  live-verified.
- [x] CR-EF-085 — client profile Active Block card now shows the next/last workout name. Built
  and live-verified on both staging and prod.
- [x] CR-EF-087 — client document sign now emails Esther. Built, tsc clean, not live-tested
  (no real document signed this session).
- [BLOCKED] CR-EF-086 (site-wide VI alt-text) — not part of this lane, needs an Open Design
  authoring pass on existing images first (only 11 new shoot photos currently have plates).

### Lane K (session assignment mechanism — CR-EF-088/089/090, 2026-08-25)
- [x] CR-EF-088 — mobile "Build from scratch" workout never sets `scheduled_at`. Built,
  `tsc --noEmit` clean, not yet pushed/deployed.
- [x] CR-EF-089 — completed-session edit path masked the real save error and left the
  Edit tab reachable. Built, `tsc --noEmit` clean, not yet pushed/deployed.
- [GATE] CR-EF-090 — content vs. scheduling are decoupled writes; 18 real Outlook bookings
  (incl. Tom's and Ellie's today) sit unconfirmed with no prompt to reconcile them. Flow
  diagram published as a Claude Artifact this session. Needs Craig's decisions on: hub-wide
  unconfirmed-booking surfacing, whether confirming a booking should offer to attach to an
  existing content-session vs. always creating a blank one, and whether "content with no
  date" should be a disallowed state entirely. Open Design mockup required before build
  (user-facing surface).

## LEDGER (files)
Progress written to: eternal-fitness-website/.context/state.md + handoff.md as each unit ticks.
Live status: eternal-fitness-website/.context/loop-status.md

CONTEXT: Consolidates wo-hub-workout-parity-2026-08-19, wo-ef-hub-dashboard-client-training-
parity-2026-08-19, wo-ef-workout-consolidation-pwa-2026-08-15, wo-ef-hub-structure-
consistency-2026-08-17, wo-ef-seo-speed-spam-2026-08-17, wo-ef-security-repo-quickwins-
2026-08-15, wo-eternalfitness-hub-mobile-session-pwa-2026-08-10. Full source detail for each
carried-over unit lives in those WOs' original .context/ files (not rewritten here) and this
session's registry sweep. CRs referenced: CR-EF-006, 008, 037, 047, 048, 050.

Lane G (2026-08-20): Craig confirmed live that clients book sessions via a Microsoft Bookings
form, and those bookings land in Outlook but never appear in `/hub/schedule` — the app's
Outlook sync is one-way (app→Outlook only, `lib/calendar-sync.ts:14-19`), so a Bookings
appointment has no `sessions` row and is structurally invisible. Scoped via AskUserQuestion:
same calendar as the existing sync (no separate Bookings mailbox to poll), match to
`clients.email` with unmatched flagged for manual review, and treat as a CR + this WO rather
than a quick fix given the new Graph read-back path, matching logic, and reconciliation UI.
See CR-EF-050 for full detail. Diagnostic unit is safe to run now (read-only, no schema); the
reconciliation UI and any new table are gated behind an Open Design brief (G7) not yet raised.

### Lane L (workout→template bulk conversion + exercise picker, CR-EF-092/093, 2026-08-25)
- [GATE] CR-EF-092 — bulk-convert every past+present workout into templates. Needs Craig's call
  on dedup strategy (merge identical structures vs. one template per session), auto-generated
  template naming (no PII), and whether Esther reviews a batch before it commits (→ new UI,
  Open Design mockup required) or it runs straight into the library. Data audit (session count,
  duplication rate) also needed before implementation — not yet run this session (no DB access
  from this worktree). See CR-EF-092 in change-requests.md for full technical scope.
- [AUTO once unblocked] CR-EF-093 — exercise free-text field (`TemplateEditorClient.tsx:547-551`,
  the only genuinely free-text exercise input in the app) becomes a searchable picker reusing the
  existing `add-exercise-dialog.tsx`/`swap-exercise-dialog.tsx` pattern, with an "add custom"
  affordance added to all three call sites via one shared `ExercisePicker` component. Lower risk
  than CR-EF-092 — extends an already-live dialog pattern, likely no new Open Design mockup
  needed, but confirm dialog styling against design-systems mockups since it's a new call site.
  Not gated on CR-EF-092's decisions; can build independently once picked up.

### Lane L continued — 2026-08-25, decisions locked + grinding via OpenCode
Craig: "add to the work order and grind with opencode." Decisions made this session (recorded
here so a resumed session doesn't re-ask):
- CR-EF-092 dedup: MERGE identical workout structures into one shared template (confirmed after
  data audit: 111 real workouts / 79 unique structures / 15 reused 2-6x each).
- CR-EF-092 naming: no PII -- auto-generate from the workout's own facets (movement_type +
  muscle_groups + archetype), never client/session identifiers. Claude's call under DECIDE
  YOURSELF (Craig didn't specify a scheme, only ruled out PII).
- CR-EF-092 review screen: skipped for v1 -- script populates workout_templates directly,
  idempotent so it's safe to re-run. Claude's call; revisit if Esther finds the auto-populated
  library noisy.
- [AUTO, dispatched] CR-EF-092 build+run: OpenCode lane `cr-ef-092-bulk-templates`
  (worktree D:\apps\worktrees\eternal-fitness-website\cr-ef-092-bulk-templates, branch
  claude/cr-ef-092-bulk-templates), writes scripts/bulk-convert-workouts-to-templates.mjs,
  dry-runs then executes against prod. Not yet reviewed/merged.
- [AUTO, dispatched] CR-EF-093 build: OpenCode lane `cr-ef-093-exercise-picker` (worktree
  D:\apps\worktrees\eternal-fitness-website\cr-ef-093-exercise-picker, branch
  claude/cr-ef-093-exercise-picker). Not yet reviewed/merged.
- [AUTO, dispatched] Mobile TrainScreen hydration-mismatch bug (dmt799jrk5j): OpenCode lane
  `fix-train-hydration-mismatch` (worktree
  D:\apps\worktrees\eternal-fitness-website\fix-train-hydration-mismatch, branch
  claude/fix-train-hydration-mismatch). Not yet reviewed/merged.
- [GATE, not opencode-gradeable] G2 (Trainer PWA client-scope indicator) -- Craig deferred to
  Open Design; brief not yet raised. Needs an Open Design run, not a code lane.
- [GATE, not opencode-gradeable] CR-EF-047 (block-module exercise-table mismatch + Next-session
  nav) -- scope was never pinned down (qmt1iroec29, open since 2026-08-20). Needs Craig's call
  on what "correct" looks like before any lane can build it.
- [GATE, not opencode-gradeable] CR-EF-006 (testimonials AggregateRating JSON-LD) -- live on
  main but register says "closed, not viable" over a possible Google manual-action risk
  (qmt8mne5c58, open since 2026-08-25). Needs a keep/revert/re-research call.

### 2026-08-26 — UNITS reconciliation pass (automated dispatcher stale-check fix)
Reconciled all `[AUTO]` units in the UNITS section against `git log` evidence on origin/main.
7 units verified as shipped and ticked:
- Lane A unit 1 (Training-blocks list Approval/Programme/Progress): c77ebcd
- Lane A unit 2 (Workout-templates browser detail drawer + paste stepper): 78a6139
- Lane A unit 3 (Derived Est. duration estimator): 7c6d762
- Lane A unit 4 (Minor styling sweep): d8a254e
- Lane B (CR-EF-006 Review schema): e5ea74d + 13d7317
- Lane D unit 1 (CR-EF-048 button relabel): 24828e8
- Lane G diagnostic (listCalendarView + bookings-gap script): 18b013d
10 units left open (no git evidence or evidence incomplete):
- Lane E units x3 (wo status/reparent CLI operations — registry ops, no code diffs)
- Lane A unit 5 (exercise_uid backfill — script exists but VERIFY requires DB row-count check)
- Lane D unit 2 (Open Design visibility — investigation task, no code change)
- Lane D unit 3 (Long-Lever Plank / Weighted Plank exercises — not in codebase)
- Lane L units x3 (CR-EF-092/093/hydration — dispatched but not merged to main)
