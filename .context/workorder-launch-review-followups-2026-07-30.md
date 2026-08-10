<!-- wo-archived-banner -->
> **ARCHIVED — HISTORY ONLY. DO NOT READ THIS AS OUTSTANDING WORK.**
>
> This work order closed as `done` (registry last updated 2026-08-02).
> Its unit checklists were never re-ticked on close, so unticked boxes below do **not**
> mean the work is outstanding. Eternal Fitness went live 2026-08-09; much of what this
> document describes as pending shipped before or at launch.
>
> **Live state lives in the registry, not here:**
> ```
> wo active                    # current work orders
> wo deferred-list             # what is genuinely still parked
> wo questions                 # decisions waiting on Craig
> ```
> Registry id: `wo-eternal-fitness-launch-review-followups-2026-07-30`

---
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
- [x] Condition-roll-call copy on Home/Personal Training "Specialist Training" teaser — **Craig's call, 2026-08-04: leave as-is for now**, revisit once the Specialist Training catalogue is built
- [x] Blog (27 legacy posts) launch-scope decision — **Craig's call, 2026-08-04: deferred, no action before launch**
- [x] FAQ answer bodies — **rewrite pass done 2026-08-04.** All 17 reviewed against voice.md; most were
      already realigned in `74b2fa9` (2026-07-27) and compliant with the hard rules. 3 polished for tone
      (GP-referral phrasing, "bring someone with you" corporate phrasing, short-term-programmes
      "budgets" phrasing). `tsc --noEmit` clean.
- [x] About "Real Story" wording — **Craig confirmed 2026-08-04: correct/final, no further changes**
- [x] Google Reviews shortlist — **Craig reconfirmed 2026-08-04: fine to use as-is** (also resolved 2026-07-30 in stats.md)
- [x] Hero "L4 QUALIFIED" badge — checked 2026-08-04, not reproducing (see outstanding-items-2026-08-01.md §5). No code change made.
- [ ] Homepage "How I Actually Train You" (01/02/03) scroll-pinned section confirmed rendering all 3 steps on a real slow scroll (not just jump-scroll)
- [ ] Contact form: submit validation confirmed working (empty required fields blocked, real submit path not accidentally triggered during the test)
- [ ] Full 7-page pass re-checked at mobile viewport (375px) — nav, hero badge, footer columns

## LANES (single app, single lane — small fixes + copy/content gates)
- Lane A — Visual/functional bug fixes (code only) · depends on: none · **still open**
- Lane B — Verification passes (no code change unless a bug is found) · depends on: none, can run alongside Lane A · **still open**
- Lane C — Copy/content decisions (Esther/Craig judgment calls) · **CLOSED 2026-08-04, all 5 GATEs resolved by Craig**

## UNITS

### Lane A — Visual/functional bug fixes (still open, unclaimed)
- [AUTO] Fix hero "L4 QUALIFIED" badge text clipping (`div.h-badge` / class `hbc`, home hero, `app/page.tsx` + associated CSS) — files: home hero component + `app/home.css` (or wherever `.hbc`/`.hbc-s` is defined) — VERIFY: screenshot at 1280px and 375px widths, "QUALIFIED" fully visible inside the circle with normal padding, no line-height overflow

### Lane B — Verification passes (still open, unclaimed)
- [AUTO] Manually scroll the homepage "01/02/03" pinned section at normal speed and confirm steps 02 and 03 render (not just 01) — VERIFY: screenshot each step; if broken, file as a new [AUTO] fix unit with the actual defect
- [AUTO] Click-test the Contact page form: trigger validation on empty required fields without completing a real submission — VERIFY: browser console/network shows validation blocking, no email actually sent
- [AUTO] Re-check all 7 launch pages at 375px mobile width — VERIFY: nav collapses correctly, hero badge doesn't clip, footer columns stack cleanly, screenshot each

### Lane C — Copy/content decisions — CLOSED 2026-08-04
- [x] Condition-roll-call list — Craig: leave as-is for now, revisit post-catalogue.
- [x] Blog — Craig: deferred, no action before launch.
- [x] FAQ answer bodies — Craig: approved, rewrite pass done (see DONE section above).
- [x] About page "Real Story" — Craig: confirmed correct/final.
- [x] Google Reviews shortlist — Craig: confirmed fine to use as-is.

## LEDGER
Progress written to: eternal-fitness-website/.context/state.md + handoff.md as each unit ticks.
Live status: eternal-fitness-website/.context/loop-status.md

CONTEXT: Generated from a full in-browser review of staging.eternal-fitness.co.uk across all 7 launch-scope pages (Home, About, Personal Training, Pricing, FAQs, Contact, Calorie Calculator — now disabled) run 2026-07-30. Three bugs (duplicate titles, dead footer link, calorie calculator) were found, fixed, and already shipped same session (commit `350e586`) before this Work Order was opened — they're listed under DONE for the record, not as units to re-run. The badge-clipping bug was flagged by Craig via a selected-element screenshot mid-review. Everything under Lane C was already open in eternal-fitness-website's/.context/state.md before this session — folded in here so the full backlog lives in one place rather than scattered across two repos' state files. **Lane C fully closed 2026-08-04 — see decisions.log same date. Lanes A/B remain open, unclaimed, candidates for the next OpenCode dispatch alongside the new Section-2 build items in outstanding-items-2026-08-01.md.**
