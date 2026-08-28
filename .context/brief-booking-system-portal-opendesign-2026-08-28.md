# Open Design brief — Portal booking flow (CR-EF-097, unit u1a)

## Context
Eternal Fitness client portal (`app/portal/(protected)/`). Existing clients log in with portal auth (separate from staff hub auth). Today there is no way for a client to book/reschedule a session themselves — all booking currently flows one way from Outlook into the hub. CR-EF-097 replaces the Microsoft Bookings dependency with a native flow.

## What to design
A new portal screen (or panel on an existing screen — designer's call) where a logged-in client can:
1. See their current training block's sessions — booked (date/time) and not-yet-booked, matching the block/session/workout model already in the app (a block is a dated period, a session is a booked slot whose identity is date+time, a workout attaches to a session on the day).
2. Pick a date/time for an unbooked session from Esther's genuinely free slots.
3. Reschedule an already-booked session to a new slot (subject to the same availability rules).
4. See a clear "not available" state for slots that collide with anything on Esther's calendar — including things Esther has booked directly into Outlook that have nothing to do with this client (personal appointments, other clients, anything). The availability check is calendar-truth, not just our own `sessions` table — do not design an interaction that could let two things land on the same slot.
5. Cancellation is out of scope for this brief (existing cancel flow stays as-is) — booking and rescheduling only.

## Design constraints
- Match `app/design-system.css` / the client-portal design language already established in this project (`ef-client-portal`), not the marketing site's.
- Mobile-first — most clients will do this on a phone. Existing portal PWA patterns apply.
- Should feel like "book a slot with Esther", not like a generic calendar app — Esther's real specialism (personal training) and the small number of daily slots should come through in tone/copy, not clinical scheduling-software copy.
- Do not design the underlying availability-check plumbing (that's an engineering unit) — but the UI needs states for: loading availability, no slots available this week, slot selected, booking confirmed, booking failed/slot taken (race condition where two people grab the same slot at once — needs a clear retry/reselect state).

## Out of scope for this brief
- The public discovery-call intake form (separate brief, separate project — marketing site facing, not portal).
- Any hub-side (Esther-facing) screen changes — the existing client-profile booking panel already covers Esther's view of inbound bookings.
