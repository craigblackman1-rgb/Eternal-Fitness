# Work Order: Marketing Credibility + Hub Programming Engine + Cashflow Follow-ups — 2026-08-07

OWNER: (cleared — session closed 2026-08-07. Lane E code-complete, needs click-through verification; Lane B blocked on unbuilt pages)
SCOPE: eternal-fitness-website (app/ marketing pages, app/hub/(protected)/** — programming/exercises/cashflow, components/ds/, components/hub/) — no other app touched.

GOAL: Land the marketing-credibility items from Craig's 2026-08-07 brain-dump session (podcast feature, FitPro press mention) and get a clear, scoped decision on Esther's programming-engine brain-dump (Master Template Registry / Session Roller / Exercise Swap / Volume Skeletons / Relational Update Module) and the visually-impaired/rehab specialist copy — plus close out the Bank Transactions functional gap found during this session's UI review.

MUST:
- Marketing copy changes follow the existing "no condition roll-calls, generalise" rule — except the Specialist Training section on Home/Personal Training pages, which already has Craig's explicit override to name conditions. Any new copy naming conditions (blind/visually impaired, cancer rehab) needs the same explicit call, don't silently apply one rule or the other.
- Don't restate the "Level 4" claim incorrectly (it's the CanRehab qualification, never "Level 4 PT / highest in the UK" — this has regressed before).
- Any new hub feature reconciles against the `ef-control-hub` mockups in `D:\apps\design-systems\ef-control-hub\` before being called done (Design Parity Gate) — section-by-section, not "matches the brief."
- Programming-engine work must first check what already exists (`sessions`/`set_logs` tables, Trainerize-ported exercise library, training-blocks module) before building anything — Esther's brain-dump describes some of this as net-new when parts may already exist under different names.

FORBIDDEN:
- No live payment/bank API integration (standing cashflow rule).
- No changes to `decoded-ops-hub` (reference-only for anything ported).
- Don't touch the existing Cashflow Lanes A–D core (invoice/import/reconciliation/dashboard) while fixing the transactions-page gap below — additive/bugfix only.

DECIDE YOURSELF:
- Exact copy/placement wording for the podcast feature and the "Featured In" badge, within Craig's placement guidance below.
- Whether the programming-engine work becomes new lanes here or a separate WO once scoped — flagged as ASK FIRST below because it needs Craig/Esther alignment on scope first, not because the coding itself is risky.

ASK FIRST:
- **Programming-engine brain-dump (Session Roller, Master Template Registry, Inline Exercise Swap, Volume Skeletons, Relational Update Module, "what next" hub notification triggers) is captured but NOT scoped into lanes below.** Esther's dump described a large, ambitious build (4 relational modules) with an Aug 31 2026 target and explicitly said "you don't need to do anything now... just putting everything here." Recommend a scoping session before any lane is written: check what's already live (`sessions`, `set_logs`, `training_blocks`, exercise library) against what she's asking for, since her dump may be describing existing features in new language. Do not start building against this raw dump.
- **Bank transactions page gap (see DONE item below) is a real feature build, not a style fix** — confirm before starting whether it folds into the existing `workorder-cashflow-tax-forecast-2026-08-04.md` Lane A (which already specs this exact UI and appears to be either unbuilt or reverted — needs investigation) or runs as its own lane here.
- Podcast episode content (what Esther actually says, any transcript/timestamps to pull out as pull-quotes) — Craig only supplied the transistor.fm link, no brief on what to feature from it.

## DONE

- [x] Tasks "New/Edit task" form converted from inline card to a popup modal (`app/hub/(protected)/tasks/TasksManager.tsx`) — shipped this session
- [x] Exercise library table row spacing restored to `py-2.5`; pagination defaults to 10/page with a 10/25/50/100 selector (`app/hub/(protected)/exercises/exercise-browser.tsx`) — shipped this session
- [x] Updates report card header padding fixed to match `hub-reports-updates.html` (14px uniform, was 16px top / 0 bottom) (`app/hub/(protected)/reports/updates/UpdatesReport.tsx`) — shipped this session
- [ ] Podcast episode (https://share.transistor.fm/s/ac03637b) featured somewhere on the public site — placement TBD with Craig (About page press section is the natural fit alongside the FitPro mention, per his own suggestion below)
- [x] FitPro feature (https://www.fitpro.com/blog/training-blind-or-partially-sighted-clients/) added as a small "Featured In" mention — `app/about/AboutPageClient.tsx`, right under "Get in touch" near the qualifications section, matching Craig's own guidance (small mention, not a new section). Verified in browser 2026-08-07.
- [DEFERRED] Blind/visually-impaired + cancer-rehab specialist copy — Craig 2026-08-07: "there is no more content to go live yet until we build out the other pages." No page exists yet to host this copy; not a wording/placement decision, a genuine dependency on unbuilt pages. Revisit once those pages exist, then pick short vs. long variant and check the roll-call exception.
- [x] Bank Transactions — CORRECTED 2026-08-07: no rebuild needed. Investigation found the per-line categorization UI (Date/Description/Amount/Category dropdown/Exclude toggle, matching `hub-cashflow-transactions.html`) already exists and is live at `app/hub/(protected)/cashflow/transactions/[id]/` (built commit `e584605`, 4 Aug), reached via the "View import log" button on the list page. My original session review only checked the top-level list page (which is intentionally a different screen — an import-history list, not the mockup's flat transaction table) and wrongly read that as a missing feature. Optional, non-blocking follow-up: consider whether "View import log" is discoverable enough as the entry point to categorization, or whether the whole import row/card should be clickable — cosmetic, not functional.
- [x] Programming-engine gap audit written to `.context/programming-engine-scoping-2026-08-07.md` (2026-08-07): Master Template Registry mostly exists (`workout_templates` table + browser UI), but no "assign to client" clone action found; Session Roller (roll-forward) not found — likely a genuine gap; Exercise Swap already exists (`swap-exercise-dialog.tsx`) but volume-retention on swap unverified; Volume Skeletons not found; Relational Update Module partially exists (`set_logs`, `TrainerizeHistoryPanel.tsx` for the 12-month lookback) but unverified whether the check-in screen shows current program params inline. Real click-through still needed before any build lane is written — this was a grep-level pass, not a click-through verification.

## LANES

- Lane A — Marketing credibility (podcast + FitPro press mention) · depends on: none
- Lane B — Specialist copy reconciliation (blind fitness / cancer rehab) · depends on: none
- Lane C — Bank Transactions functional fix · depends on: investigation of existing cashflow WO Lane A status
- Lane D — Programming-engine scoping (research only, no build) · depends on: none
- Lane E — Programming-engine build (Craig authorised 2026-08-07: "roll out the changes") · depends on: Lane D findings

## UNITS

### Lane A — Marketing credibility
- [AUTO] Add "Featured In" / "As Seen In" mention (FitPro name/logo + link to https://www.fitpro.com/blog/training-blind-or-partially-sighted-clients/) on the About page near the qualifications section — files: `app/about/**`, `components/ds/**` as needed — VERIFY: preview skill, real click-through to the live FitPro article opens in a new tab
- [AUTO] Add podcast feature (https://share.transistor.fm/s/ac03637b) — placement: About page press section alongside FitPro, matching format — files: `app/about/**` — VERIFY: preview skill, embed/link works, real audio player or link loads
- [GATE] Confirm exact podcast placement/framing with Craig before publishing (no brief supplied on what to say about the episode)

### Lane B — Specialist copy reconciliation
- [BLOCKED] Craig 2026-08-07: no page exists yet to host this copy — depends on other pages being built out first. Once those pages exist: confirm which of the two supplied copy variants (short vs. "Specialist Rehabilitation & Inclusive Fitness" long block) goes live, and cross-check against the "Level 4 = CanRehab, not 'Level 4 PT'" rule and the roll-call exception.

### Lane C — Bank Transactions functional fix
- [AUTO] Read `workorder-cashflow-tax-forecast-2026-08-04.md` Lane A + its ledger/handoff entries to determine if the per-row categorization UI was ever built and later reverted, or never built — VERIFY: git log on `app/hub/(protected)/cashflow/transactions/**`
- [AUTO] Rebuild `/hub/cashflow/transactions` to match `hub-cashflow-transactions.html`: per-line table with Date/Description/Amount/Category select/Exclude toggle, category persists to `bank_transactions` — files: `app/hub/(protected)/cashflow/transactions/**`, `lib/cashflow-*.ts` as needed — VERIFY: preview skill, real click-through, category selection persists after refresh
- [AUTO] Keep (or fold in) the existing import-history list — check with Craig whether it should remain as a secondary view or be removed in favor of the mockup's flow — VERIFY: no loss of the "view import log" capability

### Lane D — Programming-engine scoping (research only)
- [x] Audit what already exists against Esther's 4-module brain-dump — see `.context/programming-engine-scoping-2026-08-07.md`
- [x] Present the gap list to Craig — done in chat 2026-08-07; Craig responded "roll out the changes" — Lane E below is authorised

### Lane E — Programming-engine build (authorised, code complete)
Scope per the Lane D gap list — build only the confirmed gaps, don't rebuild what already exists:
- [x] **Session Roller** (2026-08-07, code complete, NOT click-through verified): "Roll Over Previous Session" button in `SessionEditor.tsx`, backed by new `GET /api/clients/[id]/sessions/latest-completed` — finds the client's most recently *completed* session across all blocks (ordered by `data.session_log.completed_at`, not row order), pulls its exercises/sets/reps/tempo/cues into the session being edited via the same `setSections` path `applyTemplate` already used. Reuses existing `sessions`/`set_logs` schema, no new tables. Pushed `bc1c149`. **Could not click-through verify — no hub login credentials available this session.** Type-checked clean, code-reviewed against the existing `applyTemplate`/`swapExercise` patterns for consistency.
- [x] **Volume Skeletons** (2026-08-07, code complete, NOT click-through verified): a "Skeleton" dropdown next to "Add exercise to {section}" offering 4 hardcoded presets (Elite Strength 4×6, Hypertrophy 3×10, Endurance/Flow 3×15, Power 3×5) — selecting one pre-fills sets/reps/tempo/rest on the new row, exercise name still picked via the existing `AddExerciseDialog`. Hardcoded constants per decide-yourself, no new table. Pushed `bc1c149`. Same verification gap as above.
- [x] **Template → client assign action** (2026-08-07): investigated the real architecture first — there is NO manual "create a new block" or "add a session" path at all; every block/session is generated exclusively via the AI Plan Agent chat (`generateBlock()` → `/api/claude/generate-block`). Presented Craig 3 options (surface the existing session-level "Apply template" more prominently / seed a 1-session block directly from a template, bypassing AI chat / feed the template into the AI generation prompt as structural grounding). **Craig chose option 3.** Built: `PlanAgentTab.tsx` gets a "Use a template as the framework" picker (clearable badge, sent as `templateId`); `/api/claude/generate-block` fetches the template and threads it through `generateViaAi` as a new `TemplateFramework`; new `buildTemplateFrameworkSection()` in `lib/planAgentPrompt.ts` describes the template's structure/volume in the AI system prompt as a shape guide for every session in the block, while exercise choice still comes from the EXERCISE LIBRARY and this client's own constraints (safety always overrides matching the template); the non-AI fallback generator also honours a template when present (deterministically repeats its exercises with phase-appropriate sets/reps rather than picking fresh ones, since it has no AI reasoning to vary choices). Template `usage_count` increments on successful block creation, matching the existing single-session convention. Pushed `f90d677`. **Not click-through verified — no hub login credentials, and can't be fully exercised without a configured AI provider either.** Type-checked clean.

**Verification gap — all three units above:** additive changes (new buttons/routes/prompt section, no existing code paths changed), type-check clean, but none have been clicked through in the real hub — this session has no `/hub` login credentials. Needs a real pass by Craig or Esther before being called fully done per the project's "verify before done" rule. Lane E is code-complete; the WO stays open pending that verification.
- [GATE] **Template → client assign/clone action** — before building, confirm with Craig/Esther this is still wanted: the template browser (`workout-template-browser.tsx`) exists but has no found "assign to this client" action. Needs a design decision (dropdown on client profile? action from the browser itself?) before implementation, not just a code gap — surface options, don't guess the UX
- [x] **Verify — Exercise Swap volume retention** (2026-08-07): CONFIRMED already correct. `SessionEditor.tsx`'s `swapExercise()` spreads the original exercise object first (`...e`) and only overwrites `exercise_name`/`coaching_cue`/`modification`/`equipment`/`media` — sets/reps/tempo/weight are untouched by the swap. No fix needed.
- [x] **Verify — Relational Update Module wiring** (2026-08-07): CONFIRMED already built. `LiveSessionLog.tsx` shows "Prescribed: {sets} × {reps}" inline per exercise and pre-fills log inputs to match the prescription (line ~750), plus a per-exercise note field — this is exactly Esther's ask. `TrainerizeHistoryPanel.tsx` renders whatever historical data it's given; since only ~12 months of Trainerize history was ever imported (per project CLAUDE.md), the panel's scope is inherently the 12-month lookback Esther described — not a literal date filter, but functionally equivalent given the data available. No fix needed.

**Net effect of the two verifications above: the real remaining build is smaller than Esther's original 4-module dump — just Session Roller and Volume Skeletons (both genuinely missing), plus the Template → client assign action pending a UX decision.**
- [ASK FIRST] Once the above lands, sanity-check the Aug 31 2026 date against the real remaining scope (likely much smaller than Esther's original dump) with Craig/Esther directly — don't let a date set against an unscoped ask silently become a deadline for scoped-down work

## LEDGER
Progress written to: `eternal-fitness-website/.context/state.md` + `handoff.md` as each unit ticks.
Live status: `eternal-fitness-website/.context/loop-status.md`

CONTEXT: This session (2026-08-07) covered two unrelated threads Craig asked to hold and then convert into a Work Order:

1. A marketing/brain-dump message from Craig: a podcast episode Esther appeared on (https://share.transistor.fm/s/ac03637b), a FitPro blog feature on training blind/partially-sighted clients (https://www.fitpro.com/blog/training-blind-or-partially-sighted-clients/) with Craig's own suggested treatment ("Featured In" badge near quals on About, or a small homepage badge — not a new section), two draft copy variants from Esther about British Blind Sport Activity Finder listing + Roy Turnham workshop mentoring + CanRehab cancer rehab specialism, and a large "Master Prompt for Claude" brain-dump from Esther describing a 4-module programming engine (Master Template Registry & Cloner, Session Roller Engine, Inline Exercise Swap + Volume Skeletons, Relational Update Module) with an Aug 31 2026 target — Esther explicitly said not to act on it yet, just capturing it.

2. Live UI feedback via inline element selection during the same session, addressed in real time: Tasks "New task" form → popup modal (done), Exercise library table row spacing + pagination (done), Updates report header spacing (done), and a Bank Transactions page review that surfaced a real functional gap against `hub-cashflow-transactions.html` — the live page shows only an uploaded-file history list, not the mockup's per-line category/exclude table — which ties directly to Lane A of the existing `workorder-cashflow-tax-forecast-2026-08-04.md` (that WO's Lane A already specs this exact screen as `[AUTO]`, so it either wasn't finished or regressed).

Craig said: "up any other works orders as well, create a works order for anything that needs discussing or doing from this session" — this WO is that consolidation. Nothing in Lanes A/B/C/D has been started; Lane D is explicitly scoping-only per Esther's and Craig's own "hold this" framing.
