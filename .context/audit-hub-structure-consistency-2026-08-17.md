# Hub structure & design-consistency audit — 2026-08-17

**WO:** `wo-ef-hub-structure-consistency-2026-08-17` · **CRs raised:** CR-EF-038–041
**Companion doc:** `request-opendesign-mockup-version-control-2026-08-17.md` (the actionable
hand-to-Open-Design piece). Sources: full code census of `app/hub/**` + two-way reconciliation of
every mockup in `D:\apps\design-systems\ef-control-hub` against live routes. All claims verified
against code with file:line references (kept in the working notes; headline numbers here).

---

## TL;DR

Craig's instinct is correct on all three counts:

1. **The "mishmash" is real and countable.** 8 distinct accordion implementations (the official
   shared one has *zero* usages while a local copy of it is used 9×), 5 competing card styles,
   6 tab/segment styles (3 of them hand-retyped copies of the shared component that have drifted),
   28 hand-rolled tables vs 5 uses of `HubTable`, page titles in 4 sizes, KPI bands in 6 grid
   recipes. Desktop and mobile share **zero** components and zero class names — the same concepts
   exist twice under different names (`HubCard`≡`.panel`, `StatusBadge`≡`.pill`, `EmptyState`≡`.empty`).
2. **The card-height problem has one root cause.** `h-full` is never applied to a card anywhere in
   the hub, no card is `flex flex-col` with a `flex-1` body, and three 2-col layouts explicitly opt
   out with `items-start`. Grids either stretch cards that don't fill (dead space inside) or don't
   stretch at all (ragged bottoms). Worst offenders: `/hub` dashboard, `/hub/process-quality`,
   `/hub/templates` grid view, `/hub/cashflow`, client documents.
3. **The right rail is per-page improvisation.** 4 different widths (280/300/340px/⅓-col), 4
   different collapse breakpoints, sticky on exactly one page, and no shared rail component exists.
   The hub's only two Quick Actions panels use *opposite* visual variants of the same component.
   That is precisely why the area feels "lost".

Separately, the mockup library needs the version-control pass Craig asked for: 2 confirmed
superseded mockups still sitting next to their replacements, 7 root-level strays outside the
category folders, a stale catalogue (`index.html`) missing ~20 files, 1 pure-concept mockup with
zero code behind it, and the drift-detection tool (`verify-hub-pages.js`) **hard-crashes on
launch** since the folder reorg — it has been silently dead. Details + the full canonical/retire/
relocate/refresh lists are in the companion request doc.

One correction to the instinct, in fairness to Open Design: the big "speculative" categories
mostly *aren't*. All 6 cashflow mockups, resources, integrations and the medical tracker map to
real live routes. The genuinely inventing-functionality cases are two site-content screens (one
partially overlaps `/hub/web-admin`, one has zero code anywhere) and the single-SOP document view.

---

## 1. Pattern census (the numbers behind "mishmash")

| Pattern | Distinct implementations | Canonical adoption |
|---|---|---|
| Accordions / disclosure | **8** (native `<details>` ×2 styles, 2 local components, 3 useState/CSS variants, sidebar) | Shared `HubSection collapsible`: **0 uses**; local `CollapsibleSection` copy: 9 uses on one page |
| Cards | **5** (`HubCard` 16px, shadcn `Card`, ad-hoc `rounded-2xl`, ad-hoc `rounded-xl` 12px, hand-typed shadows) | `HubCard` in 52 files — but ~20 files still build their own |
| Tabs / segments | **6** (Radix+`HubTabs`, 2 hand-retyped copies, `Toolbar` segments, `ScheduleShell` toggle, version tabs) | `HubTabsList`: **1 use** |
| Tables | **3** systems | `HubTable` 5 files vs 28 raw `<table>` + 2 shadcn |
| Page headers | **4** title sizes | `HubPageHeader` 20 pages; raw `<h1>` 20 pages |
| KPI bands | Same tile, **6** grid recipes + 2 full local rebuilds | `KpiTile` 8 files |
| Status pills | `StatusBadge` 21 files + **19 raw hand-built pills** across 10 files | — |
| Chevron direction | **3 contradictory conventions** (rotate-180, rotate-90, −rotate-90) | — |

Also load-bearing: broken deep-links — `agreements` pages link to
`/hub/clients/[id]?tab=profile-compliance`, a tab that isn't in `VALID_TABS`, so all three links
silently land on Overview (CR-EF-038).

## 2. Card heights — the actual mechanics

Two failure modes, both fixable with one card contract:

- **Stretched-but-hollow:** grid default stretch makes the card tall but nothing inside grows —
  no hub card is `flex flex-col` with a `flex-1` body, so the extra height is dead space at the
  bottom. (Dashboard 2-col and 3-col bands; process-quality overview; templates grid.)
- **Deliberately ragged:** `items-start` on cashflow, client edit, exercise library.

**The fix is a rule, not a redesign:** every card in a multi-column band is
`flex h-full flex-col` with its scrollable/list body `flex-1`, and bands never use `items-start`
without a stated reason. One shared `HubCard` variant + a sweep.

