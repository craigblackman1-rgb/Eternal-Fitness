# Work Order — Hub structure & design-consistency + mockup version-control

**Slug:** `wo-ef-hub-structure-consistency-2026-08-17` (registered `active` 2026-08-17)
**Apps:** `eternal-fitness-website`, `design-systems`
**Owner:** Claude (orchestrator) · OpenCode lanes for the mechanical sweep
**CRs:** CR-EF-038 (bug) · CR-EF-039 (pattern consolidation) · CR-EF-040 (rail/nav) · CR-EF-041 (mockup version-control + tooling)

## GOAL

One consistent hub: one accordion, one card contract (equal heights), one tab component, one
table, one page header, one status-pill language, one shared right rail — and a mockup library
under real version control so Open Design and the live app can't silently drift apart again.

## Evidence base

- `eternal-fitness-website/.context/audit-hub-structure-consistency-2026-08-17.md` — full audit
  (pattern census: 8 accordions, 5 card styles, 6 tab styles, 28 raw tables, 4 title sizes,
  3 chevron conventions, 4 rail widths; desktop/mobile share zero components; card-height root
  cause = no `h-full`/`flex-1` contract).
- `eternal-fitness-website/.context/request-opendesign-mockup-version-control-2026-08-17.md` —
  actionable Open Design pass (archive 5 superseded + 3 speculative, relocate 7 strays, refresh
  4 drifted, regenerate index.html as living register). Mirrored into
  `D:\apps\design-systems\ef-control-hub\`.
- `verify-hub-pages.js` confirmed hard-crashed/dead since the mockup-folder reorg.

## MUST

- Shared 5-state session status pill is built ONCE here (Lane B) and consumed by the workout WO —
  it's the prerequisite all four 2026-08-17 Open Design revisions assert.
- The sweep (Lane C) is mechanical adoption of primitives, page by page, no redesigns smuggled in.
- No big-bang desktop/mobile merge — mobile moves onto shared primitives only via the
  Trainerize-informed PWA redesign (workout WO's design phase).
- Every lane in its own worktree (DO-SOP-010); staging first.

## SCOPE BOUNDARY

Training/workout surface redesign + the 5 fresh mockups' build = `wo-ef-workout-consolidation-pwa-2026-08-15`.
This WO owns cross-cutting primitives, the sweep, the mockup register, and the verify tool.

## LANES

- **A — Open Design version-control pass** `[GATE: Craig hands the request doc to Open Design]`
  VERIFY: `_archive\` populated, strays relocated, index.html regenerated with statuses + rules.
- **B — Shared primitives** `[AUTO once Craig approves CR-EF-039/040 approach]`: SessionStatusPill
  (desktop + mobile), HubRail, HubCard height contract, single accordion, single tab component.
  VERIFY: tsc + storybook-style test page or screenshot pass.
- **C — Consistency sweep** `[AUTO after B]`: per-module adoption (tables→HubTable,
  headers→HubPageHeader, pills→StatusBadge, kill local forks incl. dead HubSection export,
  CollapsibleSection, retyped tab strips, KpiTile rebuilds; fix items-start bands).
  OpenCode-lane-shaped: named files, tsc-verifiable. VERIFY: pattern-census grep re-run shows
  counts collapsed to 1 per pattern; visual click-through.
- **D — verify-hub-pages.js repair** `[AUTO]`: recursive walk, subfolder-keyed join table,
  ~20 missing rows (incl. mobile), try/catch mockup read, drop stale /hub/log + parq rows.
  VERIFY: clean run against the reorganised library, findings list matches the audit.
- **E — deep-link fix** `[AUTO]`: CR-EF-038 (`?tab=profile-compliance` → real tab/alias).
  VERIFY: click-through from agreements pages.
- **F — Rail-as-navigation IA concept** `[GATE: after C, new Open Design brief]` (CR-EF-040 ph. 2).

## DONE

Pattern census re-run shows one implementation per pattern; mockup register regenerated and
matching live routes; verify tool runs clean in CI-able form; rails/Quick Actions consistent on
all major surfaces; all verified on development.eternal-fitness.co.uk then live.

## LEDGER

- 2026-08-17 — WO registered mid-session from Craig's verbal brief (deep-dive review of all
  modules/pages/accordions/cards/rail + "version control request to Open Design"). Audit run
  (2 explorers: UI census + mockup↔live reconciliation), both docs authored and delivered,
  CR-EF-038–041 raised. Bonus: gate-review notes on the 5 fresh Open Design revisions that
  landed tonight (faithful to the unification brief; flags: shared pill unbuilt, month-view/
  block-review/mobile not yet on the pill language, cancelled-sessions query change needed,
  edit-mode entry decision to confirm) — recorded in the audit doc §5 for Craig's G2 pass.
- 2026-08-17 (night) — Craig sent both Lane A's request doc and the workout WO's
  unification brief to Open Design; confirmed "both are done." Verified Lane A (mockup
  version-control) against git diff rather than trusting the report: fully compliant —
  all 8 archive candidates archived exactly as specified with a documented
  `_archive/README.md`, all 7 strays relocated, `index.html` regenerated as a proper
  living register, plus it independently caught and fixed a dead-sidebar-link side
  effect of the archival. Committed + pushed to `design-systems@24291ea`. CR-EF-041's
  Lane A closed as built+verified; Lane D (`verify-hub-pages.js` repair) still open —
  needs a code lane, not Open Design's to do. The same delivery also carried further
  workout-unification mockup work (that WO's scope, not this one's) — Design Parity
  Gate review found it not yet G2-ready; revision request sent, see
  `wo-ef-workout-consolidation-pwa-2026-08-15`'s ledger for detail.
<<<<<<< Updated upstream
- **2026-08-18 — mobile deferred, not recorded here until now.** `hub-m-today` and
  the wider mobile sweep were held back: mobile runs an entirely different CSS
  system (`.mtop`/`.sec-label`/`.slist`, not Tailwind), with no component reuse
  possible from the desktop primitives — this genuinely needs its own Open
  Design work, not a mechanical port of Lane B/C. `.context/state.md` carries
  the call; this WO's ledger had gone stale past 2026-08-17 night, which is why
  it looked unrecorded during the 2026-08-19 reconciliation. Also outstanding
  from that date: `.context/revision-request-hub-structure-consistency-2026-08-18.md`
  (asking Open Design for the 3 remaining desktop surfaces + mobile) — confirmed
  sitting unactioned.
- **2026-08-18 — a Lane B dispatch attempt hit OpenCode-go "Insufficient
  balance."** (`qmsyjc5cuxv`.) Billing, not a model/lane defect — check the
  opencode-go plan balance before redispatching Lane B; pull inline if it
  recurs (never fall back to Claude/OpenRouter models on lanes).
- **2026-08-19 — Craig approved the CR-EF-039/040 approach: build Lane B, then
  commission the full ~50-screen consistency sweep as Lane C** (only 5–6
  screens had ever been briefed; the rest is genuinely uncommissioned work,
  not something previously lost). Sweep is expected to run as grinding lanes
  past today's session — will be tracked via `wo defer`/`wo status`, not held
  open in chat. Lane B (SessionStatusPill, HubRail, HubCard, single accordion,
  single tab) sequenced first since CR-EF-037 Phase 2's UI consumes the pill.
- **2026-08-19 — CR-EF-042/046 un-stranded.** Merged `origin/claude/lane-cr-042-046-parity`
  into `staging` (`a50029d`), diff hand-reviewed before merge, `tsc --noEmit` clean,
  no file overlap with staging's own pending commit. Deployed via Coolify
  (`eternal-fitness-staging`, deployment `f736zfu3sb77tfjbrgfarm1j`) and verified
  live on development.eternal-fitness.co.uk via claude-in-chrome: dashboard Quick
  Actions bar now shows 4 buttons incl. "Log check-in"; mobile Today confirmed via
  `document.querySelectorAll` to render `.m-section*` classes. Not promoted to
  main/live — Craig's call, separate decision.
=======
>>>>>>> Stashed changes
