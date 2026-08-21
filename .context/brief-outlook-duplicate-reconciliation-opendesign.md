# Design brief: Outlook duplicate-event reconciliation queue (for Open Design)

**CR:** CR-EF-028 · **Rides:** `wo-ef-consolidated-2026-08-20` Lane H
**Reuses the same interaction pattern as CR-EF-050's Bookings queue** (`hub-schedule-outlook.html`,
already built and live at `/hub/schedule/outlook`) — this is its mirror image: instead of an
Outlook event with no app session, this is an app session about to create a *second* Outlook
event when Esther already has one of her own.

---

## The problem, in one paragraph

Esther has a long-standing habit of manually typing shorthand notes into her Outlook calendar for
recurring clients ("Emma", "Ian", "Sarah", "Monique" — going back to 2022 in some cases). The app
also automatically pushes its own event for any session with `scheduled_at` set
(`lib/calendar-sync.ts`, subject format `"{client} — Session {N}"`). When both exist for the same
real appointment, Esther's calendar shows two overlapping blocks for one booking. A live diagnostic
(2026-08-21) found this affects 5 of 12 currently-synced sessions (42%) — Emma Atkinson and Monique
Weardon across 4 separate dates — every case with the personal note pre-dating the app's own event.

## What to design

A second reconciliation queue, following the exact visual/interaction language of the just-shipped
Bookings queue. Two placement options for Open Design to propose and pick between (state which and
why): (a) a second tab/section on the existing `/hub/schedule/outlook` page ("Outlook bookings" /
"Possible duplicates"), or (b) its own page reachable from the same route-in badge area. Either way,
reuse `HubCard`, the row/action-button language, and the badge-count pattern already established —
no new visual dialect.

Per row (a session that's about to sync but has a same-day, name-matching pre-existing Outlook
event): show the client name + scheduled time, the **existing** Outlook event's subject (so Esther
can sanity-check it's really the same appointment, not a coincidence), and two actions:

1. **Link — adopt the existing event.** The app's session takes over that event (same "adopt, don't
   duplicate" mechanism CR-EF-050 already uses via `session_calendar_events`) instead of creating a
   new one. No visual change to Esther's calendar.
2. **Keep separate — these are different things.** Confirms the collision is a false positive (e.g.
   two different clients who happen to share a first name); the normal push-sync proceeds and
   creates its own event as usual.

Until Esther resolves a row, that session's push-sync is paused (no new event created) — the whole
point is nothing happens to her calendar silently. A count badge should be visible wherever the
Bookings queue's badge already lives.

## What NOT to design

- No changes to the Bookings queue's existing rows/logic — this is an addition, not a rework.
- No design for auto-resolving anything — every row requires Esther's explicit choice, per Craig's
  decision (an auto-adopt option was considered and rejected: a wrong first-name match could
  silently overwrite a personal note she wanted kept separate).

## Design system

Same EF hub token set as the Bookings queue (`--color-rose/teal/amber`, ink/body/muted, `HubCard`,
`StatusBadge`) — this should read as an extension of the same feature, not a new one.
