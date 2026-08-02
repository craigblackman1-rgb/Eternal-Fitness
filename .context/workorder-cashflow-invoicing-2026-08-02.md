# Work Order: Cashflow / Invoicing — 2026-08-02

OWNER: claude (this session) — claimed 2026-08-02T10:55Z
SCOPE: eternal-fitness-website — new `invoices`/`invoice_line_items`/`invoice_templates`/`bank_statement_imports`/`bank_transactions` tables; new hub Cashflow UI (`app/hub/(protected)/cashflow/...` or similar); extending the existing document engine with a 7th `kind` (`invoice`) for send/track. **No changes to public marketing pages, no changes to any existing document kind's send/sign logic, no Stripe/payment-processing integration, no live bank API/OAuth.**

Full background/rationale: `.context/scope-cashflow-invoicing-2026-08-02.md` (this worktree). Related deferred item resolved by this WO: `dmsagoxpozw` ("training-block builder: scope a reusable warm-up/cooldown template system") is a *different* templates concept (workout templates, not invoice templates) — tracked separately, see `.context/scope-trainerize-historical-import-2026-08-02.md` §6; not part of this WO.

**Confirmed answers (2026-08-02, Craig):**
- HSBC: no Open Banking / live API connection. Manual statement export → file upload → parse. Confirmed.
- Esther is **not VAT-registered** — no VAT-rate calculation/UI needed anywhere in the invoice model.

GOAL: Esther can build an invoice from a simple structured template (no HTML editing), send it to a client through the existing document-engine send/track pipeline, and reconcile it against an uploaded HSBC statement export — with a real line-item data model, not a single flat amount.

MUST:
- Reuse the existing `client_documents` document engine for delivery (add `kind = 'invoice'`) — do not build a parallel send/public-link pipeline like the Decoded Ops hub's does. Reuse `emailed` tracking and the Resend webhook wiring already in place.
- Real relational line items (`invoice_line_items`), not a flat `amount` field or baked HTML — this is the entire point of moving away from the DO hub pattern.
- No VAT/tax-rate logic anywhere (not VAT-registered) — keep the model simple; a `vat_rate` column may exist for future-proofing but must default to 0 and stay inert (no UI, no calculation) unless Craig says otherwise later.
- HSBC import is file-upload only (CSV/OFX, format TBC from a real sample) — never build toward a live Open Banking/aggregator connection under this WO.
- Follow existing repo conventions: `lib/supabase.ts` pg shim for data access, plain Postgres migrations in `supabase/migrations/`, no `CREATE POLICY ... TO authenticated` (no RLS/authenticated role on this DB), Next.js App Router + Tailwind + existing `components/hub/` primitives (HubTable, HubCard, StatusBadge, EmptyState) for UI consistency.
- Access is hub-only (Esther) — no client-portal-facing cashflow data beyond the invoice document itself once sent (same visibility model as the other 6 document kinds).

FORBIDDEN:
- `app/` public marketing routes (root-level pages, `components/ds/`) — untouched.
- Existing document-kind logic for PT Agreement / Risk Assessment / Annual Review / Consent / Feedback / PAR-Q — additive only, don't refactor their send/sign code path while wiring in the 7th kind.
- Any Stripe or other payment-collection SDK/integration — this WO is invoice generation + statement reconciliation, not payment collection.
- Any bank OAuth/Open Banking aggregator code (TrueLayer/Plaid/Yapily/etc.) — explicitly ruled out by Craig for this WO.
- `clients.payment_status` — read-only in this WO. Don't wire it to auto-update from invoice state yet (see ASK FIRST).

DECIDE YOURSELF:
- Invoice numbering scheme — default to sequential-per-calendar-year (`INV-2026-0001`), easy to revisit later since no real invoices exist yet.
- Exact hub route/nav placement for the new Cashflow section, component naming, table/migration file naming — follow existing repo conventions.
- Default seed content for `invoice_templates` (e.g. a generic "Personal Training — block payment" template) — reasonable placeholder Esther can edit, not final copy.
- Reconciliation matching heuristic details (amount + date-window + optional invoice-number-in-description) — tune as needed, suggest-and-confirm only, never auto-commit a match.

ASK FIRST:
- **HSBC CSV/OFX sample and exact column format** — cannot build the parser without one real export from Esther's HSBC account. This is a hard blocker for the import lane, not a design decision — flag to Craig/Esther early, don't guess at a column layout and build against a guess.
- **Superseding `clients.payment_status` with invoice-derived state** — out of scope for this WO entirely (see FORBIDDEN). Raise as a separate follow-up decision once invoicing is live and Esther has used it for a while, not before.
- **First real invoice sent to a real client** — confirm with Craig/Esther before the send pipeline fires for real (test with a draft/preview first).
- **Any new pnpm dependency** (e.g. a CSV/OFX parsing library, if hand-rolled parsing proves impractical) — per standing rule, `pnpm install` is always a gate.
- Standard gates apply: DB migrations that are additive (new tables only) can run [AUTO] against prod per this repo's existing pattern (see `exercises`/`session_set_logs` precedent); anything destructive or altering existing tables' semantics is a gate.

## DONE

