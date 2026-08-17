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
| CR-EF-016 | Client list should default to alphabetical (A–Z) order, not newest-first | CR (usability, S) | built | 2026-08-17 | Verified: `app/hub/(protected)/clients/page.tsx:13` ordered `created_at` descending. Mobile `/hub/m/clients` was already alphabetical (`page.tsx:96,181`) — desktop was the only gap. Fixed: query now orders by `name` ascending; the table's existing click-to-sort (`clients-table.tsx:50-51`) is unaffected. Verified live via the hub (A–Z from Amanda through Steph White). |
| CR-EF-017 | Notes section on the client profile front page in the mobile PWA — capture "spoke to X" / free-text notes against a client, timestamped | CR (functionality) | raised | 2026-08-17 | Verified: `clients` has **no** notes column in any migration. The only note stores are `trainerize_client_notes` (imported historical, read-only) and `blocks.block_note` (per-block). Needs a new timestamped `client_notes` table + surfacing on `/hub/m/clients/[id]` (front page, above the fold) and on the desktop client page. Schema + Open Design brief before build. **Re-checked 2026-08-17 after the CR-EF-024 correction** (see accuracy note below) — no existing notes module was missed. The one near-miss: `client_tracker.notes` (`20260519_medical_clearance_tracker.sql`) is a single free-text blob on a **legacy, name-keyed** table that no app or component code references at all. Do not reuse it — it has no `client_id` and no per-entry timestamp, which is the whole point of this CR. |
| CR-EF-018 | Single-sided (unilateral) exercises must always be prescribed and logged per side — Left / Right | CR (functionality) | raised | 2026-08-17 | **Scope settled (Craig, 2026-08-17, `qmsxbh95t0x`): always-on for a known unilateral list.** Not a per-exercise flag Esther maintains, and not a per-prescription toggle — a movement on the unilateral list *always* splits L/R, with no way to turn it off per prescription. Implies a curated list is the first deliverable: derive a candidate set from the `exercises` table (the Trainerize-seeded library) and have Esther confirm it, since a wrong list silently changes how sets are prescribed. Touches `lib/prescription.ts`, the Session Editor, the PWA Train Screen, and the `set_logs` shape (a set becomes two sided rows — check the existing logging/history readers don't double-count volume). Rides CR-EF-011's mockups. |
| CR-EF-019 | Audible alert when the rest timer reaches zero | CR (functionality, S) | raised | 2026-08-17 | Verified: there is **no** audio anywhere in the app — no `new Audio`, `AudioContext`, or `navigator.vibrate` in `app/hub`, `components/hub` or `lib`. The rest timer (`app/hub/m/train/[sessionId]/TrainScreen.tsx:294-317`) is visual only. Implementation note: iOS PWA blocks un-gestured audio, so the sound element must be primed on the user's "start rest" tap; add a `navigator.vibrate` fallback for silent mode. |
| CR-EF-020 | Option to change rest times | CR (functionality) | raised | 2026-08-17 | Verified: rest length is derived from the prescription string via `parseRestSeconds()` and falls back to a hard-coded `60` (`TrainScreen.tsx:990`, `:1004`). There is no in-session override, no per-exercise default and no per-client default. Scope to settle: adjust-for-this-set-only vs. edit the prescription. |
| CR-EF-021 | Edit button against each exercise inside session logging | CR (usability) | raised | 2026-08-17 | Verified: the only edit path today is the whole-session sheet at `/hub/m/train/[sessionId]/edit` — nothing per-exercise inside the logging flow. Same surface as CR-EF-011's consolidation, so it belongs in those mockups rather than being bolted on first. |
| CR-EF-022 | Client account start date shown against the profile | CR (functionality, S) | raised | 2026-08-17 | Verified: `clients` has **no** start-date column — the nearest existing fields are `block_expiry_date` and `trainerize_training_blocks.start_date` (imported history only). Needs a column, an intake-form field, backfill for existing clients, and display on both the desktop and PWA profile. |
| CR-EF-023 | Update interval — allow an explicit date, or an arbitrary number of weeks | CR (functionality) | built | 2026-08-17 | Verified: `lib/updates-due.ts:9` was a fixed enum (`4_week` / `6_week` / `12_week` / `6_session` / `flexible`) with `INTERVAL_DAYS` = 28/42/84. Built: two new interval modes, `custom_weeks` (N weeks from last send, same recurring pattern as the presets) and `fixed_date` (a date Esther pins directly, doesn't auto-advance). Code changes: `lib/updates-due.ts`, `lib/updates-due-db.ts` (query widened + `LEFT JOIN`), `UpdateIntervalControl.tsx` (weeks/date inputs shown conditionally), `page.tsx`, reminder email shows the actual week count. `supabase/migrations/20260817_update_interval_custom.sql` **run against prod 2026-08-17** with Craig's go-ahead, via `scripts/run-update-interval-migration.mjs` (transaction-wrapped, before/after schema checked, committed clean — `update_interval_weeks`/`update_interval_next_date` columns added, CHECK constraint widened, client row count unchanged at 21). Both new dropdown options confirmed live in the hub. |
| CR-EF-024 | Quick-action task on the client page — **PWA only; the desktop already has it** | CR (functionality, S) | raised | 2026-08-17 | **Scope settled (Craig, 2026-08-17, `qmsxbh96xbu`): EF-local tasks only — no `decoded-ops-hub` mirror.** **Correction, same day (Craig):** the hub already has a full tasks module — this CR originally and wrongly proposed building one. What exists: `tasks` table (`20260725_hub_tasks.sql`) with status/assignee/due_date, `task_buckets`, a `client_id` FK added `20260801_hub_tasks_client_link.sql`, `GET/POST /api/tasks` with `?client_id=` filtering, a kanban at `/hub/tasks`, and `ClientTasksPanel.tsx` **already rendered on the desktop client page** (`clients/[id]/page.tsx:10`) with an inline "Add task" quick-add (title field, Enter to save, `:205-244`). The genuine gap is the **mobile PWA**: tasks appear on the Today screen (`app/hub/m/page.tsx:77-87`) but the PWA client profile (`app/hub/m/clients/[id]`) has no tasks panel and no quick-add at all. So this is reuse + one PWA surface, not new schema. Pairs with CR-EF-017 (notes) — same screen, same one-tap-capture intent, design together. |
| CR-EF-025 | Client status | — | **closed — not wanted** | 2026-08-17 | Craig, 2026-08-17 (`qmsxbh982vf`): ignore. No work to do. Recorded rather than deleted so it isn't re-raised: `clients.client_status` exists in the schema (`active` / `inactive` / `completed` / `suspended` / `archived`) and remains deliberately unsurfaced — the client list's visible status filter is `compliance_status` (`clients-table.tsx:12-17`), which is the one that matters operationally. |
| CR-EF-026 | [BUG] Colin and Saffron show PAR-Q not signed, but their PAR-Qs are signed | Bug | built | 2026-08-17 | Root-caused as two different bugs with the same symptom (diagnosed live against production data via the hub, not `psql`; `lib/compliance.ts:31-38`). **Colin (#18):** compliance was quietly satisfied by a **legacy `signed_parq` row**, invisible on the Document Register, which only ever listed `client_documents` rows — his one visible PAR-Q line read "Sent," reasonably misread as unsigned. **Fixed:** `page.tsx` now builds a synthetic read-only "Legacy record" row (`legacyDocumentRows`) whenever compliance is satisfied via `latestParq`/`latestAgreement` with no matching signed `client_documents` row, and `DocumentRegister.tsx` renders it with no View/Open/delete actions (nothing to open) and a distinct "Legacy record" pill. Verified live: Colin's register now shows the legacy PAR-Q alongside the still-"Sent" one. **Saffron (#12):** a stale, never-completed "Sent" PAR-Q sat next to her real signed scanned original with no relationship shown, unlike Client Feedback documents on the same page which do get marked `Superseded`. **Fixed:** both places a document can become `signed` — `app/api/documents/upload/route.ts` (scanned uploads are always created signed) and `app/api/documents/[id]/sign/route.ts` (the in-app signing flow, used far more often) — now supersede any other `draft`/`sent` row of the same `kind` for that client in the same request. **Backfilled** the existing stale data with `scripts/backfill-supersede-stale-documents.mjs` (dry-run first, then `--apply`, transaction-wrapped with a post-update recheck): found and fixed exactly 2 rows across all 21 clients — Saffron's PAR-Q as expected, plus a second instance the diagnosis hadn't caught, Sam Gibbons' stale draft Personal Training Agreement. Verified live: Saffron's old PAR-Q now shows `Superseded`. `npx tsc --noEmit` clean throughout. Still belongs in the hub bug tracker once `project_id` is confirmed — not a registry blocker, just unmirrored. |
| CR-EF-027 | Session log should list in date order, be sortable, and be orderable by session number | CR (usability) | built | 2026-08-17 | Verified: `app/hub/(protected)/clients/[id]/page.tsx:125-131` pulled sessions across **all** of a client's blocks ordered by `session_number` descending, capped at 50 — so session 12 of block 1 interleaved with session 12 of block 3, no date ordering, no sort control. Fixed: server query now orders by `scheduled_at` (a real, sortable column — `completed_at` lives inside `data` JSONB and can't be ordered at the DB level); `TrainingTabContent.tsx`'s Session Log table now has clickable Date/Session headers with a client-side sort (Date = completed-or-scheduled, descending default; Session = block number then session number, so it doesn't reintroduce the interleaving bug). Also fixed in passing: `latestSessionLog` (drives the "Last Session"/"Last check-in" cards) used to blindly take `sessions[0]`, which under the new date-desc ordering could pick an upcoming uncompleted session; now derived by scanning for the session with the latest `completed_at`, independent of array order. Verified live against Emma Atkinson (#8, two blocks): Session sort correctly yields Block 1·S1→S3 then Block 2·S1→S2; Date sort correctly clusters dated sessions with an interleaved undated-but-scheduled row explained by the scheduled_at fallback. The mobile PWA (`app/hub/m/clients/[id]/page.tsx`) needed **no fix** — its "Recent sessions" card already sorts by `completed_at` in memory (`:227-234`); the missing `.order()` was only on the raw query, which never reached the user unsorted. It's a top-5 glance card by design, not a full sortable log, so no PWA change was made. |

## CR-EF-016 – CR-EF-027 — raised by Craig, 2026-08-17

A single hub/PWA usability pass raised verbally in chat and captured here the same
day. Every row above was checked against the shipped code before being written —
the "Verified:" notes are file/line reads, not assumptions.

**All three open questions answered by Craig the same day** (`wo answer`
`qmsxbh95t0x` / `qmsxbh96xbu` / `qmsxbh982vf`): CR-EF-018 is always-on for a
known unilateral list, CR-EF-024 is EF-local tasks only, and CR-EF-025 is closed
as not wanted. Nothing in this batch is gated on a decision any more — eleven
live items, one closed.

**Register-accuracy note, 2026-08-17.** CR-EF-024 as first written proposed
building a client task system. Craig corrected it the same day: the hub tasks
module already exists and is already on the desktop client page. The row now
reflects the real, much smaller gap (the PWA client profile). Worth carrying
forward as a caution for this register: an item phrased as a feature request
("quick action task on client page") can be a *placement* gap on one surface
rather than a missing capability — check both the desktop and PWA surfaces
before sizing anything in this batch. CR-EF-025 turned out the same way (the
column already existed).

**Clustering for execution** — these should not become twelve separate pieces of work:

- **Rides CR-EF-011's workout-surface consolidation** (same screens, same mockups
  still pending): CR-EF-018, CR-EF-019, CR-EF-020, CR-EF-021. Building any of
  them before those Open Design briefs exist risks work that the redesign then
  throws away — the same trap already flagged on CR-EF-015.
- **Client profile / record shape** (schema + both profile surfaces):
  CR-EF-017, CR-EF-022, CR-EF-024. Now three items, not four — CR-EF-025 is
  closed. CR-EF-017 (notes) and CR-EF-024 (tasks) share a surface and an intent
  and should be designed as one pass.
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

## Decisions — 2026-08-17 (later), Craig

Cleared in one sitting with Craig ("yes to all", then "items 3 deferred until
further notice"):

- **CR-EF-011 consolidation — unblocked.** G1 (naming story) and G3 (desktop
  Session Editor keeps its inline logger — the single desktop logging surface)
  approved. G2 mockups to verify against the Open Design briefs already in
  `D:\apps\design-systems\ef-control-hub`. L3/L4/L6 were already built by
  concurrent sessions (`62026f4` desktop consolidation, `22ff6c9`
  templates-browser + paste-and-assign, `1a07d34` portal PWA — `portal.webmanifest`
  + `portal/sw.js` confirmed present, superseding the stale "portal PWA not built"
  note on CR-EF-012).
- **Approved to build:** CR-EF-019 (rest-timer sound), CR-EF-020 (rest-time
  override), CR-EF-021 (per-exercise edit), CR-EF-017 (client notes), CR-EF-022
  (start date), CR-EF-024 (PWA tasks panel).
- **Deferred until further notice:** blog repositioning migration (scope-of-works
  §2.5), hub nav restructure (§2.6), GDPR DPA signature + ICO registration (§2.2),
  CR-EF-014 (band colour→tension — needs Esther), CR-EF-018 (unilateral L/R curated
  list — needs Esther).
- **Still needs Craig (manual, not deferred):** §1.1 WAL/PITR archive gap, §1.2
  staging shares live email creds, §4.2/§4.4 branch & worktree cleanup.

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
