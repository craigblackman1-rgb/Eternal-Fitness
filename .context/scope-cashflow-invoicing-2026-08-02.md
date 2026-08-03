# Scope of Work — Cashflow / Invoicing for Eternal Fitness

**Date:** 2026-08-02
**Requested by:** Craig
**Status:** Draft for review — not yet a Work Order. Separate initiative from the Trainerize historical-import scope (`.context/scope-trainerize-historical-import-2026-08-02.md`) — different domain, no shared dependency, should not be bundled into the same Work Order.

## The ask

Bring invoicing/cashflow into Eternal Fitness, inspired by the Cashflow module already built in the Decoded Ops hub, but better:

1. Create and send invoices to clients — **not** the raw-HTML-editing workflow Craig currently uses in the DO hub. Simple, structured templates instead.
2. Import bank statements/transactions from HSBC.

## What I found in the Decoded Ops hub (`D:\apps\decoded-ops-hub`)

Worth being direct about this: **the current DO hub invoice flow is exactly the pain point Craig described, not a pattern to copy.**

- `invoices` table (`combined_migration.sql` + later migrations) has a single flat `amount NUMERIC`, a `notes` field crudely split on `.` to fake a description, a `vat_exempt` boolean, and an `html_content` column.
- Invoice creation (`src/app/api/crm/invoices/route.ts`) calls `generateInvoiceHTML()` — a ~450-line hardcoded HTML/CSS template string in `src/lib/document-templates.ts` — and stores the rendered output into a `client_documents` table.
- **There is no email-send route and no PDF generation anywhere in the invoice flow** (confirmed by grep — zero matches for send/email/pdf under `api/crm/invoices`). Invoices are shared as a public link (`/api/public/client-docs/[docNumber]`) that serves the stored HTML once manually marked `published`. Craig manually builds/edits that HTML per invoice — this is the "cutting and pasting HTML" he's asking to move away from.
- No line-items table — one invoice, one amount, one crude description. No real invoice lifecycle beyond `draft`/`published`, `paid_at` is set by hand.
- Bank side: `bank_connections`/`bank_transactions` are **Monzo-OAuth-only** (live API sync, pence-based amounts). **No HSBC-specific code, no CSV/OFX parser, nothing statement-import-shaped exists anywhere in that repo.** The "reconciliation" concept that does exist (`bank_transactions.invoice_id`/`bill_id` FKs, manual matching) is a reusable *pattern*, not reusable *code*, since it's wired to Monzo's live feed, not a file import.

**Conclusion:** don't port DO hub's invoice code — port the *idea* (invoices tied to clients, a cashflow view) but build the line-items/template/send pieces properly, since DO hub never solved those either.

## What already exists in Eternal Fitness (genuinely reusable)

This is the good news — EF already has infrastructure DO hub doesn't:

