# Work Order: Hub Consolidated Fixes — Invoice Templates, Email Updates Toolbar, Medical Tracker/Training Rules/Studio Equipment/Plan Agent Design Fixes, Site Review + Site Content Removal — 2026-08-06

OWNER: unclaimed
SCOPE: eternal-fitness-website only — `app/hub/(protected)/templates/**`, `app/hub/(protected)/cashflow/invoices/**`, `app/hub/(protected)/reports/updates/**`, `app/hub/(protected)/tracker/**`, `app/hub/(protected)/site-review/**` (removal), `app/hub/(protected)/site-content/**` (removal), `app/hub/(protected)/settings/training-rules/**`, `app/hub/(protected)/settings/studio-equipment/**`, `app/hub/(protected)/settings/plan-agent/**`, `components/hub/HubSidebar.tsx` (nav entries only), `lib/documents/types.ts`, `types/index.ts`, associated API routes and migrations. No other app touched.

GOAL: Ship 7 real units of hub work Craig asked for in one 2026-08-06 conversation: (1) a Quote/invoice document template wired into real invoice creation, (2) a search/sort toolbar on Email Updates, (3) a redesigned Medical Tracker/Compliance page, (4) full removal of Site Review, (5) full removal of Site Content, (6) a Training Rules fix (toggle colouring + ability to edit existing rules), (7) a Studio Equipment redesign, (8) a Plan Agent Settings design fix. A ninth item (Bank Transactions design check) was answered live during scoping — see CONTEXT, no lane needed.

