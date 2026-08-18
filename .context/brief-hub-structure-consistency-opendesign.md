# Design brief: hub structural consistency — shared primitives, quick-actions placement, accordion-first density (for Open Design)

**Extends:** `wo-ef-hub-structure-consistency-2026-08-17` · **CRs:** CR-EF-039 (shared primitives + sweep), CR-EF-040 (rail/navigation)
**Evidence base:** `audit-hub-structure-consistency-2026-08-17.md` (full pattern census + card-height root cause,
mirrored into this project's `eternal-fitness-website/.context/`) — read that first for the numbers behind
every claim below. This brief is the revised ask that supersedes CR-EF-040's original "promote Quick Actions
into the existing right rail" framing, per Craig's direction 2026-08-18.

This is a **functionality + layout brief**, not a full visual redesign — the existing hub visual language
(colours, type, `HubCard`/`StatusBadge` styling) stays. What's being asked for is structural: one accordion
pattern, one rail treatment repositioned, and a real design decision on how far desktop/mobile unification
should go.

---

## The problem, in one paragraph

The hub has 8 different accordion implementations (the official shared one has **zero** usages while a local
copy is used 9× on one page alone), 5 competing card styles, 6 tab/segment styles, 28 hand-rolled tables vs
5 uses of the shared `HubTable`, page titles in 4 sizes, and 4 different right-rail widths/breakpoints with
no shared rail component. Desktop and mobile share **zero** components and zero class names for the same
concepts (`HubCard`≡`.panel`, `StatusBadge`≡`.pill`, `EmptyState`≡`.empty`). Card heights break for a
specific, already-diagnosed reason (no card anywhere uses `flex flex-col` + `flex-1` body) — that fix is a
rule, not a design decision, and doesn't need Open Design's input; it's listed here for context only.

Three things need an actual design pass, all from the same underlying complaint: **too many surfaces, too
much competing information density, and the one navigational aid (Quick Actions) is buried where it can't
help.**

---

## 1. Quick Actions — move to top-left / most-prominent position, not just "promoted"

The original ask (CR-EF-040 phase 1) was to promote Quick Actions into the existing right rail's top slot —
same side, just first in the stack. **Craig's correction, 2026-08-18: that doesn't go far enough.** Quick
Actions should move to the **top-left**, the most prominent position on the page, not stay on the right
buried below other cards.

Concretely:

- Every major hub surface that currently has a right rail (dashboard, client detail, block, schedule) should
  have its primary action set relocated to a top-left position — above or beside the page header, not below
  a stack of informational cards on the right.
- This is a genuine layout change, not a restyle. Show what happens to the content that currently occupies
  that top-left space (page title/breadcrumb area) — does the action set sit alongside the header, above it,
  or does the header itself get restructured around it? Propose the option that reads clearest; flag
  trade-offs rather than picking silently.
- The right-hand rail doesn't disappear — it keeps whatever non-action content it currently carries
  (activity feeds, related-info cards); only the actionable Quick Actions panel moves.
- One shared component either way (the underlying ask from CR-EF-040 stands): one visual variant, reused on
  every surface that has one, not per-page improvisation. Today there are 4 different rail widths
  (280/300/340px/⅓-col) and only 2 real Quick Actions call sites using 2 *different* variants of the same
  component — that inconsistency is exactly what needs to go.

## 2. One accordion pattern, closed by default, top section expanded

Craig's diagnosis: the hub shows too much at once and it's overwhelming to scan. The fix isn't less data —
it's progressive disclosure via one consistent accordion pattern:

- **Every tab/page that currently shows multiple information sections uses the same accordion component** —
  not the 8 different implementations currently in play (native `<details>` in two styles, two local
  components, three useState/CSS variants, plus the sidebar's own). The official shared `HubSection
  collapsible` variant already exists in code with zero current usages — start there rather than inventing a
  ninth pattern.
- **Closed by default**, except the top/first section, which stays **open by default** and should show the
  single most important piece of information for that page — the thing Esther actually came to check. What
  counts as "the key info" differs per page (client detail's top section is probably compliance/status at a
  glance; a block page's is probably current-week progress) — make an explicit call per page you touch and
  say what you picked and why, don't leave it generic.
- The rest of the sections stay collapsed until Esther opens them. This is the direct fix for "so much
  information it's overwhelming" — she sees one thing by default and expands what she needs.
- Apply this to every hub page currently identified in the audit as having 2+ competing card/section styles,
  not just a couple of examples — this needs to read as one pattern hub-wide, not a spot-fix.

## 3. Desktop ↔ mobile unification — treat as a real target, not deferred

The original audit recommended holding off on merging desktop and mobile (`app/hub/m/**`, a 609-line parallel
CSS file, zero shared components today) until the separate Trainerize-informed PWA redesign lands, on the
grounds that the mobile PWA works today and is Esther's daily driver — don't risk a big-bang break.

**Craig's correction, 2026-08-18: unification should be a real design goal now, not indefinitely deferred.**
The instruction is to minimise the number of distinct surfaces Esther (and future maintainers) have to learn,
not to accept "desktop has its version, mobile has its version" as permanent.

What this means for this design pass specifically:

- The shared primitives coming out of §1 and §2 above (Quick Actions placement, the accordion pattern, the
  session status pill already agreed as shared) should be designed with **both** desktop and mobile
  treatments from the start, using the same underlying concept and interaction model even where the visual
  chrome necessarily differs by screen size — not desktop-first with mobile as an afterthought.
- This does **not** mean redesigning the mobile Train Screen / live-logging flow in this pass — that's
  explicitly the separate Trainerize-informed PWA redesign (a live capture session already happened
  2026-08-18; see that WO's own brief when it's written up). This pass is about the *structural* surfaces —
  navigation chrome, quick actions, information density — not the workout-logging UX itself.
- Where a genuine full merge isn't practical yet (e.g. the mobile PWA's own navigation model), say so
  explicitly rather than forcing a fake unification — but the default assumption going in should be "how do
  we share this," not "these are separate."

---

## What NOT to do

- Don't redesign colours, typography, or the overall visual language — this is a structural/IA pass on top
  of the existing look.
- Don't touch the mobile workout-logging screens (Train Screen, session edit sheet) — separate redesign,
  separate brief.
- Don't invent new functionality. Every section, card, or panel you place should map to something that
  already exists in the live app — reconcile against the real routes/components named in the audit doc, not
  against assumption.
- Don't silently drop the right rail's non-action content when moving Quick Actions — carry it forward,
  just without the action buttons.

## Handback expectations

Same standing rules as every other Open Design pass on this project (`request-opendesign-mockup-version-control-2026-08-17.md`
§6): one canonical file per screen revised in place, register (`index.html`) updated in the same pass,
archive rather than delete anything superseded, flag every deliberate deviation from "what the live page
already does" rather than letting it go unstated.
