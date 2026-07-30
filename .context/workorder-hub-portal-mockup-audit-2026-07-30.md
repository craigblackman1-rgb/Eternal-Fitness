# Work Order: Hub + Portal mockup audit — 2026-07-30

OWNER: Claude Code — claimed 2026-07-30, worktree `eternal-fitness-website-wt-hub-portal-audit`
(branch `chore/hub-portal-mockup-audit`, branched fresh off `origin/main`). Not yet dispatched to
OpenCode — lanes below need Craig's read before any `[AUTO]` unit is sent to a lane.

SCOPE: `eternal-fitness-website` (`app/hub/**`, `app/portal/**`). Read-only reference:
`D:\apps\design-systems\brand-staging-2662e9\hub-*.html` + `portal-*.html`. No DB, no migrations.

GOAL: Craig asked for a fresh audit of the hub-facing and client-portal design mockups against the
live app, since a lot of hub/portal mockup work landed after the last full audit
(`.context/workorder-hub-design-alignment-session-editor-2026-07-26.md`, closed 2026-07-26/27) —
in particular every `portal-*.html` file and `hub-tasks.html` were touched again on 2026-07-28
(18:20–20:14 for portal, 20:04 for tasks), after that WO's reconciliation pass. Turn any real,
unimplemented delta into a lane Craig can dispatch to OpenCode; anything already matching gets no
lane.

MUST:
- Only lane a mockup with a genuine structural/IA/data delta — not copy/spacing nuance.
- Preserve all real, wired, DB-backed functionality with no mockup equivalent (progress tracking,
  update-email history, due-date filters, CRUD) — per the precedent already set for Process &
  Quality in the 2026-07-26 WO (mockup's simplified concept must not silently replace real working
  features). Where a mockup would delete something real, that's `[GATE]`, not `[AUTO]`.
- Same git-worktree-per-lane, junctioned `node_modules`, `tsc --noEmit` + `next build` (or Coolify's
  Linux build, per the Windows `EPERM` note in the 2026-07-26 WO) before merge, hand-diff review
  before trusting any OpenCode output — no self-report.

DECIDE YOURSELF: exact Tailwind/CSS translation of mockup HTML into existing hub/portal component
patterns (`HubCard`, `HubCardHeader`, `StatusBadge`, `EmptyState`, portal's own `.p-*` classes to
whatever the real portal layout uses); which existing icon/component to reuse.

ASK FIRST — real open questions found during this audit, not yet resolved:
1. **portal-sign-in.html vs `app/portal/login/page.tsx` — authentication mechanism, not just a
   restyle.** The mockup is a passwordless two-step flow (email → 6-digit one-time code, no
   password, split-screen studio photography). The live page is a traditional email+password form
   (`PortalLoginForm`, centred card, "Forgot password?" link, posts to
   `/api/portal/auth/login`). Matching the mockup means replacing the auth mechanism itself (code
   generation/email send, code verification, session issuance) — real backend work, not a visual
   pass. Need a call: (a) build the passwordless OTP flow for real, (b) keep password auth and just
   reskin the page to the mockup's split-screen photo layout with the existing email/password
   fields, or (c) leave as-is. **Tagged `[GATE]` below regardless of answer** — this is exactly the
   kind of "would change existing client-facing auth behaviour" item the 2026-07-26 WO's ASK FIRST
   list already carved out as out-of-scope for a visual pass.
2. **hub-sop.html has no confirmed live counterpart.** Content is a single example SOP document
   view ("SOP — Weekly check-in review", Purpose/Scope/Procedure/Checks/Notes sections, a
   Duplicate button) — not a list of documents. The old brief (`opencode-brief-hub-redesign.md`)
   mapped it to `/hub/documents` ("All documents"), but that mapping doesn't match this file's
   actual content, and this file's own sidebar nav (`Content` / `Reports & compliance` groups, a
   `SOPs` nav item) doesn't match the real `HubSidebar.tsx` structure or any other current hub
   mockup's sidebar — every other hub-*.html file uses the same Overview/Clients/Documents/
   Reports/Resources/Settings grouping this one doesn't. Likely candidates: a detail view for the
   real Process & Quality `sops` table (`ProcessQualityManager.tsx`'s SOPs tab currently has no
   document-viewer paired with it), or a stale/superseded draft from an earlier IA pass that should
   be ignored. **No lane drafted below — needs Craig's steer on what this file is actually for
   before any work is scoped against it.**

## AUDIT FINDINGS

### Hub — no lane needed (already aligned)
The 2026-07-26 WO (`workorder-hub-design-alignment-session-editor-2026-07-26.md`) already ran a
full presentation-layer reconciliation across every hub-*.html mockup against its live route, all 8
lanes shipped and merged. All hub-*.html files carry a 2026-07-28 07:48 batch timestamp — after
that WO closed — but on spot-check (hub-dashboard.html, and a full deep-diff of hub-tasks.html
against `TasksManager.tsx`, below) the content is unchanged from what was already reconciled; the
timestamp looks like a bulk copy/export event, not a content revision. Treating the following as
**ALIGNED, no lane**: hub-dashboard.html, hub-clients.html, hub-client-detail.html,
hub-client-edit.html, hub-parq-edit.html, hub-exercise-library.html, hub-process-quality.html,
hub-reports-updates.html, hub-site-content.html, hub-site-content-editor.html,
hub-studio-equipment.html, hub-plan-agent-settings.html, hub-training-rules.html, hub-schedule.html.

