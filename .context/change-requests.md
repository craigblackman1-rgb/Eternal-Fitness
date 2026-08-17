# Change Requests — Eternal Fitness Website

Per-project CR register (DO-SDLC Pipeline v1 / SOP-008). Git-tracked for the
first time 2026-08-17 — an untracked predecessor existed in the shared checkout
but was never committed (see the resolved process-gap note below). CR-EF-001–008
seeded from the SEO/AI-SEO/speed/spam audit run 2026-08-17; CR-EF-009–010 from a
concurrent hub-screens session the same day; CR-EF-011–015 reconciled from the
untracked predecessor; CR-EF-016–027 raised by Craig 2026-08-17 (hub/PWA
usability pass — see the grouping note under the table).

Status flow: raised → approved → briefed → built → verified.

**Bug vs CR boundary (per operating model):** the two items below marked `[BUG]`
are functional defects (something broken, not something new/improved) and belong
in the hub's task tracker (`decoded-ops-hub`, `task_type=bug`) once this project
has a live project_id there — not tracked yet, see note at bottom. Everything
else is a genuine change/improvement and lives here as a CR.

| ID | Item | Type | Status | Raised | Notes |
|---|---|---|---|---|---|
| CR-EF-001 | Re-enable Next.js image optimization (`images.unoptimized: false` + `sharp`) and compress oversized source images in `public/images/` (several 6–18MB originals) | CR (perf) | built | 2026-08-17 | Craig ran `pnpm add sharp` himself (gate has no self-service unblock). Config flipped, 17 source images compressed 108MB→30MB, verified live via dev server (`/_next/image` returning 200s with correct per-viewport widths, no console/server errors). Pushed `9a6fe2b`. |
| CR-EF-002 | [BUG] Contact form (`/api/leads`) has no honeypot/bot-trap — IP rate-limiting (added 2026-08-15) doesn't stop bots rotating IPs | Bug | built | 2026-08-17 | Honeypot field added to `app/contact/ContactPageClient.tsx` + server-side check in `app/api/leads/route.ts`. Not yet mirrored into the hub's live bug tracker (`decoded-ops-hub`, `task_type=bug`) — no confirmed project_id/DB access this session. |
| CR-EF-003 | `app/sitemap.ts` missing `/specialist-training` (live, indexable, nav-linked) | CR (SEO) | built | 2026-08-17 | Added. Comment updated to reflect the current re-gate (blog/cancer-rehab/falls-prevention excluded pending sign-off, not launch-scope). |
| CR-EF-004 | `/contact` title tag 80 chars, duplicates brand name — will be truncated in SERPs | CR (SEO) | built | 2026-08-17 | Fixed, `app/contact/page.tsx:21`. |
| CR-EF-005 | Meta descriptions on `/`, `/personal-training`, `/visual-impairment` run 170–197 chars, past Google's ~155–160 char practical limit | CR (SEO) | built | 2026-08-17 | Trimmed to 141–143 chars, keywords preserved. |
| CR-EF-006 | Add `Review`/`AggregateRating` schema to `/testimonials` (real named/dated quotes + "5.0 from 26 reviews" already in the HTML, no schema) | CR (SEO) | deferred | 2026-08-17 | `wo defer` id `dmsx1yz4wkp`. Source reviews are third-party (Google Reviews) — needs a read of current Google review-schema eligibility rules before implementing, not a quick fix. |
| CR-EF-007 | Update `public/llms.txt` link from `/exercise-for-health` to `/specialist-training` directly (currently an extra redirect hop) | CR (AI-SEO) | built | 2026-08-17 | Fixed. |
| CR-EF-008 | HTTP→HTTPS redirect is 302 not 301; no HSTS header | CR (infra) | deferred | 2026-08-17 | `wo defer` id `dmsx1yz8hwt`. Proxy-level (Coolify/Traefik), not app code — out of this repo's scope. |
| CR-EF-009 | Design-parity catch-up for 4 unmocked hub screens (client intake, per-client documents, updates history/composer, block review) | CR (design parity) | built | 2026-08-17 | Merged to main+staging (commits 4f9330e..27cbb28). See `.context/audit-hub-mockup-reconciliation-2026-08-15.md` and `D:\apps\design-systems\ef-control-hub\brief-hub-remaining-screens-opendesign.md`. Renumbered from a since-superseded CR-EF-006 — see process-gap note below. |
| CR-EF-010 | Monthly calendar view for `/hub/schedule` (Outlook-style month grid alongside the existing day view) | CR (functionality) | built | 2026-08-17 | Per `hub-schedule-month.html` (Open Design). Read-only baseline; day view keeps booking create/edit/cancel. Renumbered from a since-superseded CR-EF-007. |
| CR-EF-011 | Consolidate workout/logging surfaces (Session Editor, Train Screen + Edit Sheet, Portal Training) to two designs — one desktop, one mobile PWA | CR (design + functionality) | approved | 2026-08-15 | Reconciled 2026-08-17 from the never-committed series (was CR-EF-001 there). Craig 2026-08-15: fold the standalone desktop Live Log (`/hub/log/[sessionId]`) into the Session Editor, its calendar/block "Log" links repoint there, route retired with a redirect. FF: amend EF DO-FF-001 training/logging rows (regenerate the doc, don't hand-edit HTML). Design: two Open Design briefs (desktop + PWA workout surface) — pending. Execution: `wo-ef-workout-consolidation-pwa-2026-08-15` (currently PLANNED). |
| CR-EF-012 | PWA installability — staff `/hub/m` prompt + portal PWA (own manifest/SW/offline queue) | CR (functionality) | approved, partially built | 2026-08-15 | Reconciled 2026-08-17 (was CR-EF-002). `/hub/m` PWA complete and real-device-verified 2026-08-17 (Craig confirmed install + offline logging works). Portal PWA still not built — no manifest/service worker found under `app/portal/` as of 2026-08-17. Same WO as CR-EF-011. |
| CR-EF-013 | Stale "Level 4 qualified trainer" framing in `public/site.webmanifest` | CR (content, small) | built | 2026-08-15 | Reconciled 2026-08-17 (was CR-EF-003). Fixed same day: manifest description now reads "...Esther Fair, qualified in Exercise Referral and Level 4 Cancer and Exercise Rehabilitation" — matches the phrasing already used in `app/about/page.tsx`'s schema.org blocks. The wider "Level 4 Personal Trainer" retirement (2026-07-27) had fixed visible copy + 3 schema.org blocks but missed this file. |
| CR-EF-014 | Pull-up/resistance bands prescribed and logged by colour (colour defines tension per the studio's band set), not just weight | CR (functionality) | approved | 2026-08-15 | Reconciled 2026-08-17 (was CR-EF-004). Rides the same WO/mockups as CR-EF-011 — band-colour selector is part of both design briefs, not a separate pass. Colour→tension mapping still needs confirming with Esther. FF-001 §M12 row · both Open Design briefs · WO unit. |
| CR-EF-015 | Workout-from-template on training blocks (RETRO-CAPTURED) | CR (functionality) | built, unverified against consolidation design | 2026-08-15 | Reconciled 2026-08-17 (was CR-EF-005). Built and pushed to main (094d35f) by a session that predated CR-register adoption. Flag carried forward: this added functionality to the Session Editor family while CR-EF-011's consolidation redesign is still pending mockups — those briefs MUST account for it so the redesign doesn't regress it. |
| CR-EF-016 | Client list should default to alphabetical (A–Z) order, not newest-first | CR (usability, S) | raised | 2026-08-17 | Verified: `app/hub/(protected)/clients/page.tsx:13` orders `created_at` descending. The desktop table's Client column *is* click-sortable (`clients-table.tsx:50-51`) — only the default is wrong. Mobile `/hub/m/clients` needs the same default. |
| CR-EF-017 | Notes section on the client profile front page in the mobile PWA — capture "spoke to X" / free-text notes against a client, timestamped | CR (functionality) | raised | 2026-08-17 | Verified: `clients` has **no** notes column in any migration. The only note stores are `trainerize_client_notes` (imported historical, read-only) and `blocks.block_note` (per-block). Needs a new timestamped `client_notes` table + surfacing on `/hub/m/clients/[id]` (front page, above the fold) and on the desktop client page. Schema + Open Design brief before build. |
| CR-EF-018 | Single-sided (unilateral) exercises must always be prescribed and logged per side — Left / Right | CR (functionality) | raised, needs detail | 2026-08-17 | Reading of Craig's note: any unilateral movement gets explicit L/R rather than one combined entry. Touches prescription (`lib/prescription.ts`), the Session Editor, the PWA Train Screen and `set_logs` shape. **Needs Craig confirming** whether this is a per-exercise flag on the exercise library, an always-on rule for a known unilateral list, or a per-prescription toggle. Overlaps CR-EF-011's consolidation design — should ride the same mockups. |
| CR-EF-019 | Audible alert when the rest timer reaches zero | CR (functionality, S) | raised | 2026-08-17 | Verified: there is **no** audio anywhere in the app — no `new Audio`, `AudioContext`, or `navigator.vibrate` in `app/hub`, `components/hub` or `lib`. The rest timer (`app/hub/m/train/[sessionId]/TrainScreen.tsx:294-317`) is visual only. Implementation note: iOS PWA blocks un-gestured audio, so the sound element must be primed on the user's "start rest" tap; add a `navigator.vibrate` fallback for silent mode. |
| CR-EF-020 | Option to change rest times | CR (functionality) | raised | 2026-08-17 | Verified: rest length is derived from the prescription string via `parseRestSeconds()` and falls back to a hard-coded `60` (`TrainScreen.tsx:990`, `:1004`). There is no in-session override, no per-exercise default and no per-client default. Scope to settle: adjust-for-this-set-only vs. edit the prescription. |
| CR-EF-021 | Edit button against each exercise inside session logging | CR (usability) | raised | 2026-08-17 | Verified: the only edit path today is the whole-session sheet at `/hub/m/train/[sessionId]/edit` — nothing per-exercise inside the logging flow. Same surface as CR-EF-011's consolidation, so it belongs in those mockups rather than being bolted on first. |
| CR-EF-022 | Client account start date shown against the profile | CR (functionality, S) | raised | 2026-08-17 | Verified: `clients` has **no** start-date column — the nearest existing fields are `block_expiry_date` and `trainerize_training_blocks.start_date` (imported history only). Needs a column, an intake-form field, backfill for existing clients, and display on both the desktop and PWA profile. |
| CR-EF-023 | Update interval — allow an explicit date, or an arbitrary number of weeks | CR (functionality) | raised | 2026-08-17 | Verified: `lib/updates-due.ts:9` is a fixed enum (`4_week` / `6_week` / `12_week` / `6_session` / `flexible`) with `INTERVAL_DAYS` = 28/42/84, and `flexible` produces no due date at all (`:44-46`). Craig wants a free weeks-count and/or a pinned calendar date. Affects the updates-due dashboard, `lib/updates-due-db.ts` and the reminder email. |
| CR-EF-024 | Quick-action task on the client page | CR (functionality) | raised, needs detail | 2026-08-17 | Reading: raise a to-do against a client without leaving their profile. **Needs Craig confirming** whether this is an EF-local task list (new table + hub UI) or should mirror into `decoded-ops-hub` tasks — the latter is blocked on the same missing `project_id` noted under the process gap below. |
| CR-EF-025 | Client status | CR, needs detail | raised, needs detail | 2026-08-17 | Verified: `clients.client_status` already exists with a check constraint (`active` / `inactive` / `completed` / `suspended` / `archived`) — but nothing on the clients list filters or displays it; the visible status filter is `compliance_status` (`clients-table.tsx:12-17`). **Needs Craig confirming** whether the ask is (a) surface + edit the existing field, (b) filter the list by it, or (c) a different status concept entirely. |
| CR-EF-026 | [BUG] Colin and Saffron show PAR-Q not signed, but their PAR-Qs are signed | Bug | raised | 2026-08-17 | Logic verified: `lib/compliance.ts:31-35` marks "No PAR-Q on file" unless one of three holds — a legacy `signed_parq` row, a `client_documents` row of kind `parq` with `status = 'signed'`, or `profile.health.parq_trainer_override`. Most likely a **data** state (signed on paper / Microsoft Forms and never migrated) rather than a logic fault, but that is unconfirmed — needs a DB read of both clients' `signed_parq` and `client_documents` rows. Not checkable this session: `psql` is not on PATH. Also belongs in the hub bug tracker once `project_id` is confirmed. |
| CR-EF-027 | Session log should list in date order, be sortable, and be orderable by session number | CR (usability) | raised | 2026-08-17 | Verified: `app/hub/(protected)/clients/[id]/page.tsx:125-131` pulls sessions across **all** of a client's blocks ordered by `session_number` descending, capped at 50 — so session 12 of block 1 interleaves with session 12 of block 3, there is no date ordering, and no sort control. The mobile equivalent (`app/hub/m/clients/[id]/page.tsx:206-210`) applies **no** `.order()` at all. Fix needs a real date to sort on (`scheduled_at`, or `session_log.completed_at` for logged sessions) plus a sortable column header. |

## CR-EF-016 – CR-EF-027 — raised by Craig, 2026-08-17

A single hub/PWA usability pass raised verbally in chat and captured here the same
day. Every row above was checked against the shipped code before being written —
the "Verified:" notes are file/line reads, not assumptions. Three rows
(CR-EF-018, CR-EF-024, CR-EF-025) are marked **needs detail** and should be
answered as one batch, not one at a time.

**Clustering for execution** — these should not become twelve separate pieces of work:

- **Rides CR-EF-011's workout-surface consolidation** (same screens, same mockups
  still pending): CR-EF-018, CR-EF-019, CR-EF-020, CR-EF-021. Building any of
  them before those Open Design briefs exist risks work that the redesign then
  throws away — the same trap already flagged on CR-EF-015.
- **Client profile / record shape** (schema + both profile surfaces):
  CR-EF-017, CR-EF-022, CR-EF-024, CR-EF-025.
- **Independent, small, shippable now**: CR-EF-016, CR-EF-027, and CR-EF-023
  (self-contained in the updates-due module).
- **Bug, own path**: CR-EF-026 — diagnose from data before writing any code.

## Parked integrations (mirrored in FF-001 §M12, held in the ops registry)

Reconciled into the tracked file 2026-08-17 from the same never-committed series.

**INT-001 — Outlook calendar integration.** Built 2026-08-15 (L6, real OAuth) by
a concurrent session without a CR at the time. Merged to main+staging 2026-08-17
alongside this session's design-parity/monthly-calendar work — production live,
not just staging. FF-001 §M12 needs confirming it reflects this.

**INT-002 — Native Bookings picker.** Custom Microsoft Bookings date/time picker
via Graph API, replacing the iframe modal; needs Azure AD app registration +
admin consent (registry deferred `dmsk355ygro`). Still unscoped as its own Work
Order.

## Outstanding process gap

This project has no confirmed live `project_id` in `decoded-ops-hub`'s `tasks` table
from this session, and no DB/API access was verified here. CR-EF-002 (contact-form
spam) is a genuine bug and should be logged there with `task_type=bug` once that's
confirmed — flagging rather than guessing at hub credentials or another app's data.

**Register-history gap — RESOLVED 2026-08-17.** An earlier CR-EF-001 through
CR-EF-005 series (workout-surface consolidation, PWA installability, a stale
webmanifest string, band-colour prescription, and a retro-captured
workout-from-template feature) existed only in the shared checkout's working
tree (`D:\apps\eternal-fitness-website\.context\change-requests.md`), never
git-committed — invisible to the SEO-audit session that bootstrapped this
file fresh and collided on IDs (not content). Reconciled into this file as
CR-EF-011 through CR-EF-015 plus the parked-integrations section, same day.
The stale webmanifest string (CR-EF-013) was fixed in the same pass. The
shared checkout's uncommitted copy is now safe to discard — everything in it
has a home here.
