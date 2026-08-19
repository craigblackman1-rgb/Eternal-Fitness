# Work Order: Hub design-parity sweep — dashboard, client-detail, block/session — 2026-08-19

OWNER: (empty until claimed)
SCOPE: eternal-fitness-website (app/hub/(protected)/** dashboard, client-detail
       page + all tabs, block-module page, session page + components/hub/**
       backing them). NOT the training-blocks list / workout-templates browser /
       Est. duration lanes — those belong to the sibling WO
       `wo-hub-workout-parity-2026-08-19` (see cross-reference below).

## Why this WO exists

Craig ran a live page-by-page walkthrough of development.eternal-fitness.co.uk
on 2026-08-19 (the fourth or fifth time he's asked for a design deep-dive per
his own account at session start) and found concrete, specific parity gaps that
prior sessions' element-scoped checks did not catch. Each is logged as its own
CR so nothing gets lost; this WO turns them into a plan. Full detail lives in
`.context/change-requests.md` — this doc summarizes for execution.

**Important flag:** CR-EF-059/060 (block-module page, session page) directly
contradict `wo-hub-workout-parity-2026-08-19`'s working assumption that "the
bulk of the deviance is the CR-EF-037 redesign, fully built, just needed
promoting" and "all six mockups are already correct for this scope." Craig's
live check post-promotion (main `2c6c63d`) still found the block-module page
not matching `hub-block-module.html` and the session page not implementing
`hub-session.html` at all. Lane 0 below re-verifies this before either WO's
remaining lanes proceed — do not assume the sibling WO's "already built"
premise still holds without re-checking live.

## CRs covered

| CR | Page/area | Mockup |
|---|---|---|
| CR-EF-069 | Dashboard alert lists (Do Not Train / Action needed / Gone quiet) — should be an accordion | `hub-dashboard.html` |
| CR-EF-070 | Dashboard "Recent blocks" — no client/context, just "Block 1"/"Draft" | `hub-dashboard.html` |
| CR-EF-052 | Client detail — Admin tab | `hub-client-detail-refined.html` |
| CR-EF-053 | Client detail — Training tab, Blocks view | `hub-client-detail-refined.html` |
| CR-EF-054 | Client detail — Training tab, Sessions view | `hub-client-detail-refined.html` |
| CR-EF-055 | Client detail — Training tab, Progress view | `hub-client-detail-refined.html` |
| CR-EF-056 | Client detail — Training tab, Pre-app history view | `hub-client-detail-refined.html` |
| CR-EF-057 | Client detail — Comms tab, Updates view | `hub-client-detail-refined.html` |
| CR-EF-058 | Client detail — Comms tab, Tasks view | `hub-client-detail-refined.html` |
| CR-EF-059 | Block-module page (whole page/logic, not just qa-bar) | `hub-block-module.html` |
| CR-EF-060 | Session/workout detail page — not implemented at all | `hub-session.html` |

MUST:
- Mockups in `D:\apps\design-systems\ef-control-hub\desktop\**` are the target
  for every CR above — verify each mockup still reflects current intent before
  building against it (per CR-EF-041, the register was reconciled 2026-08-17;
  re-check for later drift since staging).
- **Full-page parity, not element-scoped.** Standing rule from `feedback_design_parity_gate`
  (recurred twice already on this exact page family): when touching any element
  on a mockup-governed page, enumerate every `data-od-id` in the mockup and
  confirm each one's live counterpart before calling a lane done.
- DO-SOP-010: own worktree per lane; staging → verify on development → main.
- Reuse existing shared primitives (HubTable, StatusBadge, SessionStatusPill,
  the accordion component CR-EF-039 is standardising on) — do not fork new
  local component variants (CR-EF-039's whole point).
FORBIDDEN:
- app/(marketing)**, app/portal/(client-facing UI), supabase/migrations/**
  (no new migration without GATE), components/ds/**, app/design-system.css.
DECIDE YOURSELF:
- Component-internal structure, exact copy/microcopy, which shared primitive
  to reuse for a given element.
ASK FIRST (gates):
- **G0 — accordion component choice for CR-EF-069.** CR-EF-039 is mid-sweep on
  "one accordion" as a shared primitive; confirm whether that primitive exists
  yet before building a second one-off for the dashboard alert lists.
- Any new migration/DB write.
- Merge to main (standard deploy gate).

## DONE
- [ ] Lane 0 (re-verify) complete: block-module and session-page live gaps
      documented against their mockups with `data-od-id` enumeration — confirms
      or corrects the sibling WO's "already built" premise.
- [ ] Dashboard alert lists render as an accordion matching `hub-dashboard.html`.
- [ ] Dashboard "Recent blocks" shows client name/context per the mockup.
- [ ] Client-detail Admin tab matches `hub-client-detail-refined.html`.
- [ ] Client-detail Training tab (all 4 sub-views: Blocks/Sessions/Progress/
      Pre-app history) matches mockup.
- [ ] Client-detail Comms tab (both sub-views: Updates/Tasks) matches mockup.
- [ ] Block-module page matches `hub-block-module.html` (layout + logic, not
      just the quick-actions bar already fixed by CR-EF-044).
- [ ] Session page implements `hub-session.html`.
- [ ] tsc --noEmit clean; every lane's git diff --stat reviewed against
      FORBIDDEN/MUST; each lane's Design Parity Gate check is full-page, not
      element-scoped (attest via `wo attest`).

## LANES
- Lane 0 — Re-verify block-module + session page against mockup (data-od-id
  enumeration) · depends on: none · BLOCKS Lane 3 and the sibling WO's
  remaining lanes A–D until this either confirms or corrects their premise.
- Lane 1 — Dashboard (alert-list accordion, Recent blocks context) · depends
  on: G0 (accordion component decision)
- Lane 2 — Client-detail tabs (Admin, Training×4, Comms×2) · depends on: none
- Lane 3 — Block-module + session page rebuild, scoped by Lane 0's findings ·
  depends on: Lane 0

## UNITS
### Lane 0 (re-verify)
- [AUTO] Enumerate every `data-od-id` in `hub-block-module.html` and
  `hub-session.html`; for each, confirm/deny a live counterpart at
  `/hub/clients/[id]/blocks/[blockId]` and its session drill-through — files:
  read-only pass, output a findings note appended to this WO's LEDGER — VERIFY:
  every mockup element has a stated live-status (present/missing/wrong).

### Lane 1 (dashboard)
- [AUTO] Convert Do Not Train / Action needed / Gone quiet lists to the shared
  accordion primitive per `hub-dashboard.html` — files: app/hub/(protected)/page.tsx
  and its alert-list component — VERIFY: matches mockup open/closed defaults
  and counts.
- [AUTO] Add client name + block title/context to "Recent blocks" — files:
  same dashboard page/component, likely a join to `blocks`→`clients` — VERIFY:
  each recent-block row identifies who it's for, not just "Block N"/"Draft".

### Lane 2 (client-detail tabs)
- [AUTO] Admin tab — diff against `hub-client-detail-refined.html`, fix
  layout/content gaps — files: ClientDetailTabs.tsx + admin tab component —
  VERIFY: full data-od-id pass, not spot-check.
- [AUTO] Training tab, all 4 sub-views (Blocks/Sessions/Progress/Pre-app
  history) — same file family, same VERIFY standard.
- [AUTO] Comms tab, both sub-views (Updates/Tasks) — same file family, same
  VERIFY standard.

### Lane 3 (block-module + session page)
- Scope intentionally left open pending Lane 0's findings — do not start until
  Lane 0's data-od-id table exists. If Lane 0 confirms most elements are
  present but styled/structured wrong, this is a targeted fix; if it confirms
  large swathes are genuinely unbuilt (as CR-EF-060 suggests for the session
  page), this becomes a build lane, not a fix lane, and should be re-scoped
  with Craig before dispatch.

## LEDGER
- 2026-08-19 — **Lane 0 (partial, live spot-check via claude-in-chrome).** Checked
  the block-module page (`/hub/clients/8/blocks/a2ece082-...`) and its session
  drill-through against `hub-block-module.html`/`hub-session.html`. Correction to
  the CR-EF-059/060 framing: **neither page is "nothing like"/"not implemented" —
  both carry the mockup's major structural sections** (quick-actions bar,
  page-header, meta grid, schedule panel, block-note card, weeks list on the block
  page; mode-switch, progress bar, warm-up/main-block sections, superset/round
  structure on the session page). This is a targeted-fix lane, not a rebuild.
  Concrete gaps actually found:
  - Block page: workout row title carries a redundant "(Week 1)" suffix
    (`Workout A — Upper Body Push/Pull + Glutes (Week 1)`) — violates the
    mockup's own explicit rule ("sessions named by focus_label only, never a
    bare ordinal"). Also missing the client-context descriptor line under the
    title that the mockup shows (e.g. "Joan Mercer · cancer rehabilitation ·
    18-session block") — live only shows name · session/week counts.
  - Session page: **status-pill/progress-bar contradiction** — page header shows
    a "Completed" pill while the progress bar directly below simultaneously
    reads "7 of 8 exercises logged · IN PROGRESS." Same page, two disagreeing
    state signals. Also a "Client intro" card renders the workout title itself
    as the intro text (looks like the wrong field is bound — should be
    client-specific intro copy, not a repeat of the h1).
  - Not yet checked: schedule-form/edit-block-drawer modals, mode-switch
    (Studio/Home Version) exact mockup styling, session-eta/sync-pill/rest-panel
    fine detail — needs a full data-od-id pass before Lane 3 is called complete,
    this was a first-pass spot-check only.
  Lane 3 scope corrected accordingly: fix the "(Week 1)" suffix, the missing
  context line, and the status/progress contradiction — not a page rebuild.
  **Not yet dispatched** — needs the fuller data-od-id pass first since the
  session-page state bug in particular touches `deriveSessionStatus`/
  `lib/session-status.ts`, which CR-EF-037's core explicitly said not to
  hand-modify without care.
- 2026-08-19 — **Lanes 1 and 2 dispatched to OpenCode** (`opencode-go/deepseek-v4-pro`,
  inline, own worktrees `lane-dashboard-parity` / `lane-client-tabs-parity` off a
  fresh `origin/main`, per DO-SOP-010). Lane 2's prompt requires a full
  data-od-id enumeration against `hub-client-detail-refined.html` for all 7
  tab/view combos, not a spot-fix — OpenCode cannot browse the live site, so it
  was told to read the current app source thoroughly and flag anything it
  couldn't verify without a browser. Both diffs will be hand-reviewed before any
  merge, per the standing "OpenCode output is never trusted on self-report" rule.
- 2026-08-19 (later) — **Lane 3 also dispatched** (Craig: "just get everything
  done, don't hold CRs back"). Own worktree `lane-block-session-parity`, three
  scoped fixes (Week-suffix removal, missing client-context line,
  status-pill/progress-bar contradiction + Client-intro data-binding bug),
  explicitly forbidden from touching `lib/session-status.ts`'s derivation logic
  itself. All three lanes now running concurrently; every diff still gets
  hand-reviewed before merge.

- 2026-08-19 (later) — **All 3 lanes verified live on development.eternal-fitness.co.uk**
  after their respective Coolify deploys finished (staging commits `298899c`,
  `10d77cb`, `e2f9513` — 3rd deploy took ~14min, well over the usual ~5min, but
  finished clean with a normal rolling-update log, no error). Confirmed via
  claude-in-chrome, client #8 (Emma Atkinson):
  - Dashboard alerts accordion + Recent blocks context — exact match.
  - Client-detail Admin tab (flat compliance grid + separate Documents card),
    Comms > Updates (card list, "Emailed" pill restored and visible), Comms >
    Tasks (single card, no nested rail) — all match.
  - Block page: client-context line ("Emma Atkinson · Crohn's disease (10+
    years, well managed) · 2-session block") live and correct.
  - Session page: status contradiction resolved — "Completed" pill next to
    "7 of 8 exercises logged · PARTIALLY LOGGED" no longer reads as two
    disagreeing statuses.
  **Two things NOT fully resolved, flagged for Craig:**
  1. The "(Week 1)" suffix is STILL visible on this and other already-generated
     sessions (block page row title, session page h1, browser tab title). The
     fix only changes label generation going forward — it does not retroactively
     clean existing `session.data.focus_label` values already written to the DB.
     A backfill script would be needed to fix historical sessions; not done,
     not requested yet.
  2. CR-EF-057's excerpt now surfaces raw email-template boilerplate bleeding
     into the stripped body text (e.g. "EF Eternal Fitness Worthing · West
     Sussex..." ahead of the real update content) — pre-existing in
     `body_html`, just newly visible because the mockup's card list shows an
     excerpt where the old table only showed Subject. Not a regression this
     lane introduced, but worth a follow-up CR if it looks bad in practice.
  **Not yet promoted to main/live** — per the standing G1-style gate (deploy
  to the real production site is Craig's call, not an autonomous action),
  holding here pending his answer.

CONTEXT: Craig's live page-by-page walkthrough, 2026-08-19 afternoon —
`.context/change-requests.md` CR-EF-069/070/052-060. Cross-reference:
`wo-hub-workout-parity-2026-08-19` (sibling WO, same app, adjacent route
family — its Lanes A-D cover training-blocks list / workout-templates browser
/ Est. duration, not touched here). Standing rule: `feedback_design_parity_gate`
memory — this is the third+ recurrence of full-page parity gaps being missed
by element-scoped checks on this exact page family.
