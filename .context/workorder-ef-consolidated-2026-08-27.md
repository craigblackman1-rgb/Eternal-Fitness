# Work Order: Eternal Fitness — Consolidated 2026-08-27

**Slug:** `wo-ef-consolidated-2026-08-27`
**Status:** ACTIVE
**Owner:** unclaimed (registered from Craig's 2026-08-27 session)
**Apps:** eternal-fitness-website
**Supersedes:** `wo-ef-consolidated-2026-08-20` (open deferred/questions reparented here; that WO's UNITS were already reconciled 2026-08-25, `ec57b88`)
**Scope:** All outstanding Eternal Fitness hub/app work as of 2026-08-27 — the new Outlook-booking attribution problem + label bugs Craig reported today, the unpromoted Lane L work, and every open deferred item inherited from the 2026-08-20 WO. Marketing-site copy items are listed but explicitly parked (Lane F).

---

## DONE (definition)

- [ ] "null · Session" labels no longer appear anywhere a session renders (desktop block page, schedule, mobile calendar/Today) — verified live on prod with Emma's and Becky's real rows.
- [ ] A booking arriving via Outlook (Bookings widget or Esther's hand-added entry) is attributed to the client's existing block **sensibly**: date-ordered assignment to the next unbooked planned session where one exists, with a simple designed view/assign/manage surface on desktop AND mobile for the ambiguous cases. Built against an approved Open Design mockup.
- [ ] CR-EF-092/093 (Lane L: bulk templates scoping, ExercisePicker, TrainScreen hydration fix) promoted staging → main, register rows flipped, live-verified.
- [ ] Every inherited deferred item below is either done, re-deferred with a reason, or explicitly killed by Craig.
- [ ] Register hygiene: CR rows for everything here (CR-EF-094/095 added this pass), statuses accurate, `wo` registry updated at each lane close.

---

## LANES

### Lane A — [AUTO] Session-label bugs (bugs, fast path — no mockup needed)

**CR-EF-094.** Root causes already confirmed in code this session:

1. **"null · Session" pill.** `app/hub/(protected)/clients/[id]/blocks/[blockId]/page.tsx:285` builds `archetypeLabel` as `` `${session.archetype} · ${archetypeName || "Session"}` ``. Outlook-materialized sessions are inserted with `archetype: null` (`lib/outlook-bookings.ts:162`), so the pill renders the literal string "null". Fix: null-safe label — when `archetype` is null, render the session's `focus_label` (which for these rows is already "Outlook booking — {name}") or a plain "Session" pill, never string-interpolate a null. Sweep every other render site that assumes archetype is non-null: `schedule/ScheduleCalendar.tsx` (line ~293 guards with `entry.archetype &&` — OK), `app/hub/m/calendar/page.tsx`, mobile Today, client Training tab, session detail header. Grep for `archetype` interpolations rather than trusting this list.
2. **Emma 24 Aug "view and scheduled" oddity.** Session shows "null.session" in the list but "view / unscheduled(?)" wording inside. Reproduce on prod (client Emma, w/c 24 Aug), determine whether it's the same null-archetype row plus a status-copy mismatch, fix the copy.
3. **VERIFY:** live click-through on prod for Emma's and Becky's rows, desktop + mobile, after deploy. Screenshot evidence in ledger.

### Lane B — [GATE→AUTO] Booking→block-session attribution + manage surface (CR-EF-095)

The core design problem Craig raised 2026-08-27. Current behaviour: `materializeBookingSession()` (`lib/outlook-bookings.ts:139-189`) always **appends** a new content-empty session at `max(session_number)+1`. It never considers that the block may already contain planned sessions (1–4 in Becky's draft block) that have content but no date — so a booking that should *be* session 1's date becomes a stray "session 6" with no content, while sessions 1–4 sit "not yet booked" forever.

**Target model (proposal, for Craig/design to confirm):** a booking matched to a client with an active/draft block should be offered against the block's **next unbooked planned session in session_number order** (date-ordered bookings → session-ordered slots). Auto-attach when unambiguous; a simple assign screen when not. The existing append-a-new-session behaviour remains the fallback when the block has no unbooked sessions left.

Units:
1. **[GATE] Product decisions (queued as `wo ask`, batched):**
   - Auto-attach a booking to the next unbooked planned session, or always human-confirm the pairing? (Auto is consistent with CR-EF-090's "a calendar entry already is a confirmed booking"; but attaching to *content* is a bigger claim than creating an empty one.)
   - What happens on reschedule/cancel in Outlook after attachment?
   - Should the block's "Session N of M · not yet booked" rows offer a "book this" path outward (to Bookings / to a date picker), closing the loop from the other side?
2. **[GATE] Open Design mockup** — desktop + mobile — for the unified view/assign/manage surface. This consolidates: `/hub/schedule/outlook` (Bookings queue), `/hub/schedule/outlook/duplicates`, and the new assign-to-planned-session flow, so there is ONE place to see incoming calendar reality vs. block plans. Brief to reference existing `hub-schedule-outlook.html` / `hub-schedule-outlook-duplicates.html`. No build before mockup approval (no exemptions).
3. **[AUTO once gated] Build** — dispatch to OpenCode lane(s) per DO-SOP-010; `materializeBookingSession()` gains the attach-to-existing-session path; UI per mockup; mobile parity.
4. **[AUTO] Data repair pass** — after the model ships, the already-materialized stray sessions (Becky's "session 6", Emma's, and the other ~112 auto-confirmed from 2026-08-25) need a review: which should be merged onto planned sessions vs. stand alone. Script with dry-run default; destructive merge is a GATE.
5. **VERIFY:** real Bookings event end-to-end on staging (staging Microsoft integration must stay disconnected from Esther's real account — use a test calendar), then prod behind Craig's go-ahead.

### Lane C — [GATE] Lane L promotion + CR-EF-092 decisions

1. **[GATE] Promote staging → main:** CR-EF-092 scoping/bulk-template groundwork, CR-EF-093 ExercisePicker, TrainScreen hydration fix (`claude/merge-lane-l-2026-08-25` merges, already on staging). Diff staging..main first (other sessions' work may ride along — standing rule). Craig's go-ahead required (client-facing).
2. **[GATE] CR-EF-092 open decisions** (already queued as `dmt8rf4wkdn` + wo ask): dedup strategy, auto-name convention (no PII), review-screen-before-commit or not. Needs the live data audit (hash sessions by structure, count natural duplicates) BEFORE Craig decides — run the audit read-only now, present numbers with the ask.
3. **[AUTO] After promotion:** flip register rows 092/093 from "raised — scoped" to reflect reality; verify hydration fix closed `dmt799jrk5j` and resolve it.

### Lane D — [AUTO/mixed] Inherited open items (from wo-ef-consolidated-2026-08-20)

| # | Item | Tag | Ref |
|---|---|---|---|
| D1 | Run `scripts/backfill-exercise-uid.mjs` + verify session-transitions logic against prod (and staging DB — migrations run twice) | [AUTO] | `dmszsvmdqdq` |
| D2 | Add Long-Lever Plank + Weighted Plank to `/hub/exercises` — **blocked on Esther's two video URLs** | [BLOCKED] | `dmt8mu6s2da` / `dmsyybn07vc` |
| D3 | Staging: swap off live email credentials / scrub real client data | [GATE] (infra creds) | `dmsm7yawu20` |
| D4 | CR-EF-091 fast-follow: render genuinely-unmatched personal Outlook entries (staff meetings, "LONDON", blank) as plain calendar blocks on `/hub/schedule` + mobile Today — true 1:1 Outlook parity. Fold into Lane B's mockup so it's one design pass. | [AUTO after Lane B mockup] | CR-EF-091 note |
| D5 | Regression check: does a newly auto-created session produce a duplicate Outlook event on next push-sync? (flagged 2026-08-25, never verified) | [AUTO] | handoff 2026-08-25 |
| D6 | `parseClientNameFromSubject` misses `"Online Personal Training - {name}"` pattern (anne wareing case) | [AUTO] | CR-EF-090 note |
| D7 | Orphaned Postgres auth attempts from nonexistent role `dataapp_app` hitting the EF DB — grep n8n/data-app configs | [AUTO] | `dmt6vuahvfv` |
| D8 | Open Design "EF Endurance Block Editor (CR-EF-048)" project visibility check | [AUTO] | `dmt0ix0gewn` |
| D9 | Client portal PWA: reuse staff PWA client-mode screens or own build — revisit now trainer PWA client-mode has shipped | [GATE] | `dmt2qo93nzo` |
| D10 | CR-EF-006 register reconcile (testimonial JSON-LD live on main vs register) — answer already queued | [GATE] | `qmt8mne5c58` |

### Lane E — [AUTO] Hub workout-parity remnants (from workorder-hub-workout-parity-2026-08-19)

1. Training-blocks list (`PlanScheduleTable.tsx`): status-map fix (block vocab incl. Do Not Train), Programme + Progress columns, avatar, Open/Review/Continue action link.
2. Workout-templates deeper parity: detail drawer + assign-from-browser, paste 3-step stepper + success pane + save dialog, start-blank entry, difficulty→Seated/Supported/Standing.
3. Derived Est. duration on session screen (still static "~N min · guide").
4. Styling remnants: back-link labels, avatar initials, cancelled-row dimming, archetype label-map ("Mobility & Movement Quality" everywhere).
   — Check each against current main first; some may have landed via CR-EF-079/Lane L since the 19 Aug audit.

### Lane F — [PARKED] Marketing-site items (listed so they're not lost; no action this WO)

- Blind-fitness/cancer-rehab specialist copy — blocked until host page exists (`dmsiv5xw7ok`).
- Specialist Training catalogue + Blog restructure — deferred post-launch (standing).
- Google Business Profile share link swap in FeaturedReviewedBand (waiting on Craig's link).

---

## LEDGER

- 2026-08-27: WO created. Root causes for CR-EF-094 (null·Session label) and CR-EF-095 (booking attribution) confirmed in code same session: `blocks/[blockId]/page.tsx:285` + `lib/outlook-bookings.ts:139-189`. CR rows added to register. Open items reparented from `wo-ef-consolidated-2026-08-20`; that WO closed as superseded.
