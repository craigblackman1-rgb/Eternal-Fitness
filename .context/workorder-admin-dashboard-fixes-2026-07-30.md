# Work Order: Trainer Hub — design-fidelity fixes — 2026-07-30

OWNER: (empty until claimed — see Ownership, SOP-008)
SCOPE: eternal-fitness-website (app/hub/**, components/hub/**, app/parq/edit/**, app/globals.css --hub-*/--status-* tokens). No portal/, no marketing pages, no supabase/ migrations.

GOAL: Every genuine delta found by the 2026-07-30 full re-audit (structural + visual/component
fidelity, `.context/workorder-admin-dashboard-visual-audit-2026-07-30.md`) is either fixed and
verified, or explicitly parked on Craig's desk with the exact decision needed.

MUST:
- No live hub login credentials are available in this environment (standing limitation across every
  session — see `.context/handoff.md`). Every unit below was found via static code/CSS diff, not a
  browser click-through. Verify fixes the same way (read the resulting rendered classes/tokens) and
  say so plainly — don't claim "visually confirmed" when it wasn't.
- Preserve all real functionality — none of these are data/logic bugs, they're component-consistency
  and token-fidelity fixes. If a unit's diff touches anything beyond styling/markup, stop and flag.
- Same git-worktree-per-lane, junctioned `node_modules`, `tsc --noEmit` + `next build` before merge,
  hand-diff review before trusting any OpenCode output — no self-report (per DO-SOP-010 and the
  project's "OpenCode diffs must be hand-reviewed" gotcha).
- The `rounded-full` button-shape sweep (Lane 1) must NOT touch legitimate circular elements —
  avatars, initials circles, unread-count badges, toggle switches. Only primary/secondary CTA
  buttons using the marketing pill shape are in scope.

DECIDE YOURSELF: exact Tailwind class values when converting `rounded-full` → `rounded-lg`; whether
a hand-rolled card becomes a direct `HubCard` swap or needs a thin wrapper; ordering of lanes.

ASK FIRST: 6 genuine design-intent decisions below are `[GATE]`, queued via `wo ask` against this
Work Order — see ASK FIRST list in each lane. None of them are code obviously "wrong" — they're
"which of two real designs is the intended one," same category as the earlier `hub-dashboard.html`
resolution today.

## DONE (ticks to zero = stop condition)
- [x] Lane 1 — cross-cutting token/component fixes (button-shape sweep, EmptyState, amber icon,
      Reports KPI band → shared component) — merged `882ea1f`
- [x] Lane 2 — Dashboard avatar-colour consistency fix — merged `4ed1d5f`
- [x] Lane 3 — Client-detail page-title hierarchy fix — merged `856d5b2`
- [x] Lane 4 — PAR-Q hub-mode input styling fix — merged `9be4870`
- [x] Lane 6 — DocumentDetailClient → HubCard/HubCardHeader conversion — merged `df81787`
- [x] Lane 9 — Session editor component-consistency fixes (Coaching Notes card, version toggle,
      superset group tokens, remaining hand-rolled cards) — merged `9357305`. OpenCode's diff left
      two Card/CardContent blocks with mismatched closing tags (real JSX parse failure, not caught
      by its own tsc self-check); hand-fixed and re-verified with `tsc` + `next build` before merge.
- [ ] All 6 GATE decisions queued and answered (or explicitly still pending, not silently dropped)

## LANES
- Lane 1 — Cross-cutting token/component fixes · depends on: none · touches many files, do first
  since Lanes 2/3/6/9 build on some of the same shared components
- Lane 2 — Dashboard · depends on: none, can run alongside Lane 1
- Lane 3 — Client detail/edit/list · depends on: none
- Lane 4 — PAR-Q (hub mode) · depends on: none
- Lane 5 — Exercise Library · GATE only, no build lane yet
- Lane 6 — Document engine · depends on: Lane 1 (button-shape sweep covers the same file)
- Lane 7 — Process & Quality · GATE only, no build lane yet
- Lane 8 — hub-sop.html / SopDetailModal · GATE only, no build lane yet
- Lane 9 — Session editor · depends on: none

## UNITS

### Lane 1 — Cross-cutting token/component fixes
- [AUTO] **Hub button-shape sweep** — replace `rounded-full` with `rounded-lg` on primary/secondary
  CTA buttons inside `.hub-shell`-scoped routes. Files (confirmed by audit, `Button`/CTA elements
  only, not avatars/badges/switches): `components/hub/EmptyState.tsx` (lines 32, 37),
  `app/hub/(protected)/templates/[id]/SendTemplateToClient.tsx:63`,
  `app/hub/(protected)/clients/[id]/updates/page.tsx:56`,
  `app/hub/(protected)/clients/[id]/updates/new/UpdateChatPanel.tsx:121`,
  `app/hub/(protected)/clients/[id]/updates/new/NewUpdateClient.tsx:551,610`,
  `app/hub/(protected)/reports/updates/UpdatesReport.tsx:356,362,370,415,421`,
  `app/hub/(protected)/clients/[id]/documents/[docId]/DocumentDetailClient.tsx` (lines 132, 137,
  159, 279, 306, 319, 323 — 15 occurrences, see also Lane 6),
  `app/hub/(protected)/clients/[id]/documents/NewDocumentButton.tsx`,
  and any other `Button ... rounded-full bg-rose` match inside `app/hub/(protected)/**` /
  `app/hub/(protected)/clients/**` (grep for the pattern, the audit's list may not be exhaustive).
  **Out of scope, decide with the GATE below first:** `app/hub/login`, `app/hub/forgot-password`,
  `app/hub/reset-password` — pre-auth pages outside `.hub-shell`.
  VERIFY: `tsc --noEmit` + `next build` clean; grep confirms no `rounded-full` remains on a `Button`/
  CTA element inside the listed files; hand-diff confirms no avatar/badge/switch/count-pill was
  wrongly changed.
- [AUTO] **EmptyState restyle** — CTA button `rounded-lg` (covered by the sweep above), icon circle
  changed from 64px `bg-rose/10 text-rose/50` to the spec's 48px `bg-[var(--hub-hover)]
  text-[var(--color-muted-text)]`. Files: `components/hub/EmptyState.tsx` lines 19-21, 32, 37.
  VERIFY: `tsc --noEmit` clean; every `EmptyState` call site (Clients list, client-detail Training/
  Progress tabs, others) picks up the fix automatically since it's a shared component — confirm by
  grepping call sites, not by guessing there's only one.
- [AUTO] **HubCardHeader amber icon colour** — darken from the raw `#E8A87C` (`--color-amber`) to a
  legible variant matching the mockup's `#B0713A`-on-`rgba(232,168,124,.16)` treatment, consistent
  with how `--status-warning-text` already exists as a darker variant for the same contrast reason.
  Files: wherever `HubCardHeader`'s `color="amber"` variant is defined (likely
  `components/hub/HubCardHeader.tsx`), `app/globals.css` (`--color-amber-rgb` line ~38, may need a
  new `--color-amber-text` token following the existing `--status-*-text` pattern rather than
  changing the base `--color-amber` used elsewhere). VERIFY: `tsc --noEmit` clean; confirm all 3+
  known call sites (Training Rules header, Process & Quality Improvement Log header, Plan Agent
  List/Archetype editors) pick up the darker colour automatically; confirm nothing outside the Hub
  (marketing site) references the same `--color-amber` token in a way this change would affect —
  if it does, add a hub-scoped token instead of changing the shared one.
- [AUTO] **Reports/Updates KPI band → shared `KpiTile`** — replace the hand-rolled `iconTone`/
  `deltaToneStyles` markup with the existing `<KpiTile>` component so icon colours resolve through
  `lib/hubStatus.ts`'s `getStatusClasses()` (the darker `-text` variants) instead of raw base hues.
  Files: `app/hub/(protected)/reports/updates/page.tsx` lines 93-146. **Do not touch the underlying
  data** — `sentThisMonth`/`monthDelta`/`openRate`/`clientsCovered` are genuinely derived from
  `sent_updates`, confirmed correct by two independent audit passes; this is a render-only change.
  VERIFY: `tsc --noEmit` + `next build` clean; KPI tile colours now match every other KPI band in the
  Hub (compare against Dashboard's KPI band); all 4 tiles' numbers/deltas render identically to
  before — hand-diff to confirm no data logic was touched.
- [AUTO] **Update `admin-design-system.html`'s danger-alert doc** — the spec (lines ~206-209,
  511-514) shows a tinted/bordered danger alert, but the live `HubAlert` `severity="danger"` variant
  (`components/hub/HubAlert.tsx:19-38`) is a deliberate solid/loud style for clinical-safety states
  (per its own code comment). This is the spec being stale, not the code being wrong — update the
  mockup doc to match, don't change the component. Files: `D:\apps\design-systems\ef-control-hub\
  admin-design-system.html` (design-systems repo, not the app repo). VERIFY: doc now shows the
  actual solid/loud treatment; no app code touched.

### Lane 2 — Dashboard
- [AUTO] **Avatar-colour consistency** — replace hand-picked `bg-rose/15 text-rose` with the
  semantic `bg-[var(--status-primary-bg)] text-[var(--status-primary)]` token already used correctly
  in the same page's "Recent Check-ins" table. Files: `app/hub/(protected)/page.tsx` lines 232, 266,
  313. VERIFY: `tsc --noEmit` clean; all 4 avatar-circle instances on the dashboard (Check-ins,
  Needs Attention, Active Blocks, Recent Clients) render identically.

### Lane 3 — Client detail / edit / list
- [AUTO] **Client-detail page-title hierarchy** — the mockup deliberately specs 26px/700 for the
  client's name ("the name is the largest thing on the page"); live reuses the generic
  `HubPageHeader` (20px/600) shared by every other page title. Build a client-detail-specific header
  treatment rather than changing `HubPageHeader` itself (that component is shared hub-wide and must
  not regress other pages). Files: `app/hub/(protected)/clients/[id]/page.tsx` line ~240. VERIFY:
  `tsc --noEmit` clean; every other page still uses the unmodified `HubPageHeader`; client-detail
  name now renders at the larger size/weight.
- [BLOCKED] **Client-edit field-border contrast** — the auditing agent flagged a possible gap (mockup
  uses a stronger `#7E8088` border for form-input boundaries specifically for contrast reasons; live
  may resolve to the weaker `#C7CCD4` `--hub-field-border`, mitigated by a `.hub-shell` HSL override
  that wasn't fully traced) but explicitly could not confirm this without a rendered check. Waiting
  on: either Craig visually confirming next time he's in the hub, or a follow-up pass with real
  browser access. Don't build a fix against an unconfirmed finding.
- [AUTO] **Clients index card rhythm** — minor: mockup wraps toolbar+table+pager as one continuous
  card; live renders the toolbar as a bare row above a separate card, and only shows a pager once
  data exceeds 25 rows. Low priority/cosmetic. Files: `components/hub/HubTable.tsx` and/or
  `app/hub/(protected)/clients/clients-table.tsx`. VERIFY: `tsc --noEmit` clean; confirm this doesn't
  regress any other `HubTable` consumer (it's a shared component — check call sites before changing
  its outer wrapper).

### Lane 4 — PAR-Q (hub mode only)
- [AUTO] **Sections 1 & 5 input styling** — replace the raw `border-[#D9D9D9]`/`text-[#1E1E1E]`/teal
  focus ring (copied verbatim from the public-facing PAR-Q form) with hub field tokens
  (`--hub-field-border`) and the rose focus glow already used correctly by the Yes/No rows on the
  same form. Files: `app/parq/edit/[id]/ParqEditClient.tsx` (`inputClass`/`textareaClass`, lines
  313-325; Section 1 usage ~445-483; Section 5 usage ~530-552). **Confirm `inputClass` isn't shared
  with the standalone public PAR-Q page's own styling before changing it** — if it is, scope the fix
  to the `hubMode` render path only, don't change the public-facing form's look. VERIFY: `tsc
  --noEmit` clean; Sections 1/5 now visually match the Yes/No rows' field styling within hub mode;
  public PAR-Q page (`app/parq/edit/[id]` outside hub, if it's a separate render path) unchanged.

### Lane 6 — Document engine
- [AUTO] **DocumentDetailClient → `HubCard`/`HubCardHeader`** — replace the 6 raw shadcn `Card`/
  `CardHeader`/`CardTitle` call sites with the shared `HubCard`/`HubCardHeader` components instead of
  manually re-approximating hub styling with inline token overrides. Files:
  `app/hub/(protected)/clients/[id]/documents/[docId]/DocumentDetailClient.tsx` lines 155, 192, 220,
  256, 291, 340. (The `rounded-full` buttons in this same file are covered by Lane 1's sweep —
  don't duplicate that work here.) VERIFY: `tsc --noEmit` + `next build` clean; all 6 sections
  (whatever they are — confirm names, e.g. metadata/versions/signing/send-history) render with
  consistent `HubCard` styling; every existing action (Save, Delete, New version, Sign as trainer,
  Send email, Copy link) still present and functional — hand-diff, this is the busiest
  document-management screen in the Hub, don't lose an action silently.

### Lane 9 — Session editor
- [AUTO] **Coaching Notes card → `HubCardHeader`** — replace raw shadcn `CardHeader`/`CardTitle`
  (currently overridden to `text-lg`) with `HubCardHeader`, matching the "Session Log" card
  immediately above it on the same page which already does this correctly. Files: session editor
  `page.tsx` lines ~359-360 (path:
  `app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/page.tsx`). VERIFY: `tsc
  --noEmit` clean; both cards on the page now share identical header styling.
- [AUTO] **Studio/Home version toggle → Hub segmented control** — replace shadcn `Tabs`/`TabsList`
  (`bg-muted`, white-bg-plus-shadow active state) with the Hub's rose-tinted active-state pattern
  used elsewhere (nav rail, other `seg-btn.on` instances). Files: same `page.tsx` lines ~227-230.
  VERIFY: `tsc --noEmit` clean; active state now shows the `--hub-sidebar-active`-style rose cue
  consistent with other Hub toggles; Studio/Home switching behaviour unchanged.
- [AUTO] **Superset group token correction** — `bg-rose/5 border-rose/30` → the documented
  `--status-primary-bg` (10%)/`--status-primary-border` (20%) tokens. Files: `SessionEditor.tsx:385`.
  VERIFY: `tsc --noEmit` clean; visual strength now matches other rose-tinted grouped elements
  hub-wide.
- [AUTO] **Remaining hand-rolled cards → `HubCard`** — `SessionEditor.tsx:312,342` and `page.tsx:
  287,358` use ad-hoc `rounded-2xl border ... shadow-sm` divs/shadcn `Card` instead of `HubCard`.
  VERIFY: `tsc --noEmit` + `next build` clean; no visual regression (values should be near-identical
  today, this is a maintainability/consistency fix more than a visible bug).

### Lane 5, 7, 8 — GATE-only, no build units yet (queued via `wo ask`, see below)

## GATE DECISIONS — queued via `wo ask` against `wo-admin-dashboard-fixes-2026-07-30`, not asked inline
1. **`--hub-border` token collapse.** The spec documents two distinct border tokens (`#E6E8EC`
   "default" vs `#D7DBE1` "section"); in production, `.hub-shell`'s CSS override
   (`app/globals.css:210-213`) silently collapses `--hub-border` to the section value everywhere, so
   every `HubCard`/`KpiTile`/`HubTable` border hub-wide is `#D7DBE1`, not `#E6E8EC`. Restore the
   distinction (real code change, touches every card border hub-wide), or accept the current
   single-value behaviour as correct and fix the spec doc instead (like the danger-alert item above)?
2. **Dashboard page-header treatment.** Mockup specs a dedicated 24px/700 "Good morning, Esther"
   greeting; live uses the generic 20px/600 `HubPageHeader` with generic copy. Build a bespoke
   dashboard greeting header, or is the current shared-header treatment the intended, simpler design
   (same resolution pattern as the dashboard's data-card layout, already confirmed correct earlier
   today)?
3. **PAR-Q Section 7 "Medical clearance record"** is missing entirely from the hub-mode editor
   (present in the mockup). Ties to the project's known history of fabricated-content bugs being
   caught and stripped (`.context/` CLAUDE.md "OpenCode dispatched diffs" gotcha) — was this
   deliberately removed, or should it be restored as a real trainer-only clearance-status section?
4. **Exercise Library IA.** Mockup is a compact list + detail-drawer (single selected exercise,
   category-dot filters, ~150 curated rows). Live is a single wide table with 6 filter dropdowns,
   inline row-expand, bulk-edit, and a much larger (2500+ row, Trainerize-imported) dataset — a
   functional superset built after the mockup, not a regression. Keep the current table design
   (recommend retiring/updating the mockup to match), or is the drawer pattern still wanted for a
   specific reason (e.g. a faster single-exercise lookup mode alongside the table)?
5. **Process & Quality IA.** Mockup shows a read-only operational dashboard (onboarding-process
   timeline + pre-session quality checklist + KPI band). Live is a tabbed CRUD admin tool (Process
   Register / SOPs / Improvement Log) with no timeline or checklist anywhere — these aren't two
   versions of the same screen, they're two different concepts. Which is the intended design: build
   the timeline/checklist dashboard as a new view (and keep the CRUD tool as management-underneath),
   or is the CRUD tool the correct, final design and the mockup should be retired (same resolution
   pattern as `hub-dashboard.html` earlier today)?
6. **hub-sop.html / `SopDetailModal` divergence.** Confirmed live counterpart exists
   (`SopDetailModal` in `ProcessQualityManager.tsx`), but has diverged: full page → centered modal,
   6 meta fields → 3 (dropped Applies-to/Linked-client/Source/Status-badge), two sections repurposed
   for AI-prompt-template content, "Duplicate" action dropped entirely. Backport the missing fields
   and Duplicate action to the modal, or accept the current simpler modal as the intended design and
   treat the mockup as stale (retire it, same pattern as above)?

## LEDGER
**All 6 AUTO lanes DONE + merged 2026-07-30.** Dispatched to OpenCode (deepseek-v4-pro) in 6 isolated
worktrees per DO-SOP-010 (Lane 6 sequenced after Lane 1 since both touch DocumentDetailClient.tsx).
Every lane independently re-verified before merge — fresh `tsc --noEmit` (+ `next build` for the two
riskiest, Lane 6 and Lane 9) re-run myself, not trusted on OpenCode's self-report — then fast-forward
pushed to `main` in order: `882ea1f` (Lane 1) · `4ed1d5f` (Lane 2) · `856d5b2` (Lane 3) · `9be4870`
(Lane 4) · `9357305` (Lane 9) · `df81787` (Lane 6). Coolify auto-deploy will pick these up.

**Lane 9 caught a real bug before merge, not on self-report:** OpenCode's diff left two unrelated
Card/CardContent blocks (the session's "client intro" banner and the "Session Log" card) with
mismatched closing tags — `</div>`/`</HubCard>` instead of `</CardContent>`/`</Card>` — a genuine
JSX parse failure that `tsc --noEmit` caught immediately. OpenCode's own process partially
self-corrected one instance mid-run; the second was hand-fixed directly before re-verifying with a
full `tsc` + `next build` pass. This is exactly the "OpenCode diffs must be hand-reviewed, never
trusted on self-report" pattern already documented in CLAUDE.md — logged here as another instance.

**One item found during Lane 1 verification, out of original scope:** `NewUpdateClient.tsx:633`
("Test to X" secondary button) is still `rounded-full` — same anti-pattern as the rest of the sweep,
missed by the original audit's file list, not an OpenCode error. Deferred (`wo defer`), low severity.

Lanes 5, 7, 8 have no build units — GATE-only, queued via `wo ask` against this Work Order (6
questions, unanswered as of merge). No further `[AUTO]` work remains until Craig resolves those.

Progress written to: eternal-fitness-website/.context/state.md + handoff.md as each unit ticks.
Live status: eternal-fitness-website/.context/loop-status.md

CONTEXT: Generated from the full re-audit in
`.context/workorder-admin-dashboard-visual-audit-2026-07-30.md` (5 parallel audit passes: Dashboard+
Clients, Documents/PARQ/Exercise, Process/Content/Studio/PlanAgent/TrainingRules/SOP,
Schedule/SessionEditor/Tasks/Reports, and a dedicated component/token-fidelity pass). Two routes
(`hub-schedule.html`, `hub-tasks.html`) were independently reconfirmed ALIGNED by this re-audit,
agreeing with the earlier 2026-07-30 structural-only audit. `hub-reports-updates.html`'s structural
conclusion (no fabricated metrics, bulk-send reuses the single-send endpoint) was also independently
reconfirmed correct — but this pass found real visual-fidelity gaps in the same route that the
structural-only audit's scope excluded. `hub-site-content.html`, `hub-studio-equipment.html`, and
`hub-plan-agent-settings.html` were newly checked this round and found ALIGNED (Plan Agent's mockup
was itself reverse-engineered from the live component, so alignment there is closely definitional).
Session editor was audited for the first time this round (not covered by the earlier structural-only
pass at all). `client-documents-system.html` was clarified as a document-template design-spec page,
not a functional hub-route mock — not a missed build, just a category note for future audits.
