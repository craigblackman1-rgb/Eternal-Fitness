# Eternal Fitness Website — State

## 2026-08-25 (Claude Code) — Lane K: CR-EF-088–091 shipped, session-scheduling gap closed

"Tom's workout not saving" traced to the real mechanism: session content and scheduled
date are independent writes, and Outlook Bookings appointments (incl. hand-added personal-
calendar entries) had no reliable path into a scheduled session at all. Fixed the two
concrete bugs (mobile scratch-workout scheduling, completed-session error masking) and the
systemic gap (auto-confirm on the sync cron, widened beyond the Bookings-widget filter).
227 calendar events scanned on the first full run, 112 confirmed into real sessions. Full
detail in handoff.md's 2026-08-25 entry. 25-item testing checklist live in decoded-ops-hub
(project `eternal-fitness`, Testing tab) — Craig working through it.

## 2026-08-19 (Claude Code) — CR-EF-037 redesign promoted to main; remaining-gap WO opened

Craig reported the block/session/workout routes looked nothing like the design templates.
Cross-referenced `D:\apps\design-systems\ef-control-hub\desktop\training\*` against the live
hub. Root finding: the bulk of the deviance was NOT unbuilt work — it was the CR-EF-037
redesign, fully built and merged to `staging` (`4844c72`, 7 lanes, 46 files) but never
promoted to `main`/live.

**Promoted to main (`2c6c63d`), Craig-approved.** Merged `staging` into a fresh worktree
branch and pushed (`ee1c21b..2c6c63d`, 44 files, +1597/−516). Auto-deploy triggered. All of
it now live: SessionStatusPill wired into session/block/schedule/client-tab screens, H3
write-guard + audited Reopen, CR-EF-036 Sessions logged-data visibility, Phase 3 calendar
spine (derived Mon–Sun weeks + block-page schedule panel), HubRail + 8-screen sweep. Only
merge conflict was the append-only `loop-status.md` ledger (resolved keeping both sides).
Answered open question `qmszxi7xx6u` (leave Phase 2 code live — now formally promoted).

**New WO: `.context/workorder-hub-workout-parity-2026-08-19.md`** (registered active) for
the genuinely-remaining gaps, which staging did NOT contain:
- **Training-blocks list** (`PlanScheduleTable.tsx`) — untouched by staging; needs the
  status-map fix (getScheduleStatus → block vocab incl. Do Not Train), Programme + Progress
  columns, avatar, Open/Review/Continue action link.
- **Workout-templates deeper parity** — staging only re-skinned the header; detail drawer +
  assign-from-browser, paste 3-step stepper + success pane + save dialog, start-blank entry,
  and difficulty→Seated/Supported/Standing (Craig confirmed position/adaptation; G2 data
  source investigation owned by Lane E) are NOT built.
- **Derived Est. duration** on the session screen — staging still shows static `~N min · guide`.
- **Minor styling remnants** — back-link text labels, avatar initials, cancelled-row dimming,
  archetype label-map reconciliation ("Mobility & Movement Quality" everywhere).

Also this session: resolved the long-standing merge conflict in
`wo-ef-workout-consolidation-pwa-2026-08-15.md`'s ledger (both-sides-kept, chronologically
ordered, verified against the register).

## 2026-08-18 (Claude Code) — design↔build reconciliation, register recovery, CR-EF-037 Phase 1

Craig reviewed the Open Design mockups against dev/prod, found a large gap, and
suspected Work Orders had "got mashed up." Root cause turned out to be four
compounding bookkeeping/sequencing failures, not lost build work — see the full
report at `.context/audit-hub-design-parity-2026-08-18.md`.

**Register recovery.** `main`'s `change-requests.md` had silently stopped at
CR-EF-028 while CR-EF-029–041 were raised 2026-08-17 and cited by later commits,
but only ever committed to the unmerged branch
`claude/blocks-sessions-workouts-mobile-64d18f` or an untracked WO doc. Third
register-fork of the same shape (documented inline). Recovered all 13 rows plus
their governing docs (assessment, audit, briefs). Corrected 11 rows total across
the session where the table said `raised` while the code was actually built:
CR-EF-017/019/020/021/022/024 (17 Aug work) and CR-EF-042/043/044/045/046 (this
session's own parity fixes, initially logged but never flipped after building —
caught before close). Register now runs CR-EF-001–046, contiguous, no gaps.

**Mockup library committed.** The entire 18 Aug structural-consistency delivery
(9 files, 433 insertions) had sat uncommitted in `D:\apps\design-systems` with no
version to build against — committed (`design-systems@9032447`). Added a
standing rule: commit before code build starts.

**Design-parity findings, built same session:**
- CR-EF-042 [BUG] — dashboard missing "Log check-in" button
- CR-EF-043 — client-record quick-actions bar now matches the mockup's
  explicit header/bar split (Edit Client + New Session moved into the header)
- CR-EF-044 — block-module button reorder (Schedule primary), Add workout kept
  non-destructively (deliberate deviation, noted)
- CR-EF-046 — mobile Today's accordion renamed onto its own `.m-section*`
  contract instead of reusing TrainScreen's `.sec*` classes (cosmetic-only,
  no visual change)
- CR-EF-045 — mockup fix (Plan Agent tab added, badge moved Comms→Admin to
  match the live app)

**CR-EF-037 Phase 1 — shipped.** `sessions.status/started_at/completed_at`
added to production and backfilled (72 planned / 19 cancelled / 12 scheduled /
7 completed / 0 in_progress), independently re-verified post-commit. Migration:
`supabase/migrations/20260818_session_status_model.sql`, runner:
`scripts/run-session-status-migration.mjs` (dry-run by default, `--apply` to
commit — stricter default than this repo's other migration runners given how
central this column is).

**Hotfixes H1/H2/H4/H5/H6 — shipped**, hand-reviewed diff-by-diff (not lane
self-report) before merging: CR-EF-029 (online writes now carry `client_op_id`,
was only on the offline-queue path — this was actively corrupting production
data), CR-EF-030 (`handleComplete` now syncs refs so a later autosave can't
revert `completed_at`), CR-EF-033 (`scheduled_at` primary on the desktop
Sessions tab, `NULLS LAST`), CR-EF-034 (`focus_label` naming), CR-EF-035
(`client_number` links, was UUID).

**Still open, explicitly not started:** H3 (guard writes to completed sessions
— deliberately held until Phase 1's Reopen UI exists, or Esther loses the
ability to fix a finished log), CR-EF-031/032/036, CR-EF-037 Phases 2–3
(uid-keyed logs, one write path, calendar spine — the bulk of the actual
redesign), Emma Atkinson's duplicate-log cleanup (blocked on Esther's
confirmation, destructive). **Design-consistency scope:** only 5–6 of ~50 hub
screens were ever briefed for CR-EF-039/040's pattern — the other ~44 are
real, catalogued inconsistency (`audit-hub-structure-consistency-2026-08-17.md`)
that has never been commissioned, not lost work. Told Craig this plainly —
bringing the rest of the hub into line needs its own Work Order and its own
Open Design brief, neither of which exist yet.

**Process fix worth noting:** caught and fixed a bug in my own bulk
status-flip script mid-session (had wrongly touched a row outside its target
list plus two unrelated prose sentences) — found by diffing before declaring
done, not by re-running the script. Also: my first design-library commit went
directly through the shared checkout before the worktree-isolation hook
caught it on a later commit — left as-is (low-risk, already pushed) but named
here rather than glossed over.

**Branch:** `claude/design-dev-hub-alignment-dcb6fb`, merged to `main`
(`ace1535`) via a real merge (not fast-forward) — `origin/main` had genuinely
diverged with two other sessions' work (Nathan Wadey's 12-week block, the
document-template preview feature, a kneel-to-stand template seed) that a
force-push would have destroyed.



## 2026-08-18 (Claude Code) — hub structure-consistency extended to client record + block module, GATED on mobile

Continued CR-EF-039/040 (hub structure-consistency: shared Quick Actions bar +
accordion primitives) from the morning session, which had shipped the
dashboard only (`d0c7d6d`) and queued a follow-up request to Open Design for
the remaining 3 desktop surfaces + mobile
(`.context/revision-request-hub-structure-consistency-2026-08-18.md`).

- **Open Design MCP still broken.** Craig opened the app to wake the active
  context (`get_active_context` then returned `active:true`), but every data
  call (`list_files`/`search_files`/`get_file`) still threw
  `WORKSPACE_CONTEXT_REQUIRED` — a daemon-side bug, not fixed by having a
  project open. Cross-checked the design register directly
  (`D:\apps\design-systems\ef-control-hub\index.html`): confirmed the other 3
  surfaces + mobile genuinely hadn't been touched (version stamps unchanged,
  no `.qa-bar`/`.hub-section` change notes) — the follow-up request was still
  sitting unactioned.
- **Craig's call: build from the written spec rather than keep waiting.**
- **Client record — DONE + DEPLOYED (`fafa4f9`).** `app/hub/(protected)/clients/[id]/page.tsx`:
  Quick Actions moved from a right-rail `HubCard` to the top `.qa-bar`,
  absorbing the header's inline "Edit Client"/"Plan Block" buttons (one action
  surface, not two). Overview tab's 5 info cards (Active Block/Last
  Session/Snapshot/Training Snapshot/Active Training Rules) converted to a
  `HubAccordionSection` stack, "Active Block" open by default (most-checked
  fact on a client record; the real compliance signal already has its own
  alert banner). `ClientNotesPanel` left outside the stack — editable panel,
  not a collapsible info section.
- **Block module — DONE + DEPLOYED (`fafa4f9`).** `HubQuickActions` extended
  to support `onClick` actions alongside `href` (Edit Block/Add Workout open
  drawers, not links — needed a real primitive change, not a look-alike
  duplicate). `BlockActions.tsx` now renders the shared `.qa-bar`; Print/
  Export/Delete stay in the "..." overflow menu (secondary/destructive, not
  quick actions). Week/session `<details>` collapse and the single optional
  Block Note card left as their own patterns — genuinely different kind of
  collapsible / no real multi-section case for `.hub-section`, flagged in a
  code comment per the brief's own instruction.
- **Schedule — deliberately no `.qa-bar`.** Audited the live page and mockup:
  no genuine quick actions exist there today (day/month toggle and
  cancelled-visibility already live inside `ScheduleShell`; bookings happen
  from a client record, not from the schedule page). Flagged in code rather
  than inventing filler buttons.
- **Mobile (`hub-m-today`) — not touched, deferred.** Entirely different CSS
  system (`.mtop`/`.sec-label`/`.slist` etc., not Tailwind) with no direct
  component reuse — genuinely needs real Open Design work once the MCP bug is
  fixed or mockups are hand-delivered another way, not a mechanical port.
  Work order left `GATED` on this.
