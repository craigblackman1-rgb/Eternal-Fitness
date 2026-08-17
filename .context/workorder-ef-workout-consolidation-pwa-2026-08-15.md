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
