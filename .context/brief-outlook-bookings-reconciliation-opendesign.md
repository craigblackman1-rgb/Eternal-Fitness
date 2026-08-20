# Design brief: Outlook Bookings reconciliation queue (for Open Design)

**CR:** CR-EF-050 · **Rides:** `wo-ef-consolidated-2026-08-20` Lane G
**Evidence base:** live diagnostic run 2026-08-20 (`scripts/diagnose-outlook-bookings-gap.mjs`,
read-only, real connected Outlook calendar) — see CR-EF-050 in `.context/change-requests.md`
for the full numbers. This is a **new hub surface**, not a restyle — no "it's just a list"
exemption per this project's rule (same precedent as CR-EF-048's endurance block editor).

---

## The problem, in one paragraph

Clients book personal-training sessions through a Microsoft Bookings form. Those bookings land
directly in Esther's Outlook calendar — the same calendar the app already syncs *to* (one-way,
app→Outlook only) — but the app never reads anything back. A Bookings appointment has no
corresponding `sessions` row, so it's invisible on `/hub/schedule` and doesn't show against the
client's record. The diagnostic found 17 real Bookings appointments across 7 clients sitting in
Outlook with zero trace in the app, over just the next 60 days.

The fix isn't fully automatic — a Bookings appointment's Outlook event carries no reliable link
to an existing `blocks`/`sessions` row (which block? which session number? what exercises?), and
the client's real email never appears on the event (organizer/attendees are internal addresses
only — the shared Bookings mailbox and Esther herself). What **does** identify the client
reliably is the event **subject**, formatted `"Personal Training - {client name}"` /
`"Initial consult - {name}"` — parsing the name out of that string and matching it against
`clients.name` correctly identified all 7 real clients in the diagnostic (0/17 would have
matched by email). So this needs a human-in-the-loop reconciliation step: surface the unmatched
Outlook events, propose the name match, let Esther confirm (or search/link manually), and only
then create/attach a `sessions` row.

**Important noise to filter, not surface:** the same calendar also carries ~200 of Esther's own
long-standing personal Outlook entries in the same window (single first names like "Ian"/
"Emma"/"Sarah", plus "0FF"/"BLOCK OUT"/blank subjects, some dating to 2021) — pre-existing usage
unrelated to Bookings or the app. The reconciliation queue should only ever surface events whose
organizer is the Bookings mailbox (`EternalFitnessBookings@eternal-fitness.co.uk`) — don't design
a UI that would drown Esther in her own calendar noise.

---

## What to design

A **reconciliation queue** — reachable from `/hub/schedule` (near the existing day/month
calendar toggle, `hub-schedule.html`/`hub-schedule-month.html` are the existing mockups for that
surface) — showing Outlook Bookings appointments that don't yet have a matching `sessions` row.
Per event, three states:

1. **Auto-suggested match** — the parsed name matched exactly one `clients` row. Show the
   proposed client, date/time, and a one-click **Confirm & create session** action (plus a way
   to pick a different client if the suggestion is wrong).
2. **Ambiguous / no match** — the parsed name matched zero or more than one client. Needs a
   manual client search-and-link control, same visual language as any other client-picker
   already in the hub (e.g. the client search used when starting a new document/block).
3. **Dismissed** — Esther can mark an event as "not a client booking" (covers edge cases the
   organiser-filter doesn't catch) so it stops reappearing in the queue.

Each queue row needs: date/time, the event subject as-is (so Esther can sanity-check against
what she'd expect), and the action controls above. A count badge (e.g. "3 unmatched") should be
visible from the schedule page itself, not just inside the queue — same pattern as the existing
dashboard alert badges.

**Once confirmed**, the flow needs to ask *which block* the session belongs to (a client can have
more than one active block) — reuse whatever block-picker pattern already exists on session
creation flows (`AddWorkoutDialog.tsx`'s block context, or the training-blocks list). Don't
invent a new block-selection pattern for this one surface.

## What NOT to design

- No changes to `hub-schedule.html`/`hub-schedule-month.html`'s existing day/month calendar
  views themselves — this is an additional panel/page, not a rework of those.
- No design for the Microsoft Bookings form itself (that's Microsoft's own UI, out of scope) —
  this is purely the reconciliation step inside the hub.
- No design for the "native Bookings picker" (INT-002 in the CR register) — that's a separate,
  smaller, unscoped integration replacing the client-facing booking widget. Don't conflate it
  with this reconciliation queue.

## Design system

Use the real EF hub token set (`--color-ink/cream/warm/rose/teal/amber`, `HubCard`,
`StatusBadge`, existing accordion/queue patterns already in the hub mockup set at
`D:\apps\design-systems\ef-control-hub\`) — match the existing schedule/dashboard visual
language, don't introduce a new one for this single surface.
