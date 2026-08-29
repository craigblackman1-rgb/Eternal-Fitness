# Design brief — CR-EF-099: Bookings/workout model, "once and for all"

**Status:** approved CR, Design stage. Mockup required before any build (Design Parity Gate).
**Raised:** 2026-08-29, Craig, live-testing Tom Putnam's block.
**WO:** wo-ef-session-save-band-notes-2026-08-29, unit u7 [GATE].

## The problem, in Craig's words

> "We need to sort this bookings issue out once and for all as it is making this all complex and difficult to understand. It is hard to see which workouts are assigned or have been used for him in a block, and given Esther is not assigning workouts until the day, it's hard to see what was done in the last session to know which one to schedule next."

## What the data shows (Tom Putnam, block 1)

- Plan-generated sessions 5+ ("Full Body A/B", plan weeks 3–6) sit **unbooked forever** — they render as "Plan week N · not yet booked".
- His real Outlook bookings were appended as **new content-empty sessions 14–18** ("Outlook booking — Tom Putnam") — they render in calendar-week groups.
- Result: the block view interleaves two groupings ("Week of 24 Aug" vs "Plan week 3") that are really **two halves of a forked model**: planned workout content in one set of rows, real booked slots in another.
- CR-EF-095 already makes NEW bookings consume the earliest unbooked planned session — but existing forked blocks stay forked, and the deeper model mismatch remains.

## The agreed model (already decided, 2026-08-21)

**Block** = a dated period. **Session** = a booked slot — its identity is date + time. **Workout** = content, attached on the day, never in advance.

The current block view predates this: it treats a "session" as a numbered content carrier that may or may not have a date. That's the root of the confusion.

## What the design must deliver

1. **One grouping, not two.** The block view shows **booked slots on a calendar timeline** (past → completed, future → scheduled). No "Plan week N" rows for slots that don't exist yet.
2. **A workout pool.** The block's planned workouts (Full Body A, Full Body B, …) live in their own visible pool with a clear per-workout state: **unused / done on <date> (session N) / in progress**. This is how Esther sees "which workouts are assigned or have been used".
3. **"What was done last, what's next."** The view leads with: last completed session + which workout it used → suggested next workout (e.g. simple rotation or "least-recently-used"), so on the day Esther picks with one glance.
4. **On-the-day attach.** A booked slot with no workout shows an obvious "Attach workout" affordance offering the pool (with used/unused state visible at point of choice). This matches the existing add-workout flows, unified.
5. **Full-block behaviour.** When a booking arrives and the block is at its 18-session cap (Ian Healey case): never a background error loop — the booking lands in the manual queue with a clear "block full — extend or new block" action.
6. **Reconcile pass for forked blocks** (build item, not design): merge existing content-empty booked sessions with unbooked planned sessions (booked slot absorbs the planned workout's content into the pool; planned-session rows dissolve). One-off migration + the CR-EF-095 rule keeps it clean going forward.

## Constraints

- Mobile parity: the same model must read cleanly on the trainer PWA (client mode) — the desktop block view and mobile add-workout/book flows all draw from it.
- Don't break: session logging (set_logs keyed by session), document engine links, Outlook sync mapping (session_calendar_events), portal views.
- Mockup home: `D:\apps\design-systems\brand-staging-2662e9\` (hub design language, `hub-*.html` conventions).

## Open questions for the mockup pass (batch via `wo ask` if they block)

- Does session numbering ("Session 14 of 18") survive, or does the count become "12 of 18 slots used" + a separate workout-pool count?
- Where does the pool live on mobile — its own tab, or inline under the timeline?
- Suggested-next-workout logic: strict rotation vs least-recently-used vs Esther-only choice (no suggestion)?

## Next step

Open Design mockup of the desktop block view + mobile equivalent → Craig approval → build lanes under this CR. The reconcile migration (item 6) is scoped after the model is signed off.
