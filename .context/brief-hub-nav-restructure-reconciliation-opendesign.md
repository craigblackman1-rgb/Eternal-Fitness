# Reconciliation brief: hub nav restructure vs. what's actually shipped (for OpenDesign)

This is a **functionality + constraints spec**, not a visual spec — no layout, colour, or component
opinions here. Hand this to OpenDesign to produce a revised mockup; bring it back and I'll implement it.

Scope-of-works §2.6. Not part of `wo-ef-workout-consolidation-pwa-2026-08-15` — standalone.

## What this is

`hub-nav-restructure.html` (`ef-control-hub/desktop/design-system/`) proposes **two alternative nav
restructures, Option A and Option B**, and was drawn before two things happened:

1. **Desktop sidebar grouping/collapse already shipped** (2026-08-06, `HubSidebarNav.tsx`) — 7 labelled
   groups (Overview, Clients, Client Library, Documents, Finance, Reports, Studio Admin), each
   collapsible, "Studio Admin" collapsed by default, whichever group holds the current route
   force-expands. This borrowed the collapse *mechanic* from the mockup but it was never confirmed
   which of Option A or B (if either) this fully matches, or whether it's a hybrid.
2. **A completely separate mobile bottom-tab bar shipped** (2026-08-10, `MobileShell.tsx`,
   `/hub/m/*`) — just 3 tabs: Today, Train, Clients. This is a deliberately narrow, different surface
   (thumb-reachable, in-studio use) with no obvious mapping back to the desktop sidebar's 7 groups /
   ~20 items — it wasn't designed *from* either nav-restructure option, it was designed fresh for the
   mobile PWA work.

Nothing has actually reconciled these three things against each other: the original two-option mockup,
the desktop sidebar that shipped since, and the mobile tab bar that shipped since. This brief asks for
that reconciliation, not a fresh nav design from scratch.

## What OpenDesign needs to do

1. **Look at what's actually live** — `HubSidebarNav.tsx`'s current 7 groups (listed below) and
   `MobileShell.tsx`'s 3 tabs — against the two proposed options in `hub-nav-restructure.html`.
2. **Confirm or revise which option (A, B, a hybrid, or neither) the current desktop sidebar actually
   matches**, now that real items have grown past whatever was in the original mockup.
3. **Decide, and show in the mockup, how the mobile 3-tab bar relates to the desktop grouping** — is
   it meant to be a fixed, permanently-narrow subset (just the 3 highest-frequency actions, everything
   else reached some other way on mobile), or should more of the desktop groups eventually surface on
   mobile in some form? If the answer is "mobile stays exactly as narrow as it is, by design, forever,"
   say so explicitly in the mockup rather than leaving it implicit — that's a real answer, not a
   non-answer.
4. **Produce one updated, current nav mockup** (desktop + mobile together, since they're now shown to
   be related, not independent) rather than leaving Option A vs B open — pick one and revise it against
   what's real today.

## Current desktop groups (for reference, not to be treated as fixed)

- **Overview** — Dashboard, Studio Schedule, Tasks
- **Clients** — Clients, Training Blocks, Portal Resources
- **Client Library** — Exercise Library, Workout Templates
- **Documents** — All Documents, Templates
- **Finance** — Overview, Invoices, Reconciliation, Bank transactions, Tax, Forecast
- **Reports** — Email Updates, Medical Tracker
- **Studio Admin** *(collapsed by default)* — Process & Quality, Training Rules, Studio Equipment, Plan
  Agent Rules, Integrations, Web Admin

## Current mobile tabs (for reference)

Today, Train, Clients — that's the entire mobile nav surface, everything else on `/hub/m/*` is reached
from within those three (e.g. via the Clients tab's client detail, not a dedicated nav entry).

## Constraints / things to preserve

- Desktop force-expand-on-active-route and default-collapsed-Studio-Admin behaviour should carry
  forward unless there's a specific reason to change it — it was a deliberate fix (2026-08-06), not an
  accident.
- Mobile's 3-tab simplicity is a deliberate design choice for in-studio, one-handed use — don't treat
  "mobile only has 3 tabs" as a gap to fill in by default; only add to it if there's a genuine
  frequently-needed action currently unreachable from the 3 tabs.
- This app's design system (colours/type/components) is already established across every hub screen —
  this brief is about information architecture (what's grouped where, what's on mobile vs desktop), not
  a visual refresh.

## Out of scope (don't design for these)

- Any new hub feature/page — this is purely reorganising navigation to existing pages.
- Redesigning individual hub screens — only the nav chrome (sidebar + mobile tab bar) is in scope.