- **Concurrent-session reconciliation.** A different session pushed 2 commits
  straight to `main` mid-session (`2b7415a`/`f683042`, client-assessment
  workout template seed) — no registry entry, zero file overlap with this
  work (confirmed via `git diff --stat`). Merged cleanly into this branch
  before the final push so `main` didn't regress.
- **Verified:** `tsc --noEmit` clean throughout. Both surfaces click-through
  verified twice — once on local dev via Craig's real hub session (accordion
  toggle, Edit Block drawer opening via the new `onClick` action), again live
  on production post-deploy (`https://eternal-fitness.co.uk/hub/clients/1`,
  hard-reloaded to rule out cache). Design Parity Gate attested as "no
  mockup governs this change" (Open Design hadn't returned one) — built and
  verified against the written spec instead.
- **Note for next session:** if Open Design's daemon is still throwing
  `WORKSPACE_CONTEXT_REQUIRED` on every call, don't retry the same way — it's
  a real bug, not a stale-context issue. Mobile structure-consistency and the
  Design Parity Gate proper (mockup vs. code, not spec vs. code) are still
  owed once the daemon is fixed or mockups arrive another way.

## 2026-08-17 (OpenCode, evening) — finished stranded work + cleared the CR backlog
Resumed a Claude session that ran out of tokens. Reconstructed state from git + `.context`,
finished the session-page crash fix, merged the stranded delete/clone feature, then built
the CRs Craig approved ("yes to all" / "functional-first, designs in progress"):

- **Crash fix** (`027c64d`) — `SetRow`'s prop named `ref` (React reserved) → `exerciseRef`.
- **Delete/clone** (`51e9d27`) — merged `staging` → `main`; converged `main`/`staging`.
- **CR-EF-019/020/024** (`cb2d5ed`) — rest-timer beep+vibrate, rest-time ±15s override, PWA tasks panel.
- **CR-EF-022/017/021** (`4191575`) — client start date, client notes, per-exercise edit button.
- **Migrations run on prod**: `clients.start_date` + `client_notes` table (transaction-wrapped, 21 rows unaffected).

**Deferred (Craig):** blog migration, nav restructure, GDPR DPA/ICO, CR-EF-014 (band colours),
CR-EF-018 (unilateral list). **Still open (Craig):** PITR/WAL gap, staging email creds, branch cleanup.
**Flags:** concurrent session's 5 document-template seed migrations need confirming on prod;
start-date backfill for 21 existing clients outstanding.

## 2026-08-17 (Claude Code, afternoon/evening) — Hub task-board audit, workout-consolidation design→build, production crash found+fixed
Craig asked for a review of the `decoded-ops-hub` project board for this project
(duplicates from the go-live push) plus a design-parity pass on Open Design
mockups vs. the live site. Full session, several distinct pieces:

