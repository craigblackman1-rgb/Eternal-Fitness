# Open Design Brief — Hub Navigation + Cashflow + New Client-Profile Tabs

**Date:** 2026-08-04
**Requested by:** Craig
**Purpose:** Hand this to the design tool (OpenDesign) to produce updated/new mockups. This is a design brief, not a build spec — no code changes are proposed here.

## Why this brief exists

The hub has grown a lot since the last full design pass (`D:\apps\design-systems\ef-control-hub\`, the `hub-*.html` mockup set). Several live features now have **no mockup at all**, and the sidebar navigation mockup predates entire sections that exist in the live app today. Craig did a live click-through and flagged real inconsistencies (icon sizing, search bar treatment, spacing, an inconsistent pill/dropdown pattern) that a design pass should resolve system-wide, not page-by-page.

## What already has a mockup vs. what doesn't

| Area | Mockup exists? | File |
|---|---|---|
| Dashboard | ✅ | `hub-dashboard.html` |
| Clients list | ✅ | `hub-clients.html` |
| Client detail | ⚠️ partial — only 6 of the live app's 9 tabs | `hub-client-detail.html` |
| Client edit | ✅ | `hub-client-edit.html` |
| Documents | ✅ | `hub-documents.html` |
| Exercise library | ✅ | `hub-exercise-library.html` |
| Reports / Email Updates | ✅ (but live page has since diverged — see below) | `hub-reports-updates.html` |
| Studio schedule (session calendar) | ✅ | `hub-schedule.html` |
| Session editor / logging | ✅ | `hub-session-editor.html`, `hub-session-log.html` |
| Process & quality | ✅ | `hub-process-quality.html` |
| Site content | ✅ | `hub-site-content.html`, `hub-site-content-editor.html` |
| Studio equipment | ✅ | `hub-studio-equipment.html` |
| Training rules | ✅ | `hub-training-rules.html` |
| Plan Agent settings | ✅ | `hub-plan-agent-settings.html` |
| Tasks | ✅ | `hub-tasks.html` |
| SOP detail | ✅ | `hub-sop.html` |
| **Plan Schedule** (block list — distinct from Studio Schedule above) | ❌ none | — |
| **Cashflow — Overview / Invoices / Reconciliation / Bank Transactions / Tax / Forecast** (6 screens; Tax + Forecast are net-new, registered 2026-08-04) | ❌ none | — |
| **Workout Templates** | ❌ none | — |
| **Templates** (document templates list) | ❌ none | — |
| **Client Progress tab** | ❌ none | — |
| **Client Training History tab** | ❌ none | — |
| **Client Resources** (per-client portal-resource toggle — currently buried in Edit, see below) | ❌ none, doesn't exist as its own screen yet | — |
| Sidebar nav structure itself | ⚠️ stale — predates Finance/Cashflow group entirely and the current Resources group | `hub-dashboard.html`'s embedded `.hs-*` sidebar |

**Net: the Cashflow module was deliberately built without a design pass** (flagged explicitly in its own Work Order's DONE checklist as "no new mockup exists for this — flag any deviation rather than freelancing a new visual language"). This brief is that flagged follow-up.

## Part 1 — Navigation restructure

**Current sidebar groups** (`app/hub/(protected)/HubSidebar.tsx`):

```
Overview   → Dashboard, Schedule, Plan Schedule, Tasks
Clients    → Clients
Documents  → All Documents, Templates
Reports    → Email Updates, Medical Tracker
Finance    → Overview, Invoices, Reconciliation, Bank Transactions
Resources  → Exercise Library, Workout Templates, Process & Quality, Site Review, Site Content
Settings   → Training Rules, Studio Equipment, Plan Agent Rules
```

**Problems identified:**

1. **"Schedule" and "Plan Schedule" are easy to conflate** despite being genuinely different things — Schedule is a day-by-day calendar of individual booked *sessions* across the studio; Plan Schedule is a flat list of every client's training *block* (start date + approval status). Neither page cross-links to the other or clarifies the distinction in its subtitle. **Recommend renaming "Plan Schedule" to something that doesn't share the word "Schedule"** — e.g. "Training Blocks" or "Block Plan" — and adding a one-line subtitle on each page pointing at the other ("See Schedule for individual session times").
2. **"Resources" the nav group mixes two unrelated concepts**: client-training content (Exercise Library, Workout Templates) and internal site/ops tooling (Process & Quality, Site Review, Site Content). This is likely part of why Craig can't mentally locate "resources applied to a client" under this group — it doesn't contain that at all (see Part 3).
3. **7 top-level groups is a lot** for a single-user (Esther) + occasional-admin (Craig) hub. Worth asking the design tool to propose a flatter or better-grouped structure once Cashflow/Plan Schedule/Resources are accounted for — this brief intentionally doesn't prescribe the final grouping, since that's a genuine IA design decision, not a mechanical fix.

**Ask of the design tool:** propose 1-2 alternative sidebar structures that (a) resolve the Schedule/Plan Schedule naming collision, (b) separate client-training resources from internal-ops tooling, (c) give Cashflow's 4 screens a nav treatment consistent with the rest of the sidebar (it already has its own "Finance" group, which is fine — just make sure the group's visual weight/icon choice matches the others once the icon audit below is resolved).

## Part 2 — Cashflow module (first design pass)

6 screens now (2 added 2026-08-04, see below), all currently built against `components/hub/` primitives only, with zero mockup to check against:

- `/hub/cashflow` — overview dashboard (outstanding/overdue totals, recent activity, and — once the new Work Order below lands — a headline tax-liability figure + forecast summary)
- `/hub/cashflow/invoices` — invoice list + creation flow (client picker → template picker → line-item table → send/save-draft)
- `/hub/cashflow/reconciliation` — suggested transaction-to-invoice matches, confirm/dismiss
- `/hub/cashflow/transactions` — bank statement upload/review/commit; will gain a per-row expense-category dropdown (new)
- **`/hub/cashflow/tax` (new, not yet built)** — estimated tax liability for the current UK tax year: income minus categorized allowable expenses → Income Tax + Class 2/4 NIC, mirroring the calculation the Decoded Ops hub already does. Needs a clear "estimate only, not a substitute for an accountant" disclaimer treatment — this is a real number Esther could act on.
- **`/hub/cashflow/forecast` (new, not yet built)** — a 12-month cash flow forecast: month-by-month opening/income/expenses/closing balance, built from unpaid invoices (expected income) + pending bills (expected outgoings) + a starting balance minus the tax reserve. Framed as "what's coming in and going out," not a startup-style "running out of cash" runway — this is a healthy business, the calculation shape is borrowed from DO hub, not the anxious framing. Should still visually flag a month if the projected balance would go negative, but that's a safety-net detail, not the headline.

Full spec for these two new screens: `.context/workorder-cashflow-tax-forecast-2026-08-04.md` (registered Work Order, not yet built — good timing for the designer to work in parallel with implementation).

**Important context for the designer:** this was deliberately built *not* to copy the Decoded Ops hub's cashflow pattern (that pattern is a flat-amount, hand-edited-HTML invoice with no real line items and no email-send route — the exact workflow Craig was trying to get away from). The data model here is genuinely relational (`invoices` → `invoice_line_items`, real status lifecycle draft/sent/paid/overdue/void). **Don't mockup toward the DO hub's visual style if that means flattening the line-item UI back down** — the brief is for a fresh visual design against the existing data richness, not a port of DO hub's screens.

Dummy/demo data has been seeded into all 4 screens in prod (tagged `[DEMO DATA]`, safe to review live) so the designer/design tool can see real populated states rather than empty tables.

## Part 3 — New client-profile tabs needing mockups

`hub-client-detail.html` covers 6 tabs: Overview / Profile / Compliance / Training / Plan Agent / Updates.

The live client detail page (`app/hub/(protected)/clients/[id]/ClientDetailTabs.tsx`) now has **9**: `overview, profile, compliance, training, progress, training-history, plan-agent, updates, tasks`.

**3 tabs have no design coverage at all:**
- **Progress** — trend view / PB tracking across live + historical (Trainerize-imported) training data
- **Training History** — historical blocks/notes from the Trainerize import
- **Tasks** — per-client task panel

**Plus a genuinely missing piece Craig flagged: there is no "Resources" screen on the client profile.** The per-client toggle for portal resources (currently just Calorie Calculator + Showdown Soundboard) exists only inside the client **Edit** form — nowhere read-only/visible on the profile itself, so there's no way to glance at a client and see what's enabled for them. Recommend the design tool either (a) add a 10th tab, "Resources," showing enabled/disabled state per resource with a link into Edit to change it, or (b) surface it as a small read-only card on the existing Overview tab if a full tab feels like overkill for a 2-item list today (it may grow). Flagging both options rather than dictating — this is a product-shape decision, not a coloring decision.

## Part 4 — System-wide component inconsistencies (found via live code audit, cite exact locations)

These affect the design system, not just Cashflow, so should be resolved once at the component level and then reflected everywhere in updated mockups.

### 4a. Icon-badge sizing — 4 different patterns in live use

- `HubCardHeader` (shared component, most common): 30×30px badge, 16px icon
- `KpiTile` (shared component, stat tiles): 44×44px badge, 20px icon — plus one hand-copied duplicate on the dashboard that doesn't even use `KpiTile`
- Templates list-row badge (one-off inline): 36×36px badge, 20px icon
- Exercise Library / Workout Templates filter-toolbar badge (one-off inline, both pages): 32×32px badge, 16px icon
- Client-initials avatar circles: 3 different sizes in use (48px on client detail/edit, 40px on list rows, 36px in the update-compose chat panel) for what's visually meant to be the same affordance

**Ask:** pick one badge scale per context (page-header icon, stat-tile icon, list-row avatar) and apply it everywhere — currently every one of these is a different one-off measurement.

### 4b. Search bar / filter pill / dropdown — no single pattern

- `HubTable` (shared component) provides a built-in search input, used by Clients, Documents, and Plan Schedule.
- Every page using `HubTable` still hand-rolls its own filter `<select>` dropdowns as copy-pasted inline JSX (same class string repeated 6+ times across Clients and Documents alone) rather than a shared dropdown component.
- **Plan Schedule wraps the whole `HubTable` (search bar included) inside a `HubCard`/`HubCardHeader`** — the one place this happens. Every other `HubTable` page renders the search bar directly on the page canvas, not inside a card. This is Craig's "search bar is part of a card" observation, confirmed.
- **Email Updates (`/hub/reports/updates`) doesn't use `HubTable` at all** — it has its own bespoke search input, plus a **segmented pill/toggle control** (e.g. for filtering by update type) that has no equivalent anywhere else in the hub, plus its own dropdown with different height/border styling than the Clients/Documents dropdowns.
- Cashflow's Reconciliation and Bank Transactions pages have no search/filter toolbar pattern at all today.

**Ask:** design one canonical search+filter toolbar (search input + dropdown(s) + optional pill/segment control as a single reusable pattern) and show how it adapts across a data-table page (Clients/Documents/Plan Schedule), a card-embedded list (Email Updates), and the two Cashflow screens that currently have nothing. This is the biggest system-level ask in this brief — most of Craig's "everything looks slightly different" impression traces back to this one gap.

### 4c. Email Updates spacing

The "Click a row to preview the email" subtitle sits only 2px below the "Updates" card title (`mt-0.5`) — tighter than it reads visually against the divider line below it. Minor, but worth a pass while the component is being touched anyway for 4b.

## Deliverables requested

1. Updated sidebar nav mockup(s) — at least one proposed restructure per Part 1.
2. 6 Cashflow screens (overview, invoices, reconciliation, transactions, tax, forecast) — first design pass, informed by the live seeded demo data. Tax and Forecast are still mid-build (Work Order registered 2026-08-04) — fine to design against the spec ahead of the code landing.
3. Updated `hub-client-detail.html` (or new tab-specific files) covering Progress, Training History, and Tasks tabs, plus a Resources tab/card treatment per Part 3.
4. One new "Plan Schedule" (or renamed equivalent) mockup, distinct from the existing `hub-schedule.html`.
5. A component-level spec for the unified search/filter/pill toolbar (Part 4b) and the icon-badge scale (Part 4a), shown applied to at least 3 existing pages so the pattern's flexibility is visible.

Everything above is scoped as **design only** — implementation would be a separate Work Order once mockups are approved, per the project's usual Design Parity Gate process.