- **hub-tasks.html** — deep-diffed in full against `app/hub/(protected)/tasks/{page.tsx,TasksManager.tsx}`
  despite its later (20:04) timestamp flagging it as a possible outlier. Structure matches: 3-column
  kanban (To Do/In Progress/Done), bucket chips with inline rename/delete, My Tasks/All Tasks scope
  toggle, new-task form with bucket creation inline. The live version is actually **ahead** of the
  mockup (due-date filter chips — Overdue/Due Today/Due This Week/No Due Date — and a sort control,
  neither in the mockup) — additive, not a regression. **ALIGNED, no lane.**

### Portal — no lane needed (already aligned)
- **portal-account.html vs `app/portal/(protected)/account/page.tsx`** — near-identical section by
  section: How this looks (text-size radios + preview, high-contrast/reduce-motion toggles, reset),
  How you like your documents (online/large-print/post/in-person radios), Your details (name/email/
  mobile/address/emergency contact/GP), How Esther gets in touch (contact-method checkboxes), Your
  information (data-rights buttons), accessibility-help callout. **ALIGNED, no lane.**
- **portal-documents.html vs `app/portal/(protected)/documents/page.tsx` +
  `DocumentsFilterClient.tsx`** — filter chips (All/Needs you/Shared/Signed with live counts),
  search-by-name, live result-count text, grouped doc rows with badges — all match, including the
  empty-state copy. **ALIGNED, no lane.**
- **portal-document-sign.html vs `.../documents/[id]/sign/DocumentSignClientWrapper.tsx`** — 3-step
  flow (Check → Sign → Confirm) matches almost exactly, including the "this summary is not the
  document" caution box and the final receipt/declaration screen. One real gap, see LANES below.

## LANES