- [ ] `invoices` / `invoice_line_items` / `invoice_templates` tables exist, migrated, with a defined status lifecycle (`draft`/`sent`/`paid`/`overdue`/`void`)
- [ ] `client_documents` extended with `kind = 'invoice'`; invoice send reuses existing email/tracking pipeline end-to-end (verified with a real test send, not just code review)
- [ ] Hub UI: create invoice from template → editable line-item table → send or save draft
- [ ] At least one seed `invoice_template` exists and is usable
- [ ] `bank_statement_imports` / `bank_transactions` tables exist, migrated
- [ ] HSBC statement upload + parse + review screen works against a real sample export (blocked until sample obtained — see ASK FIRST)
- [ ] Reconciliation queue: uploaded transactions get suggested invoice matches, Esther can confirm/dismiss, confirmed matches update invoice status
- [ ] Cashflow overview page shows outstanding/overdue totals and recent activity from real data
- [ ] `npx tsc --noEmit` clean; `pnpm build` succeeds (Windows EPERM symlink quirk aside — verify via Coolify build or WSL/Linux if needed)
- [ ] Design parity: new Cashflow UI reviewed against `components/hub/` existing patterns for visual consistency (no new mockup exists for this — flag any deviation explicitly rather than freelancing a new visual language)

## LANES

- Lane A — Invoice core (schema, document-engine wiring, creation/template UI) · depends on: none
- Lane B — HSBC statement import (schema, parser, upload/review UI) · depends on: HSBC sample file (ASK FIRST) — can scaffold schema/UI in parallel, parser logic blocked until sample arrives
- Lane C — Reconciliation queue · depends on: Lane A + Lane B reaching schema-complete
- Lane D — Cashflow overview dashboard · depends on: Lane A + Lane B + Lane C (lowest priority)

## UNITS

### Lane A — Invoice core
- [AUTO] Migration: `invoices`, `invoice_line_items`, `invoice_templates` tables — files: `supabase/migrations/2026080X_invoices.sql` — VERIFY: migration applies clean against prod tunnel, `\d invoices` etc. show expected columns
- [AUTO] Extend `client_documents` kind enum/check + invoice-specific render path (structured line items → simple branded HTML, reusing existing document email-shell pattern per the in-flight `wo-eternalfitness-email-shell-redesign-2026-08-02` — coordinate, don't diverge from it) — files: `lib/documents/*`, migration for kind constraint — VERIFY: a test invoice document renders and sends via the real pipeline, `emailed` flag confirms
- [AUTO] Hub invoice creation UI: client picker → template picker → editable line-item table → send/save-draft — files: `app/hub/(protected)/cashflow/invoices/*`, new components under `components/hub/` — VERIFY: preview skill, real click-through creating and sending a draft invoice
- [AUTO] Seed 1+ `invoice_templates` row — files: migration or seed script — VERIFY: appears in template picker

### Lane B — HSBC statement import
- [BLOCKED] Confirm HSBC export format — waiting on: real CSV/OFX sample from Esther's HSBC account
- [AUTO] Migration: `bank_statement_imports`, `bank_transactions` — files: `supabase/migrations/2026080X_bank_statements.sql` — VERIFY: applies clean, columns match plan
- [AUTO] Upload + review UI (file picker → parsed preview → commit) — files: `app/hub/(protected)/cashflow/transactions/*` — VERIFY: preview skill, upload a real (or realistic synthetic, until the real sample lands) file end to end
- [GATE] Parser implementation itself — genuinely blocked on the real format, don't build against a guessed column layout

### Lane C — Reconciliation
- [AUTO] Matching logic (amount + date window + optional invoice-number text match) surfaced as suggestions — files: `lib/cashflow-reconciliation.ts` (new), API route — VERIFY: seed a known invoice + matching transaction, confirm it surfaces as a suggested match
- [AUTO] Confirm/dismiss UI wired to update `invoices.status` and `bank_transactions.matched_invoice_id` — VERIFY: click-through, confirm state updates in DB

### Lane D — Cashflow dashboard
- [AUTO] Overview page: outstanding total, overdue total, recent payments — files: `app/hub/(protected)/cashflow/page.tsx` — VERIFY: real numbers reflect seeded/test data correctly

## LEDGER
Progress written to: `eternal-fitness-website/.context/state.md` + `handoff.md` as each unit ticks.
Live status: `eternal-fitness-website/.context/loop-status.md`

CONTEXT: Originates from Craig's request to bring Cashflow/invoicing into Eternal Fitness, referencing the existing Decoded Ops hub Cashflow module (`D:\apps\decoded-ops-hub`) as inspiration — investigation found that module's invoice flow is a hand-edited HTML-per-invoice pattern with no line items and no email-send route, i.e. the exact pain point Craig wants to avoid, not a pattern to copy. Full findings and design rationale in `.context/scope-cashflow-invoicing-2026-08-02.md`. This WO is one of three related-but-independent scope items discussed 2026-08-02 (the other two: Trainerize historical data import, and live-PB-flagging/workout-templates — see `.context/scope-trainerize-historical-import-2026-08-02.md`) — deliberately kept as separate initiatives since they don't share schema or UI surface.
