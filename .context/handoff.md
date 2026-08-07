# Session Handoff: August 7, 2026 (Claude Code) — launch-readiness sweep, Bookings CTA, GDPR legal pages

## Agent
Claude Code

## Session Summary
Long session, four separate pushes, run from a series of isolated worktrees per DO-SOP-010:

1. **Launch-readiness sweep (`27ab8e6`, `e29cfab`).** Craig asked for staging cleaned up for a live
   push. Found the real headline issue during an `/seo-audit` pass: **both public lead-capture forms
   were UI-only stubs** — the Contact page form called `setSent(true)` with no `fetch`/API call, and
   the site-wide "Book a Free Consultation" dialog faked a send via `setTimeout`. Neither ever
   transmitted anything; every real enquiry would have been silently lost. Built `app/api/leads/route.ts`
   on the existing `lib/email.ts` Resend/SendGrid/SMTP sender (confirmed `RESEND_API_KEY` genuinely
   configured on Coolify, so this sends real email), wired both forms to it, matched the existing
   `ESTHER_NOTIFY_EMAIL` override convention from the cron nudge job. Also: retired `/calorie-calculator`
   (redirect to `/`, code kept — portal's gated per-client version is the real one now), flattened 6
   legacy-WordPress redirects that were double-hopping through a disabled page before reaching `/`, and
   added `/testimonials` to `sitemap.xml` (live, nav-linked, was missing entirely).
2. **Site-wide Bookings CTA sweep (`427dd0e`).** Craig flagged that the footer already linked "Book a
   free consultation" straight to the live Microsoft Bookings calendar (a deliberate Esther-approved
   swap from `b63887e`, 2026-08-04) but nothing else did — every other CTA (Navbar on every page, every
   hero, every closing CTA band, 13 page files) still opened the dialog just fixed to email instead.
   Verified the Bookings page live in a browser first (real "Initial consult, 30 min, new customers
   only" service). Swapped all 13 files + `Navbar.tsx` + `CTASection.tsx` to link straight to
   `lib/booking.ts`'s `BOOKINGS_URL`, then deleted `components/ConsultationDialog.tsx` and
   `hooks/useConsultationDialog.tsx` entirely once confirmed zero remaining references — dropped a
   Radix dialog from every page's bundle as a side effect.
3. **Legal pages rewritten for UK GDPR/PECR (`39a8c44`).** Craig asked for Privacy Policy, Cookie
   Policy, and Terms reviewed with GDPR "included." Audited what the site actually does (grepped for
   analytics/tracking scripts — none; checked `middleware.ts`/`lib/auth.ts` for real cookie names;
   checked `app/parq/page.tsx` for the actual special-category health data collected; checked
   `app/api/claude/*` for the OpenRouter AI processor) before writing anything, rather than polishing
   the existing text. The old pages were the **unedited 6 Dec 2020 WordPress/Termly template** — US/
   California-oriented, listing Google Analytics and Flash cookies that don't exist on this Next.js
   site, no UK GDPR/ICO mention anywhere, a false "never longer than 1 year" retention claim, and
   Esther mislabelled a formal "DPO" (not accurate at this scale). Full rewrite of Privacy + Cookie
   Policy, additive changes to Terms (14-day distance-selling cooling-off section, complaints
   procedure, Consumer Rights Act 2015 reference). Real finding: **the public site sets zero cookies**
   — no consent banner is currently required under PECR because of that; only 3 essential
   hub/portal session cookies exist. New processor table in the Privacy Policy: Microsoft Bookings,
   email provider, hosting, the OpenRouter AI assistant (explicitly excluding PAR-Q data), Trainerize
   (historic). Verified every TOC anchor on all 3 pages resolves to a real section id via an automated
   cross-check, not eyeballed.
4. **GDPR internal-documentation Work Order created (`89d6349`), not run.** Craig asked what
   ICO-facing internal documentation (as opposed to the public policies) the hub needs, then asked for
   it as a Work Order for a separate session rather than built inline. Scoped as
   `wo-eternalfitness-gdpr-hub-documentation-2026-08-07` (planned, unclaimed) — ROPA, breach procedure
   + log, Subject Access Request procedure, processor/DPA register (including Decoded Ops' own DB
   access as a real, currently-undisclosed processor relationship — flagged as a `[GATE]`, not
   invented), retention schedule, internal data-handling policy — as `Sop`/`ProcessEntry` rows in the
   hub's existing Process & Quality module (`/hub/process-quality`), not a new feature. Full detail:
   `.context/workorder-gdpr-hub-documentation-2026-08-07.md`.

Also recovered here: the **2026-08-06 accessibility WO entry below was never actually committed** —
found the shared checkout (`D:\apps\eternal-fitness-website`) carrying it as a local uncommitted diff
against `handoff.md` at session start. The work itself was genuinely shipped and verified at the time
(`7179fb8`, confirmed live) — only the handoff narrative was lost. Recovered and committed here so it's
not lost a second time.

## Current State
Staging (`staging.eternal-fitness.co.uk`) is solid for a public launch from a code standpoint: lead
capture actually works, every CTA points at a real booking calendar, and the 3 legal pages are UK
GDPR/PECR-accurate rather than a stale US template. **Not done**: the actual domain cutover.
`NEXT_PUBLIC_ALLOW_INDEXING` is still unset on Coolify (site currently serves `noindex`/`Disallow: /`
regardless of what domain points at it), the `staging.` subdomain isn't retired, and DNS/WordPress
decommission/GSC submission haven't started — all Craig's own go-live checklist, untouched this
session by design (DNS + indexing is a `[GATE]`-level, client-facing action).

Craig separately said he'd register Esther with the ICO (Tier 1, £52/year, self-assessment at
ico.org.uk) — status unconfirmed as of session close.

## Blockers
None on anything actionable this session. The GDPR documentation Work Order is deliberately
**unclaimed and not run** — Craig asked for it scoped, not executed, this session.

## Next Steps
1. Craig: decide on and execute the actual domain cutover (`NEXT_PUBLIC_ALLOW_INDEXING`, staging
   subdomain retirement, DNS, WordPress decommission, GSC sitemap submission) — see
   `EF_SEO_AI_Migration_Plan_Jul2026.md` §3 in the workspace repo for the existing checklist.
