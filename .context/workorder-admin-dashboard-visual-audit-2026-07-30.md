<!-- wo-archived-banner -->
> **ARCHIVED — HISTORY ONLY. DO NOT READ THIS AS OUTSTANDING WORK.**
>
> This work order closed as `done` (registry last updated 2026-07-30).
> Its unit checklists were never re-ticked on close, so unticked boxes below do **not**
> mean the work is outstanding. Eternal Fitness went live 2026-08-09; much of what this
> document describes as pending shipped before or at launch.
>
> **Live state lives in the registry, not here:**
> ```
> wo active                    # current work orders
> wo deferred-list             # what is genuinely still parked
> wo questions                 # decisions waiting on Craig
> ```
> Registry id: `wo-admin-dashboard-visual-audit-2026-07-30`

---
# Work Order: Trainer Hub — full design-fidelity re-audit — 2026-07-30

OWNER: claude — claimed 2026-07-30, worktree `admin-dashboard-design-review-9fde06`
(branch `claude/admin-dashboard-design-review-9fde06`). No hub login credentials available in this
environment (standing limitation throughout `.context/handoff.md`) — proceeding via rigorous static
code/CSS diff against `ef-control-hub` mockups + `admin-design-system.html` tokens rather than a
live authenticated click-through; flagged explicitly wherever that distinction matters.
SCOPE: eternal-fitness-website (app/hub/**, components/hub/**, components/ds/HubSidebar or equivalent shell). No portal/, no marketing pages, no supabase/ migrations.

GOAL: Craig sees a considerable gap between `D:\apps\design-systems\ef-control-hub\*` and the live
`/hub` admin surface. Every hub-*.html mockup and admin-design-system.html's documented component
spec is re-checked against the live app — structure AND visual fidelity — with genuine deltas turned
into fix lanes Craig can dispatch. Nothing here is assumed correct just because a prior audit said so.

MUST:
- Treat `.context/workorder-hub-portal-mockup-audit-2026-07-30.md` (closed earlier today, same repo)
  as a **starting point to re-verify, not a trusted conclusion** — Craig has explicitly said not to
  assume it caught everything. In particular its "no lane" call on `hub-dashboard.html` and its
  MUST line explicitly excluding "copy/spacing nuance" are exactly what this audit should
  double-check, since a visual-fidelity gap is what prompted this Work Order.
- Audit against BOTH sources: the per-page mockups (`hub-*.html`) for structure/IA, AND
  `admin-design-system.html` for component-level fidelity (colour tokens, spacing, card/table/badge/
  button styling, KPI tiles, status colours) — the prior audit only did the former.
- Preserve all real, wired, DB-backed functionality with no mockup equivalent (per the precedent set
  in the 2026-07-26 and 2026-07-30 hub WOs — Process & Quality, due-date filters, delivery-history,
  etc.). Where a mockup would delete or simplify away something real, that's `[GATE]`, not `[AUTO]`.
- Same git-worktree-per-lane, junctioned `node_modules`, `tsc --noEmit` + `next build` before merge,
  hand-diff review before trusting any OpenCode output — no self-report.
- Visual checks must be done in a real browser against the running app (Playwright/preview tools),
  not by reading JSX and assuming it matches — this WO exists because a prior "aligned" call may have
  been wrong, so don't repeat that mistake by skipping the actual visual comparison.

DECIDE YOURSELF: exact Tailwind/CSS translation of any confirmed delta into existing hub component
patterns (`HubCard`, `KpiTile`, `StatusBadge`, `HubPageHeader`, `HubTable`); which existing
icon/component to reuse; ordering of audit passes.

ASK FIRST: nothing yet — this WO is an audit first. Any fix lane touching client-facing hub data
display, or that would remove a real feature to match a simpler mockup concept, becomes `[GATE]`
inside the fix-lane WO this audit produces, not decided here.

## DONE (ticks to zero = stop condition)

### Phase 1 — Structural re-audit (per route, don't trust prior "aligned" calls)
- [ ] `/hub` overview vs `hub-dashboard.html` — re-verified live in browser, not from memory of the
      prior audit's conclusion
- [ ] `/hub/clients` (list) vs `hub-clients.html`
- [ ] `/hub/clients/[id]` (detail) vs `hub-client-detail.html`
- [ ] `/hub/clients/[id]/edit` vs `hub-client-edit.html`
- [ ] PAR-Q editor vs `hub-parq-edit.html`
- [ ] `/hub/exercises` vs `hub-exercise-library.html`
- [ ] Process & Quality vs `hub-process-quality.html`
- [ ] `/hub/site-content` (+ editor) vs `hub-site-content.html` / `hub-site-content-editor.html`
- [ ] `/hub/studio-equipment` vs `hub-studio-equipment.html`
- [ ] `/hub/plan-agent-settings` vs `hub-plan-agent-settings.html`
- [ ] `/hub/training-rules` vs `hub-training-rules.html`
- [ ] `/hub/schedule` vs `hub-schedule.html`
- [ ] Session/workout editor vs `hub-session-editor.html`
- [ ] `/hub/tasks` vs `hub-tasks.html`
- [ ] `/hub/reports/updates` vs `hub-reports-updates.html`
- [ ] `hub-sop.html` — resolve what this maps to (flagged unresolved in prior audit, ASK FIRST #3)

### Phase 2 — Visual/component-fidelity audit (new — not done by the prior structural audit)
- [ ] Colour tokens: `--hub-canvas`, `--hub-card`, `--hub-border`, `--hub-hover`, `--hub-sidebar*`,
      `--hub-field-border*`, `--hub-section-border` — confirmed used consistently vs hardcoded/
      drifted values in `components/hub/*`
- [ ] Status system: 5-token set (primary/success/warning/danger/neutral) with ~10% tinted bg + 20%
      border — confirmed `StatusBadge` and any other status chip actually uses these, not ad-hoc
      colours
- [ ] Sidebar (240px, dark navy `--hub-sidebar`, rose active-state left bar) — pixel/spacing check
      against `admin-design-system.html`'s `.hs-*` classes
- [ ] Cards (`HubCard`) — border, shadow (`--hub-shadow`), radius, "tighter/flatter, no hover lift"
      rule from admin-design-system.html §"Tighter, flatter, no hover lift" — confirmed the marketing
      site's warm double-shadow + hover-lift hasn't leaked into hub cards
- [ ] KPI tiles / stat chips — spacing, typography scale vs spec
- [ ] Tables (`HubTable` or equivalent) — row density, border colour, header styling
- [ ] Buttons/form fields inside hub — `--hub-field-border` / `--hub-field-border-hover` used, not
      the marketing `.ef-btn` pill system bleeding into hub forms
- [ ] Typography — DM Serif Display only for hub H2s per spec, DM Sans everywhere else, no accidental
      marketing-site heading classes reused in hub

## LANES (this WO is audit-only; each finding becomes a tagged unit for a follow-up build WO)
- Lane A — Structural re-audit, high-traffic routes first (dashboard, clients list/detail/edit) ·
  depends on: none
- Lane B — Structural re-audit, remaining routes · depends on: none, runs alongside Lane A
- Lane C — Component/visual-fidelity audit (design-system-wide, not per-route) · depends on: none,
  runs alongside A/B — needs a live browser session against the deployed or local hub, not just
  static file reading
- Lane D — Synthesis: merge Phase 1 + Phase 2 findings into a single fix-lane Work Order, no
  duplicate findings against what's already logged in the closed 2026-07-30 audit unless this pass
  found the prior conclusion was actually wrong (flag explicitly if so) · depends on: A, B, C

## UNITS

### Lane A — Structural re-audit: Dashboard + Clients
- [AUTO] Re-verify `hub-dashboard.html` vs live `/hub` — files: read-only, browser screenshot
  comparison — VERIFY: side-by-side screenshot, explicit note on whether the prior "no lane, live is
  correct" call still holds or was wrong
- [AUTO] Re-verify `hub-clients.html`, `hub-client-detail.html`, `hub-client-edit.html` vs their live
  routes — VERIFY: same, screenshot each state (list, detail, edit)

### Lane B — Structural re-audit: remaining routes
- [AUTO] Re-verify the remaining 11 routes listed in Phase 1 DONE above — VERIFY: screenshot + note
  per route, explicit ALIGNED / DELTA-FOUND verdict, no silent skips
- [AUTO] Resolve `hub-sop.html` — determine live counterpart (or confirm none exists and it's stale)
  — VERIFY: documented conclusion, not left open again

### Lane C — Component/visual-fidelity audit
- [AUTO] Extract the full token/component checklist from `admin-design-system.html` (colours,
  spacing, shadow, typography, the 4 "what keeps the Hub coherent" rules in its closing section) and
  check each against `app/globals.css` `--hub-*` tokens + `components/hub/*` usage — VERIFY: a
  findings table, token-by-token, ALIGNED / DRIFTED with the actual drifted value quoted
- [AUTO] Live-browser pass across at least 4 representative hub screens (dashboard, clients list, a
  detail/edit form, a table-heavy screen like tasks or reports) checking spacing/shadow/hover
  behaviour against the "tighter, flatter, no hover lift" rule — VERIFY: screenshots + explicit
  pass/fail per screen

### Lane D — Synthesis
- [AUTO] Merge all Lane A/B/C findings into `.context/workorder-admin-dashboard-fixes-<date>.md`
  using the same `[AUTO]`/`[GATE]`/`[BLOCKED]` tagging convention, cross-referenced against what the
  2026-07-30 audit already shipped (don't re-lane something already fixed today) — VERIFY: every
  Phase 1 + Phase 2 DONE item above has a corresponding ALIGNED-no-lane or a fix-lane entry, nothing
  silently dropped

## LEDGER
**CLOSED 2026-07-30.** All 4 lanes run in parallel via 5 subagents (Dashboard+Clients,
Documents/PARQ/Exercise, Process/Content/Studio/PlanAgent/TrainingRules/SOP,
Schedule/SessionEditor/Tasks/Reports, and a dedicated component/token audit). Every Phase 1 + Phase 2
DONE item above got an explicit ALIGNED or DELTA-FOUND verdict — nothing silently skipped.
`hub-schedule.html` and `hub-tasks.html` reconfirmed ALIGNED (agreeing with the earlier
structural-only audit). `hub-reports-updates.html`'s structural conclusion reconfirmed correct, but
real visual-fidelity gaps found in the ground that audit's scope excluded. `hub-sop.html` resolved
definitively: maps to `SopDetailModal`, diverged on 4 specific points (queued as GATE #6). Genuine
structural mismatch found in Process & Quality (mockup = read-only dashboard, live = CRUD tool — not
caught by the earlier audit at all, since it wasn't structurally "missing" content, just a different
concept). New visual/component-fidelity deltas found across nearly every route: a hub-wide
`--hub-border` token collapse, a widespread `rounded-full` marketing-pill leak (12+ files), an
`EmptyState` component that violates its own documented button-shape and icon-colour rules, a washed
amber icon colour on `HubCardHeader`, and several instances of hand-rolled cards bypassing
`HubCard`/`HubCardHeader`. Full findings synthesized into
`.context/workorder-admin-dashboard-fixes-2026-07-30.md` (8 AUTO fix lanes, 6 GATE decisions queued
via `wo ask` against `wo-admin-dashboard-fixes-2026-07-30`). No hub login credentials were available
in this environment (standing limitation) — every finding is from static code/CSS diff, not a live
click-through; flagged explicitly wherever that distinction mattered (see the client-edit
field-border item, marked `[BLOCKED]` in the fix WO pending a real rendered check).

CONTEXT: Craig asked directly (2026-07-30, ~16:15) for a deep-dive review of the admin dashboard
against `D:\apps\design-systems\ef-control-hub` — he sees a considerable gap between design and
implementation. Cross-referenced against open Work Orders first:
- `.context/workorder-hub-portal-mockup-audit-2026-07-30.md` — closed earlier the same day, same
  repo, overlapping scope (`app/hub/**`). Concluded almost everything "ALIGNED, no lane" on a
  **structural/IA-only** basis (its own MUST line explicitly excludes "copy/spacing nuance"), 7 lanes
  shipped for genuine gaps found. Craig, asked directly, said don't trust this at face value and
  wants both structure AND visual fidelity re-checked from scratch — this WO is that re-check, not a
  duplicate.
- `wo-eternal-fitness-launch-review-followups-2026-07-30` (registry, ACTIVE, owner `claude`,
  `D:\apps\eternal-fitness-website\.context\workorder-launch-review-followups-2026-07-30.md`) — no
  overlap, scoped to public marketing pages only, explicitly excludes hub/.
- `D:\apps\design-systems\ef-control-hub\` is a same-day (2026-07-30) per-app split of the combined
  `brand-staging-2662e9` folder — the `hub-*.html` files inside it are byte-identical (same 2026-07-28
  07:48 timestamps) to what the closed audit already used, **except** `admin-design-system.html`
  (modified 2026-07-30 16:08, same day as Craig's ask) — a component-level style-guide doc built from
  reading the live repo's own CSS, not a fresh target design, but never explicitly diffed against
  actual rendered output before. That's the most likely source of the "considerable gap" Craig is
  seeing, since it covers exactly the visual/spacing/component-styling ground the prior audit's MUST
  line ruled out — Phase 2 above targets it directly.
- Companion mockup folder `D:\apps\design-systems\ef-client-portal\` exists too (portal-scoped split)
  — out of scope here, portal was already covered by the same closed 2026-07-30 audit.
