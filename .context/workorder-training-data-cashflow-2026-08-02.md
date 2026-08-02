# Work Order: Trainerize Historical Import + Live PB/Templates + Cashflow — 2026-08-02

OWNER: claude (this session) — claimed 2026-08-02T11:00Z
SCOPE: eternal-fitness-website — three independent lane groups, all hub/portal/DB, no shared files between groups:
- **Group 1 (Trainerize import):** new `trainerize_training_blocks`/`trainerize_sessions`/`trainerize_set_logs`/`trainerize_client_notes`/`personal_records` tables; new scraper scripts under `scripts/`; new "Training History" hub UI.
- **Group 2 (PB flagging + templates):** `lib/exercise-history.ts` consumers (`app/hub/log/[sessionId]/LiveSessionLog.tsx`, portal `TrainingClient`); new `workout_templates` table + template library UI (reusing `app/hub/(protected)/exercises/exercise-browser.tsx` filter pattern); shares the `personal_records` table with Group 1.
- **Group 3 (Cashflow):** new `invoices`/`invoice_line_items`/`invoice_templates`/`bank_statement_imports`/`bank_transactions` tables; new hub Cashflow UI; document-engine 7th kind (`invoice`).

**No changes to public marketing pages, no Stripe/payment-collection integration, no live bank OAuth, no changes to existing document-kind send/sign logic beyond additive wiring.**

Full background/rationale for each group: `.context/scope-trainerize-historical-import-2026-08-02.md` (Groups 1 & 2) and `.context/scope-cashflow-invoicing-2026-08-02.md` (Group 3), both in this worktree. This WO supersedes the standalone `wo-cashflow-invoicing-2026-08-02` (created earlier this session, now folded in here — same Group 3 content, unchanged).

Also resolves/absorbs deferred item `dmsagoxpozw` ("training-block builder: scope a reusable warm-up/cooldown template system") — that's Group 2's `workout_templates` concept.

GOAL: Esther gets (1) her clients' full Trainerize training history, notes, and PB history pulled into the hub; (2) live "New PB" flagging during session logging plus a reusable, filterable workout-template library; (3) simple structured invoicing with HSBC statement reconciliation — replacing the hand-edited-HTML approach used in the Decoded Ops hub.

