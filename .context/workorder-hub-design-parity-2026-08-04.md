# Work Order: Hub Design Parity — Nav, Toolbar/Icon System, Cashflow Screens, Resources, Client Detail — 2026-08-04

OWNER: claude (this session) — claimed 2026-08-04T13:00Z
SCOPE: eternal-fitness-website (components/hub/*, app/hub/(protected)/HubSidebar.tsx, app/hub/(protected)/cashflow/**, app/hub/(protected)/plan-schedule → training-blocks rename, new app/hub/(protected)/resources, app/hub/(protected)/clients/[id]/** overview rail only, app/hub/(protected)/schedule subtitle only) — no other app touched. Built in the same worktree as wo-cashflow-tax-forecast-2026-08-04 (`D:\apps\worktrees\eternal-fitness-website\cashflow-tax-forecast-2026-08-04`) since Lanes A/B of that WO are direct foundations here.

GOAL: implement the 11 new/updated OpenDesign mockups Craig supplied 2026-08-04 (hub-nav-restructure, hub-toolbar-icon-spec, hub-cashflow-{overview,invoices,reconciliation,transactions,tax,forecast}, hub-training-blocks, hub-resources, hub-client-detail) as real code — the shared toolbar/icon components, the nav restructure, all 6 cashflow screens (2 of which, Tax and Forecast, need their underlying feature built too, not just styled), the renamed Training Blocks page, the brand-new Portal Resources page, and the client-detail Resources rail card.

MUST:
- **Build the two foundational shared components FIRST** (Lane 1) — every other lane in this WO consumes them:
  - `components/hub/Toolbar.tsx` — search input (always) + 0-N filter dropdowns + optional segmented pill control, canvas-level by default (rendered above the card, not inside `HubCard`), with a card-embedded variant for the Email Updates pattern. Exact spec: `hub-toolbar-icon-spec.html` `#toolbar` section (`.tb`/`.tb-search-wrap`/`.tb-select`/`.tb-seg`/`.tb-count` classes — port the visual spec, not the literal class names, into Tailwind).
  - Icon-badge sizing — resolve `HubCardHeader`'s badge to **30×30px, 16px icon, 8px radius** (already correct, keep), `KpiTile` to **44×44px, 20px icon, 12px radius** (already correct, keep — also fix the one hand-copied dashboard KPI band that skips `KpiTile`, per the design-brief's original 4a finding), and standardize every **row avatar** (client list rows, dashboard feeds, any repeated-row initials circle) to **32×32px**, and the **client-detail hero avatar** to **48×48px** (named exception, single non-repeated subject), and **chat-message avatars** (Plan Agent, Email Updates compose) to **24×24px** (named exception, inline conversation UI only). Fix the Templates list-row badge (currently 36×36/20px → 30×30/16px) and Exercise Library/Workout Templates toolbar badges (currently 32×32/16px → 30×30/16px).
- **Nav restructure: Option A** (the brief's own recommendation, lower disruption) — see `hub-nav-restructure.html`. Do not build Option B. Rename "Plan Schedule" → "Training Blocks", move it under the Clients group. New "Client Library" group (Exercise Library, Workout Templates) split out of old "Resources". Old Resources' ops items (Process & Quality, Site Review, Site Content) merge into a renamed "Studio Admin" group alongside old Settings items. Finance group keeps its existing 4 items plus Tax (already added by Lane B of the sibling WO) and Forecast (add once Lane 8 below lands). Add the two subtitle cross-links verbatim from the mockup: Studio Schedule → "Every booked session across the studio. See Training Blocks for each client's block start date and approval status." / Training Blocks → "Every client's current training block. See Studio Schedule for individual session times."
- **"Sent" status token resolved as `warning`**, not the mockup's inconsistent mix of `b-primary`/`b-warning` for the same label — this matches the app's own existing real convention (`lib/hubStatus.ts` already maps `sent: { token: "warning", label: "Sent" }` for both documents and updates). Use this for invoice status everywhere in the new Cashflow screens; don't introduce a third, invoice-specific mapping.
- **Every "estimate" figure (Tax page, Forecast page, Overview's tax-summary-card and forecast-summary-card) carries the exact disclaimer text quoted in the mockups** — this is a repeated hard requirement across all 6 cashflow files, not decoration. Tax disclaimer and Forecast disclaimer have distinct wording — use each verbatim, don't merge them into one generic string.
- **Forecast is framed as "what's coming in and going out," never as a startup "runway to zero"** — this was confirmed with Craig already (see `workorder-cashflow-tax-forecast-2026-08-04.md`). The one projected negative month (if any) is a flagged row detail, never the page headline.
- Cashflow Overview, Invoices, Reconciliation, Transactions already exist and function (built 2026-08-03) — this WO is a **visual/structural redesign pass** on them, not a rebuild of their data logic. Reuse existing data-fetching code; change markup/styling to match the new mockups' card structure and the new shared Toolbar component.
- Tax page already exists and functions (Lane B, verified 2026-08-04) — this WO's Tax lane is **also visual-only**: reconcile the existing page's cards against the mockup's exact card set (`tax-headline`, `income-expense-card`, `income-tax-card`, `nic-card`, `total-card`) and copy, keep the existing calc logic untouched.
- Forecast does **not** exist yet functionally (Lane C of the sibling WO was never dispatched — folded into this WO's Lane 8 instead, to avoid building generic UI once and restyling it a second time). Build the calculation logic (`bills`/`cash_settings` migration, `lib/cashflow-forecast.ts` porting the Decoded Ops hub's monthly-bucket projection shape — unpaid invoices + pending bills + starting balance − tax reserve, see `D:/apps/decoded-ops-hub/src/app/api/cashflow/runway/route.ts` for the reference logic, pounds not pence, no owner_id/RLS) directly against the mockup's exact structure (`forecast-assumptions` tiles, `forecast-chart`, `forecast-table` with a "Goes negative" flagged row, disclaimer).
- Follow this repo's existing conventions throughout: `lib/supabase.ts` pg shim for reads, `createClient()`/`auth.getUser()` from `lib/supabase-server.ts` for route auth (real Better-Auth wrapper, verified in Lane A/B — not literal Supabase Auth), `components/hub/` primitives, Tailwind + CSS custom properties already defined in `app/globals.css` (map the mockups' hardcoded hex tokens to the equivalent existing `--hub-*`/`--status-*` variables, don't hardcode new hex values).
- Portal Resources is a **new page** at `/hub/resources` (check this path isn't already claimed — it isn't, per the current `HubSidebar.tsx` read earlier this session) — a cross-client matrix (every client × every entry in `lib/resources.ts`'s `RESOURCES` registry), read-only + "Manage" link into each client's Edit form (the actual toggle surface stays in Edit, per the mockup's own explicit framing — this page does not duplicate the toggle UI).
- Client Detail gains a **rail card**, not a 10th tab, on the Overview tab only — matches the mockup's own explicit design rationale comment (2-item list today, a full tab would out-weigh its content; revisit as a tab if the resource list grows). Compact: resource name + enabled/disabled badge per row, "View all clients →" link to the new `/hub/resources` page, "Manage in Edit" link to that client's Edit page.

FORBIDDEN:
- Building Nav Option B — pick one (A), don't build both and let Craig choose after the fact; that's how "final grouping is a real IA call" turns into wasted work. If Craig wants B instead, that's a fast follow-up once he's seen A live, not a parallel build now.
- Touching `decoded-ops-hub` — read-only reference for forecast calc logic, same rule as the sibling WO.
- Rebuilding Cashflow Invoices/Reconciliation/Transactions/Overview's underlying data-fetching or business logic — visual/structural pass only, per MUST above.
- Touching the Tax page's calculation logic (`lib/cashflow-tax.ts`) — verified correct 2026-08-04, this WO only touches its presentation layer.
- Any Stripe/payment-processing, live bank OAuth, or VAT logic — same standing rules as both cashflow WOs.
- Deleting the old `/hub/plan-schedule` route outright if renamed — see DECIDE YOURSELF on the redirect approach.

DECIDE YOURSELF:
- Exact Tailwind class values implementing the mockups' pixel specs (this WO gives exact target measurements; translating to Tailwind's spacing scale, e.g. `w-[30px] h-[30px]` vs a scale value, is an implementation detail).
- Whether `/hub/plan-schedule` becomes a hard rename (new route `/hub/training-blocks`, old route removed) or gets a `permanent: false` redirect left behind — **default to a redirect**, matching this repo's own established pattern (PAR-Q/Agreement legacy routes, the `/blog` disable) for exactly this situation: an internal rename with low but non-zero risk of an existing bookmark/link.
- `/hub/resources` vs some other route name for Portal Resources, as long as it doesn't collide with the existing `Resources` nav-group items (Exercise Library etc. keep their own routes) — the page title itself should say "Portal resources" per the mockup, to visually disambiguate even if the route is short.
- Whether the Overview page's `tax-summary-card`/`forecast-summary-card` query the underlying tables directly or call the existing `/api/cashflow/tax/calculate` GET-latest pattern — follow whatever's more consistent with how the Overview page already reads its other KPIs.

ASK FIRST:
- None beyond what the sibling WO already flagged (starting balance is manual-entry, tax rates are hardcoded and need annual review, real bank data is still Monzo-format demo data not real HSBC). This WO is presentation + the forecast feature build, not new financial-risk surface.
- Standard gates apply: additive migrations (bills, cash_settings) can run [AUTO] against prod once reviewed by Claude, same pattern as Lanes A/B; anything destructive is a gate.

## DONE

- [ ] `components/hub/Toolbar.tsx` exists, used by at least 3 different page contexts (data-table canvas-level, card-embedded, cashflow) — matches all three demo frames in `hub-toolbar-icon-spec.html`
- [ ] Icon-badge sizing resolved to the 5 named roles (30/44/32/48/24) everywhere audited in the design brief + this WO — spot-checked across HubCardHeader, KpiTile, Templates list row, Exercise Library/Workout Templates toolbars, client avatars (hero/list-row/chat)
- [ ] `HubSidebar.tsx` matches Nav Option A exactly — group structure, renamed items, new Client Library/Studio Admin groups, Tax/Forecast in Finance
- [ ] Studio Schedule and Training Blocks pages carry the exact cross-link subtitle copy from the mockup
- [ ] Cashflow Overview restyled to the mockup's exact card set (KPI row incl. tax + forecast headline figures, recent-activity-card, tax-summary-card, forecast-summary-card, quick-actions-card), real data not hardcoded
- [ ] Cashflow Invoices restyled: canvas-level Toolbar, table matches mockup columns, new-invoice creation flow is a right-side drawer (client → template → line items → send/draft) replacing whatever the current creation flow is
- [ ] Cashflow Reconciliation restyled: canvas-level Toolbar added (page had none before), match-card layout matches mockup
- [ ] Cashflow Transactions restyled: canvas-level Toolbar added, existing per-row category dropdown (built in Lane A of the sibling WO) kept functionally as-is, restyled to match
- [ ] Cashflow Tax restyled to the mockup's exact 5-card structure, calc logic untouched, disclaimer text matches verbatim
- [ ] Cashflow Forecast built (bills/cash_settings migration, lib/cashflow-forecast.ts, forecast page) AND styled to the mockup's exact structure (assumptions tiles, chart, table with flagged-negative-month row, disclaimer text matches verbatim)
- [ ] `/hub/training-blocks` live (renamed from Plan Schedule), old route redirects, nav updated
- [ ] `/hub/resources` (Portal Resources) live — real cross-client matrix from `clients` + `lib/resources.ts`, summary cards with real percentages, Manage links work
- [ ] Client Detail Overview tab gains the Resources rail card, matching the exact 2-row + links structure from the mockup, real data for the client in view
- [ ] `npx tsc --noEmit` clean (no new errors vs. the pre-existing ~1116-error baseline — confirmed by diffing error count before/after each lane, not just "build succeeds")
- [ ] Every lane's diff reviewed line-by-line by Claude before merge — this project's standing rule after 4 prior OpenCode fabrication incidents (placeholder names, invented content, fake status badges, deleted real feedback text) — no lane ships on self-report alone

## LANES

- Lane 1 — Toolbar + icon-badge shared components · depends on: none — **build and merge this first, everything else depends on it**
- Lane 2 — Nav restructure (Option A) · depends on: Lane 1
- Lane 3 — Cashflow Overview restyle · depends on: Lane 1 (soft dep on Lanes 7+8 for real tax/forecast figures, can stub with "pending" state if those land later)
- Lane 4 — Cashflow Invoices restyle + drawer · depends on: Lane 1
- Lane 5 — Cashflow Reconciliation restyle · depends on: Lane 1
- Lane 6 — Cashflow Transactions restyle · depends on: Lane 1
- Lane 7 — Cashflow Tax restyle · depends on: Lane 1
- Lane 8 — Cashflow Forecast build + style · depends on: Lane 1
- Lane 9 — Cashflow Overview real-data wiring for tax/forecast cards · depends on: Lane 3 + Lane 7 + Lane 8
- Lane 10 — Training Blocks rename + restyle · depends on: Lane 1, Lane 2 (nav label)
- Lane 11 — Portal Resources new page · depends on: Lane 1
- Lane 12 — Client Detail Resources rail card · depends on: Lane 1

## UNITS

### Lane 1 — Foundational
- [AUTO] `components/hub/Toolbar.tsx` — files: new component + a barrel export update in `components/hub/index.ts` — VERIFY: rendered in at least one page this WO touches, visually matches the 3 demo frames
- [AUTO] Icon-badge audit fixes — files: `components/hub/HubCardHeader.tsx`, `components/hub/KpiTile.tsx`, dashboard hand-copied KPI block, Templates list row, Exercise Library + Workout Templates toolbar badges, client avatar instances (hero/list-row/chat) — VERIFY: grep for the old measurements confirms zero remaining, tsc clean

### Lane 2 — Nav
- [AUTO] `HubSidebar.tsx` restructure to Option A — files: `app/hub/(protected)/HubSidebar.tsx` — VERIFY: every route in the old sidebar still has a nav entry (no silently-dropped destination), diff reviewed against the mockup's exact group/item list

### Lane 3 — Cashflow Overview
- [AUTO] Restyle to mockup card set — files: `app/hub/(protected)/cashflow/page.tsx` and subcomponents — VERIFY: preview skill, real seeded demo data renders in every card

### Lane 4 — Cashflow Invoices
- [AUTO] Toolbar + drawer creation flow — files: `app/hub/(protected)/cashflow/invoices/**` — VERIFY: preview skill, create a draft invoice through the new drawer end-to-end

### Lane 5 — Cashflow Reconciliation
- [AUTO] Toolbar + restyle — files: `app/hub/(protected)/cashflow/reconciliation/**` — VERIFY: preview skill, existing confirm/dismiss actions still work

### Lane 6 — Cashflow Transactions
- [AUTO] Toolbar + restyle, keep Lane A's category dropdown — files: `app/hub/(protected)/cashflow/transactions/**` — VERIFY: preview skill, category dropdown still PATCHes correctly

### Lane 7 — Cashflow Tax
- [AUTO] Restyle to mockup's 5-card structure — files: `app/hub/(protected)/cashflow/tax/page.tsx` — VERIFY: preview skill, real calculated figures render in the new layout, disclaimer text matches verbatim

### Lane 8 — Cashflow Forecast
- [AUTO] Migration: `bills`, `cash_settings` — files: `supabase/migrations/2026080X_cashflow_forecast.sql` — VERIFY: Claude applies + confirms columns after review
- [AUTO] `lib/cashflow-forecast.ts` — port DO hub's monthly projection logic, pounds-based — VERIFY: hand-checkable against a small seeded scenario
- [AUTO] `/hub/cashflow/forecast` page — files: new page + components — VERIFY: preview skill, matches mockup's assumptions/chart/table structure, disclaimer verbatim

### Lane 9 — Overview real-data wiring
- [AUTO] Wire tax-summary-card + forecast-summary-card to real Lane 7/8 data — files: `app/hub/(protected)/cashflow/page.tsx` — VERIFY: figures match what Tax/Forecast pages themselves show, not independently computed

### Lane 10 — Training Blocks
- [AUTO] Rename + restyle — files: `app/hub/(protected)/plan-schedule/**` → `app/hub/(protected)/training-blocks/**`, `next.config.js` redirect, `HubSidebar.tsx` label (coordinate with Lane 2) — VERIFY: preview skill, old URL redirects, new URL matches mockup

### Lane 11 — Portal Resources
- [AUTO] New page + matrix logic — files: new `app/hub/(protected)/resources/**` — VERIFY: preview skill, real client × resource data, Manage links resolve to the right client's Edit page

### Lane 12 — Client Detail Resources rail card
- [AUTO] Overview tab rail card — files: `app/hub/(protected)/clients/[id]/page.tsx` (or its Overview panel component) — VERIFY: preview skill, real per-client resource state, both links resolve correctly

## LEDGER
Progress written to: `eternal-fitness-website/.context/state.md` + `handoff.md` as each lane ticks.
Live status: `eternal-fitness-website/.context/loop-status.md`

CONTEXT: Craig supplied 11 new/updated OpenDesign mockup files 2026-08-04 as the direct follow-up to `design-brief-hub-nav-cashflow-2026-08-04.md` (which this session wrote earlier the same day) plus the tax/forecast feature brief. Two research agents extracted full structural specs from all 11 files before this WO was written — nothing here is guessed from filenames. Supersedes the undispatched Lane C (forecast) and Lane D (dashboard integration) of `workorder-cashflow-tax-forecast-2026-08-04.md`, folding their functional-build scope into this WO's Lane 8/9 so the forecast feature is built once, directly against its real mockup, rather than built generically and restyled twice. Lanes A (categorization) and B (tax calc) of that sibling WO are already DONE + verified and are direct foundations this WO builds visual polish on top of. Nav Option A chosen over Option B per the mockup's own explicit recommendation (lower disruption, both real problems resolved) — not independently re-litigated here.
