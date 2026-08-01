# Work Order: Launch-page review follow-ups — 2026-07-30

OWNER: (empty until claimed)
SCOPE: eternal-fitness-website (public marketing pages — app/, components/Navbar.tsx, components/Footer.tsx, home.css and page-level CSS; no hub/, portal/, supabase/ changes)

GOAL: Every item surfaced by the 2026-07-30 in-browser launch-page review is either fixed-and-verified live, or explicitly parked on Esther/Craig's desk with the exact decision needed.
MUST: Match the site's existing "disabled, not deleted" pattern for anything being pulled from public view (see next.config.js redirect block). Don't touch the portal-only `/portal/calorie-guide` page — separate feature, out of scope. Follow DO-SOP-010 (worktree per unit, fast-forward push, never edit the shared checkout).
DECIDE YOURSELF: CSS fix approach for the badge clipping, exact wording tweaks that don't change meaning, which page to check first.
ASK FIRST: Any copy change to condition/health-related language, anything touching FAQ answer bodies, anything published to Esther-facing content — these need her voice sign-off per CLAUDE.md hard rules, not just a code fix.

## DONE (ticks to zero = stop condition)
- [x] Duplicate page-title bug fixed (About/Personal Training/Pricing/FAQs/Cookies/Privacy/Terms) — shipped `350e586`
- [x] Dead footer "Specialist Training" link fixed (was `/exercise-for-health`, a redirect-to-home dead end) — shipped `350e586`
- [x] Calorie Calculator pulled from nav/footer, route redirected to home — shipped `350e586`
- [ ] Hero "L4 QUALIFIED" badge text no longer clips inside the circle, checked at desktop + mobile widths
- [ ] Homepage "How I Actually Train You" (01/02/03) scroll-pinned section confirmed rendering all 3 steps on a real slow scroll (not just jump-scroll)
- [ ] Contact form: submit validation confirmed working (empty required fields blocked, real submit path not accidentally triggered during the test)
- [ ] Full 7-page pass re-checked at mobile viewport (375px) — nav, hero badge, footer columns
- [ ] Condition-roll-call copy on Home/Personal Training "Specialist Training" teaser reviewed against the hard rule — either reworded or explicitly accepted as-is by Craig/Esther
- [ ] Blog (27 legacy posts) launch-scope decision made (noindex / curate subset / post-launch rewrite)
- [ ] FAQ answer bodies (~15 of 17 remaining) rewritten against voice.md
- [ ] About "Real Story" wording confirmed verbatim by Esther (sourced from a third-party-published interview)
- [ ] Google Reviews shortlist in stories.md confirmed by Esther for public use

## LANES (single app, single lane — small fixes + copy/content gates)
- Lane A — Visual/functional bug fixes (code only) · depends on: none
- Lane B — Verification passes (no code change unless a bug is found) · depends on: none, can run alongside Lane A
- Lane C — Copy/content decisions (Esther/Craig judgment calls) · depends on: none, but blocks nothing else — park and move on

## UNITS

### Lane A — Visual/functional bug fixes
- [AUTO] Fix hero "L4 QUALIFIED" badge text clipping (`div.h-badge` / class `hbc`, home hero, `app/page.tsx` + associated CSS) — files: home hero component + `app/home.css` (or wherever `.hbc`/`.hbc-s` is defined) — VERIFY: screenshot at 1280px and 375px widths, "QUALIFIED" fully visible inside the circle with normal padding, no line-height overflow

### Lane B — Verification passes
- [AUTO] Manually scroll the homepage "01/02/03" pinned section at normal speed and confirm steps 02 and 03 render (not just 01) — VERIFY: screenshot each step; if broken, file as a new [AUTO] fix unit with the actual defect
- [AUTO] Click-test the Contact page form: trigger validation on empty required fields without completing a real submission — VERIFY: browser console/network shows validation blocking, no email actually sent
- [AUTO] Re-check all 7 launch pages at 375px mobile width — VERIFY: nav collapses correctly, hero badge doesn't clip, footer columns stack cleanly, screenshot each

### Lane C — Copy/content decisions (surface to Craig/Esther, don't code around them)
- [GATE] Condition-roll-call list ("Heart health and blood pressure / Bone and joint health / Visual impairment / Cancer rehabilitation") appears on Home and Personal Training — both general pages, not the not-yet-built dedicated catalogue. Hard rule says generalise on general pages. Esther/Craig to confirm: reword to a generic line now, or accept as-is until the Specialist Training catalogue ships?
- [GATE] Blog (27 unedited legacy WordPress posts) — still disabled/redirected. Esther to choose: noindex-and-launch-as-is, curate a subset, or post-launch rewrite project.
- [GATE] FAQ answer bodies — only the intro/category order and 2 factually-wrong answers have been rewritten; ~15 of 17 answers still carry pre-rewrite tone/content. Needs a full pass against voice.md with Esther.
- [GATE] About page "Real Story" — sourced from Esther's published Storm Fitness Academy interview, not yet confirmed verbatim by her directly.
- [GATE] Google Reviews shortlist (curated in references/stories.md) — Esther hasn't confirmed which reviews she's comfortable seeing used publicly.

## LEDGER
Progress written to: eternal-fitness-website/.context/state.md + handoff.md as each unit ticks.
Live status: eternal-fitness-website/.context/loop-status.md

CONTEXT: Generated from a full in-browser review of staging.eternal-fitness.co.uk across all 7 launch-scope pages (Home, About, Personal Training, Pricing, FAQs, Contact, Calorie Calculator — now disabled) run 2026-07-30. Three bugs (duplicate titles, dead footer link, calorie calculator) were found, fixed, and already shipped same session (commit `350e586`) before this Work Order was opened — they're listed under DONE for the record, not as units to re-run. The badge-clipping bug was flagged by Craig via a selected-element screenshot mid-review. Everything under Lane C was already open in eternal-fitness-website's/.context/state.md before this session — folded in here so the full backlog lives in one place rather than scattered across two repos' state files.