MUST:
- **Group 1:** Use direct internal-API replay (`api.trainerize.com/v03/*`, confirmed live via Phase 0 recon — see scope doc) via an authenticated Playwright session, not DOM scraping — the API is faster and more robust and was confirmed working against Amanda's real account. Import into new `trainerize_*` archive tables, never write directly into live `blocks`/`sessions`/`set_logs` (status-semantics risk). PBs land in a shared `personal_records` table using Trainerize's own rep-range PB definition (`accomplishment/getList` — already computed by Trainerize, don't re-derive).
- **Group 2:** PB check reuses the *existing* `buildExerciseHistory` logic in `lib/exercise-history.ts` — don't invent a second PB definition. `workout_templates.data` uses the same `SessionVersion` JSON shape already used in `sessions.data` so templates drop into the existing session editor with no transform step. Auto-derive template facet tags (archetype/movement/muscle/equipment) from the exercises inside the template on save; manual `condition_tags` are a separate, small, human-curated field.
- **Group 3:** Reuse the existing `client_documents` document engine for invoice delivery (`kind = 'invoice'`) — do not build a parallel send/public-link pipeline. Real relational `invoice_line_items`, not a flat amount. No VAT/tax-rate logic anywhere (Esther confirmed not VAT-registered). HSBC import is file-upload only (CSV/OFX) — Craig confirmed no Open Banking connection.
- All groups: follow existing repo conventions (`lib/supabase.ts` pg shim, plain Postgres migrations in `supabase/migrations/`, no `authenticated`-role RLS policies, Next.js App Router + `components/hub/` primitives for UI consistency).
- Client health/personal data (from Trainerize recon or elsewhere) never lands in `.context/` in the shared main checkout — worktree only, and raw per-client capture files should be gitignored, not committed.

FORBIDDEN:
- `app/` public marketing routes (root-level pages, `components/ds/`) — untouched by any group.
- Existing document-kind logic for the other 6 kinds — additive only.
- `clients.payment_status` — read-only in Group 3; superseding it with invoice-derived state is an explicit future decision, not part of this WO.
- Any Stripe/payment-collection SDK, any bank OAuth/Open Banking aggregator code.
- Writing into live `blocks`/`sessions`/`set_logs` from the Group 1 import — archive tables only.

DECIDE YOURSELF:
- Invoice numbering scheme (default: sequential-per-year, `INV-2026-0001`).
- Hub route/nav placement and component naming for all three new UI surfaces, following existing conventions.
- Template/seed content defaults (invoice template, workout template facet vocabulary) — placeholders Esther can edit, not final copy.
- Reconciliation matching heuristic tuning (Group 3) — suggest-and-confirm only, never auto-commit.
- Whether Group 1's per-block exercise/set detail and notes endpoints (Phase 0b gaps) turn out to need one more API call or a UI-click-triggered one — resolve via recon, don't guess.

RESOLVED (answered by Craig, 2026-08-02):
- **Group 1 roster scope** — all historical/active Trainerize clients (not just currently-active).
- **Group 1 notes visibility** — hub-only.
- **Group 1 sync cadence** — one-time backfill.
- **Group 1 ToS sanity check** — confirmed OK to scrape at full-roster scale.

ASK FIRST (still open):
- **HSBC CSV/OFX sample** (Group 3) — hard blocker for the parser. Craig said hold this for now — do not build the Lane 5 parser or chase a sample; Lane 5 stays paused, not pursued further until he brings it back up.
- **First real invoice send** and **first real Trainerize full-roster run** — roster scope/notes/cadence/ToS are now answered, but the *act* of running the full-roster import against ~15 real clients is still its own confirmation point before firing — check with Craig immediately before kicking it off, not assumed from the scoping answers alone.
- Standard gates: any new pnpm dependency, any destructive or existing-table-altering migration, deploy/push (already pre-authorized per project convention — auto-deploy is on).

## DONE

### Group 1 — Trainerize import — DONE 2026-08-02
- [x] Phase 0b gaps closed: per-block exercise/set detail endpoint confirmed (`trainingPlan/getWorkoutDefList`), real notes endpoint confirmed (`message/getMessages` via View Profile), workout completion history via `Timeline/getList`
- [x] `trainerize_training_blocks`/`trainerize_workouts`/`trainerize_exercises`/`trainerize_client_notes` tables migrated (named `workouts`/`exercises` not `sessions`/`set_logs` — matches Trainerize's own terminology, a DECIDE-YOURSELF naming call)
- [x] Scraper/API-replay client built, resumable, credentials via env vars only
- [x] `personal_records` table populated from imported Trainerize PB data (shared with Group 2)
- [x] Import run for Amanda as full end-to-end proof, browser-verified against real DB data
- [x] Training History tab live on client detail page, showing imported blocks/notes/PBs — 2 real bugs found post-ship (personal_records and workout/exercise field-name mismatches, both root-caused to raw-Trainerize-API field names vs real DB column names) and fixed, re-verified live
- [x] Full-roster run completed 2026-08-02 — 14 remaining clients imported (89 blocks, 405 workouts, 6104 exercises, 106 PBs, 287 notes total across 15 clients incl. Amanda), Nathan Wadey correctly skipped (no Trainerize account). Verified via direct DB query + live browser spot-check.

### Group 2 — Live PB + templates — DONE 2026-08-02
- [x] "New PB" inline flagging wired into `LiveSessionLog.tsx` (hub) and portal `TrainingClient`, backed by shared `personal_records` upserts
- [x] `workout_templates` table migrated with auto-derived facet columns + manual `condition_tags`
- [x] "Save as template" action from an existing session/block editor
- [x] Template library page with facet filtering + full-text search across contained exercises (reusing `exercise-browser.tsx` pattern)
- [x] "Apply template" inserts exercises into a new session editor, still freely editable per-client

### Group 3 — Cashflow
- [x] `invoices`/`invoice_line_items`/`invoice_templates` tables migrated with a defined status lifecycle
- [x] `client_documents` extended with `kind = 'invoice'`
- [x] Hub UI: create invoice from template → editable line items → send/save draft
- [ ] `bank_statement_imports`/`bank_transactions` tables migrated — held, HSBC lane paused
- [ ] HSBC upload + parse + review screen working against a real sample (blocked on sample)
- [ ] Reconciliation queue: suggested matches, confirm/dismiss, status updates flow through
- [ ] Cashflow overview page with real outstanding/overdue totals

### All groups
- [ ] `npx tsc --noEmit` clean; `pnpm build` succeeds
- [ ] Design parity check against existing hub visual patterns for every new UI surface — no mockup exists for any of the three, so flag deviations explicitly rather than freelancing a new visual language

## LANES

- Lane 1 — Trainerize import (Group 1) · depends on: Phase 0b recon completing first
- Lane 2 — Live PB flagging (Group 2a) · depends on: none — smallest, independent, can ship first
- Lane 3 — Workout templates (Group 2b) · depends on: none, shares `personal_records`/schema conventions with Lane 1 but no file overlap
- Lane 4 — Invoice core (Group 3a) · depends on: none
- Lane 5 — HSBC import (Group 3b) · depends on: HSBC sample (ASK FIRST) for parser logic; schema/UI scaffold can start now
- Lane 6 — Reconciliation (Group 3c) · depends on: Lane 4 + Lane 5 schema-complete
- Lane 7 — Cashflow dashboard (Group 3d) · depends on: Lanes 4–6

All lanes are independent enough to run in parallel except where noted; no two lanes touch the same files.

## UNITS

### Lane 1 — Trainerize import
- [AUTO] Close Phase 0b recon gaps (block-detail endpoint, notes endpoint, calendar date-range params) — files: `scripts/discover-trainerize-*.mjs` (extend) — VERIFY: real captured response for each, written to worktree `.context/`, not shared checkout
- [AUTO] Build scraper/API-replay scripts for blocks/notes/workout history — files: `scripts/import-trainerize-*.mjs` — VERIFY: dry run against Amanda produces correct resumable JSON
- [AUTO] Migration: `trainerize_*` archive tables + `personal_records` — files: `supabase/migrations/2026080X_trainerize_history.sql` — VERIFY: applies clean, columns match plan
- [AUTO] Import script: JSON → DB, idempotent upsert — files: `scripts/load-trainerize-history.mjs` — VERIFY: re-running doesn't duplicate rows
- [AUTO] Training History hub UI — files: `app/hub/(protected)/clients/[id]/*`, new components — VERIFY: preview skill, real data renders for Amanda
- [GATE] Full-roster run — waiting on: roster-scope answer

### Lane 2 — Live PB flagging
- [AUTO] Wire `buildExerciseHistory` PB check into `handleSetDone` in `LiveSessionLog.tsx` — files: `app/hub/log/[sessionId]/LiveSessionLog.tsx` — VERIFY: preview skill, log a set that beats a known best, badge appears
- [AUTO] Same wiring in portal `TrainingClient` — files: `app/portal/(protected)/training/*` — VERIFY: preview skill, portal home-training flow
- [AUTO] Upsert into `personal_records` on live PB — files: set-logs API routes (hub + portal) — VERIFY: DB row updates correctly

### Lane 3 — Workout templates
- [AUTO] Migration: `workout_templates` — files: `supabase/migrations/2026080X_workout_templates.sql` — VERIFY: applies clean
- [AUTO] "Save as template" action — files: session/block editor components — VERIFY: click-through saves correct `SessionVersion` shape
- [AUTO] Template library page with facet filters + full-text search — files: new `app/hub/(protected)/templates/*`, reusing `exercise-browser.tsx` pattern — VERIFY: preview skill
- [AUTO] "Apply template" into new session editor — VERIFY: click-through, exercises populate correctly and remain editable

### Lane 4 — Invoice core
- [AUTO] Migration: `invoices`/`invoice_line_items`/`invoice_templates` — files: `supabase/migrations/2026080X_invoices.sql` — VERIFY: applies clean
- [AUTO] Extend `client_documents` with `kind = 'invoice'` + render path — files: `lib/documents/*` — VERIFY: real test send via pipeline, `emailed` flag confirms
- [AUTO] Hub invoice creation UI — files: `app/hub/(protected)/cashflow/invoices/*` — VERIFY: preview skill, full click-through
- [AUTO] Seed invoice template — VERIFY: appears in picker

### Lane 5 — HSBC import
- [BLOCKED] Confirm HSBC export format — waiting on: real sample from Esther
- [AUTO] Migration: `bank_statement_imports`/`bank_transactions` — files: `supabase/migrations/2026080X_bank_statements.sql` — VERIFY: applies clean
- [AUTO] Upload + review UI scaffold — files: `app/hub/(protected)/cashflow/transactions/*` — VERIFY: preview skill against a realistic synthetic file until real sample lands
- [GATE] Parser implementation — genuinely blocked on real format

### Lane 6 — Reconciliation
- [AUTO] Matching suggestion logic — files: `lib/cashflow-reconciliation.ts` — VERIFY: seeded invoice + matching transaction surfaces as a suggestion
- [AUTO] Confirm/dismiss UI — VERIFY: click-through updates `invoices.status` and `bank_transactions.matched_invoice_id`

### Lane 7 — Cashflow dashboard
- [AUTO] Overview page — files: `app/hub/(protected)/cashflow/page.tsx` — VERIFY: real numbers reflect seeded/test data

## LEDGER
Progress written to: `eternal-fitness-website/.context/state.md` + `handoff.md` as each unit ticks.
Live status: `eternal-fitness-website/.context/loop-status.md`

CONTEXT: Consolidates everything scoped in this session (2026-08-02): (1) pulling Amanda's/all clients' historical Trainerize training blocks, profile notes, and workout completion/PB data into the hub; (2) live "New PB" flagging during session logging plus a filterable, reusable workout-template system to fix Esther's "I call them all the same name" problem; (3) simple structured invoicing (vs. the hand-edited-HTML pattern in the Decoded Ops hub) with HSBC statement reconciliation. Trainerize Phase 0 discovery already completed against Amanda's real account this session — found Trainerize runs on an internal JSON API (`api.trainerize.com/v03/*`), which is a much better integration path than DOM scraping; details in the Group 1 scope doc. Cashflow investigation found the Decoded Ops hub's own invoice system is the anti-pattern to avoid (flat amount, no line items, no send route) — full findings in the Group 3 scope doc.
