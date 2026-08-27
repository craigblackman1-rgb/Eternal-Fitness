# Design brief: consolidated booking view/assign/manage surface (for Open Design)

**CR:** CR-EF-095 · **Rides:** `wo-ef-consolidated-2026-08-27` Lane B
**This is a new/extended hub surface, not a restyle** — no "it's just a list" exemption per this
project's standing rule (same precedent as CR-EF-048's endurance block editor, CR-EF-050's
reconciliation queue).

---

## The problem, in one paragraph

A real, live production bug (CR-EF-095, found and root-caused 2026-08-27) has already been fixed
at the data/logic layer: Outlook bookings now attach to a client's next unbooked planned session
instead of piling up as stray numbered sessions, and a moved Outlook appointment now propagates
its new date onto the already-attached session. Those two backend fixes are shipped and live —
**this brief is NOT about that logic**, it's about the surrounding UI, which is currently split
across two disconnected queues and has no per-client view at all:

- `/hub/schedule/outlook` (`hub-schedule-outlook.html`) — unmatched-booking reconciliation queue
- `/hub/schedule/outlook/duplicates` (`hub-schedule-outlook-duplicates.html`) — collision queue
- **Nothing** on the client's own profile page shows their own bookings that are still ambiguous
  or unassigned — Esther has to go hunting in the generic queue even when, as Craig put it,
  "the majority of them are linked to an existing person" already.

## What to design

### 1. Client-profile booking panel (new — Craig's idea, 2026-08-27)

On each client's own profile page, show that client's Outlook bookings that are matched to them
but not yet resolved into a session (ambiguous block pick, or genuinely still open). This is a
**filtered view of the same underlying queue**, not a parallel data source — reuse
`hub-schedule-outlook.html`'s row pattern (raw event subject, date/time, confirm/dismiss/pick-block
actions) scoped to one client, so the two views can never drift apart. Most of the time this panel
should be empty or absent entirely (nothing to show); when there's something to resolve, surface it
prominently near the top of the client record, not buried in a tab.

### 2. Consolidate the two schedule-level queues into one entry point

`hub-schedule-outlook.html`'s tab bar already links "Outlook bookings" and "Possible duplicates" —
keep that shared tab-bar pattern, but the badge/count on `/hub/schedule` (`hub-schedule.html`'s
`#outlookBtn`) should reflect BOTH queues combined, not just the unmatched one, so Esther has one
number to check rather than two.

### 3. Correct stale copy in the integrations settings mockup

`desktop/settings/hub-settings-integrations.html` currently states the sync is "one direction
only... nothing created in Outlook comes back the other way" (lines ~216, 251, 271, 339). That's
now inaccurate — a moved Outlook appointment DOES propagate back onto an already-attached session
(shipped 2026-08-27). Update this copy to describe the real, narrower truth: Outlook is
authoritative for the *date* of a booking once matched, but the app never creates/deletes events
on its own initiative outside the sessions it manages. Get the wording right rather than either
overclaiming or leaving the old false claim in place.

### 4. Mobile parity

`mobile/calendar/hub-m-calendar.html` already sketches an "Outlook-triage confirm" pattern
(referenced at line ~386, ~391) and `index.html`'s nav references `/hub/m/sessions/new` doing
"client + block pick is the phone-hard part" — extend that existing mobile intent to also cover
the client-profile panel's mobile equivalent (client detail screen), not just the booking flow.

## What NOT to design

- No changes to the underlying attribution/reschedule LOGIC — that's shipped code, not a design
  question. This brief is UI/surface only.
- No design for auto-cancellation-on-Outlook-deletion — that decision hasn't been made yet (see
  Open decision below); don't design UI for a behaviour that might not exist.
- No changes to `hub-schedule.html`/`hub-schedule-month.html`'s day/month calendar views
  themselves beyond the shared badge count described above.
- No design for the Microsoft Bookings client-facing form itself (Microsoft's own UI).

## Open decision — do not assume an answer

Craig has not yet decided what happens when a booking that's already attached to a session
disappears from Esther's Outlook calendar (deleted/cancelled on her side). This might end up
needing its own small UI (e.g. "this session's booking vanished from Outlook — confirm cancel?"
surfaced in the same queue pattern) once that decision is made — flag it as a likely v2 addition
rather than designing blind for it now.

## Design system

Use the real EF hub token set (`--color-ink/cream/warm/rose/teal/amber`, `HubCard`, `StatusBadge`,
existing queue/tab-bar/accordion patterns already in `D:\apps\design-systems\ef-control-hub\`) —
extend the existing schedule/dashboard visual language, don't introduce a new one.

## Evidence base

- `.context/change-requests.md` CR-EF-090/091/094/095 (this project's own register) for the full
  mechanism history and what's already shipped.
- Live production example (2026-08-27, now repaired): Becky Price's Block 1 had 8 Outlook bookings
  scattered as stray sessions 5–12 while 4 real planned sessions sat unbooked — the exact confusion
  this surface exists to prevent from recurring and to make legible when it does.