- **Hub task board cleanup (`decoded-ops-hub`, project `33ccfd11…`).** Found and
  fixed real duplication: 2 exact-duplicate "go-live cutover" tasks deleted, a
  duplicate WAL/PITR deferred item resolved, 3 tasks wrongly marked `completed`
  reopened (specialist pages re-gated same day, so "done" didn't match live
  reality), 2 stale backlog items closed (already fixed weeks ago), a duplicate
  ICO-registration task merged, SVG→PNG task dropped (Craig: doesn't matter),
  two vague placeholders merged into one "content queue" holding item. Seeded 6
  hub tasks for the open CRs (CR-EF-006/008/011/012/014/016) that had no board
  counterpart. Board went from 26/0/13 (backlog/in-progress/completed, with
  duplicates) to a clean, CR-linked state.
- **Design-parity scan** (`.context/` design-systems folders vs. live routes)
  found several hub mockups with no live route and several live pages ahead of
  their mockup. Craig asked for design briefs on the ones that needed one.
- **Design briefs written, then corrected.** Drafted 3 new briefs (desktop
  workout consolidation, templates browser, paste-and-assign) before
  discovering a more thorough brief already existed
  (`brief-workout-consolidation-opendesign.md`, from an earlier 2026-08-15
  session, with G1/G3 already answered by Craig) — deleted the 3 redundant
  ones, mirrored the correct brief into this repo's git-tracked `.context/`.
  Also wrote `brief-hub-nav-restructure-reconciliation-opendesign.md` (§2.6).
- **Design review round-trips.** Reviewed returned mockups against the brief:
  approved `hub-block-module.html`/`hub-schedule.html` as-is; sent
  `hub-session.html` (missing offline queue + kg/lb) and
  `hub-workout-templates.html` (missing 2 filters, wrong archetype labels —
  invented condition names instead of the real Plan Agent session-emphasis
  labels) back for revision (`revision-request-workout-consolidation-2026-08-17.md`).
  Revisions came back correct except the archetype-label fix, which Craig said
  to proceed on as-is (the eventual OpenCode build used the correct labels
  regardless). Nav reconciliation (`hub-nav-reconciliation-v1.html`) confirmed
  live sidebar already matches Option A, no code change needed.
- **Build dispatched — 3 OpenCode lanes** (`opencode-go/deepseek-v4-pro`,
  isolated worktrees, DO-SOP-010): desktop session-logging consolidation
  (`/hub/log` retired, offline queue + warm-up-gated PBs + kg/lb added, real
  bug fixed along the way — exercise notes were silently not persisting),
  workout-templates browser + paste-and-assign flow (archetype labels
  corrected to the real values in the actual build), portal PWA
  (`portal.webmanifest` + `portal/sw.js`, mirroring the hub PWA). All 3
  reviewed diff-by-diff, `tsc`/build verified, merged to `staging` then `main`.
  Caught a real divergence before pushing: `main` had 4 commits (a
  flexible-update-interval feature) that never reached `staging` — rebased
  onto current `main` rather than blindly pushing, which would have looked
  like a revert.
- **Production crash, found and root-caused via a live click-through** (Craig:
  "it is open in chrome"). First fix (a hooks-order violation — `useMemo`
  after an early return, React error #310) only got the page past loading into
  a *second* bug: `SetRow`'s own prop was literally named `ref`, React's
  reserved prop name, so a business-logic string got intercepted as a DOM ref
  and thrown (React error #290 — "Element ref was specified as a string but no
  owner was set"). Diagnosed by adding a temporary error boundary
  (`error.tsx`) to surface the real, non-minified message, since the generic
  Next.js error page and this environment's console tooling weren't
  surfacing it. Fix (rename to `exerciseRef`) was independently found and
  shipped by a concurrent OpenCode session at the same time — verified live,
  matches, no unique work left to push.
- **Verified live, post-fix:** consolidated logger (mode toggle, Studio/Home
  tabs, timers, offline sync badge, Done/Skip), templates browser (correct
  archetype filter labels), paste-and-assign entry point — all render clean,
  no console errors beyond an unrelated browser-extension one.
- **Not done this session:** templates paste-and-assign and portal PWA states
  were re-sent to Open Design after the first pass reportedly lost the briefs;
  unclear if that round ever came back — worth checking. `main` has 7 commits
  from the concurrent session (CR-EF-019/020/024/017/021/022 + the crash fix)
  not yet synced to `staging` — flagged, not actioned, in case that session is
  still active on it. **Resolved same session close:** the "concurrent
  session" turns out to have been another instance of this same work, resumed
  by OpenCode after a separate session ran out of tokens — not an unrelated
  actor. It independently fixed the same `SetRow` crash and cleared CR-EF-017
  through 027, but its own CR-EF-016 collided with and overwrote this
  session's earlier CR-EF-016 (Outlook calendar sync gate) on merge — recovered
  and renumbered to CR-EF-028, see `change-requests.md`'s ID-collision note.

## 2026-08-13 (Claude Code) — Hub mobile PWA: offline logging, Clients tab, edit-sheet apply-as-session, real-device verified
Resumed `wo-eternalfitness-hub-mobile-session-pwa-2026-08-10` (worktree
`web-admin-pages-dashboard-5ccf37`, branch `claude/mobile-workout-features-6ddaba`).
Craig asked to complete every AUTO-able lane; full detail in that WO doc
(`C:\Users\CraigBlackman\.claude\plans\see-it-on-mobile-tingly-codd.md`) and
`.context/decisions.log`. Summary:

- **L5 PWA install — DONE + DEPLOYED.** `public/hub.webmanifest` +
  hand-written `public/hub/sw.js` (cache-first static assets, network-only
  `/api/*`), scoped to `/hub/` only — marketing site's own manifest
  untouched. Fixed a real Next.js 14 bug found in the same pass:
  `themeColor` in `metadata` isn't supported, moved to a `viewport` export
  (had to carry the root layout's `width`/`initialScale`/`viewportFit`
  forward by hand since nested `viewport` exports don't deep-merge).
- **Mid-session edit sheet — DONE + DEPLOYED.** `/hub/m/train/[sessionId]/edit`:
  4 modes (library/past-sessions/templates/this-session), superset
  group/ungroup via `lib/exercise-groups.ts`, plus a later addition —
  **"Use as today's session"** (wholesale replace, not just add) on the
  Past-sessions and Templates packs, mirroring desktop's
  `applyTemplate()`/`rollOverPreviousSession()`.
- **Real mobile Clients tab + Train-tab smart routing — DONE + DEPLOYED.**
  Both were "Coming soon" stubs from the prior session. Clients tab is
  read-only (contact/flags/block-progress/history), flags sourced from
  `clients.profile.health`, not invented. Train tab now redirects to
  today's in-progress or next session instead of a dead stub.
- **Offline set-logging queue — DONE + DEPLOYED.** `set_logs.client_op_id`
  (idempotency) + client-supplied validated `logged_at`, a hand-rolled
  IndexedDB queue (`lib/hub/offline-set-log-queue.ts`), 3-way saved/queued/
  failed save outcome, sequential replay on reconnect/mount, 401 parks the
  queue rather than dropping it. Also fixed the real last-write-wins PB bug
  flagged in the original WO scoping (`GREATEST`, not overwrite).
- **Warm-up PB exclusion + band-unit lock — DONE + DEPLOYED**, per Esther's
  answers (relayed by Craig): `set_logs.is_warmup` persisted at write time
  (prescription can change mid-session, so it can't be re-derived later),
  gates `checkAndUpsertPB`/`buildExerciseHistory`/`buildExerciseTrends`.
  Band exercises now hard-locked to lb (was default-only, previously
  overridable).
- **Real-device verification — PARTIAL.** Craig logged into
  `development.eternal-fitness.co.uk` via his own Chrome session; walked
  through Clients tab (19 real clients), Train screen (real set-log save +
  PB detection, confirmed then reverted), edit sheet all 4 tabs, band-lock
  fix — all confirmed working against real data. Found and fixed one real
  bug live: client detail's Focus panel was rendering raw markdown
  (`blocks.summary`, never rendered anywhere on desktop either) instead of
  `blocks.block_note`. **Still not tested: actual install-to-home-screen and
  airplane-mode offline behaviour — needs a real phone, not done this
  session.**
- **`staging` synced 3×**, each time verified (`tsc` + `next build`) before
  push, deployed to `development.eternal-fitness.co.uk`, confirmed healthy.
  Two real merge conflicts hit and resolved by hand along the way: a stale
  blog-redirect resurrection (kept staging's own fix, didn't reintroduce
  known-broken redirects) and a genuine race with another session's
  marketing-site PR landing on `staging` mid-sync (caught via the
  operating-model's re-check-ownership-before-every-push rule).
- **L3b correction.** Craig pushed back on the WO doc's claim that 11
  desktop screens had "no mockup ever done" — verified against actual
  mockup files + commit history and he was right: 10 of 11 were designed
  *and* implemented same-day on 2026-08-04, already on `main`. Only the
  workout-templates browser is genuinely undesigned (and that's deliberate
  — the training-blocks mockup shows it as a disabled nav item on purpose).
  WO doc corrected in place.
- **Explicitly deferred, at Craig's direction, not done:** L6 Outlook
  integration (blocked on his Azure tenant-type decision), and the L8
  flagged risks (WAL/PITR gap, `CTABand.imagePosition` no-op affecting ~11
  marketing pages, GDPR WO's DPA-signature gate).

## 2026-08-09 (Claude Code) — Featured & Reviewed band, Facebook link fix, Contact hero photo swap
- **Site-wide "Featured & Reviewed" band — DONE + DEPLOYED (`9623a22`, `6337996`).** Craig wanted a
  banner promoting the FitPro press feature, the Storm Fitness Academy podcast episode + interview,
  and Google reviews, but wasn't sure where it should live. Wrote a design brief
  (`.context/brief-promotional-banner-2026-08-09.md`) recommending an in-flow band above the footer
  (Option A) over a sticky top bar (4 items don't fit legibly in ~48px) — open design delivered a full
  spec sheet (`brand-staging-2662e9/featured-reviewed-band.html`). Built as
  `components/ds/FeaturedReviewedBand.tsx`, rendered from `Footer.tsx` so it appears on all 10 public
  routes, absent from `/hub` and `/portal`. Found and fixed 2 real defects the spec's own audit missed:
  a teal-text contrast fail under AA on the tag's own hover surface (`--status-success-text` swap), and
  an arrow that could strand onto its own line at ~990px (`.fr-nowrap` fix). Also corrected
  `TestimonialsSection.tsx`'s stale `aggregateRating.reviewCount: "2"` to the real **26**, confirmed by
  Craig, to match the band's visible claim. Google Reviews currently links to a clean parameter-free
  Maps search deep link, not Craig's pasted URL — that one carried an `rlz` tracking ID tied to his
  Chrome install, unsafe to bake into permanent site HTML. **Open:** swap for the real Business Profile
  share link (Maps → listing → Share → Copy link) when Craig pulls it — one constant in the component.
- **Footer Facebook link fixed — DONE + DEPLOYED (`6337996`).** Was pointing at a stale numeric
  `profile.php?id=...` URL. Corrected to `facebook.com/EternalFitnessPersonalTraining/`.
- **Contact hero photo swapped off one showing Esther's face — DONE + DEPLOYED (`748605b`).** Craig
  asked to remove Esther's head from an image; turned out to be `who-mobility.jpg` on the Contact page
  hero, which also had stale alt text describing a completely different photo ("the kettlebell rack")
  than what was actually shown (Esther mid-session with a client). Swapped to
  `studio-kettlebell-shelf.jpg`, an existing people-free asset already correctly used on the About page
  CTABand — one photo now serves both, alt text finally matches reality. Verified at desktop, mobile,
  and simulated ultrawide (2200px) — the old crop's specific failure mode.
- **Same asset re-cropped to remove a dirty/glare mirror — DONE + DEPLOYED (`002ce08`).** Craig flagged
  the reflective mirror visible on the right of `studio-kettlebell-shelf.jpg`. Trimmed 1800×1200 →
  1130×1200 (took 3 attempts — the first two crop lines still caught the mirror's edge). Since this
  file is shared by both the About CTABand and Contact hero, one crop fixed both places at once.
- **Process note:** used a temporary local static server + a `design-assets-static` launch.json entry
  to try rendering a `brand-staging-2662e9` mockup file live before Craig redirected to the real target
  (the live Contact hero) — reverted both the launch.json entry and the mockup file edit afterward so
  neither this worktree nor the shared design-systems repo carries stray half-finished experiments.
- **Worktree hygiene:** `node_modules` had to be junctioned from the shared checkout (`D:\apps\eternal-
  fitness-website\node_modules`) and `.env.local` copied over — this worktree had neither on pickup.
  `pnpm dev` also can't be used as-is in a junctioned-`node_modules` worktree — `pnpm install`'s
  confirm-purge prompt aborts non-interactively. Launch config runs `node node_modules/next/dist/bin/
  next dev` directly instead, bypassing pnpm's install-check entirely.

## 2026-08-07 (Claude Code)
- **Launch-readiness sweep — DONE + DEPLOYED (`27ab8e6`, `e29cfab`).** Both public lead-capture forms
  (Contact page form, site-wide "Book a Free Consultation" dialog) were found to be non-functional
  stubs that never sent anything — fixed with a real `app/api/leads/route.ts` on the existing
  `lib/email.ts` sender (confirmed `RESEND_API_KEY` genuinely configured, so this sends real email).
  Also: `/calorie-calculator` retired (redirect, code kept), 6 legacy-WordPress redirect chains
  flattened, `/testimonials` added to `sitemap.xml` (was missing despite being live and nav-linked).
- **Site-wide Bookings CTA sweep — DONE + DEPLOYED (`427dd0e`).** Every "Book a Free Consultation" CTA
  (13 page files + Navbar + CTASection) now links straight to the live Microsoft Bookings calendar,
  matching what the footer already did since 2026-08-04. `ConsultationDialog.tsx`/
  `useConsultationDialog.tsx` deleted as dead code (zero remaining references confirmed).
- **Legal pages rewritten for UK GDPR/PECR — DONE + DEPLOYED (`39a8c44`).** Privacy Policy and Cookie
  Policy were the unedited 6 Dec 2020 WordPress/Termly template (US/CCPA-oriented, listed Google
  Analytics/Flash cookies that don't exist on this site, no UK GDPR/ICO mention). Full rewrite,
  grounded in an actual codebase audit (confirmed: zero tracking cookies on the public site; 3
  essential hub/portal session cookies; PAR-Q collects genuine special-category health data; an
  OpenRouter-routed AI assistant drafts client emails/plans, explicitly excluding PAR-Q). Terms
  extended (not rewritten) with a 14-day distance-selling cooling-off section, complaints procedure,
  Consumer Rights Act 2015 reference.
- **GDPR internal-documentation Work Order — RUN + GATED, later same day.** `wo-eternalfitness-gdpr-
  hub-documentation-2026-08-07` — SOP-011 through SOP-015 (ROPA, breach procedure, SAR procedure,
  retention schedule, processor register) drafted and inserted live into the hub's `sops`/
  `process_entries` tables, cross-checked against the real Privacy Policy. Caught and fixed a real
  problem first: the worktree picking this up was 3 commits behind `main`, missing the actual legal-
  page rewrite (`39a8c44`) this WO's content had to be grounded in — fast-forwarded before drafting
  anything. Craig asked for the Decoded Ops/Craig DB-access line to be a formal processor relationship,
  not just wording — drafted a full Art. 28 UK GDPR Data Processing Agreement
  (`.context/decoded-ops-dpa-2026-08-07.md` + a signable `.docx` sent to Craig), `PR-015.status` left
  as `review` pending signature. Craig confirmed: has his own hub login now; ICO registration **not
  yet** done. Full detail: `.context/workorder-gdpr-hub-documentation-2026-08-07.md`.
- **Marketing/hub follow-ups Work Order — RUN + GATED, same day.** `wo-eternalfitness-marketing-hub-
  followups-2026-08-07` — consolidated a marketing brain-dump (podcast episode, FitPro press feature,
  blind-fitness/cancer-rehab copy) plus live UI feedback from the same session. Shipped: Tasks "New
  task" form → popup modal, exercise library row-spacing + pagination fix, Updates report header
  spacing fix, FitPro "As featured in" mention on the About page. A live review of Bank Transactions
  first looked like a missing feature (only checked the list page) — corrected: the per-line
  categorization UI already exists one click deeper, at `/hub/cashflow/transactions/[id]`, no rebuild
  needed. Blind-fitness copy Lane B is `[BLOCKED]` — Craig: no page exists yet to host it, depends on
  the still-disabled Specialist Training catalogue restructure.
  **Programming-engine build (Lane E) — code-complete, NOT click-through verified:** Esther's 4-module
  brain-dump (Master Template Registry, Session Roller, Exercise Swap, Volume Skeletons, Relational
  Update Module) was scoped first, not built blind — a grep-level audit found most of it already built
  under different names (exercise-swap volume retention, the live-session "Prescribed: 3×10" inline
  display) or partially built (`workout_templates`). Built the 3 real gaps: (1) **Session Roller** —
  new `GET /api/clients/[id]/sessions/latest-completed` + a "Roll Over Previous Session" button in
  `SessionEditor.tsx`; (2) **Volume Skeletons** — a preset picker (Elite Strength 4×6, Hypertrophy
  3×10, Endurance/Flow 3×15, Power 3×5) next to "Add exercise"; (3) **template → client assign
  action** — investigated first and found there's no manual block/session creation path at all
  (blocks only come from the AI Plan Agent chat), so instead of a standalone assign button, a chosen
  template now grounds the AI generation prompt itself (`buildTemplateFrameworkSection()` in
  `lib/planAgentPrompt.ts`) — Craig's explicit pick among 3 options presented. All pushed
  (`bc1c149`/`f90d677`). **No hub login credentials available this session — none of Lane E has been
  clicked through, needs a real pass before being trusted with a client.** Full detail:
  `.context/workorder-marketing-hub-followups-2026-08-07.md`,
  `.context/programming-engine-scoping-2026-08-07.md`.
- **Not started this session:** the actual domain cutover (`NEXT_PUBLIC_ALLOW_INDEXING` still unset,
  staging subdomain not retired, DNS/WordPress decommission/GSC submission) — Craig's own go-live
  checklist.

## 2026-08-06 (Claude Code)
- **Work Order `wo-hub-consolidated-2026-08-06` — DONE, all 9 lanes merged, deployed.** Craig raised 9
  hub items in one session: (1) Quote/invoice template built into cashflow's `invoice_templates`
  system using `invoice-template.html` as the basis, surfaced on `/hub/templates` (`2c9cbcc`); (2)
  Email Updates gained working search + column sort (`a044170`); (3) Medical Tracker redesigned
  against `hub-medical-tracker.html` (`d93fcf7`); (4) Site Review removed entirely (`16d8eaf`); (5)
  Site Content removed entirely, `page_keywords`/`page_content_blocks` tables left intact (`14f7e62`);
  (6) Training Rules toggle recoloured + inline edit added for existing rule types (`2296bc6`); (7)
  Studio Equipment redesigned against `hub-studio-equipment.html`, and a real pre-existing bug caught
  in passing — `DELETE /api/equipment/[id]` had no handler despite the UI already calling it
  (`f7776da`); (8) Plan Agent Settings reconciled against `hub-plan-agent-settings.html`, 12 documented
  deltas fixed (`205de15`); (9) Client Detail restructured from 9 tabs to a refined 5-tab layout
  (Overview/Profile/Admin/Training/Comms + Plan Agent as a 6th), full `?tab=`/`?view=` alias map so old
  links still resolve, Resources rail card and Plan Agent access both kept per Craig's confirmed
  answers rather than the newer mockup's silent omissions (`e7fec08`). Bank Transactions (a 10th item
  Craig asked about) needed no work — checked live against its mockup and already matched (shipped
  2026-08-04). All 9 lanes dispatched via OpenCode in isolated worktrees under
  `D:\apps\worktrees\eternal-fitness-website\`, every diff reviewed line-by-line before merge, `tsc`
  clean throughout. Full lane-by-lane detail in `.context/workorder-hub-consolidated-2026-08-06.md`.
- **Two follow-up fixes from live Craig feedback, same session:**
  - Hub sidebar nav sections now actually collapse (chevron toggle, Studio Admin collapsed by default,
    active group force-expands) — the 2026-08-04 nav restructure had regrouped/renamed sections but
    never built the collapse behaviour its own mockup (`hub-nav-restructure.html`) specified (`71cf1f8`).
    First webhook deploy of this commit failed at the Docker build step with an unclear exit 255 (no
    error text surfaced, matches this project's known flaky-build-infra pattern); a force-rebuild
    redeploy succeeded.
  - New `/hub/resources/preview/[key]` route lets staff see exactly what each portal resource (calorie
    calculator, Showdown Soundboard) looks like/contains without a client portal login — the existing
    `/hub/resources` page only showed the client×resource visibility matrix, not the resource content
    itself. Reuses the real client-facing components directly (`CalorieGuideClient`,
    `ShowdownSoundboardClient`) with a placeholder name; both are fully self-contained with no
    fetch/save calls, safe to render under hub auth. "Preview →" link added to each resource's summary
    card (`5cc8970`).
  - Portal Resources nav link (added 2026-08-04) was independently re-confirmed live and correct
    multiple times this session (code, DOM, post-deploy) — Craig's "can't see it" reports turned out to
    be about wanting the resource-preview feature above, not a missing nav link.
- **Note for next session:** confirm the `5cc8970` deploy finished — it was still building when this
  session closed; check `wo active`/Coolify if picking this up.

- **Item-2 backlog checked live + a real "Level 4 Personal Trainer" regression found and fixed —
  DONE 2026-08-04.** Live-checked all 4 approved item-2 units with a disposable staff account: the
  home_training hub toggle and the site-review 500 both turned out to already be non-issues (toggle
  already built, 500 not reproducing); client data consolidation is Craig's own manual task, not
  code; the "gone quiet" nudge's Esther-facing detection banner is already live and may already be
  the intended design — queued as a direct question to Craig rather than building a speculative
  client-facing send feature. While checking, found the "Level 4 Personal Trainer" claim (banned
  2026-07-27) and a Level-3-vs-4 comparison (banned by voice.md rule 3) still live in 7 places the
  original rewrite missed, including the site-wide default page title (`app/layout.tsx`, showing on
  every hub page) and the AI system prompts that draft client emails/plans. All fixed, `tsc` clean,
  pushed `72de64f`, deployed. Full detail: `.context/decisions.log` 2026-08-04 (later entry).
- **Launch-review Lane C fully closed + FAQ rewrite pass — DONE 2026-08-04.** Craig resolved all 5
  outstanding Lane C GATE items from `workorder-launch-review-followups-2026-07-30.md` in one batch:
  condition-roll-call copy on Home/PT left as-is for now, blog scope deferred, About "Real Story" and
  the Google Reviews shortlist both confirmed final, and FAQ answer bodies approved for a rewrite pass.
  Reviewed all 17 FAQ answers against `voice.md` — most were already realigned in `74b2fa9`
  (2026-07-27); polished 3 for tone (GP-referral phrasing, a corporate "accommodate wherever possible"
  line, a transactional "budgets" phrase). `tsc --noEmit` clean, built in worktree
  `eternal-fitness-website-wt/decisions-2026-08-04` per DO-SOP-010. Separately, Craig confirmed the
  `portal-sign-in.html` mismatch flagged as open in `outstanding-items-2026-08-01.md` was stale — it
  was already resolved 2026-07-30 (keep password auth, reskin only) and shipped (`71de12c`); the
  outstanding-items file's stale entry is now corrected. Also cleared as resolved: Resend delivery
  (Craig confirmed tested/working), SPF/DKIM (confirmed working), `ANTHROPIC_API_KEY` (hub's AI agent
  runs on OpenRouter instead — not a gap), and the "no real client invited to portal" item (real
  clients are live). Craig approved proceeding on all of `outstanding-items-2026-08-01.md` section 2
  (nudge send mechanism, `home_training` toggle UI, `/hub/site-review` 500 bug, client data
  consolidation) as the next Work Order. New standing capability: Claude Code can now create a
  throwaway login for front-end/admin testing, closing the section-4 live-click-test gap going
  forward. Full detail: `.context/decisions.log` 2026-08-04 entry,
  `workorder-launch-review-followups-2026-07-30.md`, `outstanding-items-2026-08-01.md`.
Fitness Website — State

## Current
- **Cashflow work order CLOSED — Lanes 5-7 (bank import, reconciliation, dashboard) DONE + DEPLOYED
  2026-08-03 (`3178fee`/`92467cd`/`9ffdc84`).** Bank statement import at `/hub/cashflow/transactions`
  (parser built against a Monzo CSV Craig supplied as a stand-in for the still-missing real HSBC
  sample — adapter pattern, no real transactions imported), reconciliation queue at
  `/hub/cashflow/reconciliation` (suggest-and-confirm matching, never auto-commits), and a cashflow
  overview dashboard at `/hub/cashflow` (real live KPI queries, no hardcoded numbers). All 3 lanes
  hand-reviewed line-by-line and independently `tsc`/build re-verified, plus DB-level verification
  with seeded-then-cleaned-up synthetic data for the two lanes with computed numbers. See
  `handoff.md`'s 2026-08-03 entry for full detail. **Separately found, not actioned:** a second
  unclaimed work order (`wo-eternalfitness-consolidated-2026-08-02`, public marketing-page
  follow-ups — hero badge clipping fix, live verification pass, 5 copy/content decisions) — deferred
  in the registry, not silently dropped; the badge-clip candidate fix was applied but left
  uncommitted/unverified since the Browser pane's screenshot tool wouldn't render this session.
- **Hub task backlog cleared + email system redesigned — DONE + DEPLOYED 2026-08-02 (`e8b44aa`).**
  Client-portal Resources area (calorie calculator, Showdown Soundboard, per-client visibility
  toggle), Exercise History (PB + last-performed from `set_logs`), session-notes RPE removed +
  voice-to-text added, Plan Schedule page, email-timing (BST/GMT) fix, welcome-aboard email
  (manual-send-only, branded, previewable), and every client-facing email (welcome, document-ready,
  PAR-Q ×2, six/four-week/flexible update) redesigned onto a new warm-palette shared shell matching
  Craig's mockups at `D:\apps\design-systems\ef-client-portal\email-templates\`. Updates-module
  AI-generation bug root-caused and fixed (chat-context truncation + `[CLIENT]` placeholder banned
  outright) but not yet live-verified — see `handoff.md`. Resources module also not yet reviewed live
  by Craig — deferred `dmsbpoaa37f`.
- **Training block module redesign — DONE + DEPLOYED + LOG-VERIFIED 2026-08-01 (afternoon).** Built
  against a new mockup (`hub-block-module.html`): collapsed-by-default week/session accordion,
  new Edit Block drawer (note/summary/status), one-click session-edit entry via `?edit=1`. Shipped in
  4 commits (`f10daa9` → `ea68e70` hotfix for an RSC boundary crash `tsc` couldn't catch → `9e96f64`
  mockup-parity fixes → `011ca1d` shared tab-bar component). Exercise table intentionally kept at 5
  columns (Tempo/Rest) vs. the mockup's simplified 3 — Craig confirmed "leave as is". New global rule
  (Design Parity Gate, in `CLAUDE.md`) came out of this session after a real miss — see `handoff.md`.
- **Session editor cross-section drag + log-type toggle + standalone live-logging screen — DONE +
  DEPLOYED + LIVE-VERIFIED 2026-08-01.** Corrected two prior WOs' inaccurate "done" checkmarks first
  (live code grep showed the claimed functionality didn't exist). Shipped via one OpenCode lane
  (`174b5dc`), code-reviewed line-by-line, then genuinely live-verified via a disposable staff
  account — a real "Done" click confirmed to write a real `set_logs` row, not just render. Craig
  caught one real gap (block page's session list missing the new logging deep-link, `7e3e8f7`).
  Full detail in `handoff.md`'s 2026-08-01 entry.
- **New standing rules (derived verification vs. an external source; `git diff --stat` scope review)
  applied and refined, then proven out on this repo — 2026-08-01.** Built
  `.context/tools/verify-hub-pages.js`, run live, found a genuinely real drift: `hub-documents.html`
  appeared today, contradicting a 2026-07-26 WO's "not mocked" claim for `/hub/documents`. Also found
  a real, unrelated `HTTP 500` on `/hub/site-review`, not yet investigated. See `handoff.md`.
- **Consolidated outstanding-items list** now lives at `.context/outstanding-items-2026-08-01.md` —
  supersedes scattered notes across individual `workorder-*.md` files as the first place to check.
- **Hub + portal mockup audit — DONE (audit only, not yet dispatched) 2026-07-30.** Craig asked for
  the hub-facing and client-portal `brand-staging-2662e9` mockups to be audited against the live app
  (everything not covered by the 2026-07-29 marketing-page reconciliation), with real deltas turned
  into new Work Order lanes for OpenCode. Full detail:
  `.context/workorder-hub-portal-mockup-audit-2026-07-30.md`. Short version: all 14 remaining
  hub-*.html mockups already match (the 2026-07-26 hub design-alignment WO covered them; spot-checked
  hub-dashboard.html and fully deep-diffed hub-tasks.html despite its later mockup timestamp — live
  is actually ahead of the mockup there, not behind). `hub-sop.html` has no confirmed live
  counterpart and its own sidebar nav doesn't match any other current hub mockup — flagged for
  Craig's steer, no lane drafted. Portal: `portal-account.html` and `portal-documents.html` already
  match closely (both built after the mockup's 07-28 update). Four real gaps got `[AUTO]` lanes —
  portal-home's task-first restructure (must keep the live page's real progress/update-history
  panels, which the mockup doesn't show), a missing table-of-contents nav on the document viewer, a
  missing "draw signature" option on document signing (typed-only today), and a missing section-jump
  sidebar on the PAR-Q/feedback editor. One real gap is `[GATE]`, not dispatched: portal-sign-in.html
  is a passwordless email+one-time-code flow, but the live page is traditional email+password —
  matching the mockup means changing the auth mechanism itself, not just the visuals, so it's parked
  pending Craig's call. Also fixed in the same session, unrelated: `AccreditationStrip.tsx` reduced
  from 3 badges (SafeFit/REPS/FitPro) to FitPro only, per Craig's 2026-07-30 confirmation — the
  component isn't currently rendered anywhere in `app/`, so zero visual impact; `tsc --noEmit` +
  `next build` both clean. Built in worktree `eternal-fitness-website-wt-hub-portal-audit`
  (branch `chore/hub-portal-mockup-audit`), not pushed — needs review before dispatching lanes.
- **Full mockup reconciliation round 2 — CLOSED 2026-07-29.** Craig resolved every `[GATE]` item from
  the 2026-07-28 design-reconciliation Work Order in one instruction: match the updated
  `brand-staging-2662e9` mockups exactly, remove anything on staging with no mockup equivalent. Also
  fixed the hero gradient he called "awful" — a new full-bleed 3-layer scrim replacing the old flat
  gradient, and the two-column "split" hero retired everywhere in favour of one unified pattern. Shared
  hero rework (`b6515b7`) + all 6 launch pages' section cleanup (`fdca133`). Craig's own click-through
  (via direct screenshots, not description) then caught two real remaining gaps: Home's Approach section
  step images were never actually reconciled against the mockup (`8860624`, same commit also restored the
  Specialist Training condition list on Craig's explicit reversal), and a leftover extra "No weigh-ins"
  card plus an invisible white-on-white testimonial text bug (`40ec639`). All four commits `tsc`/`next
  build` clean, Coolify-confirmed `running:healthy` via MCP. Full detail:
  `.context/workorder-mockup-reconciliation-2026-07-29.md` and the `decisions.log` 2026-07-29 entries.
  One item still flagged, not reversed: the mockup's "See Specialist Training" links point at the
  still-disabled `/exercise-for-health` catalogue — kept pointing at live pages instead.
- **Update-composer paste fixes + email send/resend delivery history — DONE + DEPLOYED + LIVE-VERIFIED
  2026-07-28 (evening).** 6 commits, all confirmed `running:healthy` via Coolify MCP. (1) `5f64b03` —
  "Paste a draft" option added to the New Update composer, bypassing the AI chat entirely (it was
  silently rewriting pasted text through a 4000-char conversation-summary). (2) `ff46fe2` — opening line
  is now WYSIWYG; Flexible Update (custom sections, has add/remove) restored as the default template —
  it used to be the only template, so add/remove was always visible until 6-Week/4-Week got added ahead
  of it in the list. (3) `295e7ca` — paste-parser heading detection no longer requires a blank line
  before a heading (real Word/Docs/Gmail pastes don't have one). (4) `f05aab0` — paste box switched from
  a plain `<textarea>` (always flattens clipboard content to plain text, per the HTML spec) to a
  contentEditable rich-text box, so bold/headings/lists survive; new `parsePastedHtmlUpdate()` reads the
  actual pasted DOM. (5) `bb482bf` — client portal's documents list had no click-through at all (plain
  `<li>` rows, no `<Link>`) — fixed. (6) `ac47f67` — real feature: append-only `email_send_events` table
  (migration applied live) tracks every send/resend/delivered/opened/clicked/bounced/complained event per
  update and document — previously a resend overwrote the only `sent_at` on record, so "did this actually
  go out" was unanswerable after a resend. New "Delivery history" panel in the hub (per-client updates
  list + document detail page); portal's update-email list now links through to a real view page.
  Backfilled 27 historical sends from existing `sent_at` (honestly caveated as last-known-send only, not
  a true reconstructed history). **Needs Craig:** subscribe `email.delivered`/`bounced`/`complained` on
  the Resend webhook endpoint (Resend dashboard → Domains → Webhooks) — only `opened`/`clicked` are
  enabled today, so the new event types won't populate until that's added. Also created a portal login
  for Ian Healey (client #9), credentials handed to Craig directly (invite email not sent). **Not done:**
  no live click-test in a real hub session. Full detail in handoff.md.
- **Hub tasks — due-date filtering, sorting, "Due This Week" banner — DONE + DEPLOYED 2026-07-28.**
  `/hub/tasks` now has Overdue/Due Today/Due This Week/No Due Date filter pills, a Due date/Created/Title
  sort control (direction toggle, no-due-date tasks always last), and a due-soon summary banner (rose if
  anything's overdue, amber otherwise). Client-side only against the existing `due_date` column, no
  migration. Built in an isolated worktree, `tsc --noEmit` + full `next build` both clean, pushed
  `e5347ef..087ae2e` to `main`, Coolify auto-deploy confirmed `running:healthy`. Not click-tested live
  (no hub credentials in this environment). Full detail in `.context/handoff.md`.
- **Launch-page copy alignment + 4 follow-up UI fixes — DONE + DEPLOYED + LIVE-VERIFIED 2026-07-27
  (evening).** Craig reported the morning's launch-copy commit (`3f50bd8`) had shipped copy diverging
  from the source doc (`EF_Launch_Pages_Redraft_Jul2026.docx`, workspace repo). Confirmed real: Home and
  About had each picked up the doc's new hero/story copy but retained clinical-first sections and
  elements the doc explicitly replaced. Fixed across five commits, each built in its own isolated
  worktree per DO-SOP-010, each deploy confirmed healthy via Coolify MCP **and** re-verified live in a
  real browser (never on deploy-status alone):
  - `74b2fa9` — all 6 launch pages aligned line-by-line to the doc. Home: qualification badge moved out
    of the hero, a GP-referred-clients badge removed from the Why section (not in the doc at all —
    exactly the clinical-first framing the rewrite existed to strip), Who-cards reordered so the
    general-audience card leads, added the doc's Specialist Training cross-link band, corrected a
    testimonial quote misattributed to Saffron S. About: Experience/Philosophy/studio-callout rewritten
    (still carried the old condition-roll-call copy) + added the missing Colin F testimonial. Personal
    Training: added the doc's Specialist Training section. Pricing/FAQs: minor wording. Contact: clean.
  - `5f4ca6e` — removed a duplicate self-introduction. Hero and Why section both opened with "I'm Esther
    — a personal trainer based in a private studio in Worthing"; a regression from `74b2fa9` (hero took
    the line from the doc, the pre-existing Why paragraph already had it). Dropped the Why paragraph —
    the doc has no paragraph there, just heading + 3 bullets.
  - `eee2be1` — CTA-band photos cropped Esther's head off on wide screens. The band is full-width with a
    fixed min-height, so `object-fit: cover` crops far more vertically as the viewport widens; with the
    default centred `object-position` and her head in the upper third of every source photo, wide
    viewports cut into her face. Added an optional `imagePosition` prop to the shared `CTABand`
    component (default unchanged) and top-biased the 5 CTA photos featuring her. Pricing's CTA image has
    no person in it — deliberately untouched.
  - `ed51b6f` — hero heading descenders (the "g" in Training/Worthing) were clipped. `.hw`'s
    `padding-bottom: .04em` sat on an element with no font-size of its own, so the `em` resolved against
    the inherited 16px body font (0.64px) rather than the 78–92px heading rendered inside it, while
    `.hw`'s `overflow: hidden` (needed for the GSAP slide-reveal) clipped the overflow. Moved the
    padding onto `.hl`, which carries the large `clamp()`'d font-size.
  - `97dba83` — homepage **section order** was wrong, not just wording: Who I Work With and Specialist
    Training sat before The Approach instead of after. Reordered to the doc's sequence (Hero → Why →
    How I Actually Train You → Who I Work With → Specialist Training → testimonials → CTA), no copy
    changes; every paragraph re-checked word-for-word against the doc at the same time.
  **Open:** the Specialist Training catalogue pages these now link to don't exist yet (placeholder
  anchor `/personal-training#specialist`) — must not reach production in that state. FAQ answer bodies
  (21 questions) still un-rewritten, deliberately.
- **Homepage nav-scrim contrast fix — DONE + DEPLOYED 2026-07-27.** Craig flagged the homepage nav
  looking washed out over the hero's white left text panel (fine over the dark hero photo on the right).
  Root cause: `#hero::before`'s scrim (`app/home.css`) faded from 50% opacity at the top to fully
  transparent by 170px down, but the nav itself is only 72px tall — by the bottom of the nav the scrim
  had already faded to ~29% opacity, so the white logo/nav text sat on a near-transparent scrim over a
  plain white background on the left. Fixed by holding the gradient at 60% opacity through the full 72px
  nav height, then fading to transparent by 170px. Built in an isolated worktree
  (`ef-worktree-nav-scrim-2026-07-27`, branch `fix/nav-scrim-contrast`) per DO-SOP-010 — the shared
  checkout had been edited directly by mistake first, caught before pushing, reverted, redone properly.
  Pushed `9c03763`, GitHub webhook auto-triggered a Coolify deploy (confirmed `running:healthy` via MCP),
  verified live on `staging.eternal-fitness.co.uk` with a real Playwright screenshot (not just a
  self-report) — nav now reads clearly across the full width. **Auto-deploy confirmed ON for this app**
  (the webhook deploy already finished by the time a manual API-triggered deploy was tried — the manual
  one was redundant/wasted, one attempt even failed; don't manually trigger a deploy on this app after a
  push, it's automatic.
- **Marketing site copy rewrite + launch-scope page disabling — DONE + DEPLOYED 2026-07-27.** Two pieces,
  both from the `eternal-fitness` workspace repo's reference-layer sign-off the same day (see that repo's
  `.context/decisions.log`, 2026-07-27 entries, for the full "personal trainer first" positioning
  rationale):
  1. **Copy rewrite** (`3f50bd8`): Home, About, Personal Training, Pricing, FAQs, Contact rewritten to
     lead with personal training, not health conditions. Fixed the "Level 4 Personal Trainer / highest in
     the UK" claim everywhere it appeared, including 3 separate schema.org blocks (jobTitle/hasCredential
     on Home and About, plus Personal Training's Service schema) — Esther's Level 4 is the CanRehab
     Cancer and Exercise Rehabilitation qualification specifically. Removed the £45 single-session tier
     — confirmed not a real offer — from the Pricing cards, 2 schema.org Offer blocks, and a hardcoded
     FAQ answer that also quoted it. About's fabricated origin story replaced with a real one sourced from
     Esther's published Storm Fitness Academy interview. Testimonials swapped for real, sourced Google
     Reviews quotes.
  2. **Launch-scope page disabling** (`ded1a88`→`63c7875`): Craig asked to disable everything outside the
     6 launch pages + 3 legal pages for now. Added temporary (`permanent: false`) redirects in
     `next.config.js` for `/blog`, `/blog/:path*`, `/cancer-rehabilitation`, `/exercise-for-health`, and
     `/exercise-for-health/:path*` → `/` — code stays in the repo, easy one-block revert once the
     Specialist Training catalogue restructure and blog-rewrite scope decision are resolved. Stripped the
     matching links from Navbar (flat 6-item nav now, dropdown removed) and Footer (Services column
     removed, merged into a 3-column layout), and removed the in-page cross-link sections on Home and
     Personal Training that pointed at the now-disabled pages. Trimmed `sitemap.ts` to the 9 live URLs
     and dropped its Supabase `blog_posts` fetch entirely (no longer needed).
  Both pushed straight to `main` from isolated worktrees (`ef-worktree-launch-copy-2026-07-27`,
  `ef-worktree-disable-pages-2026-07-27`) per DO-SOP-010, `tsc --noEmit` and full `next build` clean each
  time, Coolify auto-deploy confirmed via MCP. **Not done:** no live click-through verification in a
  browser — confirm `staging.eternal-fitness.co.uk` renders correctly and disabled routes actually
  redirect, next session.
- **Hub design-alignment Work Order — all 8 lanes (A–H) built, reviewed, merged, DEPLOYED — 2026-07-26/27,
  not click-tested.** `.context/workorder-hub-design-alignment-session-editor-2026-07-26.md`. Lane H
  (session/workout editor, the one genuinely new feature) re-landed correctly in an isolated worktree
  (fixing a DO-SOP-010 deviation from the prior session), pushed `d105e29`. Lanes A–G (presentation-only
  diffs of every other hub route against its Open Design mockup) were dispatched to OpenCode
  (`opencode-go/deepseek-v4-pro`) in isolated worktrees with junctioned `node_modules` (2026-07-25's
  disk-fill incident deliberately not repeated — worktrees capped at 4 concurrent, junctions/worktrees
  removed immediately after each merge). **OpenCode's first batch (lanes A–D) needed real fixes on
  review, not rubber-stamping:** a mockup placeholder client name ("Joan") got copied verbatim into 3
  lines of live PAR-Q copy instead of the real `client.name` in scope; a wholesale invented "Section 7
  — Medical Clearance Record" block carried fabricated clinical-sounding demo text with no real form
  data behind it; a static always-on "Connected" badge got added to the Plan Agent tab with no real
  connectivity check behind it (would contradict the tab's own error banner on a real API failure);
  and live search/pagination feedback text on the exercise library got deleted and replaced with a
  static condition-roll-call string lifted from mockup demo copy. All 4 fixed and re-verified (`tsc`
  clean) before merge. The second batch (lanes E–G) had the same failure patterns spelled out
  explicitly in the OpenCode brief and came back clean — nothing to fix. Final commit `5c92510`
  deployed to Coolify (`sbzxkdejcmb5ahw3ai42on8q`), confirmed `finished`/`running:healthy` at
  `staging.eternal-fitness.co.uk`. Two earlier auto-triggered webhook deploys failed on transient infra
  collisions (a container-name clash between concurrent deploys, and one build whose exec channel died
  after it had already compiled successfully) while pushes landed in quick succession — not code
  errors, confirmed by reading the raw build logs. **Not done: no live, logged-in click-test of any
  lane** (no hub credentials available in this environment) — first thing Craig should do next session.
  See handoff.md for the full per-lane breakdown.
- **Block schedule/review link fix — DONE + DEPLOYED 2026-07-25 (later), not click-tested.** Craig
  couldn't find the "Review" button on an already-approved training block. Root cause: the link to
  `/hub/clients/[id]/blocks/[blockId]/review` (Lane D's scheduler lives there) only rendered for
  `status === "draft"`, and the review page's Approve button had no such guard either — clicking it on
  an approved block would have hit the API's existing `400 "Block is already X"` rejection. Fixed both
  (`77f5861`, deployed via `f25b98c`): block page always links through ("Schedule" once approved),
  review page hides Approve and shows real status once non-draft. First deploy attempt hit a one-off
  Coolify/SSH infra failure (unrelated to the code, retried clean). See
  `.context/workorder-session-logging-2026-07-25.md` (Lane D follow-up) and `handoff.md`.
- **Hub to-do task list — DONE + DEPLOYED 2026-07-25, not click-tested.** New `/hub/tasks` page: a
  3-column kanban (To Do/In Progress/Done), tasks assignable to Esther Fair/Craig Blackman/Unassigned,
  free-form staff-creatable buckets (Website/Content/Admin/etc.) for grouping, and a "My Tasks" default
  filter that reads the signed-in user's name against the `assignee` field. Only Esther has a hub
  account today (verified against the live `user` table) so "My Tasks" only activates for her. Three
  commits (`51e6a38`, `9542840`, `a3e861e`), each independently verified (`tsc`/`next build` clean) and
  confirmed `running:healthy` on Coolify before the next was built. **Not done:** no live logged-in
  click-test — needs Craig's own session. See handoff.md for full detail.
- **Session logging Work Order (Lanes A–D) — DONE + DEPLOYED 2026-07-25, click-tested via a dedicated
  test client, not by Esther/Craig on a real one yet.** `.context/workorder-session-logging-2026-07-25.md`.
  Replaces Trainerize's session-delivery/logging/progress role: Lane A — Esther per-set live logging on
  the session detail page (`set_logs` table, quick-log UI); Lane B — home-training client self-logging
  in the portal, gated to `clients.delivery_mode='home_training'`, server-verified ownership on every
  read/write; Lane C — progress/trend view (hub "Progress" tab + portal dashboard) plus a 7-day
  "gone quiet" Esther-facing alert; `delivery_mode` toggle added to the client edit page. **Lane D**
  (added same day, Craig-directed): `sessions` gained `scheduled_at`/`cancelled_at`/`cancel_reason` —
  there was zero scheduling data anywhere in this app before this (booking lived entirely in Outlook) —
  a bulk repeating-pattern scheduler on the block review page, plus a new studio-wide `/hub/schedule`
  day-view calendar across all clients with overlap warnings (warn only, never blocks). All migrations
  run against prod and verified; all commits independently verified (`tsc`/build, code read line-by-line,
  not trusted from agent self-reports) before push. A test client (client_number 19,
  "Test - Home Training", portal login `craig.blackman1@gmail.com`) exists for click-through testing —
  safe to delete once done with it. **Not done:** the client-facing "gone quiet" nudge send mechanism
  (detection is live; auto-send vs. Esther-reviewed is still an open decision); no real client assigned
  to `home_training` yet.
- **Hub sign-up endpoint closed — DONE + DEPLOYED + LIVE-VERIFIED 2026-07-25.** Found while creating a
  new hub login for Craig: `/api/auth/sign-up/email` was completely open on the public internet with no
  invite/approval gate — anyone who found the URL could self-register a full staff hub account. Fixed
  with `emailAndPassword.disableSignUp: true` in `lib/auth.ts` (`f25b98c`). Live-verified via curl: the
  endpoint now returns `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`; sign-in with the newly-created
  `craig@decodedops.co.uk` account still returns `200` with a valid session. **Side effect:** any future
  new staff member now needs manual provisioning (a one-off script, or a temporary flip of this flag) —
  no in-hub "invite staff" UI exists.
- **Hub task-list buckets gained rename/delete UI — DONE + DEPLOYED 2026-07-25, not click-tested.**
  The bucket feature (built by a separate concurrent session) was create-only; `PATCH /api/task-buckets/[id]`
  added for rename, and hover-revealed pencil/trash icons wired to rename/delete on the bucket filter
  chips (`51afdd8`). Deleting a bucket clears `bucket_id` on its tasks rather than deleting them.
- **Consent choices surfaced in hub admin portal — DONE + PUSHED 2026-07-24, not click-tested.**
  Craig couldn't see what clients had actually consented to from the hub. Investigated first: the data
  (`client_documents.consent_choices`) was already captured correctly on sign — no schema change
  needed. Fixed the read side only: document detail page now renders a per-option ✓/✗ breakdown against
  the template's `consentGroups`; the client detail page's document register select now includes
  `consent_choices`; each register row shows an "N/M consents" pill. Pushed straight to `main`
  (`edaa0c4`) from an isolated worktree per DO-SOP-010. **Not done:** no `tsc`/build run (worktree had
  no `node_modules`, `npm install` is gated and wasn't authorized this session) and no live click-through
  on staging — both worth doing next session before calling this fully verified. Known limitation, not a
  bug: a consent box the client never touched has no key in `consent_choices` at all, so it reads
  identically to an active decline (✗) — flagged to Craig, not silently fixed.
- **Lane I — scanned/paper document storage — DONE + DEPLOYED 2026-07-22.** `client_documents` gained
  `source_type`/`source_file_name`/`source_file_mime`/`source_file_size`; new `client_document_files`
  table holds raw bytes directly in Postgres (no Coolify volume needed at this scale); staff-auth-only
  `POST /api/documents/upload` + `GET /api/documents/[id]/file`; `DocumentRegister.tsx` shows scanned
  rows with a "Scanned original" badge + download link instead of send/resend. Real bug found and fixed
  live: a migration policy referencing Supabase's `authenticated` role failed against prod — that role
  never carried over from the Supabase migration, and it turns out `client_documents` has had RLS
  enabled with zero working policies the whole time; access control is actually enforced at the app
  layer everywhere in the document engine, not Postgres RLS. Sarah Tyler's scanned Personal Training
  Agreement is the first real record (`client_documents` id `a74a1ef7-0c19-478c-b5e2-538a9304e102`,
  183,462 bytes, verified byte-for-byte). UI upload path itself not yet click-tested in a real browser
  session. See `handoff.md` for full detail.
- **Lane K — portal auth rework — DONE + DEPLOYED 2026-07-22.** Passwordless magic-link login replaced
  with email+password; portal accounts are now created only via a staff "Invite to portal" button on
  the client detail page (closes a real gap where `ensurePortalAccount()` used to auto-create *and*
  auto-enable an account for any matching email with no staff step, despite its own doc comment claiming
  staff-gating). Confirmed while building: **no `portal_*` tables existed on production at all** — the
  original magic-link migration was written but never run, so the portal login had never worked against
  real data. New tables (`portal_accounts`/`portal_sessions`/`portal_reset_tokens`) live, migration
  verified, Coolify deployment confirmed healthy. Password hashing via Node's built-in `crypto.scryptSync`
  (no new dependency), deliberately isolated from staff auth's `better-auth`. **Not done yet**: no client
  has actually been invited, and the invite/login/reset UI flow hasn't been click-tested in a real
  browser session.
- **Lane J (paper→digital conversion tool) — scoped, deliberately parked** (Craig's call, 2026-07-22) —
  recommendation on record (extract fields into `ClientProfile` via a vision-LLM call, not OCR — no OCR
  tooling exists and the scan has no extractable text), not built. Not to be picked back up proactively.

- **Flexible/four-week update AI drafting fixed, pushed, deployed** (2026-07-21, latest) — `generate`
  route only ever supported `six_week_update`; picking Flexible or 4-Week Update in the hub's
  "New Update" chat flow hit a hard 400 ("not implemented yet"). `generateUpdateDraft()`
  (`lib/generate-six-week-update.ts`) now covers all three kinds; flexible lets the AI choose its own
  section count/headings from the conversation instead of a fixed shape (Craig's explicit ask, so Esther
  stops drafting these by hand in Claude Desktop). `NewUpdateClient.tsx` now populates `flexSections` from
  the AI draft too (previously silently did nothing for the flexible kind). `tsc`/build clean. Committed
  `cc29c03`, pushed to main — Coolify deployment `oe8ppywxvdv1odhbq1kvn9yk` confirmed `finished` before
  session close. **Not live-UI-tested** (no hub session this session) — worth a real click-through next
  time. Monique Weardon's (#10) actual draft was built directly via
  `scripts/create-update-draft.mjs` against prod as an immediate workaround — sitting as a draft at
  `/hub/clients/10/updates`, nothing sent. See handoff.md and decisions.log.
- **Real root cause of "still shows as sent" found and fixed** (2026-07-21) — a second, previously-undiscovered "Create & send" component on the *template* detail page (`app/hub/(protected)/templates/[id]/SendTemplateToClient.tsx`) was bypassing the whole document-engine send flow: it PATCHed a bare `action: "send"` that just flipped status to "sent" with no email attempt and no `emailed` field ever set. That's what Craig meant weeks-turns ago by "/hub/templates needs the same send mechanism" — there genuinely was a broken send button there, missed by an earlier grep that only checked the server page component, not the client component it renders. Fixed: `SendTemplateToClient.tsx` now just creates the draft and redirects to the real document page; the bare `action: "send"` branch is deleted from `app/api/documents/[id]/route.ts` entirely (confirmed zero other callers first) — `send_email` is now the only way status becomes "sent", closing off this exact failure mode for good. `tsc`/build clean. See handoff.md.
- **`client_documents.emailed` flag added, live** (2026-07-21) — status "sent" no longer the only signal of whether an email actually delivered. Real data showed a document marked "sent" 36ms after creation — physically too fast for a real SendGrid API round-trip, strong evidence the backend is dry-running in prod (not definitively confirmed — didn't reveal/test the raw SENDGRID_API_KEY/SMTP_* values, which do exist as env vars on Coolify). `sendDocumentEmail()` now records `emailed: !dryRun`; `DocumentRegister.tsx`/All Documents/`DocumentDetailClient.tsx` all show a "Not delivered" indicator when status says sent but emailed is false. Mirrors the same pattern `sent_updates.emailed`/`ClientUpdatesPanel.tsx` already used for update emails — this problem had already been solved once, just not applied to documents. **Needs a real test send (hub UI or SendGrid dashboard) to confirm whether the backend is actually broken** — flagged for Craig, not something confirmable without live credentials. See handoff.md.
- **4 more document/update-email issues fixed** (2026-07-21) — editable section headers extended to the 6-week/4-week update templates (previously only the non-default "Flexible Update" had this); documents can now be deleted (`DELETE /api/documents/[id]`, wired into both list and detail views) with a clearer draft-status note; the confusing Copy-link icon (was reusing the send/paper-plane icon) swapped to a real copy icon; document-ready email button/link spacing rebalanced (was `20px 0 4px` → `margin:0`, now `24px 0 16px` → `margin:8px 0 0`). Migrated PAR-Q/Agreement documents can still show "sent" from legacy status carry-over — Craig confirmed leave that historical data as-is. `tsc`/build clean. See handoff.md.
- Next.js 14 / Tailwind / shadcn-ui / self-hosted Postgres on Coolify
- Hub with client management, training blocks, agreements, PAR-Q
- **Custom icon system**: 90+ SVG icons replacing lucide-react (grew from 36+ this session — `IconRefreshCw`, `IconUser`, `IconShieldCheck`, `IconRuler` added where a mockup specified a shape genuinely missing) ✅
- 6-week client update email feature: **BUILT** (all phases complete, build+tsc clean)
- **Work Orders:** `.context/workorder-eternal-fitness-hub-consolidation-2026-07-20.md` (client data
  consolidation + document-led client portal) — closed 2026-07-20, all AUTO units done; client data
  consolidation itself (manual entry) still not started, not blocking. `.context/workorder-session-
  logging-2026-07-25.md` (Trainerize-replacement session logging + scheduling) — Lanes A–D all DONE +
  DEPLOYED 2026-07-25, only Craig-decision GATE items open (nudge auto-send vs. Esther-reviewed;
  assigning a real client to `home_training`; a live click-test of the whole thing). See either file's
  DONE checklist for live status; see `.context/handoff.md` for the full per-unit log.
- Client document engine now visually matches the new brand design system (`D:\apps\design-systems\brand-staging-2662e9`) — masthead, accessibility toolbar (text size + high contrast), sign-boxes — applied to all 4 document kinds. New `consent` document type live (checkbox-based content permissions). Documents can now be emailed to clients directly from the hub, not just copy-link.
- Client detail page (`/hub/clients/[id]`) fully rolled out against `hub-client-detail.html`. Live on staging (commits `2acaf4e`, `211f3f7`).
- Six more hub screens restyled to match mockups (dashboard, exercise library, process & quality, reports/updates, SOP detail view, studio equipment) — live on staging.
- **Lane F pushed and deployed 2026-07-21** (was sitting locally since 2026-07-20): every remaining hub route with no source mockup restyled — `clients/new`, training delivery pages, PAR-Q, agreements, top-level documents register, settings, site-content, site-review, templates, tracker, hub auth screens, `PackagePaymentsCard` button fix.
- **Client portal is now actually live** (2026-07-21) — was built 2026-07-20 but had a real infinite-redirect-loop bug (`/portal/login` nested inside its own auth-gating layout) that made it completely unreachable; fixed and deployed. No real client invited yet — that's still a `[GATE]`.
- **Hub-wide icon/status-colour audit (2026-07-21)** — 8 hub pages checked against their OpenDesign mockups after Craig caught a real drift on Site Content; 6 of 8 had genuine defects, several serious (invisible white-on-white badges, silently-blank dashboard status pills, a literal `/* comment */` rendering as visible page text). Full detail in the Work Order's new Lane G. Also fixed the actual root cause of the `ClientUpdatesPanel.tsx:60` TS error that had been flagged "pre-existing, unrelated" three separate times — `tsc --noEmit` is now completely clean project-wide.
- **Site Content page rebuilt into a full inventory** (2026-07-21) — was tracking only 9 static pages; now covers all 47 real+planned pages (static, all 8 condition pages, all 3 legal pages, all 27 blog posts) with status filters (Published/Needs Writing/Needs Updating) and type filters, matching a new OpenDesign mockup. Migration `20260721_site_content_full_inventory.sql` applied to prod.
- **Blog byline fixed** (2026-07-21) — 26 of 27 posts corrected from "Craig Blackman" to "Esther Fair". Content/titles untouched, awaiting Esther's full content review separately.
- **SEO fixes shipped** (2026-07-21) — blog meta descriptions were raw truncated excerpt text (199-200 chars, past Google's ~155-160 limit, occasionally leaking a literal `&nbsp;`); cleaned via a new `cleanMetaDescription()` helper. 4 of 5 raw `<img>` tags converted to `next/image`. Added blog→condition-page internal links (previously zero). Sitemap `lastModified` now uses `updated_at`. `/portal` added to `robots.ts`'s disallow list, matching `/hub`'s existing (already-correct) noindex treatment.
- **Resend now works on every document kind, built, NOT pushed** (2026-07-21, later) — PAR-Q's "Send" action was copy-link-only despite looking like an email button; it now has a real "Email …" action (`app/api/parq/send-email/route.ts`, mirrors the document engine's send flow). 6-week/4-week update emails can now be resent once sent (`UpdateRowActions.tsx`, `app/api/updates/[updateId]/send/route.ts`), which was previously blocked outright. Agreements' email button (`AgreementDetailClient.tsx`) was silently dead — it used an unconfigured `RESEND_API_KEY`/`resend` package instead of the app's real backend; rewired onto `lib/email.ts`, which gained attachment support (`SendEmailInput.attachments`, both SendGrid and SMTP paths) so the PDF attachment still works. A follow-up fix found and closed a real PAR-Q link bug: two places (`AgreementDetailClient.tsx`'s "copy client link", the hub PAR-Q edit page's admin-mode "copy client link") built a bare `/parq/edit/[id]` link with no signature, always rejected as invalid — both now mint the same signed exp/sig pair the working "Send PAR-Q update" flow already used. `tsc --noEmit` clean; not live-verified (no hub credentials this session) or deployed. See handoff.md.
- **New "Client Feedback Questionnaire" document type, live** (2026-07-21, latest) — 5th document-engine kind (`feedback`), matching `brand-staging-2662e9/documents/client-feedback-questionnaire.html`. Free-text + radio-choice survey questions + 2 optional consent checkboxes, no legal signature (name only). `feedback_responses` jsonb column + the seeded `document_templates` row are both live on prod (Craig's go-ahead, 2026-07-21). Esther's document-detail view gained a "Responses" card to actually read submitted answers. `tsc --noEmit` clean. Not yet live-browser-verified. See handoff.md.
- **PAR-Q migrated onto the document engine, live** (2026-07-21) — 6th kind (`parq`), all 29 real clinical questions + personal/GP fields, reusing the same interactive schema as Feedback (stays on the full signature+"I agree" flow, unlike Feedback's name-only survey). 17/17 legacy `signed_parq` rows backfilled into `client_documents` and spot-verified byte-for-byte against 3 real clients — no legacy data touched/deleted. `SendDocumentLink.tsx` and `/api/parq/send-email` (the standalone "Send PAR-Q" mechanism) removed — PAR-Q now sends/resends exactly like every other document kind. `/parq` and `/parq/edit/[id]` deliberately left in place (unlinked, not deleted) as a safety net for any outstanding pre-migration links.
- **Agreement migrated too, live, all document types now hub-only** (2026-07-21, same session) — turned out `document_templates` kind `'terms'` was already the real Personal Training Agreement (updated 2026-07-04) but never formally taken over from the standalone `/agreement` page — relabelled it "Personal Training Agreement" and backfilled all 6 `signed_agreements` rows into `client_documents` (2 had no `client_id`, resolved by exact name match, 0 skipped). `/hub/agreements` relabelled "(legacy record)". Every document kind — Terms/Agreement, Risk Assessment, Annual Review, Consent, Feedback, PAR-Q — now shares one send/resend mechanism from the hub; nothing generates a fresh standalone public-page link anymore. `tsc` clean. See handoff.md.
- **`signed_agreements`/`clients` duplication fixed same-day, not left as a follow-up** — the dangerous UI path (editing package/payment/clinical fields on the Agreement page, silently diverging from the live client page) turned out to be dead code already disconnected from any button; removed it entirely (`AgreementDetailClient.tsx`'s trainer-fields edit state + `app/api/agreements/[id]/route.ts`'s PATCH handler) rather than leave it as a latent risk. `clients` is now unambiguously the only writable source for those fields. See handoff.md.
- **Inline Send/Resend added to both document lists** (2026-07-21) — new `components/hub/DocumentRowActions.tsx` (Send/Resend + Copy link per row, same pattern as `UpdateRowActions.tsx`) wired into `DocumentRegister.tsx` (client Documents tab) and the hub-wide All Documents list — previously both only had an "Open" link, no inline send. "New document" renamed "Create & send". Investigated Esther's "Agreement only gives a link" report with real data — not a bug, the client she tested with (`Craig Blackman` test record) has no email on file; confirmed the Send button works for clients with a real email. Also fixed a real leftover bug: `/hub/templates` still linked to the retired `/parq` blank form via a hardcoded card (from before PAR-Q was migrated) — removed, and fixed template section-counts always showing 0 for feedback/parq kinds. `tsc`/build clean. See handoff.md.
- **Hub mockup-alignment pass, Lane H, built, NOT pushed** (2026-07-21, later still) — 12-agent visual/IA pass against all `hub-*.html` mockups. Most routes already matched from earlier sessions (verified, not assumed). Real fixes: All Documents rebuilt to the hub's own list-page pattern (its mapped mockup turned out to be an SOP detail page, not a list — flagged separately), Site Content list (TokenPill fix), Site Content editor (fixed a literal `&amp;amp;` text bug + missing icon + Title Case labels + missing subtitle). Process & Quality's real CRUD/data confirmed untouched throughout — mockup's onboarding-checklist content deliberately not added, per Craig's decision. `tsc --noEmit` clean project-wide. Three items spawned as separate background-task suggestions rather than actioned: client-edit page missing a right rail/clearance banner (needs new computed logic), `ProcessQualityManager.tsx` badge-markup dedup, and the hub-sop/All-Documents mockup mismatch. See Work Order Lane H and handoff.md.

## Built
- DB schema (now on plain Postgres, originally built on Supabase): clients, blocks, sessions, signed_agreements, signed_parq, medical_clearance_tracker, client_tracker
- **6-week update emails**: block_summaries JSONB + sent_updates table (migration)
- **4-week update template**: `four_week_update` kind (lib/email-templates/four-week-update.ts) —
  7 sections incl. "What Every Session Is Actually Doing" / "A Couple of Things to Keep an Eye On",
  for injury/recovery-block reviews. AI auto-generate now works (fixed 2026-07-21 — see handoff.md);
  drafts can still be authored via scripts/create-update-draft.mjs or hand-edited in the hub too.
- **Reusable SMTP send layer**: lib/email.ts — nodemailer, dry-runs gracefully when unconfigured
- **Branded email template**: inline-CSS, 6 sections, Rose/Teal brand colours
- **Generation API**: pulls profile + blocks + summaries → Claude or template-based fallback
- **Send API**: SMTP send + history storage
- **UI**: /hub/clients/[id]/updates (history) + /updates/new (generate → review → send)
- **Updates tab** on client detail page
- Hub: client CRUD, block generation (Claude + fallback), session review, agreement management
- **Custom Icon System**: components/icons/index.tsx — all public and hub pages updated
- **Document engine** (2026-07-20): `document_templates`/`client_documents` covers `terms`/`risk_assessment`/`annual_review`/`consent`; shared `DocumentView` component gives every kind the same real branded structure (masthead/eyebrow/toolbar/sign-boxes/footer); `lib/documents/render.tsx` renders interactive consent checkboxes when a template has `consentGroups`. Email-send action (`app/api/documents/[id]/route.ts`, action `send_email`) reuses `lib/email.ts`; falls back to dry-run if no SendGrid/SMTP env vars are set — **not confirmed which backend is live on this environment, verify before relying on real sends.**
- **Process & Quality System** (2026-07-20): `process_entries`/`sops`/`improvement_log` tables + `/hub/process-quality` CRUD UI, DB-backed so Esther can edit without a code deploy. **Now seeded** with 10 real SOPs + 10 matching Process Register entries (published 2026-07-20, background session — see handoff.md for the full list and how it was published). `improvement_log` still empty — no incidents logged yet.
- **Client portal** (2026-07-20, deployed live 2026-07-21): magic-link auth (`lib/portal-auth.ts`, separate from staff auth) + read-only `/portal/*` view. No real client account exists yet.
- **Site Content inventory** (2026-07-21): `page_keywords` table now covers all 47 pages (static/condition/legal/blog) with `page_type` column and a published/needs_writing/needs_updating status model; `/hub/site-content` list + `/hub/site-content/[slug]` editor rebuilt to match the OpenDesign mockup.
- **Trainerize historical import** (2026-08-02): `trainerize_training_blocks`/`workouts`/`exercises`/`client_notes`/`workout_results` tables — full training history, notes, and real per-set logged performance (19,687 sets) imported for all 15 active + 2 archived clients via direct API replay (`api.trainerize.com/v03/*`). "Training History" tab (blocks/notes only) + unified "Progress" tab (trends/PBs across both live and Trainerize eras via `lib/trainerize-adapter.ts`) on the client detail page. `clients.client_status` now supports `archived` (hub-list-hidden by default, toggle to show) — reusable for future former-client backfills.
- **Live PB flagging + workout templates** (2026-08-02): inline "New PB" badge in hub/portal session logging, backed by shared `personal_records`. `workout_templates` table with auto-derived facet tags (archetype/movement/muscle/equipment computed from contents) + manual `condition_tags`; library page reuses the exercise-browser filter pattern.
- **Cashflow core** (2026-08-02): `invoices`/`invoice_line_items`/`invoice_templates` — real relational line items, delivered via the document engine as a 7th `kind`. No VAT logic (Esther not VAT-registered). HSBC statement import/reconciliation/dashboard **not built yet** — held pending a real CSV/OFX sample.
- **12 clients' currently-in-progress Trainerize blocks promoted to real hub blocks** (2026-08-02, status=`draft`, hub-only) via `scripts/promote-active-trainerize-blocks.mjs` — the Training tab is no longer empty for imported clients. Not yet reviewed/approved by Esther.

## Known Issues
- Greyed-out "Send email" buttons are correct-by-design when a client has no email on file (`DocumentDetailClient.tsx`/`DocumentRowActions.tsx`) — confirmed via direct DB query 2026-07-21, not a bug.
- ANTHROPIC_API_KEY empty — Claude generation (blocks + updates) falls back to template
- **SMTP/SendGrid backend status is still unconfirmed as of 2026-07-21** — real data (a 36ms created→sent gap on a live send) is strong circumstantial evidence it's dry-running in prod, but not proven (didn't reveal/test the raw credentials). `client_documents.emailed`/`sent_updates.emailed` now make this visible in the UI ("Not delivered" indicator) whenever it happens — check `getEmailStatus()` (`lib/email.ts`) or do a real test send to confirm one way or the other.
- **RESOLVED 2026-08-02**: Trainerize historical data (training blocks, notes, PBs, actual per-set workout results) now imported for all 15 active + 2 archived clients — see handoff.md "Trainerize historical import" entry. Outlook/paper client data still not consolidated.
- PAR-Q edit screen inside the hub (`/hub/clients/[id]/parq/[parqId]/edit`) still uses the shared public-facing `ParqEditClient` component's own styling internally — deliberately not restyled, since that component is also live on the public client-signing flow and a deep edit risks breaking it. Now reads/writes only the legacy `signed_parq` table (pre-migration history) — new PAR-Qs go through the document engine instead. Needs a scoped decision (fork vs. leave vs. retire) before touching further.
- 5 of 8 `exercise-for-health` condition sub-pages still don't exist (`type-2-diabetes`, `copd`, `heart-conditions`, `chronic-pain`, `adaptive-training`) — gated off (`available: false`) on the index page, not dead links. Scope decision needed on how many to build before launch.
- 27 blog posts are still unedited legacy WordPress content pending Esther's voice/hard-rule review — content/titles deliberately untouched this session (only the byline field was fixed).

## Required Actions
- **Subscribe `email.delivered`/`email.bounced`/`email.complained` on the Resend webhook endpoint**
  (Resend dashboard → Domains → your sending domain → Webhooks) — only `opened`/`clicked` are enabled
  today; the webhook code handles all 5 event types now (2026-07-28) but Resend won't fire ones you
  haven't subscribed to.
- Set SMTP env vars (or confirm SendGrid is already the live backend)
- Set ANTHROPIC_API_KEY
- Verify SPF/DKIM
- **Esther should review the 12 draft blocks created 2026-08-02 from currently-in-progress Trainerize
  programs** (Anne Wareing, Becky Price, Camilla Arnold, Ellie Wallwork, Ian Healey, Odul Bozkurt,
  Saffron Somerset, Sam Gibbons, Sarah Tyler, Steph White, Amanda Munday, Colin Farley) — each block's
  note documents what was auto-filled (no coaching cues/modifications/equipment tags, no week-by-week
  progression, week/phase defaulted) before approving them for real use.
- **HSBC CSV/OFX sample needed** to unblock the cashflow WO's Lane 5 (statement import) — held per
  Craig, not chased further this session.
