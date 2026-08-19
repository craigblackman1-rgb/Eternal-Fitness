# Work Order — Workout Surface Consolidation + Templates Story + Portal PWA

**Slug:** `wo-ef-workout-consolidation-pwa-2026-08-15` (registered, status `active` — brief drafted 2026-08-15, awaiting Craig's sign-off)
**Apps:** `eternal-fitness-website` (+ `design-systems` for mockups)
**Owner:** Claude (orchestrator) · OpenCode lanes for scoped implementation
**Absorbs:** `wo-templates-paste-and-assign-2026-08-14` (Craig's 2026-08-15 decision: folded in, not shipped standalone)

## GOAL

One coherent workout story across the app: **exactly two staff logging designs** (one
desktop, one mobile PWA), **one clear templates → blocks → sessions naming and
conversion story** (including Esther's paste-a-workout entry point), and **the client
portal made installable** like the staff PWA already is.

## The problem being solved

Three independently-built staff logging surfaces exist, each with its own components
and no shared design source (organic growth, never a consolidation pass):

| Surface | Route | Status |
|---|---|---|
| Session Editor (inline `ExerciseSetLogger`) | `/hub/clients/[id]/blocks/[blockId]/sessions/[sessionNum]` | Full prescription workspace, desktop |
| Standalone Live Log (`LiveSessionLog.tsx`) | `/hub/log/[sessionId]` | Lighter logging-only screen, added 2026-08-01 — no distinct job |
| Train Screen (`TrainScreen.tsx`) | `/hub/m/train/[sessionId]` | Flagship mobile logger — offline queue, rest timers, PBs |

Alongside: templates, blocks and sessions each have differently-designed pages with no
clear naming or conversion story (Craig's own framing, scope-of-works §2.4), Esther has
no way to paste a workout she's agreed with Claude into the hub as a template
(§2.3), the workout-templates browser is the one genuinely undesigned hub screen
(§5.4), and the client portal has **no PWA manifest at all** — it falls back to the
marketing site's `site.webmanifest` with no service worker, while `/hub/m` is a real
installable PWA.

## MUST

- **Mockup first, then build** — same sequence as the mobile-session WO. No lane
  builds until its mockup is signed off (Design Parity Gate applies to what follows).
- Keep the Train Screen as the mobile design baseline — it's the most actively
  developed surface and just shipped offline logging; consolidation must not regress
  it (offline queue, idempotency, warm-up/PB rules, band-unit lock all stay).
- Fold `/hub/log` (Standalone Live Log) into the surviving surfaces — a redirect, not
  a dead 404: schedule-calendar and block-overview "Log" links must keep working.
- Templates paste flow reuses `TemplateEditorClient` and `rescaleTemplateSection` —
  no parallel template editor.
- Paste structuring uses a cheap non-Claude model (same OpenRouter-avoidance rules as
  everything else; whatever the hub's existing AI path uses).
- Portal PWA scoped to `/portal/` exactly as the hub one is scoped to `/hub/` —
  marketing site's own manifest untouched.
- Every lane in its own worktree under `D:\apps\worktrees\eternal-fitness-website\`
  (DO-SOP-010); `staging` first, verify on development.eternal-fitness.co.uk, then `main`.

## DECIDE YOURSELF

- Component-level structure of the consolidated desktop logger (which parts of
  `ExerciseSetLogger` vs `LiveSessionLog` survive).
- The AI prompt/parse shape for pasted workouts, provided output lands in the
  existing template data shape (`SessionVersion`).
- Portal service-worker caching strategy (mirror the hub's: cache-first static,
  network-only `/api/*`).

## ASK FIRST (gates)

- **G1 — the naming/conversion story itself.** Templates vs blocks vs sessions:
  what each is called in the UI, and the canonical conversions (template → session,
  session → template, block roll-over). This is a product decision; propose, don't decide.
- **G2 — mockup sign-offs** (one batch per lane, not drip-fed).
- **G3 — whether the desktop Session Editor keeps an inline logger at all**, or
  desktop logging always routes to the consolidated live-log view. Changes Esther's
  studio workflow — her call, via Craig.
- **G4 — portal PWA copy/behaviour visible to clients** (install prompt, offline
  message) — client-facing, standing gate.

## LANES

Dependencies: **L1 → L2 → (L3 ‖ L4) → L5**; L6 independent.

### L1 — Inventory & naming proposal `[GATE → G1]`
Map every workout-shaped surface, component and data path (the 5 in the memory note
plus templates pages). Produce the naming/conversion story proposal + a one-page
"what folds into what" plan. **VERIFY:** Craig reviews; G1 answered.

### L2 — Mockups `[GATE → G2]`
`design-systems/brand-staging-2662e9`: consolidated desktop logging screen
(hub-session-editor.html revision), workout-templates browser (§5.4 — the genuinely
undesigned screen), templates paste-entry flow, portal-install/offline states if any
UI is needed. **VERIFY:** section-by-section sign-off (G2).

### L3 — Staff surface consolidation `[AUTO once G2/G3 answered]`
Fold `/hub/log` into Session Editor (desktop) / Train Screen (mobile) per the
signed-off design; redirect `/hub/log/[sessionId]`; delete `LiveSessionLog.tsx` once
nothing links it. **VERIFY:** tsc + build; every former "Log" link click-through;
Train Screen regression pass (offline queue replay, PB, warm-up exclusion).

### L4 — Templates: paste-and-assign + browser `[AUTO once G2 answered]`
Paste box (rich-text, same contentEditable pattern as the update composer) → AI
structuring → `TemplateEditorClient` for review → save as `workout_templates` row →
assign-to-client via the existing template-grounding path. Build the
workout-templates browser against its new mockup. **VERIFY:** paste 3 real
Esther-shaped workouts (one messy), confirm structure + rescale + assign end-to-end
on development.

### L5 — Naming/conversion rollout `[AUTO]`
Apply G1's agreed names and conversion affordances across templates/blocks/sessions
pages. **VERIFY:** grep for the old terms in UI strings; click-through.

### L6 — Portal PWA `[AUTO, code · GATE G4, client-visible states]`
`public/portal.webmanifest` + `public/portal/sw.js` + registration component, scoped
to `/portal/`, mirroring the hub implementation. **VERIFY:** install + airplane-mode
check on a real phone (same protocol as the hub PWA's outstanding §3.1 test — batch
the two device tests together).

## DONE

- `/hub/log` no longer a third design; two staff logging designs total.
- Esther can paste a workout → structured template → assigned to a client, without leaving the hub.
- Templates/blocks/sessions use the agreed names and conversions everywhere.
- Portal installs to a phone home screen with its own manifest + SW.
- All verified on development.eternal-fitness.co.uk, then live on `main`, ledger updated.

## LEDGER

- 2026-08-15 — WO registered; brief-drafting deferred to a fresh session (Craig).
- 2026-08-15 — Craig folded templates paste-and-assign into this WO
  (`wo-templates-paste-and-assign-2026-08-14` → abandoned). Brief drafted; awaiting
  Craig's review of the brief itself + G1 proposal sequencing.
- 2026-08-17 — Craig asked for L2's mockup needs to be turned into real OpenDesign
  briefs so he can run them and hand back for implementation. Drafted 3 functionality
  briefs presuming G1 (naming) was still open — **wrong**: found and corrected same
  day, see next entry.
- 2026-08-17 (later) — Discovered `D:\apps\design-systems\ef-control-hub\brief-
  workout-consolidation-opendesign.md`, a more thorough brief from **2026-08-15**
  (an earlier session) that already completed L1 (full code inventory) and got
  **G1 and G3 answered by Craig** that day. It supersedes all 3 briefs drafted
  earlier today, which duplicated its scope without the inventory behind them and
  got one fact wrong (called the workout-templates browser "genuinely undesigned"
  — it's actually fully built and working, needs a skin-only pass, not new UX).
  Deleted the 3 superseded briefs; mirrored the correct one into this repo's
  git-tracked `.context/` as `brief-workout-consolidation-opendesign.md` (single
  brief covering all 4 pieces: consolidated desktop logger, templates browser
  skin pass, paste-and-assign, portal PWA states). Re-sent to Craig to run.
  **Status check same day:** only the templates-browser skin pass mockup
  (`hub-workout-templates.html`) has actually come back from Open Design so far —
  the consolidated desktop logger (Craig's "unified plan editor"), paste-and-assign,
  and portal PWA states have not, which is why nothing new is on `main` yet.
- 2026-08-17 (later still) — Craig ran a further Open Design pass; 4 mockups came
  back (`hub-session.html` consolidated logger, `hub-workout-templates.html` skin,
  `hub-block-module.html`, `hub-schedule.html`). Ran a Design Parity Gate review
  against the brief + G1/G3. `hub-block-module.html` and `hub-schedule.html`
  **approved as-is** — both correctly route "Log" actions to
  `hub-session.html?mode=log`, no stale `/hub/log` references. `hub-session.html`
  and `hub-workout-templates.html` sent back for revision (see
  `revision-request-workout-consolidation-2026-08-17.md`): consolidated logger
  needs offline queueing + kg/lb switching added; templates browser needs its 2
  missing filters (movement type, muscle group) restored and the archetype filter
  values fixed (mockup invented condition-style labels; archetype is actually the
  Plan Agent's session-type emphasis — Mobility & Movement Quality / Strength &
  Stability / Power & Conditioning — a different, already-existing field from
  condition). Paste-and-assign, portal PWA states, and nav-restructure
  reconciliation still outstanding — Craig re-sent those briefs to Open Design
  after the first pass apparently lost them.
- 2026-08-17 (evening) — Craig reported live field problems from Esther (Emma
  triple-logged workout, 5 workouts in one "week", desktop/mobile date and
  status disagreements, completed sessions editable, logged data invisible on
  the client page, calendar disconnect). Full investigation run against prod
  data + code: every symptom confirmed and root-caused. Headline: **0 of 247
  `set_logs` rows carry a `client_op_id`** (the live write paths never send
  one — the 2026-08-13 idempotency layer has never deduped anything), and
  every manually-built block has all sessions stamped `week 1` (66/92 prod
  sessions). Registered as CR-EF-029–036 (bugs) + CR-EF-037 (umbrella
  architecture CR). Assessment + unified-model proposal (first-class session
  status, uid-keyed logs, mandatory idempotency, date-derived Mon–Sun weeks,
  calendar-as-spine, Trainerize-informed PWA):
  `eternal-fitness-website/.context/assessment-workout-unification-2026-08-17.md`.
  **Proposed scope amendment:** Phases 1–3 of that doc become lanes of this WO
  (or a sibling WO — Craig's call, question on the board). Phase 0 hotfixes
  (H1–H6) are small [AUTO]-shaped bug lanes awaiting Craig's go-ahead on the
  two behaviour-changing ones (H1 reject keyless writes, H3 block writes to
  completed sessions). The approved `hub-block-module.html` / `hub-schedule.html`
  mockups need a functional revision pass against the state model before build.
  Emma data cleanup queued as a gated decision — destructive, needs Esther's
  account first.
- 2026-08-17 (later) — Craig asked for an Open Design brief to visualise the
  unified-model proposal. Drafted `brief-workout-unification-opendesign.md`
  (repo `.context/` + mirrored to `D:\apps\design-systems\ef-control-hub\`):
  functional revision pass on the approved `hub-block-module.html` (date-derived
  Mon–Sun weeks, block-page scheduling) and `hub-schedule.html` (completion
  states), session-state additions folded into the already-open
  `hub-session.html` revision, plus a client-detail Sessions-tab redesign
  (logged-data visibility). Mobile PWA IA explicitly deferred to a post-
  Trainerize-walkthrough brief. Sent to Craig to run.
- 2026-08-17 (night) — Craig confirmed Open Design ran the unification brief.
  Revisions landed on `hub-block-module.html`, `hub-schedule.html`, `hub-session.html`
  + new `hub-client-sessions-tab.html` (400+ line diffs, not cosmetic). Ran a Design
  Parity Gate review before treating this as G2-ready — **verdict: not yet, 4 gaps**.
  What's solid (don't rework): the shared 5-state status pill is byte-identical
  across all four files, completed/cancelled render read-only correctly, the audited
  Reopen flow matches the brief, and "in progress" correctly triggers on the first
  set logged rather than on opening the screen (verified against the exact trigger
  condition, not just the section heading). What's missing: (1) `hub-session.html`'s
  own `<h1>`/breadcrumb reads "Session 10," a bare `S{n}` — breaks the brief's own
  `focus_label` naming rule, on the one screen the trainer is actually using; (2)
  `hub-schedule.html` (day) and the pre-existing `hub-schedule-month.html` weren't
  reconciled as the pair the brief asked for — they disagree on whether cancelled
  sessions are hidden by default, and don't cross-link; (3) 2 of the brief's 5 named
  "honest data cases" (an off-pattern 4–5-session week, an 18-session block) aren't
  in the sample data anywhere, despite being named specifically because they're what
  broke in production; (4) none of the four files' own handback notes flagged any of
  this — they read as fully confirmatory. Revision request written and sent:
  `.context/revision-request-workout-unification-2026-08-17.md` (mirrored + committed
  `design-systems@6512f1b`). CR-EF-037 updated to reflect gate status. **Do not sign
  G2 until the revision lands and gets re-checked.**
- **2026-08-17 (later still) — L3/L4/L6 actually shipped, ledger never updated
  until now (found during the 2026-08-19 reconciliation pass).** Correcting the
  record:
  - **L3 (staff surface consolidation) — BUILT.** `347145c`. `LiveSessionLog.tsx`
    deleted; `app/hub/log/[sessionId]/page.tsx` is now a real redirect into
    `/hub/clients/[id]/blocks/[blockId]/sessions/[sessionNum]`. `/hub/log` is no
    longer a third design.
  - **L4 (templates paste-and-assign + browser) — BUILT.** `626952f`.
    `app/hub/(protected)/workout-templates/new/TemplatePasteClient.tsx` +
    `/api/workout-templates/structure` are live; Esther can paste a workout and
    get a structured, assignable template without leaving the hub.
  - **L6 (portal PWA) — BUILT.** `b328e52`. `public/portal.webmanifest` +
    `public/portal/sw.js` present, scoped to `/portal/` per the brief.
  - **L2 (mockups) — delivered, revised, verified.** All 4 lane mockups
    (`hub-session.html`, `hub-block-module.html`, `hub-schedule.html`,
    `hub-workout-templates.html`) came back, the two sent for revision were
    revised and re-verified against the brief on 2026-08-18 (see
    `.context/audit-hub-design-parity-2026-08-18.md`).
  - L5 (naming/conversion rollout) — not evidenced as done; still open.
  - G4 (portal PWA client-facing copy) — standing gate, not yet asked.
- **2026-08-19 — G2 signed by Craig.** Also approved adopting
  `.context/assessment-workout-unification-2026-08-17.md` Part 3's unified
  session state model (clears queued decision `qmsxl5j0c7l`; all hotfixes AUTO).
  CR-EF-037 Phases 2–3 — the state-model build, uid-keyed set_logs, one write
  path, calendar spine — are now buildable lanes off this WO. Emma Atkinson's
  duplicate-log data question (`qmsxl5iz4wg`) also answered: clean up as
  proposed in CR-EF-029's reconstruction, backup taken first.
- **2026-08-19 (same day, later) — Phase 2 started, real progress shipped to
  `staging`.** Found and fixed a live risk while starting: the 18 Aug status
  migration shipped without the "transition API" its own comments call for,
  so nothing had written the new `status`/`started_at`/`completed_at` columns
  since — verified 0 sessions had drifted yet, but every completion from today
  onward would have started the exact bug CR-EF-037 exists to kill, again.
  Shipped: `lib/session-transitions.ts` (`markSessionInProgress`, idempotent,
  called from both set-log insert paths); `app/api/sessions/[id]/route.ts`
  syncing `completed_at`/`status` on the existing PATCH both loggers already
  call (no frontend changes needed); `scripts/backfill-exercise-uid.mjs`
  (156 rows backfilled, 100% `exercise_uid` coverage, applied to prod);
  `components/hub/SessionStatusPill.tsx` (Lane B, dispatched to OpenCode,
  hand-reviewed, render-verified against all 5 mockup states). All on
  `staging` (`79c5d3f`), verified via `tsc --noEmit` + a synthetic
  throwaway-session test (zero real data touched) + direct code-path review.
  **Not yet on `main`/live** — Craig's call, per today's staging-only decision.
  **Still open, explicitly deferred (not silently dropped):** wiring
  SessionStatusPill into live screens; CR-EF-036's actual fix (client Sessions
  view reading `set_logs`); H3's write-guard + Reopen UI (needs a read of the
  mockup's `reopen-dialog` section before building — UI-dependent, didn't fit
  today); Phase 3 (calendar spine); the wider CR-EF-039/040 ~50-screen sweep
  (HubRail, HubCard height contract, single accordion, single tab still open
  Lane B units before the sweep itself can start).
- **2026-08-19 (same day, even later) — wo-ef-sessions-blocks-full-build-2026-08-19
  dispatched and completed on staging.** All 7 lanes (A: shared primitives remainder,
  B: wire SessionStatusPill into live screens, C: CR-EF-036 Sessions visibility,
  D: CR-EF-031 write-guard + Reopen, E: Phase 3 calendar spine, F: verify-hub-pages.js,
  G: CR-EF-039/040 8-screen consistency sweep) merged to `staging` (`4844c72`), 46 files,
  1594 insertions, deployed to development, spot-verified live. **Not promoted to main** —
  standing decision pending. This WO's Phase 2–3 scope is now materially delivered on
  staging; only the genuinely-remaining gaps (training-blocks list, workout-templates
  deeper parity incl. the position/adaptation difficulty facet, derived Est. duration,
  minor sweep remnants) are tracked by the follow-on
  `.context/workorder-hub-workout-parity-2026-08-19.md`.