MUST:
- **[Lane 1] Quote/invoice template.** Craig gave two overlapping instructions: "add the quote template [invoice-template.html] to the Templates page" AND "update the hub create-invoice flow to use this." Current code has **two unrelated systems both called "template"**: (a) the document engine (`document_templates` table, `lib/documents/types.ts` `DocumentKind` enum, rendered/edited via `lib/documents/render.tsx`, listed on `/hub/templates` via `TemplatesLibrary.tsx`) — `"invoice"` is already a nominal `DocumentKind` here (label, icon, category all defined) but nothing renders it against `invoice-template.html`'s actual layout, and it is **not** connected to real invoice generation; (b) the cashflow invoicing system (`invoice_templates` table, `app/api/invoices/templates/route.ts`, `NewInvoiceDrawer.tsx` under `/hub/cashflow/invoices`) — this is what actually creates a real, sendable invoice today. Building a mockup-accurate "Quote" template only in system (a) would satisfy "add to Templates page" but not "update create-invoice to use this," since (a) and (b) don't talk to each other. See DECIDE YOURSELF/ASK FIRST below for how to resolve this without guessing wrong.
- **[Lane 2] Email Updates toolbar.** Live-checked 2026-08-06: `/hub/reports/updates` (`UpdatesReport.tsx`) already has a status segmented control (All/Scheduled/Drafts/Sent/Failed with counts) and an "All programmes" filter select, but **no free-text search box and no column sort** — confirmed by a live DOM check finding zero search inputs on the page. Add a text search (client name + subject, matching `Toolbar`'s existing search pattern used elsewhere in the hub, e.g. `TemplatesLibrary.tsx`) and click-to-sort on the Updates table's sortable columns (When, Status at minimum). Reuse `components/hub/Toolbar.tsx` rather than inventing new filter UI.
- **[Lane 3] Medical Tracker / Compliance redesign.** Craig's message pointed at `D:\apps\design-systems\ef-control-hub\index.html`, but that file is the **screen-index page** (a directory of links to every mockup, not a design spec for any one screen) — it has no Medical Tracker-specific layout to build against. The design-systems folder has a dedicated, purpose-built mockup instead: `hub-medical-tracker.html` (66KB, last touched 2026-08-06 16:55 — the most recently updated file in the whole folder, i.e. very likely the one Craig actually meant). **Default to building against `hub-medical-tracker.html`**; flag this substitution to Craig explicitly when reporting the lane done, per the Design Parity Gate's "surface deviations proactively" rule — don't let him discover the file swap by himself. Current live page (`app/hub/(protected)/tracker/page.tsx`) is read-only, no Toolbar, a single plain table (Client/Status/PAR-Q/Agreement/GP Letter/Outstanding) + 3 KPI tiles, reading `clients`/`signed_parq`/`signed_agreements`/`client_documents` via `lib/compliance.ts`. Preserve the "read-only, edit happens on client profile" behaviour unless the mockup explicitly shows inline editing — reconcile visual structure only, not data-editing scope, unless the mockup clearly adds it.
- **[Lane 4] Remove Site Review entirely.** Delete `/hub/site-review` (page + its local hardcoded task/sitemap data, `task-statuses` localStorage key becomes dead — no migration needed, it's client-local), remove its `HubSidebar.tsx` nav entry (Studio Admin group). Note: a 2026-08-01 HTTP 500 on this route was investigated and found not reproducing 2026-08-04 — irrelevant now since the whole route is being deleted, not fixed.
- **[Lane 5] Remove Site Content entirely.** Craig's stated reason: site content is now updated directly via Claude Code, not through this in-hub editor. Delete `/hub/site-content` and `/hub/site-content/[slug]` (both the inventory table and the 8-slug real editor over `page_content_blocks`), remove its `HubSidebar.tsx` nav entry. Leave the underlying `page_keywords` and `page_content_blocks` tables in place (do not drop tables — Claude Code may still want to query them for reference; this is a UI removal, not a data-destructive migration).
- **[Lane 6] Training Rules fix.** Two concrete, confirmed-live gaps: (a) the active/inactive toggle (`components/ui/switch.tsx` `Switch` in `TrainingRuleTypesManager.tsx`) renders with no colour distinction between on/off states — give it the same on/off colour treatment already used elsewhere in the hub (e.g. the studio-equipment page's own toggle, or `hub-training-rules.html`'s toggle spec) so active vs inactive is visually obvious at a glance; (b) there is currently **no way to edit an existing rule type's label/bucket/description** — only add-new and toggle-active exist today. Add an edit affordance (inline edit or a small edit drawer/dialog, whichever matches `hub-training-rules.html`) that PATCHes `/api/rule-types/:id` with the editable fields, not just `active`.
- **[Lane 7] Studio Equipment redesign.** Build `app/hub/(protected)/settings/studio-equipment/**` (`page.tsx` + `EquipmentManager.tsx`) against `hub-studio-equipment.html`. Current page: flat table (Name/Detail/Home equivalent/Active/delete), hand-rolled toggle button (not the shared `Switch`), inline add form, no Toolbar. Reconcile visual structure to the mockup; keep the existing add/toggle/delete API contract (`/api/equipment`) unless the mockup shows a materially different flow.
- **[Lane 8] Plan Agent Settings design fix.** Craig flagged "the hub design is not right" against `hub-plan-agent-settings.html` without specifying the exact deltas — this lane starts with a proper Design Parity Gate pass (read the mockup in full, enumerate every section/card/control, cross-check against `PlanAgentSettingsManager.tsx`'s actual per-`value_type` editors — `PaceModesEditor`/`TextEditor`/`ListEditor`/`KeyedTextEditor` grouped by section) before touching any code, since the specific mismatch isn't known yet.
- Every lane's diff reviewed line-by-line by Claude before merge — this project's standing rule after 4 prior OpenCode fabrication incidents. No lane ships on self-report; each design lane goes through the Design Parity Gate (read mockup in full, enumerate every section, cross-check against implementation, real screenshot where login/browser access allows) before being called done.

FORBIDDEN:
- Dropping `page_keywords` or `page_content_blocks` tables, or any other data-destructive migration, as part of the Site Content removal — UI removal only.
- Rebuilding the cashflow invoicing calculation/send logic (`/api/invoices`, PDF/email send) as part of Lane 1 — only the template-picking/creation-entry surface is in scope.
- Touching `lib/compliance.ts`'s flag-computation logic in Lane 3 — visual/structural redesign only, unless the mockup explicitly changes what's flagged.
- Silently choosing a template architecture for Lane 1 without flagging the two-systems ambiguity to Craig first (see DECIDE YOURSELF/ASK FIRST).

DECIDE YOURSELF:
- Exact Tailwind/shadcn implementation details for every mockup-parity lane (spacing scale, component composition) — mockups give visual targets, not literal class names.
- Whether Lane 6's rule-type edit UI is inline-in-row or a drawer/dialog, and whether Lane 7's toggle recolour reuses `Switch` (recommended, for consistency with Lane 6) or keeps the existing hand-rolled toggle just recoloured — pick whichever matches `hub-training-rules.html`/`hub-studio-equipment.html` most closely.
- Redirect vs hard-delete for `/hub/site-review` and `/hub/site-content` routes — default to hard-delete (no `permanent:false` redirect) since these are internal admin-only tools with no public/bookmarked-by-clients exposure, unlike the PAR-Q/Agreement legacy-route precedent.

ASK FIRST — both resolved by Craig 2026-08-06, no longer blocking:
- **Lane 1 architecture call — ANSWERED:** cashflow's `invoice_templates` system (the one that actually drives `NewInvoiceDrawer.tsx`/real invoice creation), built using `invoice-template.html` as the direct basis for the new template's content/layout. Still add the lightweight read-only card/link on `/hub/templates` per the DECIDE YOURSELF fallback below, so it's visible from both places Craig named.
- **Lane 3 file-swap confirmation — ANSWERED:** confirmed, build against `hub-medical-tracker.html`.

## DONE

- [ ] Lane 1: real invoice creation flow uses a Quote/invoice template built from `invoice-template.html`; template also visible/creatable from `/hub/templates` per whichever architecture Craig confirms (or the recommended default if unanswered)
- [ ] Lane 2: `/hub/reports/updates` has working free-text search (client name + subject) and at least one sortable column, built on `components/hub/Toolbar.tsx`
- [ ] Lane 3: `/hub/tracker` redesigned to match `hub-medical-tracker.html`, Design Parity Gate pass documented, data/edit-scope unchanged unless mockup explicitly shows otherwise
- [ ] Lane 4: `/hub/site-review` route deleted, nav entry removed, `tsc` clean, no dangling links anywhere in the app
- [ ] Lane 5: `/hub/site-content` and `/hub/site-content/[slug]` routes deleted, nav entry removed, underlying tables left intact, `tsc` clean, no dangling links
- [ ] Lane 6: Training Rules toggle has clear on/off colour treatment; existing rule types can be edited (label/bucket/description), not just toggled/added
- [ ] Lane 7: `/hub/settings/studio-equipment` redesigned to match `hub-studio-equipment.html`, Design Parity Gate pass documented
- [ ] Lane 8: `/hub/settings/plan-agent` reconciled against `hub-plan-agent-settings.html` with specific deltas identified and fixed, Design Parity Gate pass documented
- [ ] `npx tsc --noEmit` clean (no new errors vs. pre-existing baseline) across all lanes
- [ ] Every lane's diff reviewed line-by-line before merge; every design lane's parity confirmed via screenshot or DOM-vs-mockup diff, not self-report

## LANES

- Lane 1 — Quote/invoice template + wire into invoice creation · depends on: Craig's architecture answer (or proceeds on recommended default)
- Lane 2 — Email Updates search/sort toolbar · depends on: none
- Lane 3 — Medical Tracker / Compliance redesign · depends on: none (proceeds on `hub-medical-tracker.html` default)
- Lane 4 — Remove Site Review · depends on: none
- Lane 5 — Remove Site Content · depends on: none
- Lane 6 — Training Rules toggle colour + edit capability · depends on: none
- Lane 7 — Studio Equipment redesign · depends on: none
- Lane 8 — Plan Agent Settings design fix · depends on: none (starts with a Design Parity Gate audit pass since exact deltas aren't yet known)

## UNITS

### Lane 1 — Invoice templates
- [AUTO] Build Quote/invoice template content from `D:\apps\design-systems\ef-control-hub\documents\invoice-template.html` into cashflow's `invoice_templates` system (Craig's answer, 2026-08-06) — VERIFY: template selectable in the real invoice-creation flow, produces a real invoice matching the mockup's layout
- [AUTO] Bridge/visibility on `/hub/templates` per the DECIDE YOURSELF fallback — VERIFY: template visible and correctly labeled from the Templates page

### Lane 2 — Email Updates toolbar
- [AUTO] Add search input + column sort to `UpdatesReport.tsx` using `components/hub/Toolbar.tsx` — files: `app/hub/(protected)/reports/updates/UpdatesReport.tsx` — VERIFY: preview skill, search filters both the "Updates due" and "Updates" tables (or whichever table(s) it's meant to cover — confirm scope during build), sort toggles direction on repeated click

### Lane 3 — Medical Tracker
- [AUTO] Redesign `/hub/tracker` against `hub-medical-tracker.html` — files: `app/hub/(protected)/tracker/page.tsx` and any new subcomponents — VERIFY: Design Parity Gate section-by-section check, real client compliance data renders correctly, `tsc` clean

### Lane 4 — Remove Site Review
- [AUTO] Delete route + nav entry — files: `app/hub/(protected)/site-review/**` (delete), `components/hub/HubSidebar.tsx` — VERIFY: route 404s or redirects per DECIDE YOURSELF, no other file references it, `tsc` clean

### Lane 5 — Remove Site Content
- [AUTO] Delete routes + nav entry — files: `app/hub/(protected)/site-content/**` (delete), `components/hub/HubSidebar.tsx` — VERIFY: routes gone, no other file references them, `page_keywords`/`page_content_blocks` tables untouched, `tsc` clean

### Lane 6 — Training Rules
- [AUTO] Toggle colour fix — files: `app/hub/(protected)/settings/training-rules/TrainingRuleTypesManager.tsx` (or `components/ui/switch.tsx` styling) — VERIFY: on/off states visually distinct, matches `hub-training-rules.html`
- [AUTO] Edit existing rule type — files: same component + `app/api/rule-types/[id]/route.ts` (extend PATCH if needed) — VERIFY: edit label/bucket/description on an existing row, persists, `tsc` clean

### Lane 7 — Studio Equipment
- [AUTO] Redesign against `hub-studio-equipment.html` — files: `app/hub/(protected)/settings/studio-equipment/page.tsx`, `EquipmentManager.tsx` — VERIFY: Design Parity Gate pass, add/toggle/delete still function

### Lane 8 — Plan Agent Settings
- [AUTO] Design Parity Gate audit (read mockup in full, enumerate deltas against `PlanAgentSettingsManager.tsx`) before any code change — VERIFY: written delta list reviewed before proceeding
- [AUTO] Apply identified fixes — files: `app/hub/(protected)/settings/plan-agent/page.tsx`, `PlanAgentSettingsManager.tsx` — VERIFY: Design Parity Gate re-check post-fix, all editors (`PaceModesEditor`/`TextEditor`/`ListEditor`/`KeyedTextEditor`) still save correctly

## LEDGER
Progress written to: `eternal-fitness-website/.context/state.md` + `handoff.md` as each lane ticks.
Live status: `eternal-fitness-website/.context/loop-status.md`

CONTEXT: Craig raised 9 items in one 2026-08-06 conversation. **Bank Transactions design check answered live during scoping, no lane needed:** `/hub/cashflow/transactions` was checked against `hub-cashflow-transactions.html` (DOM read live on staging) and already matches — canvas-level Toolbar with search + category-status filter + count, per-row category `<select>` + exclude button, import-card summary. This was Lane 6 of `wo-hub-design-parity-2026-08-04.md`, confirmed shipped (`005f7d9`, 2026-08-04, status `done` in the registry) and still correct as of this check. The other 8 items became Lanes 1–8 above. No other eternal-fitness-website work order is currently active or planned in the registry (only `wo-hub-design-parity-2026-08-04` and `wo-eternalfitness-consolidated-2026-08-02` exist, both `done`) — nothing to consolidate this WO with.
