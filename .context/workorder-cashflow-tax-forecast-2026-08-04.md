# Work Order: Cashflow — Tax Liability + Cash Flow Forecast — 2026-08-04

OWNER: claude (this session) — claimed 2026-08-04T11:45Z
SCOPE: eternal-fitness-website (app/hub/(protected)/cashflow/**, new tax_calculations/tax_payments/bills/cash_settings tables, lib/cashflow-*.ts, supabase/migrations/) — no other app touched.

GOAL: Esther can see (1) an estimated tax liability for the current UK tax year, calculated the same way Craig's own Decoded Ops hub does it (income minus categorized allowable expenses → Income Tax + Class 2/4 NIC), and (2) a forward-looking cash flow forecast (not a literal startup-style "runway to zero," confirmed with Craig 2026-08-04 — this is a healthy business, the ask is "what's coming in/out over the next few months," holding back the estimated tax as a reserve) — both surfaced on the existing `/hub/cashflow` overview.

MUST:
- **Mirror the Decoded Ops hub's tax calculation logic exactly** (Craig's explicit instruction: "same as how I do via decoded ops, its the same biz model") — see `D:\apps\decoded-ops-hub\src\app\api\cashflow\tax\calculate\route.ts` and its migration `D:\apps\decoded-ops-hub\supabase\migrations\20260629_cashflow_module.sql` for the reference implementation: UK tax year bounds (Apr 6 – Apr 5), 2025-26 personal allowance (£12,570)/basic rate limit (£50,270)/higher rate (40%) bands, Class 2 NIC (£3.45/week flat once profit clears the allowance), Class 4 NIC (6% main band, 2% additional band). **Port the math, not DO hub's pence-based storage** — EF's `invoices`/`bank_transactions` already store amounts as `NUMERIC` pounds (see `20260802_invoice_core.sql`, `20260803_bank_statements.sql`); keep that convention, don't introduce pence.
- **Mirror the forecast/runway calculation shape**, not the literal "runway to zero" framing — see `D:\apps\decoded-ops-hub\src\app\api\cashflow\runway\route.ts`: a 12-month rolling projection built from (a) unpaid/overdue invoices bucketed by due date as expected income, (b) pending/recurring bills as expected outgoings, (c) a starting cash balance minus the current estimated tax liability held back as a reserve, producing a month-by-month opening/income/expenses/closing balance. Still compute and surface the "would go negative in month X" signal if it ever occurs (useful safety net even though not the primary framing) — just don't lead the UI with "runway" language; lead with "cash flow forecast."
- No VAT logic (Esther not VAT-registered — same standing rule as the rest of the cashflow module).
- Reuse `lib/supabase.ts` pg shim, plain Postgres migrations, no RLS/`authenticated` role, existing `components/hub/` primitives — same conventions as the rest of this app (do NOT copy DO hub's Supabase-auth/RLS pattern, that doesn't apply here).
- Access is hub-only (Esther) — same visibility model as the rest of Cashflow.
- Every tax-estimate and forecast figure shown in the UI must carry a visible "estimate only, not a substitute for an accountant" disclaimer — this is a real number Esther could act on; don't present it as authoritative.

FORBIDDEN:
- Any change to `decoded-ops-hub` itself — read-only reference for the calculation logic, nothing in that repo gets touched.
- Existing Cashflow Lanes A–D (invoice core, bank import, reconciliation, dashboard totals) — additive only, don't refactor their existing code paths while adding tax/forecast.
- Any live bank API/OAuth (same standing rule as the original cashflow WO) — forecast income/expense inputs come from already-imported `bank_transactions` and `invoices`, not a live feed.
- `clients.payment_status` — untouched, same as the original WO.

DECIDE YOURSELF:
- Whether to build DO hub's full `personal_expenses` and `forecast_items` (weighted sales-pipeline) tables, or scope v1 down to just `bills` (recurring/pending non-invoice outgoings) + the existing `invoices`/`bank_transactions` as forecast inputs. **Recommend scoping down** — Esther's business doesn't have a sales pipeline the way Craig's consultancy does; `forecast_items` would sit empty. Add it later if a real need shows up, don't build speculative UI for it now.
- Exact `expense_category` taxonomy for `bank_transactions` (DO hub uses software/office/travel/marketing/professional_fees/insurance/tax/ni/other — adapt as needed for a PT studio, e.g. studio_rent/equipment/insurance/software/marketing/professional_fees/other).
- Where in the UI the tax/forecast surfaces exactly (new `/hub/cashflow/tax` + `/hub/cashflow/forecast` pages vs. sections on the existing overview) — follow existing repo/nav conventions; note the nav placement in the design brief (`.context/design-brief-hub-nav-cashflow-2026-08-04.md`) once built, since that brief already flagged Cashflow nav as needing a pass.
- Whether `cash_settings.current_balance` is a single manually-entered field on a settings card, or something richer — keep it simple (Esther types in her current balance periodically), since there's no live bank feed to derive it from automatically.

ASK FIRST:
- **The starting cash balance has no automatic source** — no live bank connection exists (file-upload-only HSBC import, and no real HSBC sample has landed yet per the original cashflow WO). The forecast is only as good as a manually-entered balance Esther keeps updating. Flag this limitation explicitly in the UI copy, don't build toward a false impression of automation.
- **2025-26 tax rates are hardcoded** (mirroring DO hub) — these change every UK tax year. Flag to Craig that this needs a manual update (or a small "tax year rates" config table) each April, not something this WO makes self-updating.
- **No real bank transaction data exists yet** (only the Monzo-format stand-in parser + demo data seeded 2026-08-04) — the tax/forecast numbers will be near-meaningless until Esther does a real HSBC import and categorizes real transactions. Say this plainly once built, don't imply the number is production-accurate on day one.
- Standard gates apply: additive migrations can run [AUTO] against prod; anything destructive is a gate.

## DONE

- [ ] `bank_transactions` gains `income_category`/`expense_category`/`is_excluded` columns (already has most of the shape from the original import migration — verify what's missing before adding)
- [ ] `bills` table exists (recurring/pending non-invoice outgoings — studio rent, insurance, etc.), migrated
- [ ] `tax_calculations` / `tax_payments` tables exist (pounds-based, no owner_id/RLS), migrated
- [ ] `cash_settings` table exists (starting balance, tax reserve toggle), migrated
- [ ] Tax calculation logic ported and produces the same result as DO hub's for an identical hand-computed test case (income £X, expenses £Y → same Income Tax + Class 2 + Class 4 figures, verified by hand against the 2025-26 rates, not just "code runs")
- [ ] Forecast logic ported: 12-month projection combining unpaid invoices + pending bills + starting balance minus tax reserve, with a flagged "would go negative" month if applicable
- [ ] Hub UI: tax liability view + cash flow forecast view, both reachable from Cashflow nav, both carrying the "estimate only" disclaimer
- [ ] Existing `/hub/cashflow` overview surfaces a headline tax-liability figure and forecast summary
- [ ] `npx tsc --noEmit` clean; `pnpm build` succeeds
- [ ] Craig/Esther told explicitly (in the handoff, not just buried in code comments) that the numbers are only as accurate as manually-entered balance + real imported/categorized transactions — not automatically trustworthy on day one

## LANES

- Lane A — Expense categorization (schema + categorization UI on the transactions review screen) · depends on: none
- Lane B — Tax calculation (schema + calc logic + tax page) · depends on: Lane A reaching schema-complete
- Lane C — Cash flow forecast (schema + projection logic + forecast page) · depends on: Lane A + Lane B (needs the tax reserve figure)
- Lane D — Dashboard integration (surface both on existing overview) · depends on: Lane B + Lane C

## UNITS

### Lane A — Expense categorization
- [AUTO] Migration: add `income_category`/`expense_category`/`is_excluded` to `bank_transactions` if not already present (check `20260803_bank_statements.sql` first — it may already have some of this) — files: `supabase/migrations/2026080X_cashflow_tax_categories.sql` — VERIFY: `\d bank_transactions` shows new columns
- [AUTO] Categorization UI on `/hub/cashflow/transactions` review screen (per-row category dropdown, bulk-apply optional) — files: `app/hub/(protected)/cashflow/transactions/*` — VERIFY: real click-through, category persists

### Lane B — Tax calculation
- [AUTO] Migration: `tax_calculations`, `tax_payments` (pounds-based, adapted from DO hub schema minus owner_id/RLS) — files: `supabase/migrations/2026080X_tax_calculations.sql` — VERIFY: applies clean, columns match plan
- [AUTO] `lib/cashflow-tax.ts` — port DO hub's `estimateTax()`/tax-year-bounds logic in pounds — VERIFY: unit-testable by hand calculation against 2-3 known income/expense pairs
- [AUTO] `/hub/cashflow/tax` page (or a section on the existing overview per DECIDE YOURSELF) — VERIFY: preview skill, real numbers against seeded/real data

### Lane C — Cash flow forecast
- [AUTO] Migration: `bills`, `cash_settings` — files: `supabase/migrations/2026080X_cashflow_forecast.sql` — VERIFY: applies clean
- [AUTO] `lib/cashflow-forecast.ts` — port DO hub's monthly-bucket projection logic (unpaid invoices + pending bills + starting balance − tax reserve) — VERIFY: hand-checkable against a small seeded scenario
- [AUTO] `/hub/cashflow/forecast` page — 12-month table/chart, flagged negative-balance month if any — VERIFY: preview skill, real click-through

### Lane D — Dashboard integration
- [AUTO] `/hub/cashflow` overview gains a tax-liability headline figure + forecast summary card — files: `app/hub/(protected)/cashflow/page.tsx` — VERIFY: real numbers reflect Lane B/C output, not hardcoded

## LEDGER
Progress written to: `eternal-fitness-website/.context/state.md` + `handoff.md` as each unit ticks.
Live status: `eternal-fitness-website/.context/loop-status.md`

CONTEXT: Follows directly from Craig's 2026-08-04 request to add tax liability + forecast to the Eternal Fitness cashflow module, explicitly modeled on the Decoded Ops hub's existing tax/runway feature ("same as how I do via decoded ops, its the same biz model") — reference implementation fully read and cited above. Confirmed with Craig: forecast means a forward cash-flow view (income/outgoings over the next few months), not a literal startup-style depletion "runway" — this business isn't burning cash, the concept borrowed from DO hub is the calculation shape (monthly projection holding back a tax reserve), not the "about to run out" framing. This WO is separate from and additive to the original `workorder-cashflow-invoicing-2026-08-02.md` (invoice core + bank import + reconciliation + dashboard), which is already closed. Related design brief already flagged Cashflow nav placement as needing a pass: `.context/design-brief-hub-nav-cashflow-2026-08-04.md`.