### Lane 1 — Portal home restructure (medium-large) · `[AUTO]` with a preservation constraint
**Files:** `app/portal/(protected)/page.tsx`
**Goal:** portal-home.html is task-first: a personalised "Good morning, Joan" greeting, a "Two
documents need you" action-summary alert, "Needs you" task cards (sign agreement / finish PAR-Q,
each with its own icon, progress bar, and single obvious CTA), a "Your next session" card (date/
time/location/focus, direct-call-Esther fallback), "Recently shared with you" doc list, a Tools
section, and a "Coming to your client area" roadmap (Sessions/Messages/Plan/Payments with "Autumn/
Winter 2026" badges). The live page (`PortalDashboardPage`) is analytics-first: a generic greeting,
a Quick Tools card, Signed/Needs-you document-count tiles (linking to `/portal/documents`), a
"Your progress" panel (`ExerciseTrendsPanel`/`buildExerciseTrends`), and an Update-email-history
list — none of which the mockup shows.
**What to change:** rebuild the top of the page to the mockup's task-card treatment for outstanding
documents (reuse `getOutstandingDocuments()`/`getSignedDocuments()` — the data is already fetched,
just needs the mockup's per-document action-card layout instead of count tiles) and add the
personalised greeting + next-session-if-known copy.
**What must NOT be dropped** (mockup has no equivalent — real, wired, DB-backed): the "Your
progress" `ExerciseTrendsPanel` and the "Update email history" list. Keep both, positioned below the
task cards, exactly as today.
**Verify:** `tsc --noEmit` + `next build` clean; existing document-fetch calls, exercise-trends
build, and update-history rendering all untouched; hand-diff confirms nothing real was deleted.

### Lane 2 — Document view table-of-contents nav (small-medium) · `[AUTO]`
**Files:** `app/portal/(protected)/documents/[id]/page.tsx`
**Goal:** portal-document-view.html has a sticky "What is in this document" contents nav
(`<nav class="toc">`) alongside the document body — numbered anchor links into each section,
sticky on scroll on wide viewports, moving focus to the target heading on click (not just scroll,
for screen-reader/keyboard users). The live page renders `typed.body.sections` as a flat list with
no jump nav at all.
**What to change:** add a contents sidebar built from the same `typed.body.sections` array already
being mapped over (each section already has `id`/`title`) — two-column layout on wide viewports
(`grid-template-columns: 15rem 1fr` per the mockup), single column on mobile, sticky positioning,
focus-move-on-click per the mockup's accessibility pattern (not required to be byte-identical CSS,
just the same behaviour).
**Verify:** `tsc --noEmit` + `next build` clean; existing Print/Download/Sign action bar, signed-
state block, and body rendering untouched; contents nav's links jump to and focus the correct
section for every existing document kind.

### Lane 3 — Document sign: add "draw signature" option (medium) · `[AUTO]`
**Files:** `app/portal/(protected)/documents/[id]/sign/DocumentSignClientWrapper.tsx`
**Goal:** portal-document-sign.html's Step 2 offers two signing methods — "Type my name"
(recommended, works with any device) and "Draw my signature" (canvas, needs a pointing device, with
a "switch to typing instead" fallback link for anyone who can't use it). The live wrapper only
implements the typed-name method; the radio-button choice between the two isn't present at all.
**What to change:** add the draw-signature canvas option per the mockup (canvas sized to its CSS
box at device pixel ratio, "Clear and start again" control, empty-canvas validation), gated behind
a method radio exactly like the mockup. **Before wiring this up, check what `/api/documents/[id]/sign`
actually accepts** for the `signature` field — the existing typed flow sends the name as a plain
string; a drawn signature will need to send image data (data URL or similar), so confirm the API
and any DB column (`client_signature` on `client_documents`, per `DocumentEditorClient`/`sign`
route) can hold it before assuming this is presentation-only. If it can't without a schema change,
stop and flag rather than silently truncating/dropping the drawn image.
**Verify:** `tsc --noEmit` + `next build` clean; existing typed-signature path (steps 1/2/3, confirm
screen, `/api/documents/[id]/sign` POST) completely unchanged when "Type my name" stays selected.

### Lane 4 — PAR-Q editor: add section-list jump nav (small-medium) · `[AUTO]`
**Files:** `app/portal/(protected)/documents/[id]/edit/DocumentEditorClient.tsx`
**Goal:** portal-document-edit.html shows a persistent "Sections" sidebar nav next to the
questionnaire form — each of the 6 sections shown as done (checkmark)/current (numbered, current)/
todo (numbered, greyed), clickable to jump directly to any section, plus a progress bar with
"X of Y sections complete" and a rough time-remaining estimate. The live editor (from what's read at
the top of the file) advances section-by-section with Next/Back only — no visible jump-to-any-
section sidebar list.
**What to change:** add the section-list sidebar (derived from `doc.body.feedbackSections`, which
the component already has) showing per-section completion state, wired to `setCurrentSection`
directly rather than only sequential Next/Back. Keep the existing autosave-on-change, validation-
per-section-before-advancing, and final-submit behaviour untouched.
**Verify:** `tsc --noEmit` + `next build` clean; autosave, validation, and submit-on-last-section
logic confirmed unchanged; jumping via the sidebar doesn't bypass the existing per-section
validation in a way that lets an incomplete required question through silently.

### Lane 5 (`[GATE]`, not dispatched) — Portal sign-in auth mechanism
See ASK FIRST #1 above. No lane drafted until Craig picks (a)/(b)/(c) — building the wrong one is
real backend work to undo.

## LANES SUMMARY
- Lane 1 — Portal home restructure · depends on: none · medium-large
- Lane 2 — Document view TOC nav · depends on: none · small-medium
- Lane 3 — Document sign draw option · depends on: none (but confirm API/schema first) · medium
- Lane 4 — PAR-Q editor section nav · depends on: none · small-medium
- Lane 5 — Portal sign-in auth mechanism · `[GATE]` · blocked on Craig's decision

All four `[AUTO]` lanes are independent of each other and of the hub side (no shared files) — can
run in parallel once Craig has reviewed this lane list.

## LEDGER
Not yet dispatched. Progress will be written to `eternal-fitness-website/.context/state.md` +
`handoff.md` as each lane lands, per this repo's standing convention.

## CONTEXT
- Prior hub audit: `.context/workorder-hub-design-alignment-session-editor-2026-07-26.md` (closed,
  all 8 lanes shipped) — this WO only re-audits what changed since, per Craig's brief.
- Prior marketing-page audit: `.context/workorder-mockup-reconciliation-2026-07-29.md` (closed) —
  different scope (6 public pages), no overlap.
- Old hub route map (useful for file paths, historical claims about "not yet built" are stale):
  `D:\apps\design-systems\brand-staging-2662e9\opencode-brief-hub-redesign.md`.
- Portal build history relevant to this audit: `481c3cf` ("feat: Lane C portal pages — account,
  documents list/viewer/edit/sign, dashboard summary cards"), `0426aa0` ("feat: add public and
  portal calorie calculator pages"), `478a255` (PAR-Q-sourced Account page fix) — all landed after
  the portal-*.html mockups' 2026-07-28 18:20–20:14 timestamps, which is why portal-account.html and
  portal-documents.html already match closely despite the late mockup edits; portal-home.html and
  portal-sign-in.html are the two pages where a real gap remains.
- Not separately audited in depth this round (flagged, not lanes): portal-calorie-calculator.html
  vs `CalorieGuideClient.tsx` (695 lines, built same session as the mockup per `0426aa0` — likely
  aligned, worth a quick visual QA pass but no structural delta found in the time available this
  round).