- **A working document engine.** `client_documents` table, 6 existing kinds (PT Agreement, Risk Assessment, Annual Review, Consent, Client Feedback, PAR-Q), all sent/resent/signed through the same pipeline, with a real `emailed` boolean tied to actual send confirmation (not DO hub's manual-publish model) and Resend webhook tracking for opened/clicked. **Adding "invoice" as a 7th document kind reuses send, resend, and tracking wholesale** — this is a materially better foundation than what DO hub itself has for invoicing today.
- **`clients` already has billing-adjacent fields** — `package_type`, `sessions_purchased`, `sessions_used`, `sessions_remaining`, `payment_method`, `payment_status` (paid/deposit/pending/overdue/suspended, CHECK-constrained), `block_expiry_date` — currently hand-toggled by Esther via `PackagePaymentsCard.tsx` / `PATCH /api/clients/[id]`. A real invoicing system should **drive `payment_status` from actual invoice state**, not leave it as a separate manually-maintained flag that can drift from reality.
- No Stripe, no existing payment processing, no prior invoicing code to conflict with — clean slate for the data model itself.

## Proposed data model

Genuinely relational, unlike DO hub's flat version:

- `invoices` — id, client_id, invoice_number, issue_date, due_date, status (`draft`/`sent`/`paid`/`overdue`/`void` — a real enum, not free text), currency (GBP, but don't hardcode — same lesson as DO hub's `£`-everywhere problem), subtotal/vat/total (computed from line items, not typed by hand), `client_document_id` FK once sent (ties into the existing document engine's send/track).
- `invoice_line_items` — id, invoice_id, description, quantity, unit_price, vat_rate — the piece DO hub never built. This is what makes "simple templates" possible at all: a template is just a saved default set of line items, not a saved HTML blob.
- `invoice_templates` — id, name, description, default line items (JSONB array of `{description, quantity, unit_price, vat_rate}` with placeholders), maybe tied to `package_type` so "create invoice for a 10-session block" pre-fills from the matching template. This directly answers "simple templates rather than cutting and pasting HTML" — Esther picks a template, adjusts amounts/quantities in a form, done. No HTML ever touched.
- `bank_statement_imports` — id, uploaded_at, source (`hsbc`), file_name, row_count, status.
- `bank_transactions` — id, import_id, transaction_date, description (raw, as HSBC exports it), amount, direction (in/out), matched_invoice_id (nullable FK), match_confidence/method (`auto`/`manual`), reconciled boolean. Same reconciliation *shape* as DO hub's Monzo table, but populated by file import rather than a live OAuth feed.

## HSBC statement import — needs a decision, not an assumption

"Import" most realistically means: **Esther exports a CSV (or OFX/QIF) from HSBC's own online banking and uploads the file to the app** — this is what "import" usually means for a traditional high-street bank that doesn't offer a simple read API. That's the scope I'd default to: a file-upload page, a parser for whatever format HSBC actually exports (CSV column layout needs confirming from a real export — HSBC's business banking CSV format varies by account type), and a review screen before transactions are committed.

**What I would NOT default to without an explicit yes:** a live Open Banking connection (HSBC via a PSD2 aggregator like TrueLayer/Plaid/Yapily) — that's a materially bigger, higher-risk piece of work (OAuth consent flow, ongoing API costs, regulatory/compliance surface, credential handling far beyond "upload a CSV"). If Craig actually wants live bank sync rather than manual statement upload, that's a different, larger scope — flagging it now rather than assuming either way.

**Reconciliation approach:** suggest-and-confirm, not fully automatic — match imported transactions to open invoices by amount + rough date proximity + optional invoice-number-in-description text match, surface candidates to Esther, she confirms or dismisses. Bank statement descriptions are messy in practice; full auto-matching would misfire more than it'd help.

## Design/UI considerations

- New Cashflow section in the hub, structurally separate from client training data — Esther is the only hub user today, but if that ever changes, invoicing/banking data should be scoped to owner-level access, not general staff access, from day one.
- Invoice creation UI: pick client → pick template (or start blank) → editable line-item table → send (reuses document-engine send flow) or save as draft.
- Client-facing: invoices become another entry in whatever "your documents" view the portal already has for signed documents — consistent with how PT agreements etc. already surface to clients, rather than a bespoke new client-facing page.
- Bank import UI: upload → parsed preview/review screen (catch malformed rows before they hit the DB) → commit → reconciliation queue.
- Cashflow overview (optional, DO-hub-inspired): a simple dashboard — outstanding invoices, overdue total, recent payments — genuinely useful for Esther, straightforward to build once the underlying tables exist, not the hard part of this scope.

## Open questions to resolve before this becomes a Work Order

1. **CSV vs OFX vs live Open Banking** for HSBC — confirm which, and if CSV/OFX, get one real sample export from Esther's HSBC account to build the parser against (column layout, date format, whether it's business or personal banking export).
2. **VAT/tax handling** — is Esther VAT-registered? If not, the whole VAT-rate-per-line-item piece simplifies to a no-op, worth confirming before building it.
3. **Numbering scheme** — sequential per calendar year, per client, or global? Affects the `invoice_number` generation logic and whether gaps are acceptable (some invoicing/accounting conventions care about this).
4. **Access scope** — hub-only (Esther), or should invoice status/amount ever be portal-visible to clients directly (vs. just receiving the emailed/signed document)? Likely hub-only plus the sent document itself, but worth confirming rather than assuming.
5. **Relationship to `clients.payment_status`** — supersede that field entirely (derive it from invoice state) or keep both and sync them? Recommend supersede — two sources of truth for the same fact is exactly the kind of drift DO hub's `paid_at`-set-by-hand pattern already shows the risk of.

## Phased plan

| Phase | What | Gate |
|---|---|---|
| 1 | Answer the 5 open questions with Esther/Craig; get one real HSBC export sample | [GATE] |
| 2 | `invoices`/`invoice_line_items`/`invoice_templates` schema + invoice-as-7th-document-kind wiring into the existing document engine | [AUTO] once Phase 1 answered |
| 3 | Invoice creation/template UI in the hub | [AUTO] |
| 4 | HSBC statement parser (format confirmed from Phase 1 sample) + `bank_statement_imports`/`bank_transactions` schema + upload/review UI | [AUTO] |
| 5 | Reconciliation queue (suggest-and-confirm matching) | [AUTO] |
| 6 | Cashflow overview dashboard | [AUTO], lowest priority — nice-to-have once the rest exists |
| 7 | Migrate `clients.payment_status` to be derived from invoice state (if Phase 1 Q5 confirms supersede) | [GATE] — touches existing client records, needs a careful one-time backfill, not a silent schema change |

## Effort signal

This is its own multi-day Work Order, separate from the Trainerize/fitness-data scope — different domain (financial data vs. training data), no shared schema or UI surface. The good news is EF's existing document engine does a lot of the "send to client" heavy lifting for free; the real net-new work is the line-item/template data model (which DO hub never built either) and the HSBC parser (entirely new, format TBC). Recommend scoping this as its own Work Order once Phase 1 questions are answered, rather than folding it into the training-data Work Order — keeping financial-data work in its own lane also makes sense from an access-control and blast-radius standpoint.