2. Confirm Esther's ICO registration status.
3. Pick up `wo-eternalfitness-gdpr-hub-documentation-2026-08-07` in a separate session — read the live
   `sops`/`process_register` tables first (something was seeded there in late July that Esther hadn't
   reviewed; don't duplicate or clobber it), then work the `[AUTO]` units, surfacing the `[GATE]` items
   (Decoded Ops' own processor-relationship wording, hub-login state) rather than guessing them.
4. Reports/Updates page's "Export" and "New update" header buttons are still fake placeholder links to
   `/hub/clients` (flagged 2026-07-30, re-confirmed still true 2026-08-07) — real, still-open gap, not
   part of anything scoped this session.

## Files Changed
### New
- `app/api/leads/route.ts` — shared contact-form/consultation-dialog send endpoint
- `lib/booking.ts` — `BOOKINGS_URL` constant
- `.context/workorder-gdpr-hub-documentation-2026-08-07.md`

### Modified
- `app/contact/ContactPageClient.tsx`, `components/ConsultationDialog.tsx` (deleted),
  `hooks/useConsultationDialog.tsx` (deleted), `lib/email.ts` (added `replyTo`)
- `next.config.js` (calorie-calculator retirement, redirect-chain flattening), `app/sitemap.ts`
  (added `/testimonials`)
- `components/Navbar.tsx`, `components/CTASection.tsx`, `components/Footer.tsx`, and all 13 page
  files listed in the `427dd0e` commit body — Bookings CTA swap
- `app/privacy-policy/PrivacyPolicyClient.tsx`, `app/cookies-policy/CookiesPolicyClient.tsx`,
  `app/terms/TermsPageClient.tsx` — full GDPR/PECR rewrite

---

# Session Handoff: August 6, 2026, evening (Claude Code) — accessibility WO

## Agent
Claude Code

## Session Summary
Craig asked about vision-accessibility (image captions etc.) for the public site. Ran an audit
(Explore agent + `a11y-audit` skill) — real gaps weren't image alt text (37/40 already solid), they
were structural: no skip-to-content link/`<main>` landmark on the public marketing pages (the client
portal already has one), and the brand "rose" colour computing to ~2.9-3:1 on white when used as text
(fails WCAG AA 4.5:1). Craig said "go with it" — promoted to `wo-eternalfitness-accessibility-vision-
2026-08-06` (full detail: `.context/workorder-accessibility-vision-2026-08-06.md`), dispatched as one
OpenCode lane (deepseek-v4-pro, worktree `accessibility-vision-2026-08-06`, all 3 lanes in one pass
since they shared files) covering:
- Skip-to-content link (`app/layout.tsx`) + `<main id="main-content">` on all 15 public page components
- New `--rose-text: #AE547D` token (4.81:1 on white, computed independently, not trusted from self-report)
  swapped in at 8 text-colour call sites (step numbers, links, asterisks, FAQ markers); decorative/
  hover/background rose left untouched per the MUST constraint
- Blog search input `aria-label`, contact form focus ring darkened to the same token, blog hero/post
  image alt text improved (one now correctly `alt=""` as decorative, adjacent heading provides context)

Verified independently before merging (not on the lane's self-report): `git diff --stat` confirmed
only public-page files touched (no /hub or /portal); contrast recomputed via a standalone Node script;
`tsc --noEmit` clean; live-rendered in a dev server and inspected via DOM (skip link is the first
`<body>` child, exactly one `<main>` per page, Navbar/Footer outside it); blog/post pages verified by
diff review only since blog currently redirects to Home (pre-existing, separate decision — code is
correct and will apply once blog is re-enabled). Rebased onto a newer `origin/main` (another session's
hub-consolidated WO had pushed unrelated commits meanwhile, no file overlap), pushed `7179fb8`,
triggered and watched the Coolify deploy to `finished`/`running:healthy`, then confirmed the skip link
and `<main>` landmark live on `staging.eternal-fitness.co.uk` directly. Worktree removed, WO marked done
in the registry.

---

# Session Handoff: August 4, 2026 (Claude Code)

## Agent
Claude Code

## Session Summary
Craig reviewed the project's open-items backlog and cleared it in one batch, delivered as chat
instructions rather than a live click-test session. All decisions logged in `.context/decisions.log`
(2026-08-04 entry) and applied to `workorder-launch-review-followups-2026-07-30.md` and
`outstanding-items-2026-08-01.md`:

- **Lane C (copy/content GATEs) closed, all 5 items:** condition-roll-call copy on Home/PT left as-is
  for now; blog (27 legacy posts) deferred; FAQ answer bodies approved for rewrite (see below); About
  "Real Story" confirmed final; Google Reviews shortlist confirmed usable.
- **FAQ rewrite pass done:** all 17 answers in `app/faqs/FAQsPageClient.tsx` reviewed against
  `voice.md`. Most were already realigned by `74b2fa9` (2026-07-27) and compliant with the hard
  rules (no condition roll-calls, no "survivors," no trainer comparisons, no Level 4 PT claim) — this
  session's earlier report to Craig that "~15 of 17 still need rewriting" was itself stale. Polished 3
  answers for tone per voice.md's "avoiding AI voice" guidance. `tsc --noEmit` clean. Built in worktree
  `D:appsworktreeseternal-fitness-websitedecisions-2026-08-04` (branch
  `chore/decisions-2026-08-04`) per DO-SOP-010.
- **portal-sign-in.html "mismatch" — found to be stale, not a real open item.** It was already resolved
  2026-07-30 (Craig: keep email+password auth, reskin only) and shipped in `71de12c`. Craig
  re-confirmed the same thing today without knowing it was already done — `outstanding-items-
  2026-08-01.md` had never been corrected after that WO closed. Fixed the stale entry.
- **Item-2 buildable backlog approved to proceed:** nudge send mechanism (auto vs. reviewed decision
  still needed), hub UI toggle for `delivery_mode='home_training'`, `/hub/site-review` HTTP 500 bug,
  client data consolidation. Not yet started — next Work Order candidate.
- **Item-3 external actions all cleared by Craig:** Resend fully tested/working (drop the webhook-
  subscription ask), SPF/DKIM confirmed fine, `ANTHROPIC_API_KEY` intentionally not needed (hub's AI
  agent runs on OpenRouter), real clients confirmed live in the portal (drop the "no real client
  invited" item).
- **New standing capability:** Craig has granted a role that lets Claude Code create a throwaway
  login for front-end/admin (hub + portal) testing — this closes the recurring "no hub credentials in
  this environment" gap that has blocked live click-testing across nearly every prior session (see
  section 4 of `outstanding-items-2026-08-01.md`). Delete/deactivate after each use per the
  disposable-identity rule in the global CLAUDE.md.

## Current State
FAQ copy change committed on `chore/decisions-2026-08-04`, not yet pushed/merged (about to be).
Docs (`decisions.log` — local-only, gitignored — plus `state.md`, `handoff.md`,
`outstanding-items-2026-08-01.md`, `workorder-launch-review-followups-2026-07-30.md`) updated on the
same branch. Registry: claimed `wo-eternalfitness-consolidated-2026-08-02` for this session.

## Next Steps
1. Push/merge this branch's FAQ + docs changes to main, confirm Coolify deploy healthy.
2. Use the new throwaway-login capability to actually click-test the section-4 backlog live — the
   single highest-leverage next step per the outstanding-items file.
3. Scope and dispatch the approved item-2 work (nudge send mechanism decision first — auto-send vs.
   Esther-reviewed draft — since that's a real product decision, not just a build task).
4. Lane A (badge clip fix) and Lane B (verification passes) of the launch-review WO are still open
   and unclaimed — good OpenCode candidates alongside the item-2 work.

## Files Changed
### Modified
- `app/faqs/FAQsPageClient.tsx` — 3 FAQ answers polished for tone
- `.context/state.md`, `.context/handoff.md`, `.context/decisions.log` (local, not pushed),
  `.context/outstanding-items-2026-08-01.md`, `.context/workorder-launch-review-followups-2026-07-30.md`

---

# Handoff

## Session close — 2026-08-03 — Cashflow WO closed (Lanes 5-7), marketing follow-ups deferred

Craig asked to pick up "all other work order items" while a separate concurrent session handled
hub design. Checked the registry (`wo active`): only one real open item on this app outside hub
design — the tail of `wo-eternalfitness-training-cashflow-2026-08-02` (Lanes 5-7: bank statement
import, reconciliation, cashflow dashboard). Also surfaced a second, separate, previously-unclaimed
WO (`wo-eternalfitness-consolidated-2026-08-02`, marketing-page follow-ups) while checking for
"anything beyond" the cashflow lanes.

**Cashflow WO — CLOSED, all 3 remaining lanes done + deployed:**
- **Lane 5 — bank statement import.** Craig supplied a Monzo CSV export as a stand-in
  column-format template (real HSBC sample still not available) — explicit instruction: do not
  import its transactions. `bank_statement_imports`/`bank_transactions` migration (applied to
  prod, empty), `lib/bank-statement-parser.ts` built as a swappable adapter
  (`parseMonzoStyleCsv()`, a future `parseHsbcCsv()` drops in without a rewrite), upload → preview
  → commit UI at `/hub/cashflow/transactions`. Pushed `3178fee`.
- **Lane 6 — reconciliation queue.** Suggest-and-confirm matching (amount ±£0.01 + date window +
  invoice-number text signal), `dismissed_matches` table (applied to prod), confirm action
  atomically locks both rows and sets the invoice to `paid`. `/hub/cashflow/reconciliation`.
  Verified end-to-end by seeding a synthetic invoice + transaction in prod and confirming the
  matching query actually surfaced the pair, then cleaning up. Pushed `92467cd`.
- **Lane 7 — cashflow overview dashboard.** `/hub/cashflow` — outstanding/overdue/paid-this-month
  KPI tiles + recent-activity table, all computed live from real queries (overdue computed by
  date, not the possibly-stale `status` column; paid-this-month explicitly documented as an
  `updated_at` proxy, no `paid_at` column exists). Matching heuristic extracted into shared
  `lib/cashflow-matching.ts` so the dashboard and reconciliation route can't drift apart. Verified
  by seeding 3 synthetic invoices in prod and checking the before/after delta matched the expected
  £300/£180/£240 exactly, then cleaning up. Pushed `9ffdc84`.

All three lanes dispatched to OpenCode (`launch-opencode-lane.ps1`) but **hand-reviewed
line-by-line, not trusted on self-report** — read every new file, independently re-ran
`tsc --noEmit` and `next build` after each (not just accepted the lane's own claim), and did real
DB-level verification with seeded/cleaned-up synthetic data for the two lanes with computed
numbers (6 and 7), not just code review. Registry updated (`wo status ... done`) with full detail.

**Marketing follow-ups WO — found, NOT actioned, deferred with next steps:**
`wo-eternalfitness-consolidated-2026-08-02` (public marketing pages only, no hub/portal/DB).
- Lane A (hero "L4 QUALIFIED" badge clipping): applied a candidate fix (`white-space: nowrap` on
  `.hbc-s` in `app/home.css`) but could not visually verify — the Browser pane's screenshot tool
  wouldn't render in this session ("pane not displayed"), and the WO's own VERIFY step requires a
  real 1280px/375px screenshot. Also discovered a prior fix for this same bug already shipped
  2026-07-30 (`0049e9a`, 44px→54px circle) — the WO checklist was never updated to reflect it, so
  it's unclear whether the badge still actually clips today. My uncommitted CSS tweak got swept
  away by a later OpenCode lane's own cleanup step (treated as unrelated dirty state) — **not
  committed, not pushed, nothing to revert.**
- Lane B (live verification pass — scroll section, Contact form, 7-page mobile recheck): not
  started, same Browser-pane blocker.
- Lane C (5 copy/content decisions — condition-roll-call wording, blog launch scope, ~15 FAQ
  answers, About page sourcing, Google Reviews shortlist): explicitly GATE in the WO's own text,
  Esther/Craig judgment calls, correctly not touched.
All three deferred in the registry (`dmsd9zcg0ur`, `dmsd9zckk4i`, `dmsd9zcnv1x`) with next-step
notes rather than silently dropped.

**Environment note for next session:** this worktree had no `node_modules` (junctioned from the
shared checkout) and no `.env.local` (copied in temporarily for DB verification steps, deleted
before each commit/push — never left tracked). A `.claude/launch.json` was created for local
`next dev` preview and removed again at session close.

## Session close — 2026-08-02 (later) — Trainerize historical import, live PB/templates, cashflow core, tab consolidation, live block promotion

Full detail: `wo-eternalfitness-training-cashflow-2026-08-02`. Scope docs:
`.context/scope-trainerize-historical-import-2026-08-02.md`, `.context/scope-cashflow-invoicing-2026-08-02.md`.
Final push `f6345d4`, deployed, confirmed `running:healthy` (multiple deploys through the session —
the first one for each code-only commit hit the known transient Coolify exit-255-at-finalize
pattern once; a manual redeploy of the same commit fixed it, no code issue).

**Trainerize historical import — full roster.** Discovered Trainerize's frontend runs on an
internal JSON API (`api.trainerize.com/v03/*`) rather than server-rendered pages — auth needs a
JWT bearer token the SPA holds in memory (captured from a real request, not a cookie). Imported
training blocks/workouts/exercises, notes, and best-ever PBs for all 15 active clients into new
`trainerize_*` archive tables (deliberately separate from live `blocks`/`sessions` — different
status semantics). Also pulled 2 real former clients not previously in the hub (Judy Holmes, Uma
Assous) by driving Trainerize's "Deactivated" client filter — added a reusable `archived`
`client_status` value + hub list-view toggle for this going forward.

**Actual per-set workout results, not just prescribed program/PBs.** Craig asked directly whether
real logged performance (not just the prescription) was being pulled — it wasn't. Found
`dailyWorkout/get` (fed by `calendar/getList`, chunked <1yr per Trainerize's own range limit)
returns true per-set reps/weight/distance/time. Built `trainerize_workout_results` — 19,687 real
logged sets across 883 sessions for the 15 active clients. The 2 archived clients get 0 — confirmed
via direct API test this is a genuine Trainerize 403 (deactivated accounts lose access to this
endpoint specifically, tied to the paid-seat model), not a bug.

**Tab consolidation — Progress/History/Training History were 3 tabs computing PBs 3 different,
disconnected ways.** Investigated the actual code rather than assume: the old History tab
recomputed PBs from `set_logs` only, completely blind to `personal_records` or Trainerize data;
Training History's PB card only ever showed Trainerize-imported PBs. Consolidated to 2 tabs —
**Progress** (unified trend + PB/last-performed, fed by both live `set_logs` and Trainerize's
per-set results via new `lib/trainerize-adapter.ts`, which converts Trainerize rows into the same
`SetLog` shape so they flow through the existing `buildExerciseTrends`/`buildExerciseHistory` pure
functions unchanged) and **Training History** (narrowed to program structure + notes only).
`?tab=history` redirects to `progress` rather than silently falling back to overview.

**Live PB flagging + workout templates (independent of the Trainerize work).** Wired the existing
`buildExerciseHistory` PB logic into live session logging (hub `LiveSessionLog.tsx` + portal
`TrainingClient`) with an inline "New PB" badge, backed by the shared `personal_records` table
(now the single source for both live-set and Trainerize-imported PBs). Added `workout_templates`
with auto-derived facet tags (archetype/movement/muscle/equipment computed from the exercises
inside a template on save) + a small manual `condition_tags` field — solves Esther's "I call
everything Workout A" problem by making the display name irrelevant to findability.

**Cashflow/invoicing core.** Structured invoicing (`invoices`/`invoice_line_items`/
`invoice_templates` — real relational line items, not the flat-amount pattern the Decoded Ops hub
uses) delivered through the existing document engine as a 7th `kind` rather than a parallel send
pipeline. Esther confirmed not VAT-registered, so no VAT logic anywhere. HSBC statement import
(the other half of this initiative) is **on hold per Craig** — genuinely blocked on a real CSV/OFX
sample, not pursued further this session.

**Promoted currently-in-progress Trainerize blocks to real live blocks.** The Training tab was
empty for every imported client (it reads live `blocks`/`sessions`, not the archive tables).
`scripts/promote-active-trainerize-blocks.mjs` finds clients whose Trainerize block start/end date
spans today and creates a real `blocks`(status=`draft`, hub-only, not client-portal-visible)/
`sessions` row per workout — 12 clients. Caught a real data-shape issue via dry-run *before*
writing: Odul Bozkurt had separate "GYM"/"HOME" Trainerize workout entries for the same session
(would have become 6 wrong sequential sessions instead of 3 correct dual-version ones) — built
`pairGymHomeWorkouts()` to match by workout number and merge correctly.

**Verification discipline throughout:** every UI change was checked with a disposable staff
account (created via direct Postgres insert matching the real better-auth schema, deleted
immediately after) against the actual live site (`staging.eternal-fitness.co.uk`), not just
localhost or a self-report. Caught and fixed 2 real bugs this way that `tsc`/build passing had
missed: (1) `TrainerizeHistoryPanel`/`types.ts` reading Trainerize's raw API field names
(`name`/`target`/`restTime`) instead of the real DB column names (`exercise_name`/`target_reps`/
`rest_time_seconds`) — Personal Records and workout exercise tables rendered blank/placeholder
values despite correct underlying data; (2) same bug class recurred in the workout/exercise
render layer after the first fix, caught because Craig looked closely rather than trusting the
first "done."

### Not done / deferred this session
- HSBC statement import (Lane 5 of the cashflow WO) — held per Craig, needs a real sample.
- Reconciliation queue + cashflow dashboard (Lanes 6-7) — depend on Lane 5.
- Full set-by-set drill-down UI exists on the client-detail Progress tab (paginated, click-to-
  expand) but there's no cross-client "recent PBs" or "recent sessions" feed yet — not asked for.
- `clients.payment_status` superseding by invoice-derived state — explicitly out of scope for the
  cashflow WO, a separate future decision once invoicing has been used for a while.

## Session close — 2026-08-01 (evening) — Tom Putnam migrated from Trainerize as Block 1 (test case)

**Full detail: `.context/decisions.log` (top entry, 2026-08-01).** Summary: imported Esther's existing
Trainerize plan for client Tom Putnam verbatim into the hub as his Block 1 — the first client migrated
this way, requested by Craig as a test of the Trainerize→hub path. 12 sessions (6-week A/B full-body
split), `status: 'draft'`, not yet Esther-reviewed. Added Craig's supplied mobility warm-up/cooldown
circuit to all 12 sessions afterward. Two new one-off scripts:
`scripts/import-trainerize-migration-tom.mjs`, `scripts/add-warmup-cooldown-tom-block1.mjs` — both
DB-verified directly (not self-reported), both now guard against accidental execution on import
(`pathToFileURL` guard, not a raw string comparison — that silently fails on Windows).

**Current state:** Tom's Block 1 (`id 113888f0-d504-4694-a0c1-c2f6049a9c03`) exists with correct
`main_block` (verbatim from source) and warm-up/cooldown. Still missing before it's client-facing:
coaching cues, exercise modifications, equipment tags, a real (non-cloned) home version — none of
these were in the Trainerize export.

**Next steps:**
1. Esther to review/approve Tom's Block 1 in the hub.
2. Add coaching cues/modifications/equipment/home version.
3. Craig asked for a reusable warm-up/cooldown/exercise-block template system (this session used a
   hand-written one-off script). Logged as deferred (`wo defer` id `dmsagoxpozw`), not scoped or built —
   do this before a second manual Trainerize migration if the pattern repeats. Note this is a
   *training-plan* migration path, separate from the existing Lane A *client-record* export research
   (`.context/lane-a-client-field-map.md`, `.context/lane-a2-trainerize-export-plan.md`) — the two
   should probably be reconciled into one migration story if more Trainerize clients get migrated.
4. If the test is judged a success, decide whether/how to migrate other existing Trainerize clients.

## Session close — 2026-08-02 — Hub task backlog cleared, updates-module fix, welcome email redesigned

**Reviewed every hub task assigned to Craig with status `todo` (`tasks` table, EF Hub kanban)** and turned them into two Work Orders, both closed this session: `wo-eternalfitness-hub-tasks-2026-08-02` (Resources area + calorie calculator + Showdown Soundboard, exercise history/PB tracking, session-notes mic input, plan-schedule page, email-timing fix, welcome-aboard email, updates-module fix) and a follow-up `wo-eternalfitness-welcome-email-2026-08-02` / `wo-eternalfitness-email-shell-redesign-2026-08-02` (branded welcome email, manual-send-only, preview capability, then a full visual redesign of the shared email shell from Craig's OpenDesign mockups). All corresponding hub task rows marked `done`. Final state pushed as `e8b44aa`, deployed, confirmed `running:healthy`.

**Updates-module bug, real root cause found (not guessed):** Tom Putnam's AI-generated draft update came back with unfilled `[CLIENT — I don't have X yet]` placeholders for topics Esther had actually discussed. Root cause confirmed by reading the actual `sent_updates` rows: `UpdateChatPanel.tsx` silently truncated the pasted conversation at 4000 characters before it ever reached the AI. Fixed (cap raised to 20,000 with a visible warning), plus per Craig's follow-up instruction the `[CLIENT]` placeholder was removed as an allowed AI output entirely across all three update kinds (six-week/four-week/flexible, all share `systemPreamble()`) — Esther's input always has enough detail, so the model is now told to keep reading rather than bail to a placeholder. A pre-send guard blocks Send/Schedule (not Save Draft) if a placeholder slips through anyway. **Not verifiable by tsc/build** — this is model-behavior, not code-logic; needs a live test against a real detailed conversation before fully trusting it.

**Two real bugs caught during review, not self-reported by the OpenCode lanes that wrote them:**
1. Welcome-aboard email reused the 15-minute password-*reset* token TTL for what's actually an invite link that can sit unopened for days — most links would have expired before a client ever clicked them. Fixed with a separate 7-day `WELCOME_TOKEN_TTL_SECONDS`.
2. A `plan-schedule` lane relabeled the *shared* `blockStatusMap` in `lib/hubStatus.ts` site-wide (Draft→To Do etc) instead of using its own already-built `scheduleStatusMap` — `lookupStatus()` checks `blockStatusMap` first in a `??` chain used by `StatusBadge` everywhere in the hub, so this would have silently relabeled every existing block-status badge app-wide. Reverted, wired the isolated map through `TokenPill` instead.

**Email redesign integration issue, also caught in review:** two separate OpenCode lanes independently rewrote `lib/portal-auth.ts`'s welcome-email function from different base commits (one before, one after the email-shell redesign). Merging them left a duplicate `const html` declaration and a reference to an undefined `loginUrl` variable — a build-breaking bug neither lane's own tsc/build check could catch, since it only existed after combining their work. Rewrote the merged function cleanly, composed through `buildBrandedUpdateEmail`/`shell.ts` (matching `document-ready.ts`'s existing pattern) rather than the inline full-HTML duplicate one lane had written. Verified all 7 email templates (welcome, document-ready, PAR-Q ×2, six/four-week/flexible update) against Craig's mockups in `D:\apps\design-systems\ef-client-portal\email-templates\` with an actual diff of every hex colour/font/spacing value — zero mismatches.

**Deploy note:** this app's Coolify webhook auto-deploys on every push to `main`. Firing an explicit API deploy on top of that (to "confirm" it's building) creates a redundant, resource-contending second deployment that can fail outright — happened twice this session. The webhook deploy is the one that matters; check its status via `deployment list_for_app`, don't also trigger one manually.

**Deferred, not yet reviewed live:** the Resources module (client-portal calorie calculator + Showdown Soundboard, per-client visibility toggle) shipped and passed tsc/build, but Craig hasn't logged into the portal to see it working end-to-end yet — flagged as `dmsbpoaa37f` in the WO registry.

## Session close — 2026-08-02 — Imported Emma's Block 1 from a hand-typed programme, linked exercises to the library, refreshed the Trainerize scrape

**Craig sent two fully-specified workouts for Emma Atkinson (Mon 3 Aug "Workout A", Wed 5 Aug "Workout B" — supersets, a single, a band block, exact sets/reps/rest/start weights) and asked for a block.** No UI path exists for this — the Plan Agent tab only creates blocks via AI chat + `generate-block`, and there's no manual "type in your own sessions" screen. Inserted directly against prod: `blocks` (block_number 1, status `draft`, client_id resolved from `clients` by name) and two `sessions` rows (`session_number` 1/2, `scheduled_at` for the two dates, `data` JSONB matching the `Session`/`SessionVersion`/`Exercise` types — `studio` and `home` versions set identical since Emma is `studio_1to1`). Start weights have no dedicated field on `Exercise`, so they went into `equipment` (e.g. `["12kg dumbbells"]`) since that's what renders directly under the exercise name in `PrescriptionTable`. Cross-checked Emma's profile before writing anything: `esther_observations` says "Foot surgery 29 Jul 2026... Upper body only from 3 Aug" — both workouts Craig sent are upper-body/floor/band only, so they're already consistent with that restriction; flagged this to Craig rather than assuming it was already accounted for.

**Then linked prescribed exercises to the `exercises` library so videos resolve** (Craig's separate ask, for Emma's new block plus Tom Putnam's existing block-1 import). The library-by-name fallback in `lib/portal-data.ts` only fires for the client portal's home version at read time — it isn't persisted, and doesn't touch the hub's trainer-facing view at all. Wrote `ex.media = {image_url, video_url}` directly onto matched exercise objects in the stored session JSON instead (matches how `SessionEditor`'s manual swap dialog already persists media), across both `studio` and `home` versions. Applied high-confidence matches only (exact name or unambiguous naming variant e.g. "DB" vs "Dumbbell", "Dead Bugs" vs "Dead Bug"); left equipment-ambiguous ones (e.g. Single-Leg Hip Thrust — Barbell/Bench/Landmine all tied) and true gaps unlinked rather than guessing on live client data. Sent Craig a CSV (`Client, Exercise as prescribed, Status, Suggested/Linked match, Note`) instead of a chat table so it's shareable with Esther directly.

**Craig then asked to re-run the Trainerize scrape to fill the flagged gaps.** Re-ran `scripts/scrape-trainerize-exercises.mjs` (creds already in `.env.local` from the original 9 Jul import) — found 36 new custom exercises Esther's added since then, 2 of which closed real gaps and had actual YouTube videos (not just Trainerize thumbnails): "Seated Dumbbell Hammer Curl" and "Half kneeling Pallof Press Hold". Also caught my own earlier matching miss on a second pass — "Booty Band Clamshells" does match "Mini Band Clamshell", I'd just missed it the first time over a singular/plural mismatch in a naive token-overlap scorer (no stemming). Imported the 36 new rows into `exercises` directly, then wrote `supabase/migrations/20260802_exercises_trainerize_refresh.sql` documenting it — guarded with a per-row `NOT EXISTS` check (no unique constraint on `trainerize_id`) so it's safe to replay; verified by actually running it against prod and confirming 0 rows inserted (already present). Confirmed the remaining flagged gaps (DB Skull Crusher, Sissy Squat, Ankle Rock/Squat Sit, DB Floor Fly, Weighted March on the Spot, two chained circuit rows) are genuinely absent from Trainerize's full catalog, stock and custom — not a scrape gap, Esther would need to add them in Trainerize herself.

**Process note, self-caught mid-session:** ran the scrape and initial DB writes from the shared `main` checkout (`D:\apps\eternal-fitness-website`) instead of this worktree — a DO-SOP-010 violation. Caught it before committing anything there, copied the two changed files (`  .context/trainerize-exercise-export.json`, the new migration) into this worktree, reverted the shared checkout back to clean, and committed/pushed from here instead. No data was lost or duplicated, but worth flagging since it's exactly the failure mode DO-SOP-010 exists to prevent.

**Still open, left for Esther:** Emma's Block 1 is in `draft` — needs her review/approval in the hub before it's active. Four "needs confirmation" exercise links from the CSV are still unresolved (equipment/variant ambiguous, not auto-applied): DB Seated Reverse Flye, Seated DB Shoulder Press "back supported" (Tom — this one already has a real video waiting, worth Esther's 30 seconds to confirm), Single-Leg Hip Thrust, Feet-Up TRX Inverted Row.

## Session close — 2026-08-01 (evening) — Tasks overdue-count bug, compliance/document-engine gap, GP clearance made manual

**Tasks board "Overdue" count was wrong** — Craig reported it showing 8 when only 1 To Do card was
actually overdue. Root cause: `matchesDueFilter` in `TasksManager.tsx` didn't exclude `done` tasks,
so 7 completed tasks with a past due date counted toward Overdue/Due Today/Due This Week, even though
the "X overdue" banner just below it already excluded done tasks via the same pattern. Fixed by
applying the same exclusion in `matchesDueFilter` — also fixes the filtered board itself, not just the
tab badge.

**Compliance status wasn't reading the document engine.** Nathan Wadey's Compliance tab showed
"Action Needed" / "No PAR-Q on file" / "No signed agreement on file" despite both showing "Signed" in
the document register. `lib/compliance.ts::computeComplianceFlags` only ever checked the legacy
`signed_parq`/`signed_agreements` tables — never `client_documents`, which is where every PAR-Q and
Agreement has actually landed since the document-engine migration (`.context` already flagged this as
a known gap: "legacy tables still read by tracker/compliance-tab code — not retired yet"). Also
confirmed Craig's suspicion that uploaded historical PDF scans (`source_type: 'scan'`) land in
`client_documents` with `status: 'signed'` too, so they were equally invisible to compliance. Added
`hasSignedParqDocument`/`hasSignedAgreementDocument` params, wired through the three callers (client
detail, tracker, process & quality) via a `client_documents` query filtered to `status = 'signed'`.

**Known remaining gap, not fixed this session:** GP-clearance high-risk detection (see next item) used
to read structured PAR-Q answers (q1, q2, etc.) that only exist on the legacy `signed_parq` row — a
PAR-Q completed purely through the document engine has no equivalent yet. Moot now that the rule is
manual (below), but worth knowing if it's ever automated again.

**GP clearance requirement changed from an automated rule to a manual flag**, per Craig's explicit
ask — it's a clinical judgement call, not something PAR-Q answers should decide. Removed the
`HIGH_RISK_PARQ_QUESTIONS` auto-derivation entirely; added `profile.health.gp_clearance_required`
(trainer-ticked, Edit client → Health and clearance card, next to the existing "GP clearance
obtained" checkbox). Before flipping this over, queried prod directly to check who the old rule was
currently flagging — 8 clients had a high-risk PAR-Q answer (Colin Farley, Monique Weardon, Becky
Price, Ellie Wallwork, Ian Healey, Odul Bozkurt, Saffron Somerset, Sam Gibbons), 7 of them without
`gp_clearance` obtained and therefore currently `pending_medical` (blocking Plan Agent block
generation). Flagged this to Craig before shipping — an unbackfilled deploy would have silently
flipped all 7 to `clear` and unblocked planning for people who may genuinely need a GP letter. Craig
confirmed the backfill; ran
`supabase/migrations/20260801_gp_clearance_required_manual_backfill.sql` directly against prod
(`profile.health.gp_clearance_required = true` for those 8), confirmed via a follow-up query. Esther
now owns the flag from here and can un-tick any of the 8 if she disagrees with the old rule's call.

Pushed straight to `main` (fast-forward from the worktree, commit `43d81d3`) — Coolify auto-deploy is
on for this project, no manual trigger needed. `tsc --noEmit` clean throughout; no UI smoke test done
this session (no browser/login access) — worth a quick look at Nathan Wadey's Compliance tab and the
Tasks board Overdue filter next session to visually confirm.

## Session close — 2026-08-01 (afternoon) — Training block module redesign shipped; Design Parity Gate added as a global rule after a real miss

**Training block module redesigned against a new OpenDesign mockup, in 4 commits, all deployed and log-verified.**
Craig asked to scope a redesign of the block overview/edit/schedule flow (accordion always fully
expanded, no way to edit a block's own note/summary/status, "Edit session" took two clicks). Wrote
`.context/brief-block-module-opendesign.md`, OpenDesign produced `hub-block-module.html`
(3 screens: block overview, Edit Block drawer, session-edit entry) in
`D:\apps\design-systems\ef-control-hub\`. Dispatched one OpenCode lane
(`.context/lane-brief-block-module-2026-08-01.md`) — first launch attempt used
`openrouter/anthropic/claude-sonnet-5` with no real justification (Craig had already removed his
OpenRouter key after prior sessions burned through shared credit; now a standing rule — see below).
Relaunched on the script's actual default, `opencode-go/deepseek-v4-pro`. Lane delivered: `PATCH
/api/blocks/[id]`, new `EditBlockDrawer.tsx`/`BlockActions.tsx`/`BlockOverviewClient.tsx`, collapsed-
by-default week/session accordion (auto-opens only the next incomplete session), `?edit=1` deep link
into the session editor's edit mode. Commit `f10daa9`.

**That first deploy crashed in production** — `page.tsx` is an async Server Component but the lane
left an inline `onClick` on a "Hide exercise table" button, which Next.js forbids across the RSC
boundary ("Event handlers cannot be passed to Client Component props"). `tsc --noEmit` was clean
throughout — this class of bug is a runtime-only failure, not a type error, so the build gate never
caught it. Found via Coolify logs, fixed by extracting `HideExerciseTableButton.tsx` as a real
client component, commit `ea68e70`, confirmed clean logs after redeploy.

**Then Craig caught real mockup-parity gaps by eye that I'd never actually checked for.** I had
verified the lane's diff only against my own written brief's checklist (right files touched, PATCH
route exists, `tsc` clean) and reported it done — never against the actual mockup file, because I
don't hold hub login credentials and treated that as a reason to skip visual verification rather
than substitute an element-by-element source comparison. Craig found three real mismatches: the old
KPI-tile band + phase-timeline strip kept instead of the mockup's 4-cell meta-grid (a deliberate but
unflagged scope cut in my own brief), week-row header content differing (extra session-count text +
phase pill the mockup doesn't have), and the exercise table's column count differing (mockup
simplifies to 3 columns; live kept the real 5-column `PrescriptionTable` with Tempo/Rest — a
judgment call, since those are real fields Esther uses, not mockup filler). Fixed the first two for
real via an actual section-by-section comparison against `hub-block-module.html` (commit `9e96f64`,
deployed, logs clean). Craig explicitly said "leave as is" on the table-columns one — that's now a
confirmed, intentional deviation, not an open gap.

**New standing rule: Design Parity Gate**, added to the global `CLAUDE.md` (not just this repo) —
`tsc`/build passing and a diff matching a written brief are not evidence a page matches its mockup.
Before calling mockup-driven UI work done: enumerate every element in the mockup, cross-check each
against the implementation (screenshot diff when browser/login access exists, element-by-element
source diff when it doesn't — no-login is never a reason to skip the check), and proactively surface
any deliberate deviation in the same message that reports completion. Full incident detail and the
process itself live in `CLAUDE.md`'s "Non-negotiable rules" section and the
`feedback-design-parity-gate` memory. Also added `feedback-no-openrouter-default` memory from the
OpenRouter mis-dispatch earlier in this session.

**Separately, fixed a real bug in shared infra**: `D:\apps\infrastructure\scripts\launch-opencode-lane.ps1`
wrapped the `-Prompt` argument in double quotes inside the generated temp `.ps1` file, which gets
re-parsed by PowerShell when that file executes — so any backtick or `$` in a prompt (this session's
brief had `` `useSearchParams` ``) was misread as an escape sequence, breaking the lane launch outright.
Fixed by switching to single-quoted (matching how `-Dir`/`-Model` were already escaped). This was a
latent bug affecting any future lane prompt containing markdown code spans or template-literal syntax
in code samples — not scoped to this session, worth knowing about repo-wide.

**Also fixed, smaller and unrelated**: the client-detail page's tab bar was already correct against
the design-system spec, but `site-review`'s tab bar had drifted (different padding/font-size, no
icons, and wasn't even using the real `TabsList` Radix primitive — a plain styled `div`, silently
dropping tablist accessibility semantics). Extracted `components/hub/HubTabsList`/`HubTabsTrigger` as
the one shared source of truth for both pages, commit `011ca1d`, deployed, logs clean.

**Deployed, in order**: `f10daa9` → `ea68e70` (hotfix) → `9e96f64` (parity fixes) → `011ca1d` (tab-bar
consolidation). All four confirmed `finished` + clean startup logs via Coolify MCP, no manual deploy
triggers (auto-deploy on push, per repo convention).

**Not done / worth knowing**: the exercise-table 5-vs-3-column deviation is confirmed intentional,
not a gap. No other pages were audited for the tab-bar drift pattern beyond the two that actually use
`TabsList`/`TabsTrigger` (grepped, confirmed exhaustive for this codebase as of today).

## Session close — 2026-08-01 — Session editor live-logging shipped + new standing rules applied to this repo

**Session editor + live logging screen, shipped and live-verified.** Built against real Open Design
templates (`hub-session-editor.html`, `hub-session-log.html`, `hub-schedule.html` in
`D:\apps\design-systems\ef-control-hub`) that had already landed but weren't yet built. Found first
that two prior Work Orders (2026-07-25, 2026-07-26) had checked off "cross-section drag" and
"log-type toggle" as done+deployed — verified directly against the live code and that was false;
neither had ever been click-tested. Dispatched one OpenCode lane (`opencode-go/deepseek-v4-pro`,
restarted after an earlier mis-dispatch on `openrouter/sonnet-5` that skipped the standard escalation
ladder — no work was lost, the run had exited with zero commits) covering three units: an explicit
per-exercise `log_type` field (`reps`/`time`, replacing a regex guess on the prescription text — no
migration, just a new `Exercise` key), real cross-section drag-and-drop (previously same-section
only), and a new standalone `/hub/log/[sessionId]` screen reachable from the calendar. Code-reviewed
line-by-line before merge (not trusted on tsc-clean alone) — no fabrication, no undefined CSS vars,
all writes reuse the existing `set_logs`/`session_log` API routes, the new route is genuinely covered
by the `/hub/:path*` auth middleware. Pushed `174b5dc`, Coolify `running:healthy`.

**Then actually live-verified it**, not just merged-and-hoped. Craig pointed out the standing
disposable-verify-account rule applied and I hadn't used it. Created a disposable staff hub login
directly in Postgres (`better-auth` user+account rows, hashed via `better-auth/crypto`), logged into
`staging.eternal-fitness.co.uk/hub`, confirmed live: the new logging screen renders real superset
groups/reps-vs-time badges/prescribed targets correctly, a real "Done" click wrote a genuine
`set_logs` row end-to-end (checked via direct DB query, not the UI), the editor's log-type toggle
renders and is clickable. Cross-section drag was code-reviewed but not physically drag-tested — the
browser tool's drag simulation proved unreliable. All test artifacts (the `set_logs` row, the
disposable account) deleted immediately after.

**Found a real gap Craig caught, not me:** the block page's own session list
(`.../blocks/[blockId]`) never got the "Log this session" deep-link — only the calendar and the
session editor header did. Fixed (`7e3e8f7`), one-line addition reusing `session.id` that was
already in scope, `tsc` clean, deployed.

**Two of Craig's new standing rules (derived verification against an external source; `git
diff --stat` scope review over a green build) got applied and refined, then run against this
repo.** Reviewed the rules as written in CLAUDE.md/SKILL.md/memory, found and fixed 4 real gaps
(the two checks catch different failure modes and the original phrasing conflated them; no
proportionality guard for small fixed sources; no explicit `FORBIDDEN:` field so the diff-stat
check had prose to re-derive instead of a real list; the incident retelling had already started
drifting across the three copies). Then built `.context/tools/verify-hub-pages.js` — derives hub
routes via `git ls-tree` and mockups via `readdir` at run time, reports mismatches in **both**
directions, run live via another disposable account. Found and fixed two false-positive classes in
the check itself before trusting any output (an SVG-region-detection bug that reported all 13
pages' logo fills as violations; embedded email-template previews on `/hub/reports/updates`
correctly using inline hex, reported as 573 "violations"). Real findings that survived: **a
`hub-documents.html` mockup appeared today**, contradicting a 2026-07-26 Work Order's documented
"real, not mocked" claim for `/hub/documents` — exactly the drift the new rule exists to catch, on
this project, the same day the rule landed. Also found a genuine, unrelated **HTTP 500 on
`/hub/site-review`**, and two routes missing from the join table (added). Tool committed and
pushed (`ffb623d`).

**Housekeeping:** three fully-merged stale worktrees removed (`admin-dashboard-design-review-9fde06`,
`design-changes-0c4d4c`, `tasks-template-parity`, all verified ancestors of `origin/main` first,
node_modules junctions unlinked cleanly). 12 already-orphaned leftover directories in
`.claude/worktrees/` (no `.git`, ~860K total) identified but not removed — bulk-delete kept getting
blocked by the session's permission classifier; the exact command to run is in the session log if
this needs picking up. One benign stray merge commit (`34d5922`, an "emdash" tool session's local
branch that got pushed straight to `main`) found and checked — no content lost, all files verified
byte-identical across it.

**Not done / worth knowing:**
- No hub credentials exist by default in this environment — every live-verification pass this
  session needed a disposable account created fresh via direct Postgres access. That's now the
  established pattern (see `[[feedback-disposable-verify-accounts]]`), not a one-off.
- Cross-section drag-and-drop itself: code-reviewed thoroughly, not physically drag-tested.
- `/hub/site-review` HTTP 500 — found, not investigated further.
- `hub-documents.html`'s relationship to the same-day `9107985` commit (which redesigned that exact
  page 12 minutes after the mockup appeared) — not confirmed whether that commit was actually built
  against the new mockup or is coincidental. Worth checking before assuming it's covered.
- `hub-sop.html` still has no confirmed live counterpart (re-confirmed via the new tool, not stale).
- Full consolidated outstanding-items list (superseding scattered notes across all `workorder-*.md`
  files) now lives at `.context/outstanding-items-2026-08-01.md` — check there first, not each WO
  file individually.

## Session close — 2026-07-31 — Odul portal-login diagnosis + calorie calculator verbatim swap

**Odul portal login ("doesn't allow me to login"):** Queried `portal_accounts`/`clients` directly
against prod via the standing tunnel. Account existed, not disabled, and the stored scrypt hash
matched the password Craig gave verbatim — `last_login_at` even showed a successful login already
recorded a few minutes after the account was created. Backend/DB were never the problem; Craig
confirmed afterwards it was working. No code changes.

**Calorie Calculator — replaced with Esther's verbatim HTML:** `/calorie-calculator` was already
unlinked from nav/footer and hard-redirected to `/` (disabled 2026-07-30, commit 350e586). Esther
now wants the page kept but its content replaced entirely with her own
`client-tools/calorie-calculator.html` (from Craig's OneDrive), byte-for-byte, still hidden from
nav/footer as a "temporary fix." Deleted the old React build
(`CalorieCalculatorPageClient.tsx`/`page.tsx`/`calorie-calculator.css`); added
`app/calorie-calculator/calculator-source.html` (the verbatim file) plus
`app/calorie-calculator/route.ts`, a raw `Response` handler (not routed through React) so the
file's inline `<script>` executes unmodified, exactly as it would if opened directly — a
dangerouslySetInnerHTML approach would NOT have run that script. Removed the next.config.js
redirect that was fully blocking the route; added a `noindex` meta tag since it's still meant to
be unlisted. Verified live in the browser preview — calculator computed real numbers (1,918 kcal
maintenance on defaults), confirming the script runs. tsc clean. Committed
(8867df7) and fast-forward pushed straight to `main` (2 commits behind first, fast-forwarded from
origin/main, no divergence) — Coolify auto-deploy will pick it up. Not yet re-verified against the
live prod URL post-deploy.

## Session close — 2026-07-30 — hub + portal mockup audit (no dispatch yet) + AccreditationStrip fix

Craig asked for the hub-facing and client-portal `brand-staging-2662e9` mockups — everything the
2026-07-29 marketing-page reconciliation didn't cover — audited against the live app, with real
deltas turned into new Work Order lanes ready for OpenCode. Full detail, including every lane's
exact files and VERIFY steps:
`.context/workorder-hub-portal-mockup-audit-2026-07-30.md`.

**Already aligned, no lane drafted:**
- All 14 hub-*.html mockups not individually re-diffed this round (hub-dashboard, hub-clients,
  hub-client-detail, hub-client-edit, hub-parq-edit, hub-exercise-library, hub-process-quality,
  hub-reports-updates, hub-site-content(-editor), hub-studio-equipment, hub-plan-agent-settings,
  hub-training-rules, hub-schedule) — the 2026-07-26 hub design-alignment WO already reconciled
  every one of these, all 8 lanes shipped and merged. Their 2026-07-28 07:48 batch timestamp (after
  that WO closed) looked like a real-change signal at first, but spot-checking hub-dashboard.html and
  fully deep-diffing hub-tasks.html (below) found no actual content drift — treated as a bulk
  copy/export event, not a revision.
- **hub-tasks.html** — deep-diffed in full against `TasksManager.tsx` despite its own later (20:04)
  timestamp specifically flagging it as a possible outlier. Structure matches exactly (3-column
  kanban, bucket chips with rename/delete, My/All Tasks toggle); the live page is actually **ahead**
  of the mockup (due-date filter pills + sort control, both shipped 2026-07-28, neither in the
  mockup). Real reassurance that the 07:48 batch timestamp isn't a meaningful signal on its own.
- **portal-account.html** and **portal-documents.html** — both match their live counterparts closely
  (section-by-section for Account; filter chips/search/grouping for Documents) — both were built
  (`481c3cf`) after the mockups' 2026-07-28 18:20–20:14 update, so they already reflect it.
- **portal-document-sign.html**'s 3-step flow (Check → Sign → Confirm) matches almost exactly —
  one real gap (missing draw-signature option) called out as a lane below, everything else aligned.

**New lanes drafted (not yet dispatched — need Craig's read first):**
1. **Portal home restructure** (medium-large, `[AUTO]` with a preservation constraint) — mockup is
   task-first (personalised greeting, "Needs you" action cards for outstanding signature/PAR-Q, next-
   session card, recently-shared docs, roadmap); live page is analytics-first (Quick Tools, doc-count
   tiles, `ExerciseTrendsPanel`, update-email history). Lane rebuilds the top of the page to the
   mockup's task-card treatment using data already being fetched, but explicitly must NOT drop the
   Progress panel or Update email history — both are real, wired, DB-backed features the mockup
   doesn't show at all.
2. **Document view table-of-contents nav** (small-medium, `[AUTO]`) — mockup has a sticky, numbered
   "What is in this document" jump-nav that moves focus to the target heading; live page renders
   sections as a flat list with no jump nav, despite already having `id`/`title` on every section.
3. **Document sign: add draw-signature option** (medium, `[AUTO]`) — mockup offers Type/Draw as
   equal choices; live only implements typed. Flagged to check `/api/documents/[id]/sign`'s actual
   accepted shape before wiring a canvas — it currently only handles a plain-string signature, and a
   drawn signature will need to carry image data.
4. **PAR-Q editor: add section-jump sidebar** (small-medium, `[AUTO]`) — mockup shows all 6 sections
   with done/current/todo state, clickable to jump directly; live editor only has sequential
   Next/Back, no jump nav, despite already having the section array in scope.
5. **Portal sign-in auth mechanism** (`[GATE]`, not dispatched) — mockup is a passwordless email +
   6-digit one-time-code flow with split-screen studio photography; live page is a traditional
   email+password form. This is an authentication-mechanism change (code generation/send, code
   verification, session issuance), not a visual pass — parked pending Craig's call between building
   the real OTP flow, reskinning the existing password form to the mockup's layout, or leaving as-is.
6. **hub-sop.html — no lane, flagged as ambiguous.** Content is a single example SOP document view,
   not a documents list; its own sidebar nav doesn't match `HubSidebar.tsx` or any other current hub
   mockup's grouping. The old brief's mapping to `/hub/documents` doesn't fit the actual content.
   Needs Craig's steer on what this file is for (a Process & Quality SOP detail view? a stale draft?)
   before scoping any work against it.

**Not deeply audited this round, flagged rather than assumed aligned:**
portal-calorie-calculator.html vs `CalorieGuideClient.tsx` (695 lines, built same session as this
specific mockup per `0426aa0` — likely aligned, worth a quick visual QA pass, no structural delta
found in the time available).

**Separately, same session — small fix, done and committed:** `components/ds/AccreditationStrip.tsx`
reduced from 3 badges (SafeFit, REPS, FitPro) to FitPro only, per Craig's 2026-07-30 confirmation.
Checked every render site first (`grep -rn "AccreditationStrip" app/ components/`) — the component is
exported via `components/ds/index.ts` but not currently instantiated anywhere in `app/`, so this is
zero visual-impact today. `tsc --noEmit` and a full `next build` both clean. Left the unused
SafeFit/REPS PNGs in `public/images/accreditations/` untouched, per instruction (asset cleanup was
explicitly out of scope).

**Process notes:** built in an isolated worktree (`D:\apps\eternal-fitness-website-wt-hub-portal-audit`,
branch `chore/hub-portal-mockup-audit`, branched fresh off `origin/main`, `node_modules` junctioned
from the shared checkout) per DO-SOP-010. Two commits made (WO-file addition, AccreditationStrip fix)
— **neither pushed**, since the lane list needs a human read before any `[AUTO]` unit goes to
OpenCode, per the task brief. Worktree left in place for review, not cleaned up yet.

---

## Session close — 2026-07-29, final — two real gaps Craig caught via screenshots, both fixed

After the round-2 reconciliation below, Craig sent screenshots of the actual live site (not descriptions)
pointing at two remaining problems the earlier pass had missed or introduced:

1. **Home's Approach section still had an extra card** — "No weigh-ins. No judgement. No agenda." next
   to the qualifications card. Re-checked the mockup: it has only ONE credential band (`.cred-band`, a
   single aside), not a 2-card grid. The second card had zero mockup equivalent — should have been
   removed in the first pass, not just left restyled. Removed it; rebuilt the qualifications block as
   the mockup's actual single-card layout (icon+checklist left, heading+paragraph right). Commit `8860624`
   also fixed a separate miss from the same pass: the Approach section's 3 step images were still on old
   placeholder filenames instead of the mockup's real client photos — never audited in the original pass
   since Approach wasn't on the original GATE list.
2. **"Testimonials styling is wrong"** — investigated rather than guessed. The two-card testimonial
   rebuild from the earlier pass reused CSS classes (`.tmark`/`.tquote`/`.tnm`/`.tlo`) written for the
   *old* dark-teal single-spotlight background — white text, translucent white accents. Moved onto a
   white card background, that text rendered white-on-white: invisible. Confirmed via
   `getComputedStyle().color` checks before and after (not a visual guess) — replaced with new
   `.quote`/`.quote-mark`/`.quote-by`/`.avatar` classes matching the mockup's actual card CSS.

Both fixed in isolated worktrees (`8860624`, `40ec639`), `tsc`/`next build` clean, Coolify-confirmed
`running:healthy` via MCP both times (not just deploy-status self-report).

**Process note, worth carrying forward**: caught and corrected a third mid-session slip of editing
directly in the shared checkout instead of a worktree (recovered via `git stash`, no work lost — see the
two earlier instances in this same session's history). Also: two of the three real gaps in this whole
reconciliation effort were only caught because Craig looked at the actual rendered page and sent
screenshots with element selectors — "the code matches what I intended to build" is not the same claim
as "the code matches the mockup." A full section-by-section screenshot diff against every mockup file
should have been the default on the first pass, not a follow-up triggered by Craig's frustration.

---

## Session close — 2026-07-29, later still — full mockup reconciliation round 2 (hero gradient + page-section cleanup)

Work Order: `.context/workorder-mockup-reconciliation-2026-07-29.md`. **DONE + DEPLOYED**, pending only
Craig's own click-through (never this session's to do).

Direct continuation of `workorder-design-reconciliation-2026-07-28.md`, which shipped all 7 lanes but left
~10 `[GATE]` items open pending Craig's call. Craig resolved every one of them in a single instruction:
"update each page to match the open designs I gave you and remove the sections not required... only
follow the open-design." He'd also updated the `brand-staging-2662e9` mockup files again same-day —
found and fixed the actual gradient he called "awful": the old flat single-layer hero scrim was replaced
across all 6 launch pages with a richer 3-layer (bottom/top/left) scrim, and the old two-column "split"
hero pattern was dropped entirely in favour of one unified full-bleed treatment.

**Lane A (shared hero) — merged `b6515b7`:** reworked `PageHero.tsx`'s "overlay" variant and
`design-system.css`'s `.ds-hero`/`.ds-hero-bg`, plus `HomePageClient`'s own bespoke hero + `home.css`,
to the new full-bleed pattern; retired the "split" variant everywhere (About/Contact/FAQs/Personal
Training/Pricing all moved off it). **Real bug caught during verification**: Next's `fill` image mode
sets `right:0` and Tailwind's `img{max-width:100%}` preflight reset both silently overrode the mockup's
per-image `--pan` width framing (e.g. About's hero photo should render at 108% width, panned left) — it
kept computing back down to exactly the container width until an explicit `right:auto`/`maxWidth:none`
override was added and confirmed via computed-style checks in a real browser (not just visual guessing).

**Lanes B–G (page sections) — merged `fdca133`:** every `[GATE]` item from the prior WO resolved to
"match mockup, remove the rest" — About lost its AccreditationStrip/StatBadge/JourneyPath decorations
and got its Philosophy section rebuilt as a dark ink band; Contact's Google Maps embed was replaced with
the mockup's studio photo section, and a duplicate "Not Sure Where to Start?"/"Follow Me" sidebar block
(already covered by the closing CTA band) was removed; Personal Training lost its extra Credentials
StatStrip and got a 4-card "What We Work On" grid plus a dark Specialist Training band; Pricing's
"What You're Investing In" was simplified to the mockup's statement + CTA and "Not Sure Which to
Choose?" was restored as its own standalone dark band; Home's Who + Specialist Training sections merged
into one dark band and Testimonials became two equal-weight cards on white instead of a single-spotlight
teal layout. FAQs needed no page-section work — its default-open accordion and "Still not sure?" band
were already shipped in the 2026-07-28 pass.

**Two things deliberately not ported from the mockup, flagged inline rather than silently applied:**
the mockup's Specialist Training copy (Home, Personal Training, Pricing) lists named conditions
(heart/blood pressure, bone/joint, visual impairment, cancer rehab) — a direct roll-call this project's
own hard rules ban on general pages ("No condition roll-calls in copy — generalise"); kept the
generalised copy instead. And the mockup's "See Specialist Training" links point at
`/exercise-for-health`, which currently redirects to Home (disabled per the 2026-07-27 launch-scope
decision) — kept those links pointing at `/contact`/`/personal-training` instead so they go somewhere live.

Both commits built in isolated worktrees per DO-SOP-010 (after catching and correcting two direct-edit-
on-shared-checkout mistakes mid-session — recovered via `git stash`, no work lost), `tsc --noEmit` +
full `next build` clean, browser-verified via computed-style checks across all 6 pages before pushing.
Fast-forward pushed to `main`, Coolify auto-deploy confirmed via MCP. **Not yet click-tested by Craig** —
that's the one remaining item on the Work Order.

---

## Session close — 2026-07-29, later — hub sidebar sign-out unreachable on tall pages

Craig reported "can't log out of the profile, no logout option" in the Trainer Hub. The sign-out
control was never missing from the code (HubSidebar.tsx bottom footer, "Esther Fair" + icon button) —
the `<aside>` had no height/position rule, so as a flex sibling it stretched to match main content
height. On any hub page taller than one screen (client list, a long client detail page), that pushed
the sign-out footer down to the very bottom of the whole page instead of the viewport, making it
effectively unreachable without scrolling the entire page to its end. Fixed by pinning the sidebar
(`sticky top-0 h-screen`) so it now stays in view regardless of main-content scroll position. Built in
an isolated worktree (`fix/hub-sidebar-logout-scroll`), `tsc --noEmit` clean, fast-forward pushed to
main (`64872ac`), Coolify auto-deploy confirmed finished and `running:healthy` via MCP. **Not yet
click-tested in a real hub session** — Craig has the only hub login, so a real click-test on his end is
still outstanding.

---

## Session close — 2026-07-29 — template deployment audit: calorie calculator, portal pages, FAQ update

Work Order: `.context/workorder-template-deployment-audit-2026-07-29.md`. **DONE + DEPLOYED + LIVE-VERIFIED.**

Craig split `D:\apps\design-systems\brand-staging-2662e9\template-index.html`'s 32 "current" templates
into individually reviewable pieces and asked what's still undeployed. Audited every one against its
live route: all 7 marketing + 17 Hub templates already existed (Hub's "SOPs" merges into Process &
Quality — checked, no real gap, richer than the mockup). The client portal was the actual gap — 4 of 8
templates missing outright, 2 more information-architecture judgment calls.

**Craig's calls, both baked into the build:** Documents gets its own dedicated `/portal/documents` page,
not folded into the dashboard. Document signing supports both paths — the existing no-login magic-link
route (`app/documents/[id]/sign/page.tsx`) stays untouched, and a new portal-wrapped signing page was
added for already-logged-in clients — both call the same `POST /api/documents/[id]/sign`.

**Built via OpenCode** (`opencode-go/deepseek-v4-pro`, explicit `--model` per
`D:\apps\infrastructure\scripts\launch-opencode-lane.ps1`'s own warning about the silent free-tier
fallback), each lane in its own worktree, none trusted on self-report:

1. **`5decb98` — Lane A, calorie calculator.** New `app/calorie-calculator/page.tsx` (public) and
   `app/portal/(protected)/calorie-guide/page.tsx` (portal-wrapped, personalised where client data
   exists). Ported from the Claude Artifact + the two mockup files, not invented. Shared calc logic in
   `lib/calorie-calculator.ts` (Mifflin-St Jeor BMR, TDEE, macro splits, unit converters). Nav/footer
   links added.
2. **Lane B — Hub SOPs parity check.** Read-only, no code. Verdict: no real gap, live is functionally
   richer than the static mockup (real CRUD vs. decorative buttons). Closed without a build unit.
3. **`d6462fa` + `478a255` + `92b5b33` — Lane C, portal pages.** 5 new routes: Account, Documents list,
   Document viewer, Document edit, Document sign (portal-wrapped). **Real bug caught before merge**: the
   new Account page queried `phone`/`address`/`emergency_contact_name`/`emergency_contact_phone`/
   `gp_surgery` straight off the `clients` table — those columns don't exist there (confirmed against
   every migration). Would have silently shown blank dashes for every real client forever. Fixed
   (`478a255`) to pull the latest `signed_parq` submission by `client_id` instead, matching the pattern
   `app/hub/(protected)/clients/[id]/parq/page.tsx` already uses. Document viewer specifically checked
   for IDOR (correctly scoped by `client_id` — a sibling repo had exactly this bug before) — clean.
4. **`4400365` — Lane D, FAQs update.** Re-diffed against the current mockup; only real difference was 2
   stale images (hero, CTA band), both swapped to already-existing assets. Originally scoped
   build-only-hold-for-review; **Craig explicitly approved publishing it alongside A/C**, overriding that
   default.

**Merge:** all 3 lanes rebased onto a shared `main` tip in sequence (A → C → D). One real conflict —
Lane A's new "Quick tools" card and Lane C's document-summary-card restructure both touched
`app/portal/(protected)/page.tsx` — resolved by hand, kept both. Final combined `tsc --noEmit` + `next
build` clean. Pushed `c77a726`.

**Deploy took 3 attempts, not a code issue.** Coolify auto-deploy (already ON) picked up the push. First
attempt stalled with the build log frozen for several minutes — cancelled. Second attempt **actually
compiled successfully end to end** (`✓ Compiled successfully`, all 78 pages generated, collecting build
traces) and only failed at Coolify's own post-build finalize step (`sudo docker exec ... bash
/artifacts/build.sh` exit code 255) — this matches a documented transient infra pattern already seen on
this app (`workorder-eternal-fitness-hub-consolidation-2026-07-20.md`: "build's exec channel dying after
it had already compiled successfully"). Third attempt cleared cleanly; Craig confirmed live. The
previous container stayed `running:healthy` throughout — zero downtime at any point.

**Live-verified via real browser** (not deploy-status alone): `/calorie-calculator` renders fully,
calculates correctly (tested: 1,918 kcal maintenance for the default inputs), nav/footer links present,
no console errors. `/faqs` loads clean. `/portal/documents` correctly redirects an unauthenticated
visitor to sign-in (can't click-test past login — standing rule, no credentials entered into any form).

**Not done / carried forward:**
- Portal auth-live GATE (from the 2026-07-20 hub-consolidation WO) is still not flipped — no real client
  has been invited to sign in. This session only added pages behind that gate, didn't open it.
- Weight/height pre-fill on the portal calorie guide isn't implemented — `clients` has no
  `weight_kg`/`height_cm` columns yet. Manual entry works as designed in the meantime.
- **Flagged, not fixed:** the homepage `<title>` still reads "Level 4 Personal Trainer in Worthing",
  spotted during live verification — this directly violates the hard rule resolved 2026-07-27 (the
  approved wording is "Level 4 qualified in Cancer and Exercise Rehabilitation," never "Level 4 Personal
  Trainer" standalone). Spun off as a separate task (`task_450b6958`) rather than fixed inline, since it
  was outside this Work Order's scope.
- Specialist Training catalogue and Blog rewrite both stay explicitly deferred to post-launch per
  Craig's direct instruction this session — neither has a lane, nothing was touched.

Worktrees removed, branches deleted, `node_modules` junctions unlinked cleanly (the known "Filename too
long" gotcha — unlink via `cmd /c rmdir` on the junction before `git worktree remove`, not after).

---

## Session close — 2026-07-28 (evening) — update-composer paste fixes, portal document/update viewing, and a real send/resend delivery-history feature

Six shipped items, all pushed straight to `main` (auto-deploy confirmed ON), each built in its own
isolated worktree per DO-SOP-010 and confirmed `running:healthy` via Coolify MCP before moving to the
next. Started from Craig reporting Emma's actual update email came out with different text than what he
pasted in.

1. **`5f64b03` — bypass-AI paste for the "New Update" composer.** Root cause: the compose screen was
   always an AI chat — pasting a fully pre-written update sent it as a chat message, and "Create Draft"
   always ran a fresh AI generation from a 4000-char-truncated conversation summary, silently rewriting
   Craig's actual wording. Added a "Paste a draft" option that bypasses AI entirely: new
   `lib/email-templates/parse-pasted-update.ts` splits pasted text into sections by heading detection and
   maps them onto the current template's fixed section keys (or straight into Flexible's custom
   sections), loading the content verbatim.
2. **`ff46fe2` — opening line made WYSIWYG + Flexible Update set back as the default template.** The
   intro-line field was a plain `<Input>` (no formatting); switched to the same `RichTextEditor` used
   everywhere else. Separately, the "add/remove sections" controls Craig remembered were still exactly
   where they'd always been (gated to the Flexible template, untouched by anything today) — but Flexible
   used to be the *only* template, so it was always the default; once 6-Week/4-Week (fixed sections, no
   add/remove) were added ahead of it in `UPDATE_TEMPLATE_KINDS`, a new update silently defaulted to a
   template with no add/remove UI at all. Reordered the array so Flexible is first/default again.
3. **`295e7ca` — paste parser didn't detect headings without blank lines.** The first paste fix's heading
   heuristic required a blank line immediately before a heading — but real pastes from Word/Docs/Gmail
   have one paragraph per line break with **no** blank line between paragraphs, so nothing after the
   first line ever got recognised and the whole email collapsed into one block. Removed the blank-line
   dependency; headings are now detected purely by shape (short line, no trailing sentence punctuation).
   Also added `*`/`-`/`•`-prefixed line grouping into a real `<ul>`.
4. **`f05aab0` — the paste box itself was plain-text-only, stripping bold/headings before the parser ever
   ran.** Craig's actual complaint after #3: pasted content still lost all bold/heading formatting,
   because the "Paste a draft" input was a plain `<textarea>` — the HTML spec always flattens clipboard
   content to plain text on paste into a textarea, no matter what the source had. Swapped it for the same
   contentEditable `RichTextEditor`, which preserves native clipboard HTML. Added
   `parsePastedHtmlUpdate()`, which reads the real DOM structure directly — recursing through the
   single-wrapper-div pattern Google Docs/Word commonly export (`<b id="docs-internal-guid-…">` /
   `<div class="WordSection1">`) to find the actual paragraph/heading/list elements, detecting headings
   via real `<h1-6>` tags or the same short-line heuristic, and keeping inline bold/italic/links and real
   `<ul>` lists intact in the section HTML instead of re-escaping everything flat. Falls back to the
   plain-text line parser if the paste carried no real block structure.
5. **`bb482bf` — client portal documents list had no click-through.** Same root cause pattern as #1's
   symptom, different feature: both the "Signed documents" and "Outstanding documents" lists on
   `/portal` rendered each row as a plain `<li>`, no `<Link>` anywhere — the sign/view page itself
   (`app/documents/[id]/sign`) already worked fine for both states, the list just never linked to it.
   Wrapped both rows in `<Link href="/documents/{id}/sign">`.
6. **`ac47f67` — real send/resend delivery-history feature (Craig's own ask, not a bug report) + portal
   update-email viewing.** Both `sent_updates` and `client_documents` stored one mutable `sent_at`/
   `sg_message_id`, overwritten on every resend — so once something was resent, there was no way to
   answer "did the first one actually go out, and when" (Esther's actual problem: clients sometimes claim
   they never received something, and only Craig could check via Resend's own dashboard). Added an
   append-only `email_send_events` log (migration `20260728_email_send_events.sql`, applied live —
   additive only) written on every dispatch across all 4 call sites for updates (create-flow, resend
   endpoint, cron dispatcher) and the document send-email action; the Resend webhook
   (`app/api/webhooks/resend/route.ts`) now also handles `email.delivered`/`bounced`/`complained`
   (previously only `opened`/`clicked`) and matches against both `sent_updates` and `client_documents`
   (`client_documents` never had a `sg_message_id` column before — added). New
   `components/hub/EmailDeliveryTimeline.tsx` server component renders that log as a collapsible
   "Delivery history" panel on the per-client updates list and the document detail page. Separately,
   portal's "Update email history" list now links sent updates through to a new `/portal/updates/[id]`
   view page (client-scoped, drafts excluded), mirroring #5.
   - **Backfilled 27 historical records** (10 sent updates, 17 sent/signed/superseded documents) with one
     `sent` event each, using their existing `sent_at` as the timestamp, tagged `meta.backfilled: true`.
     Honest caveat, told to Craig explicitly: `sent_at` only ever held the *last* known send — if anything
     was resent before today, the true first-send date is already gone and unrecoverable (Resend's API has
     no bulk "list everything sent" endpoint, dashboard-only, and we never stored per-send message IDs
     historically). Everything from this deploy onward has complete real history — confirmed live: a real
     update sent minutes after deploy was correctly captured with both a `sent` and a `delivered` event.

**Not done — needs Craig, not deployable:** the Resend webhook now handles 3 new event types, but Resend
only fires events you've explicitly subscribed to per-endpoint in their dashboard — currently only
`opened`/`clicked` are enabled. Add `email.delivered`, `email.bounced`, `email.complained` to the webhook
subscription (Resend → Domains → your sending domain → Webhooks) or delivery/bounce data won't start
populating. No live click-test of any of the 6 items in a real logged-in hub session this session
(standing limitation, no hub credentials in this environment) — worth a real click-through next time
Craig's in the hub, particularly the Delivery history panels and the portal paste/view flows.

**Also this session, unrelated to the above:** created a real client-portal login for Ian Healey
(client #9) via the same scrypt/`portal_accounts` mechanism `invitePortalAccount()` uses — deliberately
did *not* trigger the "your portal login" invite email, so the credentials went straight to Craig for him
to preview first rather than to Ian unprompted. Credentials are in the chat transcript, not repeated here.

---

## Session — 2026-07-28 (later) — full 6-page design reconciliation Work Order, all AUTO lanes shipped

After the footer-only fix (below), Craig flagged that the whole `brand-staging-2662e9` mockup files were
the intended design, not just the footer's uncommitted diff. Ran a 6-way parallel Explore-agent audit
(one per launch page) comparing each mockup section-by-section against its live `*Client.tsx` — found
two shared components (`PageHero`, `CTABand`) had drifted from the mockup's pattern site-wide, plus
~15-20 page-specific gaps, several genuine judgment calls. Promoted to a Work Order
(`.context/workorder-design-reconciliation-2026-07-28.md`, 7 lanes: A = shared components, B-G = one
page each) and ran it: Lane A dispatched to OpenCode and merged first (`ed129f2`), then Lanes B-G
dispatched to OpenCode in parallel and merged one at a time as each was hand-reviewed, `tsc`/`next build`
verified, and browser-checked — not trusted on self-report. Two real defects caught pre-merge: Lane C's
diff had silently deleted 2 GATE-tagged elements (StatBadge/JourneyPath overlay, AccreditationStrip)
while its own comment falsely claimed they were kept; Lane D's form validation silently failed on invalid
submit (no error feedback at all) after the success-state rework. Both fixed before merging. All 7 lanes
landed on `main`, Coolify auto-deploy confirmed, and a full 6-page browser sweep against
`staging.eternal-fitness.co.uk` confirmed every change live (one page hit a transient Gateway Timeout on
first load during the deploy swap, resolved cleanly on retry — not a real bug). ~10 `[GATE]` items left
deliberately unresolved and code-commented (nothing deleted) for Craig's call — see the Work Order file's
DONE section for the full per-lane list; the two Specialist Training catalogue items (Personal Training,
Pricing) are the same root open item already tracked in `state.md`. Full technical detail (every unit,
every review fix) is in this session's transcript and `.context/loop-status.md`.

## Session — 2026-07-28 (morning) — footer redesign shipped to staging

Craig asked to bring the site's design in line with a footer redesign he'd just made in the
`brand-staging-2662e9` mockups (about/contact/faqs/homepage-redesign/personal-training/pricing.html —
all 6 launch pages carried the identical diff). Rebuilt `components/Footer.tsx` to match: 3-column nav
(Explore/Training/Get in touch), a "Book a free consultation" CTA to `/contact`, a qualifications strip,
updated Facebook URL, a Cookies legal link, ink background — replacing the old dark-navy layout with
social icons (FB/IG/LinkedIn/YouTube) and an accreditation-badge strip, per Craig's explicit choice to
match the mockup exactly rather than merge those back in. Built in an isolated worktree (DO-SOP-010),
`tsc`/`next build` clean, browser-verified at desktop + mobile widths across all 6 pages before push.
Caught and fixed a real bug pre-ship: several Tailwind opacity utility classes (`text-white/62` etc.)
silently generated no CSS because Tailwind's bare `/NN` modifier only matches the theme's 5-step opacity
scale, not arbitrary numbers — rounded to valid steps. Pushed `9d57c81` to `main`, live-verified via a
real browser fetch against `staging.eternal-fitness.co.uk` (not just Coolify's status field — a redundant
manual force-redeploy triggered mid-check happened to fail on a transient build issue, confirmed harmless
since the site was already serving the new footer from the webhook-triggered deploy that landed first).
Full detail in `decisions.log`'s 2026-07-28 entry. Worktree removed, branch deleted, fully merged.

---

## Session close — 2026-07-28 — hub tasks: due-date filtering, sorting, "Due This Week" banner

**What happened.** Craig asked for the `/hub/tasks` board to support filtering/sorting by date, plus a
"what's due this week" banner. Built entirely client-side against the existing `due_date` column
(migration `20260725_hub_tasks.sql`) — no schema change, no migration needed.

**Shipped in `app/hub/(protected)/tasks/TasksManager.tsx`:**
- **Due-date filter pills** — All / Overdue / Due Today / Due This Week / No Due Date, live counts,
  sitting alongside the existing bucket-filter row.
- **Sort control** — Due date / Date created / Title, with an ascending/descending toggle. Tasks with
  no due date always sort last regardless of direction (a plain array reverse would otherwise flip them
  to the front on descending — handled explicitly with a signed comparator instead).
- **"Due This Week" banner** — appears above the board whenever any non-done task is due within 7 days
  (including overdue). Rose/warning styling if anything is overdue, amber otherwise; shows up to 6 tasks
  as clickable chips (opens the task's edit form) plus a "+N more" chip that applies the Due This Week
  filter.

**Built in an isolated worktree per DO-SOP-010** (`D:\apps\worktrees\eternal-fitness-website-task-filters`,
branch `task/hub-tasks-filters-2026-07-28`, off fresh `origin/main` — confirmed unmoved since branching).
`node_modules` junctioned from the shared checkout (first attempt via `cmd /c mklink /J` inside the Bash
tool produced a malformed double-drive-prefix symlink target under git-bash's path translation — redone
via the PowerShell tool instead, which junctions correctly). `tsc --noEmit` clean and a full `next build`
clean (`/hub/tasks` compiles at 8.05 kB), both run before push. Fast-forward pushed straight to `main`
(`e5347ef..087ae2e`) — Craig's go-ahead was for the push, and auto-deploy is already ON for this app, so
no separate deploy trigger was needed. Confirmed `running:healthy` via Coolify MCP post-deploy
(`last_online_at` matches the deploy timestamp).

**Worktree cleanup hit one snag, resolved cleanly.** `git worktree remove` failed with "Filename too
long" — the junctioned `node_modules` confused git's own recursive-delete walk. Confirmed the *shared*
checkout's real `node_modules` was untouched (523 entries, unaffected) before doing anything else, then
unlinked the junction directly (`cmd /c rmdir` — a plain rmdir on a junction unlinks it without
recursing into the target, unlike `rm -rf`), which let a plain directory delete finish the cleanup.
Worth remembering for any future junctioned-`node_modules` worktree: unlink the junction as its own step
before asking git or a recursive delete to touch the worktree directory.

**Not done:** no live, logged-in click-test — same standing limitation as every other hub session (no
hub credentials in this environment). Worth Craig's own look next time he's in the hub.

## Session close — 2026-07-27 (evening) — launch-page copy alignment + 4 follow-up UI fixes

**What happened.** Craig reported that the morning's launch-copy commit (`3f50bd8`) had shipped
content differing from the agreed source doc, `EF_Launch_Pages_Redraft_Jul2026.docx` (workspace repo).
It was a real divergence, not a misread: Home and About had each taken the doc's new hero/story copy
but kept clinical-first sections and elements the doc explicitly replaced. Five commits followed, all
deployed and live-verified in a real browser:

| Commit | Fix |
|---|---|
| `74b2fa9` | All 6 launch pages aligned line-by-line to the doc (Home badge placement, GP-badge removal, Who-card order, Specialist Training band, corrected testimonial; About Experience/Philosophy rewrite + Colin F testimonial; PT Specialist Training section) |
| `5f4ca6e` | Removed duplicate "I'm Esther — a personal trainer…" intro appearing in both hero and Why section (regression introduced by `74b2fa9`) |
| `eee2be1` | CTA-band photos cropping Esther's head off on wide screens — added `imagePosition` prop to `CTABand`, top-biased the 5 photos featuring her |
| `ed51b6f` | Hero heading descenders clipped — `.hw`'s `padding-bottom: .04em` resolved against the inherited 16px body font, not the 78–92px heading; moved onto `.hl` |
| `97dba83` | Homepage **section order** corrected to the doc's sequence (Who / Specialist Training sat before The Approach instead of after) |

**Process notes worth carrying forward.**
1. **A DO-SOP-010 violation happened and was caught.** The `loop-status.md` update was first committed
   directly in the shared checkout. The push was rejected (non-fast-forward — the shared checkout's
   local `main` was stale), which surfaced it immediately. Reverted, fast-forwarded the shared checkout,
   redid the same edit in a worktree, pushed cleanly (`d14adf2`). No damage, but it is the exact failure
   mode the rule exists to prevent, and it was the stale-local-main rejection that caught it, not
   discipline.
2. **Auto-deploy is confirmed ON for this app** — every push triggered a Coolify deploy via webhook with
   no manual API call. Matches the note in the earlier same-day nav-scrim entry. Don't manually trigger
   a deploy after pushing to this repo.
3. **One deploy failed transiently and needed a manual retry.** `5f4ca6e`'s first deploy built cleanly
   (`✓ Compiled successfully`, full route manifest emitted) then failed at the Docker image-export step.
   The app stayed `running:healthy` on the previous build throughout — no downtime. A manual redeploy of
   the same commit succeeded unchanged. Treat an image-export-stage failure after a clean compile as
   infra flake, not a code problem — but confirm the site is still serving before assuming that.
4. **Verify in a browser, and let the page settle first.** Every fix was confirmed against real rendered
   page text / computed styles, not deploy status. One descender-fix check returned a false "still
   clipped" reading because it ran moments after page load, mid-GSAP-animation and before the web font
   settled; a recheck on the settled page was clean. Re-measure before reporting a failure.

**Not done / carried forward.**
- **The Specialist Training catalogue pages do not exist yet.** Home and Personal Training now both link
  to `/personal-training#specialist` as a placeholder anchor. Deliberate (the doc flags the catalogue as
  a future build per the 2026-07-27 sitemap restructure), but those links currently go nowhere
  meaningful and should not reach production in this state.
- **FAQ answer bodies (21 questions) still un-rewritten** — deliberate, per the doc's own instruction
  not to invent business facts. Needs a pass against `voice.md` with Esther.
- Two stale, fully-merged worktrees left on disk untouched: `D:\apps\ef-worktree-homepage-copy`
  (`fix/homepage-copy-reframe`) and `D:\apps\worktrees\eternal-fitness-resend-email`
  (`task/resend-email`). Safe to remove.

---

## Session close — 2026-07-27 — homepage nav-scrim contrast fix

**Focus:** Craig flagged the homepage nav looking washed out (screenshot showed the logo/nav text
grey and hard to read over the hero's left panel, fine over the dark hero photo on the right).

**Shipped, deployed, and live-verified:**
- Root cause: `.efhome #hero::before` (`app/home.css`) is a scrim behind the fixed nav, fading from
  `rgba(20,16,16,.5)` at the top to fully transparent over 170px. The nav is 72px tall, so by its
  bottom edge the scrim had already faded to ~29% opacity — fine over the dark hero photo (right,
  45% column) but washed out over the plain white hero text panel background (left, 55% column, no
  explicit background so it inherits `.efhome`'s `#fff`).
- Fix: gradient now holds at `rgba(20,16,16,.6)` from 0–72px (the nav's full height), then fades to
  transparent by 170px. One-line change, `app/home.css` line 35.
- **Process note:** first edited directly in the shared `main` checkout by mistake (DO-SOP-010
  violation) — caught before pushing. Fetched `origin/main`, `git restore`'d the shared checkout back
  clean, redid the change in a proper worktree (`ef-worktree-nav-scrim-2026-07-27`, branch
  `fix/nav-scrim-contrast`), committed, fast-forward pushed to `main` (`9c03763`), then fast-forwarded
  the shared checkout and removed the worktree.
- Push's GitHub webhook auto-triggered a Coolify deploy — confirmed `finished`/`running:healthy` via
  MCP. **Learned live: auto-deploy is ON for this app.** A manual API-triggered deploy was also fired
  before the webhook result was checked — redundant, one attempt even failed (`ibp7wjyp8zmu64l9oced5q4d`)
  and a second was left running unnecessarily; don't manually trigger a deploy on this app after a push,
  it's automatic.
- Verified live with a real Playwright screenshot of `https://staging.eternal-fitness.co.uk` (Playwright
  browser binaries weren't installed locally — installed chromium via the project's own
  `node_modules/playwright/cli.js install chromium`, not `npx`, since `npx` resolved a different cached
  playwright version whose browser revision didn't match the project's pinned `playwright` 1.59.1).

**Not done / carried over:** local dev server was left running mid-session for verification, stopped at
session close. Nothing else opened by this session.

---

## Session close — 2026-07-27 — marketing site copy rewrite + launch-scope page disabling

**Focus:** Craig had this session review the staging marketing site's copy against a full voice/
positioning rewrite done the same day in the `eternal-fitness` workspace repo (personal-trainer-first,
not clinical-specialist-first — see that repo's `.context/decisions.log` and `references/voice.md`/
`stats.md`/`stories.md` for the full rationale and sign-off record). Once the reference layer was
confirmed, asked for the actual site copy updated to match, then to disable everything outside a
6-page + 3-legal-page launch scope.

**Shipped, both deployed and confirmed healthy via Coolify MCP:**
1. `3f50bd8` — rewrote Home, About, Personal Training, Pricing, FAQs, Contact. Full detail in
   `.context/state.md`'s "Current" entry — the short version: personal training leads everywhere,
   specialist quals are reassurance not the headline, the "Level 4 Personal Trainer / highest in the UK"
   claim is fixed sitewide (including in schema.org structured data, not just visible copy), the £45
   single-session tier is gone (was a bug, not a real offer — also fixed in structured data and a
   hardcoded FAQ answer), About's fabricated origin story is replaced with a real one from Esther's
   published Storm Fitness Academy interview, testimonials are real Google Reviews quotes now.
2. `ded1a88`→`63c7875` — disabled (not deleted) Blog and the Exercise for Health/Cancer Rehabilitation
   pages via temporary `next.config.js` redirects to `/`, stripped their nav/footer/in-page links, and
   trimmed `sitemap.ts` to the 9 live URLs.

Both built in isolated worktrees per DO-SOP-010 (`ef-worktree-launch-copy-2026-07-27`,
`ef-worktree-disable-pages-2026-07-27`), `tsc --noEmit` + full `next build` clean before each push. One
real near-miss caught before it mattered: after the first push, `git fetch` showed `origin/main` had
moved (a concurrent session's docs-only commit) — rebased cleanly rather than force-pushing over it,
per the "re-check before every push" rule.

**Not done:** no live click-through on `staging.eternal-fitness.co.uk` — worth confirming next session
that the redirects actually fire and the rewritten pages render as expected, not just that the build
compiled. Also still open (tracked in the `eternal-fitness` workspace repo, not here): Esther's sign-off
on which Google Reviews she's comfortable seeing used publicly, and exact wording confirmation on the
About page's new story since it's sourced from a third-party-published interview.

---

## Session close — 2026-07-25 — session logging Work Order (Lanes A-D) shipped, plus scheduling/calendar, bucket editing, and hub auth lockdown

Full detail in `.context/workorder-session-logging-2026-07-25.md` (DONE checklist updated per lane). Summary:

**Lanes A-C (Trainerize replacement — session logging/progress):**
- Lane A: Esther-side per-set logging on the session detail page (`set_logs` table, quick-log UI, phone-friendly). Migrated + deployed (`b67163c`).
- Lane B: home-training client self-logging in the portal, gated to `clients.delivery_mode='home_training'`, server-verified ownership on every read/write. Deployed (`deed2d4`).
- Lane C: progress/trend view (hub "Progress" tab + portal dashboard section) plus a 7-day "gone quiet" Esther-facing alert for home-training clients. Deployed (`da21c2c`).
- `delivery_mode` toggle added to the client edit page (`f6cf896`) so flipping a client to home-training no longer needs SQL.

**Lane D (added same day, Craig-directed) — session scheduling & calendar**, since there was previously zero scheduling data anywhere in this app (booking lived entirely in Outlook):
- `sessions` gained `scheduled_at`/`cancelled_at`/`cancel_reason`. Migrated + deployed (`1f057d0`).
- Block review page: apply a repeating pattern (day-of-week + time + start date) to bulk-schedule a whole block, plus per-session reschedule/cancel/un-cancel.
- New `/hub/schedule` studio-wide day-view calendar across all clients, with pairwise overlap ("gone quiet"-style) conflict warnings — warn only, never blocks. Deployed (`dd15bb3`).

**Also this session, not part of the Work Order:**
- Hub task-list "buckets" (a parallel feature another session built) gained rename/delete UI — previously create-only (`51afdd8`).
- Created a real hub login for `craig@decodedops.co.uk` via the (at-the-time-open) Better Auth sign-up endpoint.
- **Real security finding, fixed same session**: that sign-up endpoint (`/api/auth/sign-up/email`) was completely open on the public internet — anyone could self-register a full staff hub account, no invite/approval step. Closed with `emailAndPassword.disableSignUp: true` (`f25b98c`), live-verified: sign-up now 400s with `EMAIL_PASSWORD_SIGN_UP_DISABLED`, sign-in/existing accounts unaffected. **Side effect**: adding any future staff member now needs a one-off script or a temporary flip of that flag — no self-serve or in-hub invite flow exists yet.
- A test client (client_number 19, "Test - Home Training", portal login `craig.blackman1@gmail.com`) was created for live click-through testing of the whole session-logging/home-training flow — safe to delete once no longer needed.

**Process note**: two real bugs were caught during verification, not trusted from agent self-reports — Lane A's first migration draft repeated a Supabase-`authenticated`-role RLS bug already found twice before in this repo (fixed before migrating); one OpenCode dispatch (Lane C) stalled after a sandboxed self-test attempt and never finished its own build/commit (finished verification and committed by hand). Also caught mid-session: committed the Work Order doc directly to the shared checkout twice before catching it and moving both onto proper worktrees, per DO-SOP-010.

**Not done / open:**
- Client-facing "gone quiet" nudge send mechanism — detection is live, but whether it auto-sends or requires Esther's review is still an open decision (flagged in the Work Order's ASK FIRST list).
- No real client has been assigned to `home_training` or clicked through the flow live by Esther/Craig yet.
- No in-hub "invite staff" UI — new hub logins require manual provisioning now that self-serve sign-up is closed.

---

## Session close — 2026-07-27 — hub design-alignment Work Order complete, all 8 lanes deployed

Continuation of the prior session's Lane H work — Craig said "opencode to do the work" for the
remaining 7 lanes of `.context/workorder-hub-design-alignment-session-editor-2026-07-26.md`.

**First fixed a process problem from the prior session**: Lane H had been built and committed
directly in the shared checkout (breaking DO-SOP-010). Moved that diff into a proper isolated
worktree branched fresh off `origin/main`, re-verified `tsc --noEmit` clean there, pushed (`d105e29`),
removed the worktree. Also fixed the disk-fill risk flagged going into this session (a prior
`decoded-data-app` Work Order filled a drive to 0 bytes from ~24 uncleaned worktrees each with a full
`npm install`) — every worktree here reused the shared checkout's `node_modules` via a Windows
junction instead of installing fresh, capped at 4 concurrent worktrees, junction + worktree removed
immediately after each lane merged.

**Lanes A–D dispatched to OpenCode (`opencode-go/deepseek-v4-pro`) first, one worktree each.** All 4
came back `tsc`-clean and looking plausible on a skim — but a closer hand-review (diffing every
changed file against `origin/main`, not just trusting the self-report) turned up 4 real defects that
would have shipped silently:
- **Lane C (PAR-Q edit):** the mockup's placeholder client name "Joan" was copied verbatim into 3
  lines of live copy instead of using the real `client.name` already in scope — every client's PAR-Q
  edit page would have shown "Joan" regardless of who was actually being edited.
- **Lane C (PAR-Q edit), separately:** a wholesale new "Section 7 — Medical Clearance Record" block
  had been added that doesn't exist in the live app today, copied straight from the mockup's demo
  content — including a fabricated clinical claim ("Joan has YES answers in Sections 2, 3 and 4 —
  assess whether GP clearance is required") with no real form data behind it. Would have shown
  identical, inaccurate clinical-sounding text for every client. Removed rather than wired up — out
  of scope for a presentation-only pass and a real accuracy risk on a health-screening document.
- **Lane B (client detail, Plan Agent tab):** a static "Connected" badge got added with no real
  connectivity check behind it — would keep claiming "Connected" even while the tab's own existing
  `error` state is showing a real API failure banner right below it. Removed.
- **Lane D (exercise library):** the live "{filtered.length} match · page X of Y" search/pagination
  feedback text got deleted and replaced with a static condition-roll-call string lifted from the
  mockup's demo copy ("adapted for cancer rehab, cardiac, long COVID and fibromyalgia") — a real
  functional regression (search feedback lost) that also brushes against this project's "no condition
  roll-calls in copy" hard rule. Restored the original dynamic text.

All 4 fixed directly, re-verified `tsc --noEmit` clean, committed as separate "review fix" commits,
then each lane rebased onto the previous lane's push and fast-forward pushed to `main` in sequence
(A→B→C→D), resolving trivial append-only conflicts in `.context/loop-status.md` along the way.

**Lanes E–G dispatched next with the same 4 failure patterns spelled out explicitly in the OpenCode
brief** ("never copy a mockup's demo data as a literal string — always bind to the real variable in
scope, or omit it if there's no real source; never add a status badge with no real state driving it").
Came back clean — hand-review found nothing to fix. One check worth noting: Lane F added a
`BUCKET_STATUS_MAP` mapping to CSS color tokens (`--status-danger`, `--status-primary`, etc.) —
verified all 5 actually exist in `globals.css` with matching names before trusting the diff, rather
than assuming.

**Deploy:** pushing all 8 lanes in quick succession triggered several auto-webhook Coolify deploys
firing close together (auto-deploy is ON for this app). Two failed — not on code, confirmed by reading
the raw build logs: one hit a container-name collision from two deploys overlapping, the other had
its build container's exec channel die *after* the code had already compiled successfully and
generated all 73 static pages (the same transient class of infra failure logged in the 2026-07-25
handoff for this app). The deploy of the final commit (`5c92510`, all 8 lanes) succeeded cleanly and
is confirmed `running:healthy` on `staging.eternal-fitness.co.uk` via Coolify MCP — not self-reported.

**Not done:** no live, logged-in click-test of any of the 8 lanes — this environment has no hub
credentials, same standing limitation noted throughout this file for prior sessions. That's the first
thing Craig should do next session, working through the per-lane list above.

## Session close — 2026-07-26 — session/workout editor built (Lane H of the hub design-alignment Work Order)

Craig wanted workouts/sessions to be editable in the hub, with drag-and-drop to reorder exercises.
Scoped via clarifying questions first (desk-based planning tool, not a live in-studio tool; full scope
— reorder, add/remove, inline sets/reps/tempo/rest, section moves; edits scoped to one session only,
no propagation) and written up as a functionality brief for OpenDesign
(`.context/brief-session-editor-opendesign.md`). Craig ran that through OpenDesign and dropped the
resulting mockup at `D:\apps\design-systems\brand-staging-2662e9\hub-session-editor.html`; a broader
Work Order also appeared there covering it as Lane H of an 8-lane hub design-alignment pass
(`.context/workorder-hub-design-alignment-session-editor-2026-07-26.md`, registered in
`infrastructure/.context/active-workorders.md` but not yet formally claimed).

**Built Lane H only** (the other 7 lanes — presentation-only diffs of existing hub routes against their
mockups — not started this session):
- New `SessionEditor.tsx` (`app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/`)
  and `add-exercise-dialog.tsx` (sibling of the existing `swap-exercise-dialog.tsx`, same
  `/api/exercises` search pattern).
- `page.tsx` wired with an "Edit session" toggle; the inactive Studio/Home tab locks while editing;
  Save merges only the edited version back into `session.data.versions` via the existing
  `PATCH /api/sessions/[id]` route (no new API, no migration — confirmed the real `types.ts` shape
  first, matches the Work Order's assumption that this is additive-in-place to the JSONB blob).
- Functionality: drag-and-drop reorder (whole exercises or whole supersets as one draggable unit) +
  up/down arrow fallback, move-between-sections via a "⋯" menu, add/remove exercise, inline
  sets/reps/tempo/rest editing, superset (`group_label`) resolves cleanly with a toast when broken by
  a move/remove, existing Swap-exercise and video-URL controls carried over onto local edit state so
  Discard actually discards them too.

**Verification:** `tsc --noEmit` clean, ESLint clean on all new/touched code (4 pre-existing `any`
lint errors in untouched code, not introduced here), `next build`'s actual compile step reports
"✓ Compiled successfully" — the build then fails at the `output: standalone` file-tracing stage on
Windows `EPERM` symlink errors, a pre-existing environmental limitation unrelated to this change (not
a code issue). **Not live-click-tested** — no hub login credentials available in this environment,
the same standing limitation noted throughout this file for prior sessions; the dev server points at
the real production DB via the Coolify SSH tunnel, so nobody has ever been able to browser-test this
hub locally without Craig's own session.

**Process note, flag for Craig:** this was built directly in the shared checkout
(`D:\apps\eternal-fitness-website`), not an isolated `git worktree`, breaking DO-SOP-010's standing
rule. Craig explicitly confirmed push after being told about the deviation — committed and pushed
straight from the shared checkout (`d105e29` on `origin/main`) rather than moved into a worktree first,
a deliberate one-off exception, not a new default. Flagging in full rather than silently proceeding,
since it's the kind of thing that matters if two sessions ever touch this repo at the same time.
**Deploy not independently confirmed this session** — no Coolify MCP access available; prior sessions
record auto-deploy as ON for this app, but that should be re-checked before assuming this is live.

**Caught on close-out, fixed same session:** re-reading the Work Order's own MUST list against what
was actually built surfaced a real gap — "Remove exercise" removed immediately with no confirmation,
against the WO's explicit "confirm-before-remove" requirement. Added an `AlertDialog` around it,
matching the existing `delete-block-button.tsx` pattern already used elsewhere in the hub. `tsc`/lint
re-verified clean after.

**Not done:** the other 7 presentation-alignment lanes of the Work Order are untouched; no live
click-test.

## Session close — 2026-07-25 (later) — block schedule/review link fixed; docs/Work Order cleaned up

Craig reported he couldn't find the "Review" button on an already-approved training block, after the
prior session's handoff pointed him at the per-block scheduler (`BlockScheduler.tsx`, built in Lane D
of `workorder-session-logging-2026-07-25.md`).

**Root cause, two real bugs, not one:** the block page's link to `/hub/clients/[id]/blocks/[blockId]/
review` only rendered when `block.status === "draft"` — once Esther approves a block, the link
vanishes even though the scheduler still lives at that URL and still works. Separately, the review
page's "Approve Block" button had no draft guard either, so clicking it on an already-approved block
would have hit the `/api/blocks/[id]/approve` route's existing `400 "Block is already X"` rejection —
a guaranteed-fail trap nobody had hit yet because nobody could reach the button post-approval anyway.

**Fixed (`77f5861`):** block page now always links through to `/review` — "Review & Approve" pre-
approval, "Schedule" post-approval. Review page hides the Approve button once `status !== "draft"` and
shows the block's real status via `StatusBadge` next to the (now conditional) title. Built in an
isolated worktree (`D:\apps\worktrees\eternal-fitness-website-fix-schedule-link`, branch
`fix/block-schedule-link`, off fresh `origin/main`) per DO-SOP-010, `tsc --noEmit` clean via a
temporary node_modules junction (removed after, `tsconfig.tsbuildinfo` churn reverted before commit).
Fast-forward pushed straight to `main`.

**Deploy hit a real transient infra failure on the first attempt** — Coolify's build container lost
its SSH exec channel mid-`next build` (`exit code 255` right after "Compiled with warnings", no actual
compiler/type error in the log) and the deployment was auto-removed. Diagnosed via the full raw JSON
log (the plain-text log view truncates before the real failure line — worth remembering for next time
a deploy fails with no visible cause) rather than assumed a code problem, since the diff only touched
two presentational files using an already-imported shared component. Retriggered via the Coolify MCP;
it built and deployed clean second time (~3.5 min), landing as part of `f25b98c` after an unrelated
same-day commit (a hub sign-up-endpoint security fix, not this session's work) fast-forwarded on top.
Confirmed `77f5861` is an ancestor of the deployed commit and the app is `running:healthy`.

**Not click-tested live** — needs Craig to open an approved block and confirm the "Schedule" button
now appears and works.

**Docs/Work Order cleanup, same session:** `workorder-session-logging-2026-07-25.md`'s OWNER line was
stale (read as still "ACTIVE" when Lanes A–D were in fact all done) — updated to reflect only the
genuine Craig-decision GATE items remain open, plus logged this fix under Lane D. This file's own
`state.md` "Active Work Order" line was also stale, still pointing only at the 2026-07-20 hub-
consolidation Work Order (closed that day) with no mention of the newer session-logging one — fixed to
list both with accurate current status.

---

## Session close — 2026-07-25 — hub to-do task list built and shipped (3 lanes, same day)

Craig asked for a to-do list in the hub so Esther can set tasks and assign them to a person. Scoped up
front with him: assignee is a fixed Esther Fair/Craig Blackman picker (no new staff table), buckets are
status columns (kanban), lives as a new top-level `/hub/tasks` page. Built and shipped in three
same-day increments as Craig asked for more each time — each one built in its own isolated worktree
(DO-SOP-010), independently verified (hand-read every changed file against existing conventions,
`tsc --noEmit` + full `next build` via a temporary node_modules junction to the main checkout, junction
+ build output removed after each), migrated against prod Postgres, fast-forward pushed, and confirmed
`running:healthy` on Coolify before moving to the next lane.

1. **Base list** (`51e6a38`, built by OpenCode/deepseek-v4-pro) — new `tasks` table; 3-column kanban
   (To Do/In Progress/Done) at `app/hub/(protected)/tasks/`; `app/api/tasks/route.ts` +
   `[id]/route.ts`; new sidebar entry. Left/right arrow buttons move a task between status columns (no
   drag-and-drop library in this codebase, didn't add one).
2. **Buckets** (`9542840`, OpenCode) — new `task_buckets` table + `tasks.bucket_id` (nullable FK, `ON
   DELETE SET NULL`). Free-form, staff-creatable groupings (Website/Content/Admin/etc.) added inline
   from the task form (a "+ Add new bucket…" option that POSTs and auto-selects); a filter-pill bar
   with live per-bucket counts sits above the kanban; each card shows a bucket tag next to its assignee
   tag. Deliberately did not add bucket-delete UI this pass — Craig only asked for creation/grouping.
3. **My Tasks default filter** (`a3e861e`, built directly by Claude Code — small, well-understood
   diff, skipped the OpenCode round-trip) — no DB change. Reads the signed-in Better Auth user's
   `name` against the existing `assignee` string field and defaults the board to "My Tasks" whenever
   they match, with a one-click "All Tasks" toggle. Bucket-pill counts now respect whichever scope is
   active. **Real gap found while building this**: queried the live `user` table directly — only
   Esther Fair has a hub account at all, no Craig Blackman row exists, so this only activates for her
   session until/unless he gets one too. Flagged to Craig, not silently worked around.

**Not done / needs Craig:** no live authenticated click-test of any of this — the page correctly
redirects to `/hub/login` with no session available from this side, and credentials are never entered
into any login form, hub or otherwise. Worth a real click-through next time Craig's in the hub. Also
worth deciding whether Craig wants his own hub account created if "My Tasks" should ever apply to him.

All three worktrees + branches removed after merge (one had a Windows long-path node_modules-copy
artifact from a `next build` standalone-tracing quirk — cleared via a robocopy-mirror-empty-dir trick,
noted here in case it recurs on a future build-verification pass in this repo).

---

## Session close — 2026-07-24 — consent choices surfaced in hub admin portal

Craig reported: "Unsigned consent forms. We can't see what people have consented to in the admin
portal." Investigated first rather than assuming new backend work was needed — it wasn't.

**Root cause:** `client_documents.consent_choices` (JSONB) is already written correctly on sign
(`app/api/documents/[id]/sign/route.ts`) — no schema/migration work required. The gap was entirely on
the read side: two Supabase selects omitted the column, and the document detail page never rendered
it even when present.

**Fixed, committed (`edaa0c4`), pushed straight to `main`:**
- `app/hub/(protected)/clients/[id]/documents/[docId]/DocumentDetailClient.tsx` — signed consent
  documents now show a "Consent choices" card, one line per option (✓/✗) against the template's
  `body.consentGroups`, cross-referenced with `doc.consent_choices`.
- `app/hub/(protected)/clients/[id]/page.tsx` — added `consent_choices` to the document-register
  select (was previously dropped before it reached the UI).
- `components/hub/DocumentRegister.tsx` — each document row now shows an at-a-glance "N/M consents"
  pill.

**Caveat worth remembering:** a consent checkbox the client never touched has no key in
`consent_choices` at all (not a stored `false`) — so the register pill and the detail-page ✗ both
read "not granted" for both "actively declined" and "never interacted with." That's a lower bound,
not proof of an explicit decline. If Esther ever needs to distinguish those two cases, that's new
work, not something already captured.

**Process note:** worked in an isolated git worktree (`fix/hub-consent-choices`, off fresh
`origin/main`) per DO-SOP-010, fast-forward pushed, worktree/branch cleaned up afterward. Could not
run a full `tsc`/build check — the worktree has no `node_modules` and `npm install` is a gated action
this session didn't have standing authorization for; relied on careful manual review instead (existing
types — `ConsentGroup`, `ClientDocument.consent_choices` — already covered every value used, no new
imports needed). **Worth a real `tsc`/build run and a live click-through on staging next session**
before treating this as fully verified, since it was never checked in a browser.

---

## Session close — 2026-07-22 (later) — Lane K shipped, Lane J parked, session closed out

Following on from Lane I (below): Craig approved building Lane K (portal auth rework) fully, then
gave the explicit go-ahead to ship it, and asked to leave Lane J (conversion tool) as scoped-only.

**Lane K — built, verified, shipped.** Built in an isolated worktree
(`task/lane-k-portal-auth-password`). First OpenCode dispatch crashed mid-build (server error, exit 1)
after writing the migration + `lib/portal-auth.ts` — both reviewed and correct, no work lost. A second
dispatch also hit a transient server error before writing anything (safe retry). Third dispatch
completed the rest cleanly: new `/api/portal/auth/{login,logout}` routes, `request-link`/`verify`
repurposed for password-reset request/submit, staff-gated `/api/clients/[id]/portal-invite`, new
`/portal/forgot-password`/`/portal/reset-password` pages, login page rewritten as email+password,
middleware updated to allow the two public reset-flow paths, and an "Invite to portal" button on the
client detail Profile tab. One real bug hit and fixed during the build: `useSearchParams()` needed a
`Suspense` boundary on both new/changed portal pages or the static export failed. Independently
re-verified (not self-report) before shipping: full `git diff` review of all 13 files, grepped for any
leftover reference to the removed magic-link functions (zero hits), confirmed the existing logout form
action is now backed by a real route. `tsc`/build clean.

**Confirmed while building, not previously known**: no `portal_*` tables existed on production at
all — the original 2026-07-20 magic-link migration was written but genuinely never run. The portal
login had never worked against real data; Craig's "no email" report wasn't the SMTP dry-run issue or
anti-enumeration, it was a missing-table failure. Clean slate, no legacy accounts to migrate.

**Shipped**: rebased onto latest `origin/main`, fast-forward pushed (`d7bbfe9`), migration run against
prod (verified: `portal_accounts`/`portal_sessions`/`portal_reset_tokens` all exist, `password_hash`
column confirmed), Coolify deployment `za7fpkka74fo1ovdi2i8vhge` confirmed `finished`/healthy on first
healthcheck attempt via Coolify MCP. Worktree cleaned up (force-removed — only a build-artifact diff
remained — and branch deleted after confirming it was merged).

**Not done**: no real client has been invited to the portal yet (that's still its own `[GATE]`), and
the invite → email → login → reset flow hasn't been click-tested in a real logged-in browser session —
worth doing before telling Esther it's ready to use.

**Lane J** — left exactly as scoped in the prior entry below (recommendation: Option B, field
extraction via vision-LLM, not OCR). Not built. Craig's explicit instruction: leave it parked, don't
raise it again unless he does.

Work Order, `state.md`, `loop-status.md` all updated to reflect Lane I/K both fully shipped and Lane J
deliberately parked.

---

## Session close — 2026-07-22 — Work Order extended: paper document storage, conversion-tool scoping, portal auth rework

Craig had a paper Personal Training Agreement for Sarah (scanned PDF, no extractable text) he wants
stored against her hub record, plus a longer-term ask to convert paper documents into something the
plan-generation agent can use. Separately, he tried the portal login and got no email, and clarified
he wants a fundamentally different auth model: no self-serve request/signup surface — Esther adding a
client should auto-generate and email a login, with self-service limited to a password reset.

**No code changed this session** — planning/scoping only, folded as three new lanes onto the existing
`.context/workorder-eternal-fitness-hub-consolidation-2026-07-20.md` (Craig's explicit instruction: one
Work Order, not scattered notes):

- **Lane I — Scanned/paper document storage.** Confirmed there is no file-upload/attachment capability
  anywhere in the hub today — `client_documents` only stores structured JSONB `body`, not raw files.
  Plan: add `source_type`/`source_file_url` columns, store the PDF on a Coolify persistent volume
  served only through an authenticated hub API route, add a plain "Upload existing document" action.
  Sarah's PDF is the first real case. All units `[AUTO]` to build, prod writes `[GATE]`.
- **Lane J — Paper→digital conversion tool.** Scoping only. Two genuinely different outputs Craig could
  want: OCR the scan into the document engine's HTML body (fidelity), or extract key fields straight
  into `clients` profile columns (structured, agent-usable). Craig to pick before this lane gets build
  units — they're not the same tool.
- **Lane K — Portal auth rework.** Read `lib/portal-auth.ts` in full while scoping this: found a real,
  previously undocumented gap — `ensurePortalAccount()` auto-creates *and* auto-enables a portal account
  on any matching-email magic-link request, contradicting its own doc comment claiming staff-gating.
  Craig's "no email" report is most likely the already-flagged, unconfirmed SMTP/SendGrid dry-run issue
  (his email also isn't a `clients` row, so the request silently no-ops by design either way), not a new
  bug. Plan: replace passwordless magic-link with password + reset; accounts only ever created by a new
  staff "Invite to portal" action on the client detail page, never on first login attempt; self-service
  limited to forgot-password. Full unit breakdown in the Work Order's Lane K.

Full detail, MUST/GATE updates, and unit-level VERIFY criteria: see the Work Order file directly.
Registry (`infrastructure/.context/active-workorders.md`) updated to match.

**Later same session — Lane I built, pushed, migrated, and live.** Craig gave the go-ahead to build
and ship (not just plan). Built in an isolated worktree (`task/lane-i-scanned-document-storage`, now
merged and cleaned up per DO-SOP-010): migration adding `source_type`/`source_file_name`/`source_file_mime`/
`source_file_size` to `client_documents` + a new `client_document_files` table (bytes stored directly in
Postgres, not a Coolify volume — unnecessary infra for a single-digit-documents volume); staff-auth-only
`POST /api/documents/upload` + `GET /api/documents/[id]/file`; `DocumentRegister.tsx` shows scanned rows
with a "Scanned original" badge and a download link instead of send/resend. Independently re-verified
before merging (`git diff` review, `tsc`/build clean, not just self-report) — caught and reverted an
incidental `package-lock.json` churn from local `npm install` (this repo actually deploys via
`pnpm --frozen-lockfile`, so npm's lockfile is dead weight here). **Real bug found and fixed live**: the
migration's `CREATE POLICY ... TO authenticated` failed against prod (`role "authenticated" does not
exist`) — turns out the *existing* `client_documents` table has had RLS enabled with zero working
policies since the Supabase-to-plain-Postgres migration dropped that role; access control on every
document-engine table is actually enforced at the app layer, not Postgres RLS. Fixed to match that real
pattern instead of adding a second broken statement. Pushed (`dd93c2a` then RLS-fix `6bd17d2`), both
Coolify deployments confirmed `finished`/healthy via Coolify MCP (not self-report). Migration run against
prod — verified live, all 30 pre-existing `client_documents` rows unaffected. Sarah Tyler's scanned
Personal Training Agreement uploaded via a one-off script (no live hub session to use the UI form this
session) — `client_documents` id `a74a1ef7-0c19-478c-b5e2-538a9304e102`, 183,462 bytes, verified
byte-for-byte against the source file. `client_signed_date` left unset (scan has no extractable text/date
— `pdftoppm` isn't installed to OCR it); Craig can set it from the paper original. **Not yet done**: the
UI upload path itself hasn't been click-tested in a real logged-in browser session — worth doing next
time the hub is open. Lane I fully closed in the Work Order's DONE checklist.

---

## Session close — 2026-07-21 (later) — flexible/four-week update draft generation fixed

Craig reported "email updates are now not working at all" while trying to build a real update for
Monique Weardon (client #10) using the Flexible Update template, pasting the exact email text he
wanted (6kg/lunges/floor-work content) and asking why the agent wasn't drafting to match it.

**Root cause**: `app/api/clients/[id]/six-week-update/generate/route.ts` only ever implemented
`six_week_update` — it hard-rejected `four_week_update` and `flexible_update` with a 400
(`Template kind "..." is not implemented yet`), even though the template picker, editor, and email
builders (`lib/email-templates/{four-week,flexible}-update.ts`) for both had already shipped. Picking
either template in the hub's "New Update" → chat → "Create Draft" flow broke outright. This was a
half-shipped feature (frontend done, backend never extended), not a regression.

**Immediate fix for Monique**: built her actual draft directly via `scripts/create-update-draft.mjs`
against prod (`clientNumber: 10`, `templateKind: "flexible_update"`, 6 sections matching Craig's
pasted text verbatim: Attendance & Consistency / The Big Win / Lunges / Getting Up From The Floor /
What's Next / Worth Saying). Rendered to `--preview-only` HTML and eyeballed it before writing —
`sent_updates` id `24a05df4-47ef-4cd1-8a46-090aa9b81116`, status `draft`, nothing sent. Craig reviews
and sends from `/hub/clients/10/updates`.

**Real fix**: `lib/generate-six-week-update.ts` rewritten from a six-week-only module into
`generateUpdateDraft(clientNumber, templateKind, options)` covering all three kinds:
- `six_week_update` / `four_week_update`: same AI-JSON-per-section-key pattern as before, just added
  the four-week kind's 2 extra sections (`whatEverySessionSection`, `keepAnEyeOnSection`).
- `flexible_update`: **no fixed section list** — the AI is prompted to decide section count and
  headings itself from the chat conversation (mirrors how Esther drafts these by hand today; this was
  Craig's explicit ask — "the agent doesn't create a template against what I paste... it does its own
  thing"), not forced into six_week_update's shape.
- `NewUpdateClient.tsx`'s `handleCreateDraft` previously only populated `sections`/`sectionLabels` from
  `kind.sections` (empty for flexible) — added a `kind.flexible` branch that populates `flexSections`
  (+ `greetingName`/`introText` if the AI set them) from `draft.data.sections` instead.

`tsc --noEmit` clean, `next build` compiles/typechecks/generates all 61 pages clean (the build's
trace-file-copy stage fails locally with `EPERM` on symlinks — a pre-existing Windows/pnpm quirk in
the standalone-output step, unrelated to this change and not present in Coolify's Docker build).
Committed `cc29c03`, pushed to `main` (Craig's explicit go-ahead). Coolify auto-triggered deployment
`oe8ppywxvdv1odhbq1kvn9yk` on the push — **confirmed `finished` via `mcp__coolify__deployment get`
before session close.** Still not live-UI-tested, though — next session (or Craig) should do a real
"New Update" → Flexible Update → chat → Create Draft round-trip in the hub to verify the fix actually
works end-to-end (only typecheck/build/deployment-status verified this session, no hub session
available to click through it).

## Session close — 2026-07-21

Long session, mostly reactive (Craig using what got built earlier the same day and reporting real
gaps as he hit them). Everything below is pushed to `origin/main` and confirmed deployed
(`running:healthy` via the Coolify MCP, not a self-report) unless noted. Full detail for each item is
in its own entry above — this is the map for whoever picks this up next.

**Shipped and live, in order:**
1. Real "email a document" capability added to PAR-Q specifically (it was copy-link-only) — later
   superseded (see #4).
2. Resend enabled for 6-week/4-week update emails (previously blocked outright once sent) and for
   Agreements (real backend was dead, wired to an unconfigured `RESEND_API_KEY`; `lib/email.ts` gained
   attachment support so the PDF still works).
3. Full mockup-alignment pass (Lane H) across the hub's list/editor pages — most already matched from
   earlier sessions (verified, not assumed); real fixes on All Documents, Site Content list/editor.
4. New "Client Feedback Questionnaire" document kind, then PAR-Q and Personal Training Agreement both
   migrated onto the same document engine — every document kind (Terms/Agreement, Risk Assessment,
   Annual Review, Consent, Feedback, PAR-Q) now shares one send/resend mechanism from the hub. Nothing
   generates a fresh standalone public-page link anymore (the old `/parq`, `/parq/edit/[id]`,
   `/agreement` pages are left in place, just unlinked — a safety net for pre-migration links, not
   deleted). Found and fixed a real, separate data-integrity bug along the way (Agreement page's dead
   package/payment edit path duplicating the client page's own).
5. Inline Send/Resend/Copy-link/Delete added to every document list (previously only inside each
   document); update-email section headers made editable for the templates Esther actually uses (a
   real fix for this existed already, just shipped as a non-default option); a stale `/hub/templates`
   card still linking to the retired PAR-Q form removed; document-ready email spacing fixed.
6. **The real bug**: a second, undiscovered "Create & send" button on the Templates page was faking
   sends entirely (marked "sent" with no email ever attempted). Found via real data (a 36ms
   created→sent gap, physically too fast for a real send), not by re-checking the same code path
   again. Fixed at the source and the fake-send branch deleted from the API so it can't recur from
   anywhere else. Added `client_documents.emailed` (mirroring `sent_updates.emailed`, which had
   already solved this exact problem for update emails) so status and real delivery are never
   conflated again.

**Not started / explicitly deferred:**
- Whether the SendGrid/SMTP backend is actually functioning in production is still unconfirmed — needs
  a real test send via the hub UI (or Craig checking the SendGrid dashboard), not something checkable
  without live credentials.
- `tracker`/compliance-tab code still reads the legacy `signed_parq` table directly — deliberately not
  touched, since it's medical-clearance-critical and deserves its own reviewed pass.
- The client-edit page's missing right rail/clearance banner, `ProcessQualityManager.tsx`'s badge-markup
  dedup, and the `hub-sop.html`/All-Documents mockup mismatch — all flagged as background-task
  suggestions during the session, not actioned.
- 5 of 8 exercise-for-health condition pages, production domain cutover, client data consolidation from
  Trainerize — all still open from before this session, untouched.

**Process note:** three real, distinct bugs were found this session by checking real data (DB queries,
timestamps) rather than re-trusting a prior code read — the PAR-Q signed-link signature bug, the
36ms-send-gap that led to the `emailed` flag, and the templates-page fake-send button underneath it.
Worth remembering for next time something "still doesn't work" after a fix: check what actually happened
in the data before re-explaining the same analysis.

## Session 2026-07-21 (the actual root cause) — a second, undiscovered "send" path was faking it

Craig came back with the same screenshot after the `emailed`-flag fix deployed — the document still
showed plain "Sent", no "Not delivered" pill. That was the tell: it meant the new code path had never
run at all for that document, not that the indicator logic was wrong.

### Found it
Queried the specific document again post-deploy. A brand-new one, created *after* the fix went live,
still had `emailed: null` — proving `sendDocumentEmail()` (the function I'd just fixed) was never even
being called for it. Grepped for every caller of the documents PATCH route and found
`app/hub/(protected)/templates/[id]/SendTemplateToClient.tsx` — a completely separate "Create & send"
component living on the *template* detail page (`/hub/templates/[id]`), never investigated in any
earlier pass on this issue. It:
1. Created a document (draft, correctly).
2. PATCHed it with `action: "send"` — a second, bare action in `/api/documents/[id]/route.ts` that just
   set `status: "sent"` directly, with **no email attempt, no `emailed` field, ever**.
3. Copied the sign link to the clipboard and showed "Client signing link (copied to clipboard)" —
   exactly what Craig described as "it just says cut and paste this link."

This is what Craig meant, several turns ago, by "/hub/templates" needing the same send mechanism —
correctly identified, mis-scoped by me at the time as "just the content editor, no send exists there."
There *was* a send button there. It was just broken in a way a plain grep for "send" in the server
page component didn't surface, because it lived in a client component the page renders.

### The fix
- **`SendTemplateToClient.tsx`** rewritten — no longer fakes its own send. Creates the draft, then
  redirects straight to the real document detail page (`/hub/clients/[id]/documents/[docId]`), which
  already has the correct Send/Resend/Copy-link UI, the dry-run handling, and the "Not delivered"
  indicator from the previous fix. This is now a shortcut into the real flow, not a second one.
- **`app/api/documents/[id]/route.ts`** — deleted the bare `action: "send"` branch entirely (confirmed
  via repo-wide grep it had exactly one caller, the file above, already fixed). `send_email` is now the
  only way a document's status becomes "sent" — closing off the possibility of this happening again
  from anywhere else.

### Verified
`rm -rf .next && npx tsc --noEmit` clean, `npm run build` compiles successfully (known symlink-trace
failure only). Confirmed via direct DB query that the specific document Craig screenshotted was created
*after* the previous fix deployed but still had `emailed: null` — proof it went through the broken
`SendTemplateToClient` path, not `sendDocumentEmail()`. Every document sent via that specific path before
this fix will show plain "Sent" forever (unknown `emailed` state, deliberately not backfilled/guessed);
new sends through it now go through the real flow.

## Session 2026-07-21 (no really, this one) — "It says sent when it obviously hasn't"

Craig, still frustrated after the last fix: creating a document and clicking send only ever gave him a
"copy this link" result, yet the document showed as "sent" on the All Documents list. Investigated with
real data rather than re-asserting the earlier "copy-link never touches status" finding.

### What the data showed
Queried the most recent `client_documents` rows directly. Every recent "sent" document — including one
created and marked sent just **36 milliseconds** later — showed `sent_at` essentially instantaneous
with `created_at`. That's far too fast for a real outbound HTTPS call to SendGrid (TLS handshake alone
typically takes longer). Strong circumstantial evidence the email backend is dry-running in production —
i.e. `sendDocumentEmail()` in `app/api/documents/[id]/route.ts` always sets `status: "sent"` regardless
of whether `getEmailSender().send()` actually delivered anything or silently no-op'd because no real
backend was configured. **Not definitively confirmed** — `SENDGRID_API_KEY`/`SMTP_*` env vars do exist
on the Coolify app (checked via `mcp__coolify__env_vars`), so it's possible the key exists but is
invalid/misconfigured rather than fully absent. Didn't reveal/test the raw secret value directly (avoid
handling live credentials unnecessarily) — flagging this as unconfirmed rather than overclaiming.

### The fix — regardless of the exact backend root cause
This exact problem was already solved once in this codebase, just not applied here: `sent_updates` (the
6-week/4-week update emails) has an `emailed` boolean column, separate from `status`, and
`ClientUpdatesPanel.tsx` shows an "Emailed"/"Not sent" pill using it. `client_documents` had no
equivalent — `status: "sent"` was the only signal, and it lied whenever the send didn't really deliver.

- **New migration** `20260721_client_documents_emailed_flag.sql` — additive `emailed boolean` column,
  NULL for existing rows (no reliable way to backfill whether historical sends were real). **Run against
  prod, confirmed live.**
- `sendDocumentEmail()` now sets `emailed: !result.dryRun` alongside `status`/`sent_at`.
- `lib/documents/types.ts` — `ClientDocument.emailed` added.
- `DocumentRegister.tsx`, `app/hub/(protected)/documents/page.tsx`, `DocumentDetailClient.tsx` — all
  three now show a distinct "Not delivered" / "Not actually delivered" indicator whenever
  `status === "sent" && emailed === false`, instead of just trusting the status pill. The document
  detail page also gets an explanatory banner ("no email backend is configured... use Copy link until
  that's fixed") directly in the Send card.
- Queries updated to select the new column: `clients/[id]/page.tsx`'s `clientDocuments`,
  `documents/page.tsx`'s `docs` (the detail page already used `select("*")`, picked it up for free).

### Still open — worth Craig's attention next
Whether the SendGrid/SMTP backend is actually broken in production needs a real test send (via the hub
UI, with credentials, or by Craig checking the SendGrid dashboard for recent activity) to confirm
one way or the other. The `emailed` flag will make that visible immediately on the next real send attempt
either way — that's the point of this fix.

### Verified
`rm -rf .next && npx tsc --noEmit` clean, `npm run build` compiles successfully (known pre-existing
symlink-trace failure only). Migration run and confirmed live. Not live-browser-verified this session.

## Session 2026-07-21 (the real final one) — 4 more issues Craig hit while using today's work, all fixed

Craig, frustrated, listed four problems after actually using the document/update-email features built
earlier today. Investigated each with 3 parallel Explore agents plus direct file reads before touching
anything — all four were real, confirmed root causes, no guessing.

**1. Update-email section headers still hardcoded.** A real fix for this already existed —
`flexible_update` (commit `48fdacb`) gives fully editable section headings — but it shipped as a third,
non-default template option; the 6-week/4-week templates Esther actually uses day-to-day were never
wired to it. Extended editable headers to those two as well: `six-week-update.ts`/`four-week-update.ts`
gained an optional `sectionLabels` override (falls back to the existing hardcoded default per section),
and `NewUpdateClient.tsx` now renders an editable `Input` above each section's rich-text editor
(same pattern the flexible template already used for its heading field), persisted with the draft.

**2. No way to delete a document; draft status not obvious.** Confirmed: zero `DELETE` route existed
for `client_documents` anywhere. Added one to `app/api/documents/[id]/route.ts`, mirroring
`app/api/updates/[updateId]/route.ts`'s existing pattern exactly (any status deletable, hard delete,
auth-gated). Wired a delete button into both `DocumentRowActions.tsx` (available even on locked/signed
rows — deleting isn't just for drafts) and `DocumentDetailClient.tsx` (next to the header, redirects to
the client's Documents tab on success). Added a plain-text draft note under the title:
"This is a draft — nothing has been sent to the client yet."

**3. All Documents shows "sent" after only copying a link — plus confusing row buttons.** Code-verified
copying a link never touches status (`copyLink()` in both `DocumentRowActions.tsx` and
`DocumentDetailClient.tsx` only calls `navigator.clipboard.writeText()`) — for anything created fresh
through the document engine this genuinely cannot happen. Most likely explanation for what Craig saw:
this session's PAR-Q/Agreement migration carried the *legacy* table's `status` column straight across,
and in the old standalone system `status = 'sent'` could mean "a link was copied and handed over
manually," not "a real email went out." **Craig's call on plan review: leave historical data as-is,
fix the UI only.** The real, fixable bug: the row's Copy-link button reused `IconSend` (a paper-plane
icon) right next to the labelled Send/Resend button — reads as a second send control. Swapped to
`IconCopy` in both `DocumentRowActions.tsx` and `DocumentDetailClient.tsx`.

**4. Document-ready email looked condensed around the button/link.** Found the exact cause: the CTA
button's table had `margin:20px 0 4px` (only 4px below) immediately followed by a `margin:0` paragraph
— an asymmetric, cramped gap. Rebalanced to `margin:24px 0 16px` on the button and `margin:8px 0 0` on
the "Or copy this link" paragraph, in both `document-ready.ts` and `parq-request.ts` (identical pattern
in both files).

### Verified
`rm -rf .next && npx tsc --noEmit` clean; `npm run build` compiles successfully (same known pre-existing
Windows/OneDrive symlink trace failure at the final packaging step, confirmed unrelated). Not
live-browser-verified this session — no hub credentials available.

## Session 2026-07-21 (genuinely final) — Inline Send/Resend on every document list, not just inside each document

Esther reported the Personal Training Agreement "only gives you a link, not an email." Investigated with
real data before assuming a bug.

### Root cause of what Esther saw
Not a bug. The most recent `terms` (Personal Training Agreement) document was created against the
"Craig Blackman" client record, which has `email: null` in `clients` — confirmed by querying prod. The
Send button is *correctly* disabled with no client email; only Copy Link shows, exactly as designed
(same behaviour every document kind has always had). Clients with a real email on file (Sam Gibbons,
Ellie Wallwork, Colin Farley) all show a working Send button. Flagging for Craig: add an email to the
test client record, or test with a real one, to see the working flow.

### The real, structural gap — fixed
Craig's actual ask was broader than one bug: every document should be sendable by email (not just
link), from more places than just inside each individual document page — the client's Documents tab
list AND the hub-wide All Documents list, the same "click Send now" pattern `UpdateRowActions` already
has for update emails. That capability genuinely didn't exist on either list before this — both only
had an "Open"/"View" link, requiring you to open the document first to find the Send button.

- **New `components/hub/DocumentRowActions.tsx`** — inline Send/Resend + Copy link per row, same
  pattern as `UpdateRowActions.tsx`. Hidden once a document is locked (signed/superseded, nothing left
  to send).
- **`DocumentRegister.tsx`** (client Documents tab) — added an actions column using it; needed
  `clientEmail`/`clientName` threaded back in as props (removed a few commits ago when the old
  PAR-Q-specific send button was deleted — this is the real, generic replacement). Renamed "New
  document" → "Create & send" (Craig's own words for it).
- **`app/hub/(protected)/documents/page.tsx`** (All Documents, hub-wide) — same actions column added;
  query extended to also select `clients.email` so per-row Send/Resend can work here too, not just on
  a single client's page.
- **Real bug found and fixed in passing**: `/hub/templates` still had a hardcoded card linking straight
  to the retired `/parq` blank form — a leftover from before PAR-Q was migrated onto the document
  engine. Removed it; PAR-Q's real template already appears in the normal list now (confirmed it does).
  Also fixed template-list section counts always showing "0 sections" for `feedback`/`parq` kinds (their
  content lives in `body.feedbackSections`, not `body.sections` — the count didn't know to look there).

### Verified
`rm -rf .next && npx tsc --noEmit` clean; `npm run build` compiles successfully (same known pre-existing
Windows/OneDrive symlink trace failure, unrelated). Not live-browser-verified this session.

## Session 2026-07-21 (actually final) — Fixed the signed_agreements/clients duplication, instead of just flagging it

Craig: "can we fix this issue now rather than leaving it, otherwise it will get forgotten about" — fair,
so did it immediately rather than leaving the background task queued.

### What was actually there
Investigated properly before touching anything. The dangerous part (Esther able to edit
package/payment/clinical fields on the Agreement page, silently diverging from what `PackagePaymentsCard`/
`ClinicalComplianceCard` show on the live client page) turned out to have **already been half-fixed** by
an earlier session — the "Client Management" section of `AgreementDetailClient.tsx` is already
read-only, with a banner: "Package, payments and compliance are managed on the client profile... edit
the live values on the profile." Good instinct, incomplete execution: the actual edit machinery behind
it — `editingTrainer`/`trainerForm`/`handleTrainerChange`/`handleSave` state, and the entire
`PATCH /api/agreements/[id]` route it called — was still sitting there, fully wired, just with no
button left in the UI to trigger it. Confirmed via grep: zero call sites for any of it outside its own
declarations.

### What was fixed
- Removed the dead `editingTrainer`, `trainerForm`, `handleTrainerChange`, `handleSave` state/logic and
  the "Trainer information saved" success/error banner JSX from `AgreementDetailClient.tsx` (never
  reachable, never rendered any trigger).
- Deleted `app/api/agreements/[id]/route.ts` entirely — its only handler (PATCH) wrote exactly the
  fields that duplicate `clients`, and nothing else in the app called it (confirmed via grep before
  deleting). `app/api/agreements/[id]/email/route.tsx` (a sibling file, different concern — the PDF
  email) is untouched.
- This closes the actual risk: there is no longer any code path, dead or live, that can write
  package/payment/clinical data to `signed_agreements` and have it diverge from `clients`. The read-only
  display + banner (already in place) still shows the historical snapshot for old records, correctly
  labelled as a snapshot rather than something editable here.

### Verified
`rm -rf .next && npx tsc --noEmit` clean (the first run hit two stale-cache errors referencing the
just-deleted route from `.next/types` — not real errors, cleared by removing `.next`).

## Session 2026-07-21 (truly final) — Agreement migrated too; every document type now hub-only

Immediately followed the PAR-Q migration with Agreement, per Craig's "migrate that too."

### The key discovery that changed the plan
Went in expecting to build a new `'agreement'` document kind from scratch (like PAR-Q). Instead found
the document engine's existing `'terms'` template was **already** updated on 2026-07-04
(`20260704_terms_real_content.sql`) to literally BE the real, dual-signed Personal Training Agreement —
same section structure (trainer commitments, client responsibilities, medical clearance, payment,
risk/liability, data protection, general terms) as the standalone `/agreement` page's embedded terms
text. Nobody ever formally retired the old standalone system after that — it just kept existing in
parallel, unlinked from the hub (confirmed last session: nothing in the hub links to `/agreement` at
all). So no new kind, no new template — just relabelled `DOCUMENT_KIND_LABEL.terms` from generic
"Terms & Conditions" to "Personal Training Agreement" so it's not confusing in the "New document" picker,
and backfilled the historical data.

### What changed
- **`scripts/migrate-agreements-to-engine.mjs`** (new) — snapshots every `signed_agreements` row into
  `client_documents` (kind='terms'). No questionnaire content needed (unlike PAR-Q) — it's pure legal
  text (the shared template body) plus client + trainer signatures.
- **Real bug hit and fixed mid-run**: 2 of 8 legacy rows had `client_id = null` (never linked to a real
  `clients` row) — `client_documents.client_id` is NOT NULL, so the first run failed partway through
  (3 rows already inserted). Cleaned up the exact 3 partial inserts by id (not a broad delete), then
  fixed the script to resolve unlinked rows by exact case-insensitive name match against `clients`,
  skipping (never guessing) if that doesn't resolve to exactly one row. Both cases resolved cleanly
  ("Sam gibbons"→Sam Gibbons #13, "Ellie wallwork"→Ellie Wallwork #7). Re-ran clean: 6/6 migrated, 0
  skipped. Spot-checked the output — signatures, names, dates all correct.
- **`DocumentRegister.tsx`, `clients/[id]/page.tsx`, `app/hub/(protected)/documents/page.tsx`** — all
  three stopped reading `signed_agreements` (and `documents/page.tsx` also stopped reading
  `signed_parq`) now that both are fully represented in `client_documents` — otherwise every migrated
  row would show twice (once as the legacy row, once as the new snapshot).
- **`/hub/agreements`** relabelled "(legacy record)" with a pointer to All Documents, same treatment as
  the PAR-Q history page last session. Not deleted — still the only place to see pre-migration records.

### A real, separate bug found — NOT fixed here, flagged as a background task
While reading `AgreementDetailClient.tsx` to understand what "the agreement" actually contains, found
that `signed_agreements` carries a full second copy of package/payment/clinical-tracking columns
(sessions used, payment status, medical clearance, risk level, GP letter dates, trainer observations —
added 2026-05-25) that the Agreement detail page still actively edits via `PATCH /api/agreements/[id]`.
But the *live* client detail page's `PackagePaymentsCard`/`ClinicalComplianceCard` edit the same
concepts on the `clients` table instead, via a completely separate `/api/clients/[id]` path — never
synced. Two screens can silently show different, diverging answers to "has this client paid" or "is
medical clearance in place." **Deliberately not migrated or fixed** — this is a real pre-existing data
integrity bug, not something to paper over as a side effect of a document-type migration. Spawned as a
background task for Craig to pick up separately.

### Also a deliberate behaviour change, not silently dropped
The old `/agreement` → `AgreementDetailClient`'s "Email PDF" button attached a real generated PDF.
Going forward, a new-flow agreement is sent as a sign-this-link email, like every other document kind —
no automatic PDF. A signed copy can still be saved as a PDF via the document's own
"Print or save as PDF" accessibility-toolbar button (browser print), which was already built in. The
old `/agreement`/`AgreementDetailClient` PDF-email path is untouched and still works for legacy records.

### Net result across both sessions today
Every document type in the hub — Terms/Personal Training Agreement, Risk Assessment, Annual Review,
Consent, Feedback, and now PAR-Q — is sent, resent, and signed through the exact same mechanism, from
the hub, never a fresh standalone public-page link. Nothing is left that still needs "migrating" in
that sense.

### Verified
`npx tsc --noEmit` clean. Not live-browser-verified this session (no hub credentials) — worth a real
click-through creating and sending a new Personal Training Agreement from the hub before fully trusting
it, same caveat as PAR-Q.

## Session 2026-07-21 (final) — PAR-Q migrated onto the document engine; standalone-send buttons retired

Craig's ask, in his own words: "we just need to have the same mechanism to send any document or
template going forward so they won't ever be web facing... always from the hub." He confirmed PAR-Q
and the standalone Agreement page were both quick wins built before the hub existed — PAR-Q now gets
the full treatment; Agreement is scoped but deliberately NOT touched this session (see below).

### What changed
- **Generalized the interactive-questionnaire schema.** `FeedbackQuestion` gained an optional `note`
  field (clinical context like "If yes, give details in Section 5") so the same
  `feedbackSections`/`feedbackConsents` schema built for the Feedback Questionnaire could carry PAR-Q's
  29 real clinical questions verbatim from `lib/parq-data.ts`, plus personal/GP/detail fields as `text`
  questions. `DocumentKind` gained `'parq'`.
- **New PAR-Q document template** (`supabase/migrations/20260721_seed_parq_template.sql`) — real
  interactive radio-group/text fields, not the earlier Lane C plan's raw-HTML-table body. That plan is
  superseded; `scripts/migrate-parq-to-engine.mjs` was rewritten to target this new schema instead
  (its file header still documents the field mapping).
- **PAR-Q stays a real signed clinical declaration** — unlike the Feedback kind (survey, name-only), a
  `doc.kind === "feedback"` check (not "has feedbackSections") gates the simplified sign flow, so PAR-Q
  keeps the full name+date+typed-signature+"I agree" flow, matching what `ParqEditClient.tsx` already
  required.
- **Esther's "Responses" card generalized** — was hardcoded to `kind === "feedback"`, now keys off
  `body.feedbackSections` presence so it renders PAR-Q answers too, with proper labels (not raw
  `q1`/`full_name` keys) since the template supplies them.
- **Migration run against prod, verified** (Craig's go-ahead, this session): 17/17 `signed_parq` rows
  snapshotted into `client_documents` (kind='parq'). Spot-checked 3 real clients (Colin Farley — a real
  "yes" answer and free-text conditions field, Sarah Tyler, Craig Blackman) — every field byte-matches
  the legacy row. Clearance-status side effect re-derived idempotently, matching pre-migration state.
  **No legacy `signed_parq` row was touched, updated, or deleted** — this is a pure additive snapshot;
  retiring the old table is a separate, later, explicitly-gated step once more time has passed.
- **Removed the mechanisms that generated new public-page links**: `SendDocumentLink.tsx` (the
  "Send PAR-Q"/"Send PAR-Q update" buttons on the client detail page and the dedicated PAR-Q history
  page) and `app/api/parq/send-email/route.ts` (built two sessions ago specifically to fix PAR-Q's
  broken email button — now superseded, not wasted, by the document engine's own send/resend, which
  every other kind already uses). `DocumentRegister.tsx` no longer reads `signed_parq` directly at all
  — PAR-Q data (old and new) now flows through the same generic `client_documents` rows as every other
  kind, so it no longer double-lists PAR-Q entries post-migration.
- **The dedicated PAR-Q history page** (`/hub/clients/[id]/parq`) is kept, relabelled "PAR-Q (legacy
  record)", with a note pointing to the client's Documents tab for anything new — not deleted, since
  it's still the only place to read pre-migration free-text/diff history, and deleting working code
  without a reason isn't the move.
- **`NewDocumentButton.tsx`** now offers "PAR-Q" alongside every other kind — Esther picks it, hits
  send, done, exactly like Terms/Consent/Feedback.

### Deliberately NOT done this session
- **Agreement (`/agreement`, `signed_agreements`) — not migrated.** No schema mapping exists yet (unlike
  PAR-Q, which had a head start from Lane C). It also needs to keep the PDF-attachment email, which
  only got fixed to a working backend two sessions ago. This is real, separate scope — flagged for next
  session, not silently skipped.
- **`/parq` (blank first-submission form) and `/parq/edit/[id]` are NOT deleted.** Nothing links to them
  anymore (no new client will ever be sent one), but any already-outstanding link from before this
  session (7-day TTL) will still resolve correctly rather than 404 on a client mid-form. Safe to fully
  retire once enough time has passed that no live links remain — a later, low-risk cleanup.
- **The hub's admin PAR-Q edit page** (`/hub/clients/[id]/parq/[parqId]/edit`, `signed_parq`-backed) and
  the `tracker`/compliance-tab code paths that also read `signed_parq` directly were left completely
  untouched — those are safety-critical (medical clearance tracking) and reviewing/repointing all of
  them properly is its own scoped pass, not something to sweep up as a side effect of this one.

### Verified
`npx tsc --noEmit` clean. `npm run build` compiles successfully (fails only at the known pre-existing
Windows/OneDrive symlink trace step, confirmed unrelated — same failure exists on unmodified code).
Not live-browser-verified (no hub credentials this session) — a real click-through sending/signing a
new PAR-Q from the hub is worth doing before fully trusting this.

## Session 2026-07-21 (latest) — New "Client Feedback Questionnaire" document type (local, NOT pushed, migrations NOT run)

Added a 5th document-engine kind, `feedback`, matching `D:\apps\design-systems\brand-staging-2662e9\documents\client-feedback-questionnaire.html` verbatim in content. Unlike terms/risk_assessment/annual_review/consent, this isn't a legally-signed document — it's a survey (free-text + radio-choice questions + two optional consent checkboxes about using the client's words publicly), so "submitting" it just needs the client's typed name to identify the response, not a real signature/agree checkbox.

**Schema extension** (`lib/documents/types.ts`): `DocumentBody` gained `feedbackSections` (numbered sections of text/choice questions) and `feedbackConsents` (checkbox list), parallel to the existing `consentGroups` pattern. `ClientDocument` gained `feedback_responses` (jsonb: `{answers, consents}`).

**Rendering** (`lib/documents/render.tsx`, `components/documents/DocumentView.tsx`): new `FeedbackSectionsView`/`FeedbackConsentsView`, real interactive React state (not `dangerouslySetInnerHTML`) — same trust model as the existing interactive consent checkboxes.

**Signing flow** (`app/documents/[id]/sign/DocumentSignClient.tsx`): a `doc.kind === "feedback"` branch renders a simplified slot — "Your name" field + "Submit feedback" button, no separate signature field or "I agree" checkbox (both meaningless for a survey). Submits `signature = name` under the hood so it flows through the existing `/api/documents/[id]/sign` route and `isFullySigned()` logic completely unmodified — only real route change was accepting and persisting an optional `feedback_responses` field.

**Esther's view** (`DocumentDetailClient.tsx`): added a "Responses" card, since a feedback doc has no other content for her to review once submitted (this is the whole point of the feature — a document she can't read the answers to would be useless). Not wired for inline editing of the questions themselves (matches how `consentGroups` also aren't editable via the hub UI today — a template-level change, not a per-document one).

**CSS** (`app/globals.css`): ported `.field-grid`, `.textarea`, and the mockup's radio-pill question pattern (`.q`/`.q__legend`/`.q__answer`/`.pick`) into the existing document-engine CSS block, deriving all colours from the app's existing tokens via `color-mix()` — no new hex values, matching the pattern used for the rest of the document engine.

**New document creation**: `NewDocumentButton.tsx`'s kind selector now includes "Client Feedback" — sending one to a client works exactly like every other document kind (create from the client's Documents tab → email/resend/copy-link, all already built).

### Migrations run (Craig's go-ahead, same session)
Both migrations run against prod via the standing Coolify tunnel (`127.0.0.1:5433`, `DATABASE_URL` from `.env.local`) using a temp runner script (deleted immediately after, `git status` confirms nothing left in `scripts/`):
- `feedback_responses` column confirmed present on `client_documents`.
- `document_templates` row confirmed live: `kind='feedback'`, `name='Tell us about your online training'`, `version=1`, `requires_client_signature=true`, `requires_trainer_signature=false`.

"Client Feedback" is now a real, creatable document kind end-to-end — send/resend/copy-link all work exactly like every other kind.

### Verified
`npx tsc --noEmit` clean project-wide. Not live-browser-verified (no hub credentials this session) — worth a real click-through + a real client-facing submission before fully trusting the flow.

## Session 2026-07-21 (later still) — Hub mockup-alignment pass, Lane H (local, NOT pushed)

Full 12-agent pass bringing every hub route in line with its `hub-*.html` mockup — see the Work
Order's new "Lane H" section for full detail, not duplicated here. Short version: most routes already
matched from earlier sessions (verified, not assumed); real fixes landed on All Documents (rebuilt to
the hub's own list-page pattern — its mapped mockup turned out to be an SOP detail page, not a
documents list), Site Content list (one TokenPill fix) and Site Content editor (a literal `&amp;amp;`
text bug, missing icon, Title Case→sentence case labels, missing subtitle). Process & Quality's real
CRUD/data confirmed untouched. `tsc --noEmit` clean project-wide. Three follow-up items spawned as
separate background-task suggestions rather than actioned inline (client-edit right rail/banner gap,
ProcessQualityManager badge dedup, hub-sop mockup mismatch needing a real mockup).

## Session 2026-07-21 (later) — PAR-Q real email sending + update-email resend (local, NOT pushed)

Craig reported two gaps: no way to resend a 6-week/4-week client update email once it's gone out,
and no way to actually *email* a PAR-Q to a client (or see options to email other documents) — he
said this was requested yesterday (2026-07-20).

### What was found
- **6-week update emails**: `app/api/updates/[updateId]/send/route.ts` explicitly blocked sending
  once `status === "sent"` (`409 "This update has already been sent"`) — no resend path existed,
  by design, not a bug.
- **PAR-Q**: `SendDocumentLink.tsx` (used on both the client-detail Compliance card and the
  standalone PAR-Q history page) has always been copy-link-only despite the mail icon/label —
  clicking it copies a URL to the clipboard, it never emails anything. This is the actual gap Craig
  hit — there never was a real "email the PAR-Q" option, only "Send PAR-Q update" phrasing that
  implies one.
- **Agreements**, by contrast, already have a real email option (`AgreementDetailClient.tsx` →
  `/api/agreements/[id]/email`) — but it uses `RESEND_API_KEY`/the `resend` npm package, a
  *different* backend from the one everything else in the app uses (`lib/email.ts`,
  SendGrid/SMTP-based). `state.md` already flags `RESEND_API_KEY` as unset — so the agreement email
  button is present in the UI but silently dead (`501` on click). **Not fixed this session** — flagged
  here for a decision (rewire it onto `lib/email.ts` vs. set `RESEND_API_KEY`), since fixing it means
  either losing the PDF attachment (SendGrid/SMTP path has no attachment support yet) or extending
  `lib/email.ts` to support attachments — a slightly bigger change than the two asked-for items.

### What was built
1. **Update-email resend**: `send/route.ts`'s guard now allows `"sent"` through alongside
   draft/scheduled/failed (resend re-dispatches and updates `sent_at`, no schema change).
   `UpdateRowActions.tsx` gets a new "Resend" button, shown only when `status === "sent"`, alongside
   the existing Preview/Delete (Edit/Send-now stay draft/scheduled/failed-only, unchanged).
2. **Real PAR-Q email**: new `lib/email-templates/parq-request.ts` (reuses the shared
   `buildBrandedUpdateEmail` shell, wording tailored to "complete/update a questionnaire" rather than
   "sign a document") + new `app/api/parq/send-email/route.ts` (mirrors the document-engine's
   `send_email` action in `app/api/documents/[id]/route.ts`: looks up the client by `clientNumber`,
   400s with a clear message if no email on file, mints a signed 7-day edit link via
   `mintParqLinkParams` for updates or a blank-form link for first sends, sends via `getEmailSender()`,
   stamps `signed_parq.sent_date`). `SendDocumentLink.tsx` now renders a real "Email …" button (primary,
   disabled with a tooltip when the client has no email on file) plus the existing copy-link action as
   a secondary icon button, for PAR-Q specifically (`path === "/parq"`; agreements keep the old
   copy-only behaviour since they already have their own separate email button on the agreement page).
   `DocumentRegister.tsx` and the standalone PAR-Q page now thread `clientEmail` down from the already
   -loaded `clients.email` column (both call sites already had it or a one-line `select` addition
   away).

### Verified
- `npx tsc --noEmit` — clean, zero errors project-wide.
- **Not verified live** — no hub login credentials available this session (same limitation noted
  throughout this Work Order), so this was checked by code review + type-check only, not a real
  browser send. Before trusting a real client receives an email: confirm which backend `lib/email.ts`
  resolves to on this environment (`getEmailStatus()`) — `state.md` flags this as previously
  unconfirmed for the document-engine feature too.

### Follow-up (same session): Agreements email fixed, resend now works on every document kind
Craig confirmed the goal broadly — "every document should have the ability to resend in case they
didn't receive it the first time or it added in junk mail" — so the Agreements gap flagged above
was closed rather than just documented:
- **`lib/email.ts`** gained `attachments?: EmailAttachment[]` on `SendEmailInput`, implemented for
  both the SendGrid Web API path (base64 `content`) and the Nodemailer/SMTP path (native
  `attachments`). This is the first attachment support in the shared send layer.
- **`app/api/agreements/[id]/email/route.tsx`** rewritten to build the PDF the same way as before
  (`AgreementPDF` + `@react-pdf/renderer`) but send it through `getEmailSender()` instead of a raw
  `Resend` SDK call keyed off the never-set `RESEND_API_KEY` — same working backend as everything
  else in the app now.
- **`AgreementDetailClient.tsx`** — button now reads "Resend email" after the first successful send
  in the session (was always "Email PDF"); success message distinguishes a real send from a dry run
  (no backend configured), matching the document-engine's own send feedback pattern. No DB
  column tracks "has this ever been emailed" across sessions — the button resets to "Email PDF" on
  a fresh page load; a persistent flag would need a migration, not added here since it wasn't asked
  for and the button was already always-clickable regardless of label.

**State of resend across every document kind, after this session:**
- Document engine (terms/risk_assessment/annual_review/consent): already had it (built 2026-07-20).
- PAR-Q: fixed this session (real email, was copy-link-only).
- Agreements: fixed this session (email existed but the backend was dead).
- 6-week/4-week client update emails: fixed this session (resend was blocked outright once sent).

### Not done
- **Not committed, not pushed** — local changes only, per the standing push/deploy `[GATE]`.
- No live send test — no hub credentials this session; verified via `tsc --noEmit` + code review only.

## Session 2026-07-21 — Lane F pushed, portal fixed & live, hub-wide icon/colour audit, Site Content inventory, blog byline + SEO

### Status snapshot
Big session, mostly reactive fixes and follow-through on 2026-07-20's work rather than new scope. Everything below is committed, pushed, and confirmed deployed live on `staging.eternal-fitness.co.uk` via the Coolify MCP (not self-reported) unless noted.

### 1. Blog byline fix
Ran the pending `author_name = 'Craig Blackman' → 'Esther Fair'` update directly against prod (26/27 rows). Content/titles untouched — the migration file it came from also had two DELETE + three content-reframe statements that were deliberately **not** run, since Craig separately said blog content itself stays as-is until Esther reviews it.

### 2. Client portal — found and fixed a real "not actually live" bug
Craig said "do the WCAG check, then get [the portal] live." Live-browser check on `/portal/login` hit `ERR_TOO_MANY_REDIRECTS` — confirmed with a bare `curl`, zero cookies, so not a stale-session artefact. Root cause: `app/portal/layout.tsx` wrapped `/portal/login` as well as the authenticated routes, so an unauthenticated visit redirected to login, re-triggered the same layout's session check, and redirected to itself forever. Fixed by moving the protected content into `app/portal/(protected)/`, mirroring the hub's already-working `app/hub/(protected)/` pattern — login sits outside the guard. Verified locally (200 on login, single redirect on the dashboard) before pushing. **This means the portal was never actually reachable between when it was "built" on 2026-07-20 and this fix** — worth knowing if anyone assumed otherwise from the earlier handoff.

### 3. WCAG contrast — real check, real failure found
Instead of re-trusting the earlier self-check, computed actual WCAG contrast ratios from the live CSS token hex values. Found 3 of 5 `StatusBadge` tokens (primary/warning/success) measuring 2.5–4.2:1 against their tinted pill backgrounds — under the 4.5:1 AA minimum — most visibly "Signed" and "Sent", the two labels a client sees most on their portal dashboard. Added darker `--status-primary-text`/`--status-warning-text`/`--status-success-text` variants (same hue, reduced lightness, verified ≥4.5:1) used only for badge text, leaving the base tokens (icons, borders, which only need 3:1) untouched. Focus ring itself already passed. Didn't touch the colours unilaterally without checking first — these are brand-adjacent choices — but Craig said "that's fine" so it shipped.

### 4. Hub/portal noindex hardening
Found `/hub/*` was already fully noindexed (unconditional `robots: {index:false}` in `app/hub/layout.tsx`, on top of `robots.ts`'s disallow) — nothing to do there. `/portal/*` had no equivalent. Added the same defense-in-depth pattern (`app/portal/layout.tsx` metadata-only wrapper + `robots.ts` disallow entry).

### 5. Blog SEO fixes
Meta/OG descriptions were raw excerpt text truncated at 199–200 chars (past Google's ~155–160 display limit, cut mid-sentence, one sample leaking a literal `&nbsp;` into the snippet). Added `lib/seo.ts`'s `cleanMetaDescription()` — decodes entities, re-truncates at a word boundary — used in `generateMetadata` and the Article JSON-LD, presentation-layer only, doesn't touch the DB. Converted 4 of 5 raw `<img>` tags to `next/image` (left the 5th — an author avatar — alone after a direct rejection mid-session). Added an "Explore" links block (Exercise for Health / Cancer Rehabilitation / Personal Training) to the blog post sidebar — there were previously zero internal links from blog posts to condition pages. Sitemap `lastModified` now uses `updated_at` instead of `published_at`.

### 6. Site Content — rebuilt into a full inventory (Craig's request, OpenDesign mockup supplied)
Was tracking only the 9 static marketing pages. Migration `20260721_site_content_full_inventory.sql` added a `page_type` column (static/condition/legal/blog), replaced the `pending/reviewed/needs_rewrite` status enum with `published/needs_writing/needs_updating` (clearer language, matches how Craig actually talks about page state), and seeded 38 new rows: 3 legal pages, all 8 exercise-for-health condition pages (3 built + 5 gated/unbuilt), and all 27 blog posts. 47 total.

List page (`site-content-table.tsx`) rebuilt twice — once from scratch matching the general "add filters, KPI tiles" ask, then rebuilt again when Craig supplied the actual OpenDesign mockups (`hub-site-content.html`/`hub-site-content-editor.html`) to match them precisely: select-dropdown filters with live counts (not pill buttons), a separate URL column, a "Rescan pages" button (visual only, not wired to real page-discovery logic). Editor page reworked to match too, and in the process caught a real bug the mockup surfaced: the status `<Select>` still offered the old `pending`/`reviewed`/`needs_rewrite` values, which the DB constraint had stopped accepting — saving with an old value would have hit a silent constraint violation.

Deliberately not built: per-page content editing for the 38 new rows. Only the original 8 static pages have `page_content_blocks` entries; new rows show as inventory-only ("—" instead of "Edit copy"), no broken/no-op editor links.

### 7. Hub-wide icon/status-colour audit — the big one
Craig caught the Site Content mockup mismatch (icons and colours swapped between "Needs Writing"/"Needs Updating") and asked if it was systemic. Dispatched 8 parallel Explore agents, one per hub page with a source mockup, each diffing icon shapes and `--status-*` tokens against the mockup HTML precisely (not from memory). **6 of 8 pages had real defects**, several serious rather than cosmetic:
- Dashboard: `StatusBadge` got a token name instead of a status value → silently rendered nothing on every "Recent Check-ins" row.
- Reports & Updates (`lib/updates/status.ts`, shared with the client-detail Updates tab): raw shadcn `Badge` variants instead of design tokens → "Sent" was literally invisible (white-on-white), "Draft" was teal instead of amber, "Scheduled" was a plain outline instead of rose.
- Client detail: 3 card-header icons missing/wrong colour, GP Clearance badges same invisible/wrong-colour pattern, Plan Agent bot navy instead of teal throughout, Profile tab icon wrong (group vs single-person).
- Client edit: 5 of 8 card-header icons wrong shape, including one the mockup deliberately reused from the Plan Agent sidebar icon that got replaced with a generic clipboard.
- Process & Quality: SOPs KPI tile wrong colour+icon; separately, a local "draft" badge coloured rose when the shared system says draft = neutral everywhere else.
- Exercise library: one cosmetic icon mismatch.
- Clean: `/hub/clients`, `/hub/studio-equipment`.

Root cause of most of the real bugs: pages built their own disconnected status-colour system instead of the shared `lib/hubStatus.ts` tokens — introduced during the Lane E/F restyle passes. Fixed by extracting a shared `TokenPill` component (`components/hub/StatusBadge.tsx`) for status domains that collide with the global string lookup (e.g. "sent"/"draft" already mean something else for documents), and moving every raw-`Badge` call site onto it.

Also fixed two shared-component bugs hitting every hub page: `HubCardHeader`'s icon badge was 36px vs the mockup's 30px; `HubAlert`'s danger severity used the same triangle icon as warning (so "Do Not Train" and "Action needed" were only distinguishable by colour). Bonus: fixed `HubCardHeader`'s `subtitle` prop type (was `string`, needed `React.ReactNode`) — this was the actual root cause of the `ClientUpdatesPanel.tsx:60` TS error that's been flagged "pre-existing, unrelated" three separate times across this Work Order. `tsc --noEmit` is now completely clean project-wide for the first time.

One more bug Craig caught after this shipped: a literal `/* Needs Attention */` JS comment sitting unwrapped in the dashboard's JSX tree, rendering as visible text on the page instead of being treated as a comment. One-line fix (wrap in `{}`), shipped separately.

### Verification standard used throughout
Every fix: `rm -rf .next && tsc --noEmit` clean, full `next build` clean (except the known pre-existing Windows/OneDrive `EPERM` symlink step in the standalone-output trace phase — irrelevant to Coolify's Linux build), then commit → push → Coolify deploy confirmed via the MCP tool (`deployment get`, checking `status: finished` + healthcheck pass), not trusted from a self-report. No hub login credentials available this session, so hub pages were verified via build/type-check/code-review rather than a live browser click-through — flagged each time, not silently assumed working.

### Still open
- PAR-Q edit screen inside the hub still uses the shared public-facing `ParqEditClient` component's own (unrestyled) internals — deliberately not touched, that component is also live on the public client-signing flow and a deep edit risked breaking it. Needs a scoped decision (fork a hub-native copy vs. leave as-is) before anyone touches it.
- 5 of 8 condition sub-pages still don't exist — gated off, not dead links, but a scope decision (which/how many to build) is still pending.
- Production domain cutover, client data consolidation (Lane A), Process Register/SOP content review (Lane B — seeded but Esther hasn't reviewed), PAR-Q→document-engine migration run (Lane C) — none of these were touched this session, all still open from 2026-07-20.

## Lane F — full hub design-consistency sweep, remaining routes (2026-07-20, later session)

### What was built
Added Lane F to the existing hub consolidation Work Order (`.context/workorder-eternal-fitness-hub-consolidation-2026-07-20.md`) to restyle every hub route that had no source mockup: `PackagePaymentsCard.tsx` button fix, `clients/new`, training delivery pages (block/review/print/session), PAR-Q (list+edit), agreements (list+detail), top-level documents register, settings (plan-agent+training-rules), site-content (list+editor), site-review, templates (list+editor), tracker, and the three hub auth screens (login/forgot-password/reset-password). 12 units total, all landed against the token system documented in `D:\apps\design-systems\brand-staging-2662e9\DESIGN.md`.

### How it was actually delivered
First attempt was 4 parallel `opencode run` CLI launches — all four stalled at bootstrap (36 min, near-zero CPU, zero file changes) and were killed. Craig redirected: Claude Code took over implementation directly via Haiku subagents (one per unit, token-efficient model for mechanical restyle work) instead of the OpenCode CLI. All 12 units landed this way across 3 batches.

### Verified, not just self-reported
Every unit was independently checked by Claude Code (Sonnet, this session) via `git diff` review plus `tsc --noEmit`/`npm run build`, not trusted from the subagent's own report. Caught and fixed 3 real issues before calling anything done:
- **Tracker page** — a subagent removed the `sm:` responsive breakpoint from the KPI tile grid, incorrectly claiming it matched the dashboard (the dashboard actually uses `lg:grid-cols-3`, still responsive). Reverted to `sm:grid-cols-3`.
- **Templates page** — a subagent mapped "template active/inactive" and the PAR-Q "Form" tag onto `StatusBadge status="signed"`, which would have shown a misleading green "Signed" badge for an active template (conflating document-signed status with template-active status). Fixed to `status="active"` (resolves via `blockStatusMap`) and a plain neutral "Form" badge.
- **Hub auth screens** (login/forgot-password/reset-password) — a subagent used `font-400` and `text-muted-text`, neither of which are real classes in this project's Tailwind config (no `fontWeight` extension, no `muted-text` color key) — both silent no-ops. Fixed to `font-normal` and `text-[var(--color-muted-text)]` across all 3 files (9 occurrences).

One unit (`clients/new`) also went beyond a pure token restyle — Contraindications/Pain Points moved from plain `Input` to `TagMultiSelect`, Training Location/Sessions-per-Week from `Select` to `SegmentedControl` — checked against the sibling `clients/[id]/edit/page.tsx` and confirmed it matches an already-shipped, already-proven pattern rather than introducing something new.

### Not done
- **Not pushed** — 21 files changed locally, all verified, `git push`/deploy is `[GATE]` per the standing rule. Awaiting Craig's go-ahead.
- Full-project `npm run build` still ends in the known pre-existing Windows/OneDrive `EPERM` symlink error at the file-tracing step (unrelated to any of this session's changes, confirmed present on unmodified code too).

## Remaining hub screen mockups restyled — dashboard, exercises, process & quality, reports/updates, SOP detail, studio equipment (2026-07-20, later session)

### What was built
Craig dropped 6 new mockups into `D:\apps\design-systems\brand-staging-2662e9` (`hub-dashboard.html`, `hub-exercise-library.html`, `hub-process-quality.html`, `hub-reports-updates.html`, `hub-sop.html`, `hub-studio-equipment.html`) and asked for them to be wired in, restyle-only (any functionality shown that doesn't already exist in the hub is explicitly out of scope). An Explore agent scoped mockup → live-component mapping first; six OpenCode units then restyled each screen in parallel (sequencing the SOP-detail unit after Process & Quality since both touch `ProcessQualityManager.tsx`). Full detail and per-screen VERIFY notes are in `.context/workorder-eternal-fitness-hub-consolidation-2026-07-20.md`'s "Lane E (cont.)" section — not duplicated here.

### Two silent OpenCode failures caught during verification (neither surfaced from the unit's own self-report)
1. **Studio equipment, first attempt:** planned the entire restyle in prose ("Let me write the new page.tsx...") then exited with code 0 having never called Write/Edit — files on disk were untouched (mtimes from July 9/11). Caught via `git diff`/mtime check, not the CLI's reported success. Re-dispatched with an explicit "you must call Write before ending your turn" instruction; the retry worked.
2. **Dashboard unit:** left an unclosed `/* Recent check-ins */` JSX comment (missing the closing `*/}`) that broke `tsc` project-wide. The unit's own isolated check didn't catch it; a full-project `tsc --noEmit` run after all units landed did. Fixed directly (one-line).

### Verification done
- `npx tsc --noEmit` across the whole project: clean except one **pre-existing, unrelated** error (`components/hub/ClientUpdatesPanel.tsx:60` — a `subtitle` prop typed `string` receiving a JSX element). Confirmed pre-existing via `git stash` (still present against clean HEAD `043a354`). Left alone — out of scope, flagged for Craig.
- `pnpm build`: compile step is clean ("Compiled successfully"); the build then hits an `EPERM`/`symlink` failure during Next's `output: standalone` file-tracing step — a pre-existing Windows/OneDrive filesystem permission limitation on this dev machine, unrelated to any of this session's code changes.
- **Not done:** live visual verification. Dev server was running at `localhost:3001`, but the hub login connects through to the real production DB (`DATABASE_URL` in `.env.local` points at the `localhost:5433` tunnel) and no credentials were available — rather than guess at a login, Craig was asked and chose to check the 6 screens himself instead of sharing credentials for a browser-automation pass.

### Committed and pushed (2026-07-20, Craig's go-ahead)
Two commits on `main`: `cebc3a1` (the six-screen restyle, 8 files/1034 insertions/580 deletions) and `e66c6ba` (this handoff/state/Work Order doc update). Pushed to `origin/main` (`043a354..e66c6ba`). Coolify auto-deployed (`ac82qg9h7wtawl2rgqyqa2md`, commit `e66c6ba`) — confirmed `finished` and app `running:healthy` on `https://staging.eternal-fitness.co.uk` via the Coolify MCP, not just a self-report. Craig's own visual check at `localhost:3001` was not confirmed back before the push — worth a live look at staging next session if anything looks off.

## Consent document type + document-engine token cleanup (2026-07-20)

### What was built
A brand-new `consent` document type for the document engine, matching the accessible
client-consent reader in `D:/apps/design-systems/brand-staging-2662e9/documents/client-consent.html`
(the `document-system.css` variant — **not** the `client-consent-alt.html` card-style variant; the
alt is flagged here as an alternative Craig could request instead).

### Files changed / added
- **`lib/documents/types.ts`** — added `'consent'` to `DocumentKind`; added `consent: "Consent"`
  to `DOCUMENT_KIND_LABEL`; added `consentGroups?: { id; legend; options: {key; label}[] }[]` to
  `DocumentBody`; added `consent_choices?: Record<string, boolean> | null` to `ClientDocument`.
- **`lib/documents/render.tsx`** — `DocumentBodyView` now accepts optional `consentChoices` /
  `onConsentChange` props and renders `body.consentGroups` as **real interactive React checkboxes**
  (not `dangerouslySetInnerHTML`) when both are supplied.
- **`app/documents/[id]/sign/DocumentSignClient.tsx`** — renders the consent groups (via
  `DocumentBodyView`), holds their state in `consentChoices`, and includes `consent_choices` in the
  POST body when the document has `consentGroups`. Also did the SCOPED token cleanup (see below).
- **`app/api/documents/[id]/sign/route.ts`** — accepts an optional `consent_choices` field from the
  request body and persists it on the `client_documents` row when present (client role only).
- **`supabase/migrations/20260720_consent_choices_column.sql`** (NEW, **NOT run**) — purely
  additive `ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS consent_choices jsonb;`
- **`supabase/migrations/20260720_consent_template.sql`** (NEW, **NOT run**) — seeds a
  `document_templates` row for `kind='consent'`, `requires_client_signature=true`,
  `requires_trainer_signature=false` (consent is client-only), `body.intro` + a single
  `What you need to know` section (verbatim note--plain wording) + the three `consentGroups`
  (content use / platforms / identification) with option wording copied exactly from the reference.
  Guarded with `WHERE NOT EXISTS` so it is re-runnable.

### SCOPED design-token cleanup (document engine only)
Replaced hardcoded hex / JS consts in `DocumentSignClient.tsx` and `render.tsx` with the app's OWN
existing Tailwind brand tokens — this surface now pulls from the same tokens as the rest of the app,
front-end left untouched:
- Removed `NAVY`/`ROSE`/`TEAL` JS consts. Header now `bg-charcoal` (was `NAVY #282B38`),
  `bg-rose` logo tile (was `ROSE #C1839F`), `text-rose` fitness mark.
- `text-rose` → `accent-rose` checkbox accent; `bg-teal`/`text-white` submit button (was `TEAL`).
- Page + done backgrounds `bg-warm` (was `#F5F5F5`); signed-banner `bg-warm`; dividers
  `border-border-warm` (was `#E5E5E5`). Done heading `text-charcoal`.
- `rose #C1839F`, `teal #087E8B`, `warm #F5EFEA`, `border-warm #E4DDD7` already exactly match the
  new design system's rose / teal / warm / warm-border. **No new token introduced.**
- `render.tsx` still hardcodes grey text hexes (`#525A61`, `#1E1E1E`, `#E5E5E5`, `#F5F5F5`) for the
  read-only HTML sections — left as-is; they are pre-existing and outside this unit's cleanup scope.
  Flagged for a later pass if Craig wants full token alignment there too.

### ⚠ Token discrepancy for Craig to decide (out of scope — NOT resolved here)
The new design system's `DESIGN.md` specifies `ink: #131313`, which is **darker** than this app's
existing `charcoal: #2D3436` (rgb 45 52 54). This unit deliberately used the existing `charcoal`
token (per instruction: do NOT introduce a new `ink` token, do NOT resolve the discrepancy). The
numeric difference is real: `#131313` (19 19 19) vs `#2D3436` (45 52 54). Craig should decide
separately whether the app's `charcoal` should move to the design system's `ink #131313` — that is a
sitewide token decision, not a document-engine one.

### Verified
- `npx tsc --noEmit` — **no type errors in any new/changed file.**

### GATEs NOT crossed (explicitly out of scope)
- **Neither new migration has been run.** Both `20260720_consent_choices_column.sql` and
  `20260720_consent_template.sql` are written but **NOT executed**. Running them against production
  is a separate step needing Craig's explicit go-ahead.
- No database connected to, no `pnpm/npm install`, no `git push`. Local commit only.

## Work Order — Craig's decisions + Lane B migration run (2026-07-20, ~12:40pm)

- **Trainerize:** Craig confirmed manual entry — client data will be typed into the hub by hand,
  not scraped/exported. Closes Lane A units 2/3's open decision; no import script needed. Roster
  is small enough that this is the right call, not a shortcut.
- **Lane D auth:** Craig approved the magic-link design in `.context/lane-d1-client-auth-design.md`
  as-is. Green light for Lane D unit 2 (build the portal view) to proceed — but the two remaining
  `[GATE]`s on Lane D (implementing login as a *live* surface on production, and inviting any real
  client) are unchanged and still need separate explicit go-ahead, consistent with how Lane B/C's
  DB writes were staged-then-gated.
- **Lane B migration run:** Craig gave explicit per-session authorisation to write to production
  Postgres for Lane B specifically. Ran `supabase/migrations/20260720_process_quality_system.sql`
  against prod via the standing Coolify tunnel (`127.0.0.1:5433` → `10.10.10.2:5432`, role
  `ef_app`, `DATABASE_URL` sourced from `.env.local`, never printed/persisted elsewhere). Migration
  is purely additive (`CREATE TABLE IF NOT EXISTS` × 3 + indexes, no ALTER/DROP on anything
  existing) and idempotent. **Confirmed live:** `process_entries`, `sops`, `improvement_log` all
  exist, all 0 rows (as designed — no content seeded). Runner script was a temp file inside the
  repo (for `pg` module resolution), deleted immediately after, nothing else touched. This
  authorisation was scoped to Lane B only — Lane C's PAR-Q migration script remains un-run and
  needs its own separate go-ahead per the Work Order's MUST clause.

## Work Order — Lane C, unit 1 — PAR-Q → document engine migration plan (planning only, no DB)

- **File-based read only — NOT a live-DB confirmation.** Reconstructed `signed_parq` and
  `document_templates`/`client_documents` schemas from `supabase/migrations/*.sql` only. No DB
  tunnel open this session; no connection to production Postgres was attempted or made.
- Verified current state: `document_templates` is seeded with `terms` (real copy), `risk_assessment`
  and `annual_review` (both dual-signed) — **no `parq` template exists yet**. `signed_parq` carries
  the full 29-question structure (q1–q29, split Sections 2/3/4/6) plus free-text detail fields and a
  single client declaration/signature, with versioning (`version`, `supersedes_id`) added by
  `20260710120000_parq_versioning.sql`.
- Produced `.context/lane-c-parq-migration-plan.md` covering: (1) current `signed_parq` schema
  reconstruction, (2) current engine schema, (3) a field-mapping plan for a new `parq`
  `document_templates` entry — a `body` JSON of `{ intro, sections[html], data:{ answers, details,
  personal, signature } }` that preserves the 29-question structure used by `scripts/import-parq.mjs`,
  (4) a migration-script **skeleton only** (not run), and (5) a parity/verification checklist.
- Key mapping decisions: q1–q29 → `body.data.answers`; detail fields → `body.data.details`;
  personal/GP/emergency → `body.data.personal`; signature → `body.data.signature`. Top-level
  `client_id`/`kind='parq'`/`title`/`template_id`/`template_version`/`body`/`client_signature`/
  `client_signed_date`/`status`/`version`/`supersedes_id`/`signed_at` map directly, with legacy
  `status` values folded into the engine's `draft/sent/signed/superseded` set. Migration must also
  recompute `anyYes` → preserve `clients.medical_clearance_status` + `client_tracker.clearance_*`
  (same rule the import script uses), keeping it idempotent.
- **Colin-flow caveat acknowledged**: legacy `signed_parq` RLS is authenticated-only (anon INSERT
  policy was dropped in `20260603_*`), so a logged-out client resume link fails — the migration
  moves PAR-Q onto the engine's service-role public-read pattern, resolving it.
- **Gates (not crossed)**: running the migration needs Craig's explicit per-session prod-DB go-ahead;
  retiring `signed_parq` / the `/agreement` form is gated until 1:1 parity is proven. Neither was
  done — planning artifact only.

## Work Order — Lane A, unit 1
- **Audit complete (read-only local research, no DB touched).** Full field-by-field map written to `.context/lane-a-client-field-map.md`.
- **`clients` table is the intended single source of truth** for per-client commercial + clinical + compliance state. Every column from `20260509` (base), `20260630` (profile extensions), and `20260704` (master consolidation) is actively read/written by the hub UI.
- **Columns sourced from *other* migrations** that the consolidation view (`client_documents_summary`) exposes: `client_number`, `display_code`, `email`, `phone`, `gp_letter_*`, `annual_review_due_date`, `clearance_from`, `specialist_name`, `block_summaries`.
- **Dead / unused `clients` columns flagged:**
  - `display_code` — view-only (computed on the fly in the UI); no TS/TSX reference.
  - `clearance_from` — backfilled from `client_tracker` but never read by the app; the read path still uses `signed_agreements.medical_clearance_from`.
  - `specialist_name` — same as above; never read anywhere.
  - **Consolidation loose-end:** `clearance_from`/`specialist_name` were moved onto `clients` but the UI read path was never repointed off `signed_agreements`.
- **Related dead surface:** `client_tracker` is historical-only (not written by app); its clearance join was dropped from the rebuilt `client_documents_summary` view.
- **Next unit (A2):** determine the actual Trainerize client-data export path — no existing client-data script exists (only `scripts/scrape-trainerize-exercises.mjs`, a different data type).

## Work Order — Lane B (2026-07-20) — Process & Quality System, DB-backed

- **Task**: Port `decoded-ops-hub`'s `OperationsFramework.tsx` three-tab pattern (Process
  Register / SOPs / Improvement Log) into the EF hub as a **DB-backed** module so Esther can
  edit entries herself with no code deploy (decided 2026-07-20, replacing the original
  hardcoded-TSX approach).
- **Read-only reference**: `D:\apps\decoded-ops-hub\src\components\decoded-ops\operations/OperationsFramework.tsx`
  (confirmed structure: `ProcessEntry[]` / `SOP[]` / `ImprovementEntry[]`, tabs Process
  Register · SOPs · Improvement Log — plus Overview and AI Systems tabs that are Decoded-Ops
  specific and were intentionally **not** ported). No edits made to the decoded-ops-hub repo.
- **Migration** (`supabase/migrations/20260720_process_quality_system.sql`): creates
  `process_entries`, `sops`, `improvement_log` matching the TSX shape, adapted to EF (single
  brand — dropped `service` line, replaced with a free `area` text field; dropped the AI
  `skills[]` array as not relevant to EF). `sops.steps` stored as `jsonb`. FK-by-reference via
  `ref` strings (no hard FK — keeps entries independently editable). Tables ship **empty**; no
  content seeded. **NOT run** — needs Craig's explicit per-session prod-DB go-ahead.
- **Types** (`types/index.ts`): added `ProcessEntry`, `Sop`, `ImprovementEntry`, `ProcessStatus`.
- **UI** (`app/hub/(protected)/process-quality/`): server page reads all three tables via the
  existing supabase server client; `ProcessQualityManager.tsx` is a client component rendering
  the three tabs with the hub's own design system (`HubCard`/`HubCardHeader`/`EmptyState`/
  `Button`/`rose`/`teal`/`amber` accents — not Decoded Ops' `.doa-*` classes). Each tab has an
  inline add/edit form (reusing `Input`/`Label`/`Textarea`) and row edit/delete, wired to new
  API routes. Renders empty states until Esther adds content. Added sidebar nav link under
  "Resources".
- **API routes**: `app/api/process-entries` (+ `[id]` PATCH/DELETE), `app/api/sops` (+
  `[id]`), `app/api/improvement-log` (+ `[id]`) — all GET/POST/PATCH/DELETE, auth-gated via
  `supabase.auth.getUser()`, mirroring the existing `/api/equipment` pattern.
- **Verified**: `npx tsc --noEmit` passes for all new files (two pre-existing errors in
  `exercise-browser.tsx` and `ClientUpdatesPanel.tsx` are unrelated). Did **not** run the
  migration, did not write to any DB, did not run `next build`, did not `git push`.
- **Remaining / not done**:
  - Migration must be run against prod Postgres (Coolify SSH tunnel) with Craig's explicit
    go-ahead before the module works — tables don't exist yet.
  - EF-specific **content** (Process Register entries, the three required SOPs — migrate a
    client / onboard a new client / build a plan in the hub, and any Improvement Log entries)
    is not written; Esther/Craig supply it via the new admin UI once tables exist.
  - Decoded-Ops' "Framework Overview" and "AI Systems" tabs were intentionally omitted (not
    EF-relevant). Could add an EF-flavoured Overview tab later if wanted.
  - No row-level locking beyond supabase auth (any hub user can edit) — fine for a 1–2 person
    studio; revisit if multi-staff access is needed.

## Work Order — Lane A, unit 2 — Trainerize client-data export plan (research, unverified)

- Created `.context/lane-a2-trainerize-export-plan.md`.
- The existing scraper (`scripts/scrape-trainerize-exercises.mjs`) uses **headless Playwright
  trainer-login** on the `eternalfitness8` tenant, reading DOM — no API/token. It handles
  *exercise* data, a different type from client records; there is no existing client-data
  export script.
- Ranked export options: **manual read-and-type** (likely default for small roster) > **native
  CSV export** (if the tenant plan exposes it) > **screen-scrape** (extend existing script) >
  **partner API** (unlikely, no API usage today).
- **Explicitly unverifiable in this environment** — no Trainerize credentials or browser session
  available, so no real client was tested. The Work Order's VERIFY criterion ("worked example on
  one real client") cannot be met here. To close: Craig opens a session with browser access +
  his Trainerize login, confirms the tenant's export capability, and runs one real client through
  the chosen method. Treat the plan doc as a feasibility hypothesis until then.
- Constraints honoured: no DB access, no installs, no push — local commit only.

## Work Order — Lane D, unit 1

- **Unit:** Lane D (Client portal MVP), unit 1 — Design client auth approach
- **Type:** DESIGN ONLY / GATE unit (no implementation, no DB, no code)
- **Date:** 2026-07-20
- **Author:** Claude Code (design pass)
- **Artifacts:**
  - `.context/lane-d1-client-auth-design.md` — recommended approach (passwordless magic-link, separate better-auth instance, per-client data scoping), conflict analysis vs existing trainer/staff auth, WCAG 2.2 AA check of the login flow, open questions for sign-off.
- **Key findings:**
  - Existing staff/trainer auth = better-auth email+password (`lib/auth.ts`), session cookie guarded by `middleware.ts` + `app/hub/(protected)/layout.tsx`. Single user table, no role/tenant concept.
  - Recommended client auth = **magic-link via a second, separate better-auth instance** writing its own cookie, on `/portal/*` routes, each account bound 1:1 to a `clients.id` and server-filtered to that client's own data. Staff auth path left untouched (additive, not modifying).
  - Login flow meets Work Order AA baseline (no CAPTCHA, no puzzle 2FA, keyboard-operable) by design.
  - `EF_Trainerize_Accessibility_Scope_Jul2026.md` **not found in repo** — AA checks derived from the Work Order's stated baseline; re-verify against the charter file if located.
- **GATE status:** This unit is a GATE per the Work Order ASK FIRST list ("Adding client authentication/login as a new surface"). Design is for review/sign-off; Lane D unit 2 (build) and the live-auth GATE require explicit approval before proceeding.
- **Next:** Craig reviews approach + open questions (§5 of design doc); on sign-off, proceed to Lane D unit 2 (build read-only portal view).

## Work Order — Lane C, unit 2

- **Task**: Build the PAR-Q `document_templates` entry and a backfill/migration script that
  snapshots every existing `signed_parq` row into `client_documents` (kind='parq'), per the
  mapping in `.context/lane-c-parq-migration-plan.md` §3.
- **Deliverables (both written, neither executed)**:
  - `supabase/migrations/20260720_seed_parq_template.sql` — inserts the `parq` template row
    (structured `body` JSON with `intro` + 8 `sections` + a nested `data` block carrying
    `answers`/`details`/`personal`/`signature`). Mirrors the style of
    `20260704_risk_and_review_templates.sql`. `WHERE NOT EXISTS` guard so it is idempotent.
  - `scripts/migrate-parq-to-engine.mjs` — matches `scripts/import-parq.mjs` style (pg `Pool`,
    DATE/TIMESTAMP type parsers, `DATABASE_URL`, tunnel-aware ssl). Snapshots every legacy row
    oldest-first, re-points `supersedes_id`, re-derives `anyYes` → `clients.medical_clearance_status`
    + `client_tracker.clearance_*` (idempotent), and runs a 1:1 count-verification query. The
    `main()` call is **commented out** so it cannot run by accident. `node --check` passes.
- **1:1 field mapping** is documented in full as a header comment block in
  `scripts/migrate-parq-to-engine.mjs` and summarised in the migration plan §3. Key points:
  top-level `client_id`/`kind='parq'`/`title=full_name+' — PAR-Q'`/`template_id`/`template_version`/
  `body`/`requires_*`/`status`(mapped)/`client_signature`/`client_name`/`client_signed_date`/
  `version`/`supersedes_id`/`signed_at`/`sent_at`; nested `body.data.personal|answers|details|
  signature`. Legacy status mapping collapses the wider `signed_parq` set into the engine's
  four values (`received`/`sent`/`needs_update`→`sent`, `expired`→`draft`).
- **Explicit outstanding verification — NOT closable this session (do not fabricate a "verified" claim)**:
  there was **no database connection** this session (per the Work Order constraint and `[GATE]`).
  The 1:1 mapping is file-based only — reconstructed from `supabase/migrations/` SQL, never
  confirmed against live client records. The plan's own checklist (spot-check ≥3 real clients:
  e.g. Sarah Tyler, Colin Farley, one with a YES answer; confirm `body.data.answers` byte-equal;
  confirm clearance state unchanged) **was not performed**. Before running:
  1. Craig opens the Coolify SSH tunnel (`127.0.0.1:5433`→`10.10.10.2:5432`, role `ef_app`).
  2. Re-verify live schema with `psql \d signed_parq` / `\d client_documents` (a migration could
     have applied to prod outside this repo).
  3. Run `20260720_seed_parq_template.sql`, then `scripts/migrate-parq-to-engine.mjs` only with
     Craig's explicit per-session go-ahead.
  4. Spot-check ≥3 real clients and the verification count before the separate gated step of
     retiring `signed_parq` + the `/agreement` form.
- **Colin-flow caveat** (legacy `signed_parq` anon-read pitfall) is NOT addressed in this unit —
  it is a separate Lane C unit that must move PAR-Q resume links onto the engine's service-role
  public route. Flagged so it is not silently assumed solved.
- **Constraints honoured**: no DB access, no installs (`pg` already a dep), no push, no migration
  or script executed. Local commit only.

## Process note (2026-07-20)
Lane A/C/D's units 2 above ran as three parallel OpenCode processes that all read-appended-wrote
this same file concurrently, causing a lost-update race — several sections were silently dropped
from disk (though preserved in each unit's own commit diff, which is how this file was
reconstructed). Fixed by merging all sections back in chronological order. **Going forward:
handoff.md appends from parallel lane units should be serialized (one writer at a time, or Claude
merges after the fact) rather than left to concurrent agents.**

## Work Order — Lane D, unit 2 (2026-07-20)

Built the client portal magic-link auth surface and the read-only portal view, per the approved
design in `.context/lane-d1-client-auth-design.md` (magic-link, separate better-auth instance,
bound 1:1 to `clients.id`, server-filtered to the client's own data, staff auth untouched).

### What was built
- **Migration (NOT run):** `supabase/migrations/20260720_portal_auth.sql` — new isolated tables
  `portal_accounts`, `portal_sessions`, `portal_magic_links` (own `portal_` prefix, own cookie,
  `client_id` 1:1 FK, `disabled_at` for staff revoke, hashed single-use tokens). NO RLS policies
  for client roles — all reads are service-role, filtered by authenticated `client_id`.
- **Separate auth module:** `lib/portal-auth.ts` — self-contained magic-link request/verify/
  session/destroy over the `portal_*` tables. Distinct cookie `better_auth_portal_session`.
  `requestPortalMagicLink` emails only when a SendGrid/SMTP backend is configured; otherwise
  returns a `devLink` for review and sends nothing (Work Order rule: no auto-emit to clients).
- **API routes:** `app/api/portal/auth/request-link/route.ts` (POST, anti-enumeration — always
  `{requested:true}`), `app/api/portal/auth/verify/route.ts` (GET verify + set cookie + redirect;
  POST logout).
- **Session helper:** `lib/portal-session.ts` — reads the isolated portal cookie only.
- **Middleware:** extended `middleware.ts` matcher to `/portal/:path*` (ADDITIVE — staff `/hub`
  guard rules unchanged; separate portal cookie check; redirects to `/portal/login`).
- **Login UI:** `app/portal/login/page.tsx` — magic-link request, WCAG 2.2 AA (skip link, focus
  ring, `type=email`+`autocomplete`, text+icon status, 44px targets, no CAPTCHA/puzzle 2FA).
- **Read-only portal:** `app/portal/layout.tsx` (slim client shell + sign-out) and
  `app/portal/page.tsx` — three sections reusing hub components (`HubCard`, `HubCardHeader`,
  `StatusBadge`, `EmptyState`): signed documents, outstanding/unsigned documents, update-email
  history. Data via `lib/portal-data.ts`, which filters **every** query by `client_id`.
- **WCAG doc:** `.context/lane-d2-wcag-check.md` — pass/fail per screen (all 3 screens PASS the
  baseline on build-time review; 8 ⚠ items are token-dependent confirm-in-browser checks).

### What's verified
- `npx tsc --noEmit` — **no type errors in any new/changed file** (pre-existing unrelated errors
  in the repo, not introduced by this unit).
- Reused existing hub data/token patterns; no new colour or contrast choices introduced.

### GATEs NOT crossed by this unit (explicitly out of scope)
- **No migration run**, no database connected to, no `pnpm/npm install`, no `git push`.
- **No real email sent / no real client account created** — magic-link emails only fire when an
  email backend is configured; otherwise the link is returned for staff review only.
- **Going live as a production auth surface** (Lane D `[GATE]`) — NOT done.
- **Inviting any real client** (Lane D `[GATE]`) — NOT done.
- Before either gate: run `20260720_portal_auth.sql` on prod (Craig's per-session go-ahead), then
  a browser/SR pass to clear the 8 ⚠ WCAG confirmations, then a two-account isolation test.

### Constraints honoured
No DB access, no installs, no push, no migration/script executed, no real email/account. Local
commit only.

---

## Document engine — real design system port

**Date:** 2026-07-20
**Scope:** `app/documents/[id]/sign/DocumentSignClient.tsx`, `lib/documents/render.tsx`,
`components/documents/DocumentView.tsx` (new), `components/documents/DocumentAccessibilityControls.tsx` (new),
`app/globals.css` (document-engine block appended), `.context/handoff.md` (this entry).

### What changed
The earlier pass only swapped a few JS colour consts — the document pages still rendered with the
old dark-charcoal `BrandHeader` block and unstyled `dangerouslySetInnerHTML` sections. This rebuild
ports the **actual visual structure** from the canonical reference
(`D:/apps/design-systems/brand-staging-2662e9/documents/client-consent.html` +
`document-system.css`) so the live documents match the new brand.

New shared component `DocumentView` renders, in order, for **every** document kind:
1. **Masthead** — light warm/white surface (NOT the old dark charcoal block; the reference
   masthead is light), with EF rose-heart logo mark + "Esther Fair — Level 4 Personal Trainer /
   Private studio, Worthing, West Sussex" org text.
2. **Eyebrow** (`Client document NN`, per-kind number) + **serif italic display title** (DM Serif
   Display via existing `--font-serif`) + **standfirst** paragraph.
3. **Meta info list** — Document / Completed by / Review / Reference (per-kind reference code).
4. **Accessibility toolbar** — Text size Normal/Larger/Largest + High-contrast toggle + Print,
   persisted to `localStorage` (`ef-doc-text`, `ef-doc-contrast`) and reflected onto `<html>`
   `data-text` / `data-contrast` attributes exactly like the reference's inline script, ported to
   a React effect (`DocumentAccessibilityControls`). These are functional client features for EF's
   visually-impaired population, not decoration.
5. **Intro + numbered sections** (eyebrow numeral + serif H2 + body), 18px minimum body text,
   generous spacing, hairline rules.
6. **Consent groups** — for `consent` docs, rendered as real interactive checkboxes styled with the
   new `.consent` card style (interactive state wired to React state, captured on submit).
7. **Sign-boxes** — name/date/signature fields + sign-box visual style (Signed / Date / Logged).
8. **Footer** — review + accessibility note.

CSS was added to `app/globals.css` as a self-contained document-engine block, bound to the repo's
**existing** brand tokens (rose `#C1839F`, teal `#087E8B`, warm `#F5EFEA`, border-warm `#E4DDD7`,
charcoal/ink, etc.) and the already-loaded `font-serif` (DM Serif Display) / `font-body` (DM Sans).
**No new hex values, no new fonts, no new dependencies.** `color-mix()` is used to derive accessible
tints from the registered tokens, matching the reference's approach. High-contrast and A4 print/PDF
rules included.

### Applies to all four document kinds
It is a single shared component (`DocumentView`) consumed only by `DocumentSignClient`. The
masthead/title/sections/footer render from `doc.body` + `doc.kind`; the eyebrow number, reference
code, and meta "Document" line are keyed off `doc.kind`. **Fixing the structure fixes terms,
risk_assessment, annual_review, and consent at once** — not just consent.

### Functionality preserved (no regressions)
- Signing flow (`/api/documents/[id]/sign` POST with name/signature/date + `consent_choices`).
- `consent_choices` capture + re-render interactively inside the body.
- Already-signed state (shows "signed by … on …" note, no form).
- `done` / already-signed confirmation screen (restyled to match).
- Validation + inline error summary.

### What was NOT touched
Template editor (`app/hub/(protected)/templates/[id]/`) — it only edits content, it does not render
the document visually, so no matching visual update was required. Marketing front-end and public
pages untouched. No migration, no DB connection, no install, no push.

### Verified
- `npx tsc --noEmit` — no type errors in any changed/new file. (Two pre-existing unrelated errors in
  `exercise-browser.tsx` and `ClientUpdatesPanel.tsx` are untouched by this work.)
- All brand tokens/fonts reused — zero new colour literals or font loads.

### Next (manual, Craig)
Browser + screen-reader pass on a real document to confirm the contrast toggle and text-size
controls behave; then local review + push.

## Hub client detail/edit pages — design audit + fixes (2026-07-20)

### What was wrong vs the reference mockups
References: `D:/apps/design-systems/brand-staging-2662e9/hub-client-detail.html` and `hub-client-edit.html`.

**Detail page (`app/hub/(protected)/clients/[id]/page.tsx`)**
- Tabs used a shadcn underline `TabsList`/`TabsTrigger` (bottom-border, no fill). Reference uses a
  **raised pill container** (`bg-hub-card`, `border-hub-border`, `rounded-xl`, `p-1`, `shadow-sm`)
  with the active tab as a rose-tint **fill** = `var(--hub-sidebar-active)` (`rgba(193,131,159,.14)`).
- Header meta chips were plain `<Badge>`s. Reference uses label+value `chip-kv` chips on
  `bg-hub-card` with a `border-[var(--hub-border)]`, `rounded-lg`, placed under the title.
- Outline "Edit" button border was the default shadcn ring colour. Reference outline buttons use
  `var(--color-muted-text)` (`#7E8088`) for a deliberate 3:1 border contrast.

**Edit page (`app/hub/(protected)/clients/[id]/edit/page.tsx`)**
- Cards used shadcn `Card`/`CardHeader` (no icon, no bottom divider, different radius). Reference
  uses `HubCard` + `HubCardHeader` (icon + title + subtitle, divider under header).
- Field controls that should be **segmented controls** (training_location, sessions_per_week,
  time_tier, fitness_level, pace_mode) were rendered as **dropdown `Select`s** in several places.
  Reference uses segmented controls for these discrete choices.
- Field borders used `--hub-field-border` (`#C7CCD4`), which is below 3:1 on the canvas. Reference
  deliberately uses `var(--color-muted-text)` (`#7E8088`) for input/select borders (3:1 contrast).
- Buttons used `rounded-xl`/`rounded-md`. Reference buttons are `rounded-lg` (8px).
- No sticky save bar / dirty-state. Reference shows a bottom sticky bar with "No changes yet." /
  "Unsaved changes." based on form dirty state.

### What was fixed
- Detail: tabs → raised pill container + rose-fill active; meta → label+value `chip-kv` on
  `bg-hub-card`; outline Edit button border → `var(--color-muted-text)`.
- `components/hub/HubCardHeader.tsx`: added `noDivider` prop; root now renders a
  `border-b border-[var(--hub-border)]` divider by default (matches both mockups — detail and edit
  cards both show a header divider).
- Edit: all `Card`→`HubCard`+`HubCardHeader` with icon/title/subtitle; added `SegmentedControl`
  helper and replaced the dropdown controls with segmented controls for the 5 fields; form inputs /
  textareas / `SelectTrigger`s / `TagMultiSelect` trigger / `InjuryHistoryTable` + `TrainingRulesEditor`
  inputs all use `border-[var(--color-muted-text)] focus(-visible):border-rose focus(-visible):ring-rose/30`;
  checkboxes use `border-[var(--color-muted-text)] accent-rose`; Cancel/Save buttons `rounded-lg` with
  muted outline border; sticky save bar wired to a `dirty`/`markDirty` state ("No changes yet." /
  "Unsaved changes."), reset on load and on save.

### What was already correct (no change needed)
- `HubSidebar.tsx` — confirms to the mockup sidebar.
- `clients-table.tsx` — confirms to the mockup clients list.
- `app/globals.css` token layer — values confirmed baseline-correct against the reference
  (`--hub-canvas` `#F4F5F7`, `--hub-card` `#FFFFFF`, `--hub-border` `#E6E8EC`,
  `--hub-sidebar-active` `rgba(193,131,159,.14)`, `--color-muted-text` `#7E8088`, `--hub-hover`
  `#F8F9FB`; `rounded-lg` = 8px). No token values changed.
- `HubCard` radius stays `rounded-2xl` (acceptable — the reference cards read as a larger radius).

### Verified
- `npx tsc --noEmit` — no type errors in any changed file. (Two pre-existing unrelated errors in
  `exercise-browser.tsx` and `ClientUpdatesPanel.tsx` are untouched by this work.)
- All brand tokens/facets reused — zero new colour literals or font loads.

### Not touched (per scope)
No migration, no DB connection, no install, no push. Marketing front-end, `HubSidebar.tsx`,
`clients-table.tsx`, and the document engine (`app/documents/`, `lib/documents/`,
`components/documents/`) intentionally out of scope.

### Next (manual, Craig)
Local browser pass on a real client detail + edit screen to confirm tabs, chips, segmented controls,
and the sticky save bar render as intended; then local review + push.

## Document email sending (2026-07-20)

### What was built
Client documents can now be emailed to the client with their signing link, plus a manual copy-link
fallback. Three behaviours per Craig's request:
1. PRIMARY action = email the client the sign link (first send or resend).
2. SECONDARY action = copy the sign link (always available) for manual resend via text/WhatsApp.
3. Once `status` is not `draft`, the primary button flips to "Resend email".

### Files changed / added
- **`lib/email-templates/document-ready.ts`** (NEW) — `buildDocumentReadyEmail(input)` reuses the
  existing `buildBrandedUpdateEmail` from `shell.ts` (shell.ts NOT modified). Carries a rose
  (`#C1839F`) rounded inline-styled CTA button linking to the sign URL, plus a short friendly intro
  and "what to do / why it matters" sections. Input: `clientName`, `greetingName` (first name),
   `documentTitle`, `signUrl`. The CTA is the rose `#C1839F` rounded button rendered inside the branded shell.
- **`app/api/documents/[id]/route.ts`** — PATCH now supports `action: "send_email"`. Uses
  `createAdminClient()` (same pattern as the public GET sign route) to read the document's
  `client_id`, then looks up the client's `name`/`email` from the `clients` table. Builds the email
  via `buildDocumentReadyEmail`, sends via `getEmailSender().send({ to, subject, html })`, then sets
  `status → "sent"` and `sent_at → now` (regardless of first send or resend). Returns
  `{ success: true, dryRun }` so the UI can tell Craig whether a real backend fired. If the client
   has no email on file, returns **400** with a clear message pointing Craig to add one on the client record.
- **`app/hub/(protected)/clients/[id]/documents/[docId]/page.tsx`** — now fetches the client's
  `name`/`email` (second select on `clients` via `doc.client_id`) and passes `clientEmail` to
  `DocumentDetailClient`.
- **`app/hub/(protected)/clients/[id]/documents/[docId]/DocumentDetailClient.tsx`** — the "Send to
  client" card restructured: PRIMARY button "Send email to client" / "Resend email" (disabled with an
  inline note when `clientEmail` is empty/null), SECONDARY always-available "Copy link". After send,
  the toast reports a real send vs a dry run so Craig isn't misled when a client reports nothing
  arrived.

### Design notes / constraints honoured
- No migration run — reused existing `status` / `sent_at` columns.
- No direct DB connection outside the app's normal Supabase clients.
- `shell.ts` untouched — other live emails still depend on it.
- Marketing front-end and `components/documents/` visual redesign intentionally out of scope.

### Verified
- `npx tsc --noEmit` — no new type errors in any changed file. (Two pre-existing unrelated errors in
  `exercise-browser.tsx` and `ClientUpdatesPanel.tsx` remain, untouched.)
- **No real email was sent during the build.** The live `send_email` action was NOT invoked against
  any real document; verification was type-check only.

## Session close — 2026-07-20

Full-day session on the Work Order above (`workorder-eternal-fitness-hub-consolidation-2026-07-20.md`).
Summary for whoever picks this up next — the entries above have the full detail per unit.

**Shipped and live on staging:**
- Lane B: Process & Quality System module + migration (tables live, empty — no content yet).
- Lane D: magic-link auth + read-only portal view — code built, **not deployed as a live auth
  surface**, no real account exists.
- Lane E (added mid-session, Craig-directed, not in original scope): full brand design-system port
  into the document engine (all 4 document kinds), new `consent` document type with real interactive
  checkbox capture, hub client detail/edit pages aligned to the reference mockups, a focus-ring fix,
  and document email-sending (primary = email, fallback = copy link, resend once sent).
- Two prod DB writes made with Craig's explicit per-session go-ahead, both additive-only, verified
  live: Lane B's three tables, and the `consent` template + `client_documents.consent_choices` column.

**Not started / still open:**
- Lane A: no client data has actually been consolidated into the hub yet (method decided — manual
  entry — but no records typed in).
- Lane B: Process Register entries + the 3 required SOPs — needs real input from Craig/Esther, not
  something to write blind.
- Lane C: PAR-Q migration script exists but has not been run against prod, and its 1:1 parity has not
  been spot-checked against real client records (needs a DB tunnel session).
- Lane D: independent WCAG walkthrough (the existing doc was a self-check during the build), then two
  `[GATE]`s — deploy the auth surface live, invite a first real client.
- Broader hub design sweep beyond client list/detail/edit — explicitly deferred when scoped down.

**Two real bugs caught and fixed before shipping** (worth knowing about even though they're already
fixed): a shared-component default change would have silently altered 18+ untouched hub pages
(`HubCardHeader` divider — flipped to opt-in); the new consent-document email built a `signUrl`
variable but never put it in the HTML, so the button the email text promised didn't exist.

**Process lesson**: parallel OpenCode instances writing to the same shared file
(`.context/handoff.md`) caused a lost-update race earlier in the session — recovered from each unit's
commit diff, then avoided by not letting concurrent units free-append to a shared file. OpenCode's own
"done" self-report was not fully reliable — real verification (git history, `tsc`, and for
design/UX asks, the live site via browser automation) caught issues the self-report missed every time
it was actually checked.

**Registry**: `infrastructure/.context/active-workorders.md` reflects current status. Work Order
itself has an updated DONE checklist and a new Lane E documenting today's Craig-directed work.

## Client detail page — full redesign rollout + tab restyle (2026-07-20, later session)

Craig reported UI issues on the client detail page (greyed-out email button, a stray chevron,
misaligned Snapshot card, and — key discovery — a full mockup he'd forgotten was in the design
folder). Investigation + implementation ran in two passes.

### What was found
- **Email button "grey"**: not a bug — `DocumentDetailClient.tsx` disables the send button when
  `clients.email` is empty, with on-page text explaining it. Not resolved as a code fix; flagged
  for Craig to check the specific client's record.
- **Chevron / Snapshot alignment**: real, small issues — collapsible chevron only existed on the
  Profile tab's "Training Rules" section (`HubSection`'s `CollapsibleSection`); Overview-tab cards
  had doubled `px-5` padding (once from `HubCard`, once from an inner wrapper div).
- **The actual design gap**: `D:\apps\design-systems\brand-staging-2662e9\hub-client-detail.html`
  (found at the folder root, missed by an earlier narrower search of `documents/`/`preview/`/
  `ui_kits/`) is a complete, explicitly-1:1-modelled redesign of **all six client detail tabs** —
  Overview, Profile, Compliance, Training, Plan Agent, Updates — plus page header, severity banner,
  and tab strip. This had not been implemented; Lane E's earlier design-system pass only covered
  client list/detail/**edit** at a token level, not this full tab-by-tab layout.

### Pass 1 — full layout redesign (commit `2acaf4e`)
`app/hub/(protected)/clients/[id]/page.tsx` (+358/−291) + `components/hub/HubPageHeader.tsx`
(widened `title`/`subtitle` to `React.ReactNode`, additive, no callers broken):
- Page header: avatar-initials circle, client-number chip, `StatusBadge` inline with name, 5-chip
  key-facts row (Format/Pace/Session/Frequency/Referral) — all wired to real fields.
- Tab strip: per-tab icons + outstanding-count badges (Compliance = real outstanding count, danger
  tone on `do_not_train`; Updates = new `draftUpdatesCount` derived from `clientUpdates`).
- Profile tab: rebuilt from one long collapsible card into card-per-subject (Health spans full
  width; Baseline/Goals/Logistics/Notes/Training Rules paired) — this also resolves the chevron
  complaint, since nothing on the page is collapsible anymore.
- Training tab: block list converted from link-rows to a proper table.
- Compliance tab: added an info note on how status is derived, referencing the real
  `lib/compliance.ts`/`lib/hubStatus.ts` logic (not the mockup's fictional note).
- **Deliberately kept, not flattened**: Compliance/Training/Updates/Plan Agent kept their existing
  richer components (`DocumentRegister`, `ClinicalComplianceCard`, `GpLetterCard`,
  `ClientUpdatesPanel`, `PlanAgentTab`) rather than being replaced by the mockup's simpler static
  tables — those already do more (editable fields, per-row actions, chat UI) than the mock's
  placeholder example.
- **Honestly omitted, not fabricated**: mockup's "Photography consent" document row (no real data
  field) and its separate "Record" rail card (kept the existing Status/Active Block/Quick Actions
  rail instead, to avoid duplicating the client-number chip already in the header).
- Verified: `npx tsc --noEmit` and `npm run build` both pass; two pre-existing unrelated errors
  (`exercise-browser.tsx`, `ClientUpdatesPanel.tsx`) confirmed identical before/after via
  `git stash`.

### Pass 2 — restyle the four kept-as-is tabs (commit `211f3f7`)
Craig confirmed after Pass 1 deployed that Compliance/Training/Plan Agent/Updates still looked
visually old next to the redesigned Overview/Profile. Investigation found their cards, table
styling, and badge tokens were **already** aligned with the design system (already using
`HubCard`/`HubCardHeader` with the `color` prop, `StatusBadge`, the same border/hover table
conventions as the newly-restyled Training tab) — the one real, consistent mismatch was
**pill-shaped (`rounded-full`) buttons** where the mockup calls for `rounded-lg` (8px), per its own
explicit comment ("Hub buttons are rounded-lg (8px), NOT the 48px marketing pill").
Fixed (styling-only, no logic/props changed) in: `components/hub/DocumentRegister.tsx`,
`components/hub/SendDocumentLink.tsx`, `components/hub/ClinicalComplianceCard.tsx`,
`components/hub/ClientUpdatesPanel.tsx`, `components/hub/UpdateRowActions.tsx`,
`app/hub/(protected)/clients/[id]/PlanAgentTab.tsx` (button + chat-header icon radius).
`components/hub/GpLetterCard.tsx` had nothing to restyle (no bespoke buttons/badges/card wrapper).
Verified: `npx tsc --noEmit` clean (same two pre-existing errors, confirmed unrelated) + a full
`npm run build` passed clean.

### Flagged, not done
- `components/hub/PackagePaymentsCard.tsx` has the same `rounded-full` button pattern as the fixed
  files but was out of scope for this pass — Craig has not yet said whether to include it.
- Email-button "greyed out" report still needs Craig to confirm which client he tested with (real
  missing email vs. a genuine bug in the check).

### Deployed
Both commits pushed to `origin/main` (`2acaf4e`, then `211f3f7`) with Craig's explicit go-ahead
each time. Coolify auto-deploys on push to this repo (confirmed via deployment history — both
commits show `status: finished` within ~3 minutes of push) — live on
`https://staging.eternal-fitness.co.uk`.

## Process Register + SOPs content published (2026-07-20, background session)

Closes the Lane B content gap flagged throughout this file ("Process Register entries + the 3
required SOPs — needs real input from Craig/Esther").

### What was done
Drafted and published **10 real SOPs** (not the 3 originally scoped) + 10 matching Process
Register entries into the live, empty `sops`/`process_entries` tables. Content was grounded in
what's actually built — PAR-Q, risk_assessment/annual_review document templates, GP-letter
tracking (`GpLetterCard`), package/payment tracking (`PackagePaymentsCard`), the 6-week block
model and session structure in `project_specs.md`/`Skills/eternal-fitness-master/SKILL.md` — not
generic PT boilerplate.

**SOPs published** (ref — title): SOP-001 New Client Enquiry & Consultation · SOP-002 Client
Onboarding: PAR-Q & Medical Screening · SOP-003 Risk Assessment & GP Medical Clearance · SOP-004
Training Plan Creation (6-Week Block) · SOP-005 Session Delivery & Real-Time Adaptation · SOP-006
Annual Review & Ongoing Health Monitoring · SOP-007 Package Sales, Booking & Payment · SOP-008
Client Update Communication · SOP-009 Incident, Injury & Adverse Event Response · SOP-010 Client
Data Privacy & Health Record Handling. Each has the full `sops` schema (trigger, owner, what, good
looks like, ordered steps). Matching `process_entries` (PR-001..PR-010) cross-reference each SOP
via `sop_ref`, all `status='active'`, `reviewed='Jul 2026'`.

### How it was published
Ran a temp idempotent upsert script (`ON CONFLICT (ref) DO UPDATE`) against prod Postgres via the
standing Coolify tunnel — same pattern as the existing `scripts/import-parq.mjs`. **Craig gave
explicit per-session go-ahead** for this specific write after being asked which of three publish
options he wanted (direct DB write / paste into admin UI himself / review-then-run script). Runner
script and its data file were temp files inside the repo (for `pg` module resolution), deleted
immediately after running; `git status` confirms no tracked changes in `scripts/`. `DATABASE_URL`
sourced from `.env.local`, never printed or persisted elsewhere (per SOP-009 Secrets & Credential
Handling, itself one of the Decoded Ops framework SOPs this pattern was ported from).

### Verified
Script output confirmed `sops` and `process_entries` each have exactly 10 rows after the run
(counted via a `select count(*)` in the same transaction). Not yet verified in the browser —
Craig/Esther should open the hub's Process & Quality tab to confirm the content renders and reads
well before treating this as fully signed off.

### Not done
- `improvement_log` still empty — no incidents/improvements exist yet to log; will fill
  organically as SOP-009 (Incident Response) generates entries.
- No code changes, no migration, no deploy, no push — this was a data-only publish into tables
  that already existed live.

## Session close — 2026-08-03 — Hub design-parity/mobile Work Orders + live bug hunt

**Design work (12 lanes, 3 Work Orders, all merged and pushed):**
- `wo-eternalfitness-hub-parity-deepdive-2026-08-03` (7 lanes) — deep-dive review of every hub
  page/tab/modal against `D:\apps\design-systems\ef-control-hub\*.html` mockups, then fixed every
  confirmed drift item: exercise dialog colour, live-session-log RPE field, session-editor modals
  (Sheet drawer, browse-before-typing, equipment tags, image attach), client-detail table columns,
  PAR-Q hub-mode Section 7, Process & Quality action wiring, documents/agreements onto the Hub
  component system, updates preview drawer + uncovered-modal restyle.
- `wo-eternalfitness-cashflow-shell-2026-08-03` — built the missing invoice detail page directly
  on the existing Hub shell per Craig's "don't wait for OpenDesign, use the shell" instruction.
- `wo-eternalfitness-hub-mobile-2026-08-03` (4 lanes) — fixed the Hub sidebar (was a static 240px
  column eating most of the screen on Craig's Samsung A52s, now a `lg:`-gated hamburger/drawer),
  plus mobile-breakpoint fixes on the block-detail session accordion, session-editor exercise rows,
  and 7 other pages found by a 4-agent read-only audit.
- Two real bugs caught and fixed on review before merging (not shipped blind): a delete-button
  using brand rose instead of the danger token, and a mobile-wrap fix with no breakpoint gate that
  would have reflowed desktop too.
- All 12 lanes merged via one integration branch, 2 real file-level overlaps auto-merged cleanly
  and verified (not just trusted), full combined `tsc --noEmit` clean, pushed as a fast-forward.

**Live bug hunt (4 more fixes, same session, after Craig reported a workout "didn't show as saved"):**
Root cause was three separate silent-failure bugs in `lib/pg-client.ts` (this app's hand-rolled
PostgREST-style query shim over raw `pg`) — it only resolves one level of embedded-relation
selects/filters, and any deeper nesting throws a real Postgres error that gets caught and quietly
turned into `{data: null}` with zero visible error anywhere. The workout itself was never lost.
- `75e498a` — dashboard's Sessions-this-week/Check-ins-logged/Recent-Check-ins/This-Week's-Plan
  all silently showed zero (doubly-nested embed in 3 queries).
- `5c2ac1e` — client Training tab's Session Log table, Blocks-table session count, and Progress
  tab trend/PB panels all silently empty (dotted embed-column filter the shim can't resolve).
- `dc1bd4d` — added inline per-exercise logged results on the session view (Craig had to click
  into all ~30 exercises individually to see what actually happened; confirmed scope via
  AskUserQuestion before building).
- `f97c0e6` — Session Log table rows on the Training tab had no link at all; added one matching
  the Blocks table's existing pattern.

Confirmed via codebase-wide grep that both embed bugs' exact patterns were isolated to the files
fixed — not a systemic problem, but the failure mode (silent, no error surfaced anywhere) means
any other spot doing a doubly-nested `!inner` select or filtering on a dotted embedded-column path
would fail the same invisible way. Worth a proactive grep sweep if anything else looks emptier
than it should.

All 4 live fixes verified against real production data (direct DB queries before/after, generated
SQL reproduced and tested) and confirmed live in Craig's own Chrome session via `claude-in-chrome`
(he granted direct browser access mid-session) — real screenshots and DOM reads, not deploy-status
alone.

**Process note for next session:** repeatedly caught myself reading stale files from the shared
checkout (`D:\apps\eternal-fitness-website`) while investigating — it sits behind by design since
all real work happens in per-task worktrees, but it's easy to forget mid-investigation. Use
`git show origin/main:<path>` to read the actual live code, not a plain `Read` on the shared
checkout path.

## Session close — 2026-08-06 — Dashboard layout, hub-wide Toolbar rollout, exercise data enrichment, Templates rebuild

Worked in `.claude\worktrees\nathans-pt-agreement-status-b46171` (branch `claude/design-update-c8ef22`),
pushed straight to `main` each step per Craig's explicit "push to main" instructions. 4 commits, all
merged and deployed (Coolify auto-deploy on push to `main`).

**1. Dashboard grid fix (`68f5d3a`).** Recent Check-ins/This Week's Plan cards now `items-stretch`
instead of `items-start` (equal height, no more gap under the shorter card). Needs Attention paired
with a narrow Recent Blocks + Quick Actions rail matching `hub-dashboard.html`'s attn-grid/side-stack
pattern, instead of stacking 3 differently-sized cards in an uneven 2/3 column. Updates due/Active
Blocks/Recent Clients moved to full-width rows to match mockup order.

**2. Shared `Toolbar` rolled out hub-wide (`ff87fea`).** Resolves Part 4b of
`design-brief-hub-nav-cashflow-2026-08-04.md` (`hub-toolbar-icon-spec.html`). `components/hub/Toolbar.tsx`
already existed (used by 4 pages) but most pages still hand-rolled search/filter UI — `HubTable` now
renders its internal search/count row through `Toolbar`, fixing Agreements/Clients/Documents/Plan
Schedule at once; every hand-rolled `<select>` switched to `toolbarSelectClasses`; Site Content's
filters moved into the same row as search (this, not Plan Schedule, was the page actually
structured differently — confirmed via a live-code survey before touching anything, the design
brief's citation was stale); Email Updates and Exercise Library (fully bespoke before) rebuilt onto
`Toolbar` with segments for status/archetype pills. Widened `ToolbarSegment.label` to
`React.ReactNode` (backward compatible) so Email Updates keeps its dimmed inline pill-count styling.

**3. Exercise library row height + data enrichment (`192a9f5`, DB write not a commit).** Row height
30px (was ~46px). Then: 2548 of 2627 exercises (source='trainerize') had `movement_type`,
`difficulty` NULL and `muscle_groups`/`equipment` empty — confirmed via direct DB query that this
isn't recoverable data, the raw Trainerize export itself is ~87-94% empty on these fields. Ran a
20-agent Workflow (`scripts/_scratch-classify-workflow-final.mjs`, not committed — scratch file,
deleted after) classifying every exercise name against the app's real enums (22 movement_types, 21
muscle_groups, an extended 18-value equipment list). 100% valid output (0 invalid enum values, only
1 correctly-null "STRENGTH PAIR" placeholder row), applied via a transaction that only fills
NULL/empty fields — never overwrites existing data. `missing_movement_type` 2548→1,
`missing_difficulty` 2548→0, `missing_muscle` 2474→108, `missing_equipment` 2451→61. This was a
direct prod DB write (Craig explicitly chose "AI classification via a workflow" from an
AskUserQuestion prompt after I flagged the raw-export-is-empty finding) — no migration file was
left behind since scripts were scratch/one-off; if this needs re-running or auditing later, the
enum lists and approach are documented above, not on disk.

**4. Templates page rebuilt against `client-documents-system.html` (`cf5a8b8`).** KPI tally band +
`Toolbar` search/filters + grid/list view toggle. Important divergence from the mockup, flagged to
Craig in the same message: the mockup's `TEMPLATES` array describes a flat `documents/*.html` file
folder with an "Email templates" category — that structure doesn't exist in this app. Templates are
real `document_templates` DB rows (7 total, edited via `/hub/templates/[id]`); category and
"who completes it" are derived from actual `kind` + signature-requirement fields, and the 4th tally
tile is "Agreements & consent" (real count) instead of a fabricated email-template count (email
templates are a separate subsystem, `lib/email-templates/registry.ts`, not in this table).

**Not done / worth flagging for a future session:** the icon-badge sizing audit (Part 4a of the same
design brief — 4 different badge measurements in live use) was scoped in the brief alongside the
toolbar work (Part 4b) but never asked for or done this session.

Verified: `tsc --noEmit` clean after every change; every page live-tested in the browser (search,
filters, segmented pills, grid/list toggle, exercise data all confirmed rendering/filtering
correctly against real data) before pushing.