## 3. Right rail & navigation (Craig's "promote the quick actions" idea)

Current state: rails at 280px/`lg` (client detail, not sticky), 300px/`1100px` (edit, sticky),
340px/`xl` (cashflow), ⅓-col (dashboard, comms tab); no shared component; `HubQuickActions` has
exactly 2 call sites using its two different variants.

**Recommendation — make the rail a first-class shell concept, not per-page furniture:**

- One shared `HubRail` primitive: fixed width, one breakpoint, sticky by default, consistent
  card stack — used by every page that has one.
- Promote Quick Actions into the rail's **top slot on every major surface** (dashboard, client
  detail, block, schedule) with one visual variant, context-aware actions per page. This is the
  cheap version of Craig's "use it for navigation" idea and can ship as part of the consistency
  sweep.
- The more ambitious version (rail as persistent navigation layer across the whole hub) is an
  IA change — worth an Open Design concept pass *after* the consistency sweep, not before,
  or it will be designed against today's inconsistent baseline. Registered as CR-EF-040's
  second phase; nav design docs (`hub-nav-reconciliation-v1.html`) are the starting point.

## 4. Desktop ↔ mobile split

The mobile PWA (`app/hub/m/**`, `mobile.css`, 609 lines of parallel CSS) re-implements every
shared concept under different names with its own token aliases. Any consistency fix applied to
desktop does not reach mobile. Full unification is **not** recommended right now (the PWA works
and is Esther's daily driver); instead: (a) the new session **status pill** ships as one shared
component consumed by both (it's the prerequisite all four fresh mockups assert), and (b) the
Trainerize-informed PWA redesign (workout WO) is the natural moment to move mobile onto shared
primitives. Don't do a big-bang merge before that.

## 5. Gate-review notes on tonight's 5 fresh Open Design revisions

Reviewed against `brief-workout-unification-opendesign.md` (all five delivered 17 Aug evening —
`hub-block-module.html`, `scheduling/hub-schedule.html`, `training/hub-session.html`,
`clients/hub-client-sessions-tab.html` (new), plus a touch to `hub-client-detail-refined.html`):

**Direction: faithful to the brief.** Derived Mon–Sun weeks with "Plan week" fallback and
scheduling promoted onto the block page; the 5-state pill used identically across all four;
completed read-only with an audited Reopen dialog; one primary action per status on the calendar;
cancelled sessions hidden behind a toggle and rendered with their logged data ("not one fact
hidden"); the sessions tab shows scheduled-primary/completed-secondary dates and inline logged
evidence including the cancelled-with-31-sets case. No invented functionality found — the one
"New to the hub UI" element (block Summary field + status override in the edit drawer) is real,
`EditBlockDrawer.tsx` already ships that copy.

**Flags before Craig signs G2:**
1. **The shared 5-state pill component doesn't exist in code yet** — all four mockups depend on
   it; it's the first build unit.
2. **`hub-schedule-month.html` (month view) was NOT revised** — still shows the old
   booked/ready/clash legend. Same for `hub-block-review.html` and mobile `hub-m-train.html`.
   Either revise them to the pill language or accept temporary divergence knowingly.
3. The schedule mockup's "show cancelled" toggle needs a query change
   (`schedule/page.tsx` currently excludes cancelled rows at the DB level).
4. `hub-session.html` embeds a workflow decision — "Edit session" lands directly in edit mode
   (no read-only interstitial). Fine, but it's Esther's workflow; confirm deliberately.
5. Reopen/409-conflict/"live on phone" states are designed but entirely unbuilt — they land with
   the workout WO's Phase 1, not before.

## 6. What happens next (proposed lanes, in order)

| Lane | What | Rides |
|---|---|---|
| A | **Open Design version-control pass** — Craig hands the companion request doc to Open Design; register cleaned, index regenerated | CR-EF-041 |
| B | **Shared primitives build:** session status pill (5-state, desktop+mobile), `HubRail`, card height contract, one accordion, one tab component | CR-EF-039 |
| C | **Consistency sweep** page-by-page onto the primitives (tables→HubTable, headers→HubPageHeader, pills→StatusBadge, kill local copies incl. dead `HubSection`) — mechanical, OpenCode-lane-shaped once B lands | CR-EF-039 |
| D | **Fix `verify-hub-pages.js`** (recursive walk, subfolder join table, ~20 missing rows, try/catch) so drift detection is alive again — then it *enforces* A | CR-EF-041 |
| E | Broken `?tab=profile-compliance` deep-links | CR-EF-038 |
| F | Rail-as-navigation IA concept (Open Design, after C) | CR-EF-040 |

Boundary: everything training/workout-surface-specific (the 5 fresh mockups' build) stays with
`wo-ef-workout-consolidation-pwa-2026-08-15`; this WO owns the cross-cutting primitives and sweep.
The status pill sits in both — build it once under this WO's Lane B, consume it there.
