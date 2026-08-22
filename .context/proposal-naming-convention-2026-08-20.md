# CR-EF-073 — Block / session / workout naming convention proposal (v2)

**Status:** raised, awaiting Craig's approval · **Date:** 2026-08-20 · **Author:** Claude (session `eternal-fitness-feature-request-f3bea2`)

**v2, 2026-08-20:** rewritten after Craig corrected the domain model the first draft got
wrong. The model is definitive:

- **Block** = a defined period of time, typically with a start date and an end date.
- **Session** = the time period *booked* on a given day (e.g. Mon/Wed/Fri at 11am). A
  calendar appointment — its natural identity is its **date + time**.
- **Workout** = attached to a session **on the day, not normally in advance**. It is
  content, never the session's identity.

## The problem

The same session can appear under six different labels depending on the surface, and
several of them violate the model above:

| Surface | Current label | What's wrong |
|---|---|---|
| Training tab → Blocks list | "Block 1" + created date | No period — blocks are date ranges, list shows creation date only |
| Client profile → Active block panel | "Block 2" + Started | Same — no end date / span |
| Dashboard → today's sessions | "Block 2, Session 3" + workout name | Ordinal leads; date is the identity |
| Dashboard → client cards | "Block 2 · Session 3 · 4/12 done" | Ordinal-as-identity |
| Open block view → session rows | Workout name as the row's name; "Day 1"/"Day 2" when unbooked | Workout treated as identity; presumes advance assignment. "Day N" is meaningless |
| Open block view → Next-session stat | "Sat 22 Aug · S3" or bare "S3" | Abbreviation; bare ordinal when unbooked |
| Training tab → Sessions view | "Block 1 · S1" | Abbreviated ordinal as identity (date is a separate column) |
| Progress charts | "B1 S3" ticks | Ordinal codes; dates are the natural axis |
| Session detail page | Workout name headline (CR-EF-034) | Acceptable once a workout is attached, but subtitle should carry the booking (date+time) |
| Portal → training plan | "Session 1 · Workout A" | Ordinal + workout-in-advance |

Sources: `blocks/[blockId]/page.tsx:125,140`, `SessionRow.tsx`,
`TrainingTabContent.tsx:543`, `lib/progress.ts:157`, `app/hub/(protected)/page.tsx:471,569`,
`portal/(protected)/training/TrainingClient.tsx:142`.

## Proposed convention — four rules from the model

**1. A block is a period: always name it with its dates.** "Block 2" plus its span —
**"Block 2 · 4 Aug – 12 Sep"** — everywhere a block is referenced (list, Active block
panel, dashboard). Until scheduled, "Block 2 · not yet scheduled". (Depends on real
start/end dates — `blocks.scheduled_start` is NULL on most rows, CR-EF-032; end date
derivable from last session or stored.)

**2. A session is a booking: its identity is its date + time.** Rows and references
lead with **"Mon 3 Aug · 11:00"**. The ordinal — spelled **"Session 3 of 12"** — is
block-position context, shown secondary. Only when a session has no booked date yet
does the ordinal lead: **"Session 3 · not yet booked"** (replaces "Day N", "S3", and
"Block 1 · S1" everywhere).

**3. A workout is content attached on the day — a descriptor, never the name.**
Once attached, the workout name appears alongside the session ("Mon 3 Aug · 11:00 ·
Workout A — Full Body"). Before that the slot reads **"Workout: to be set on the
day"** (or is simply blank) — the UI must stop implying workouts are pre-assigned.
Session detail page keeps the workout name as headline once one is attached
(CR-EF-034 stands), with the booking date+time as the subtitle; an unattached
session's page is headlined by its date.

**4. No abbreviations.** "S1", "B2 S3", "Day N" are banned. Chart ticks use dates
(already the fallback in `lib/progress.ts`); tooltips spell out "Block 2 · Session 3
of 12 · Mon 3 Aug".

## Resulting canonical forms

- Block: **Block 2 · 4 Aug – 12 Sep**
- Session (booked): **Mon 3 Aug · 11:00** — secondary: *Session 3 of 12 · Block 2*
- Session (not booked): **Session 3 · not yet booked**
- Workout (attached): shown after the session identity — **· Workout A — Full Body**
- Workout (not attached): *to be set on the day* / blank

## Touched if approved

- `blocks/[blockId]/page.tsx` + `SessionRow.tsx` — rows lead with date+time, ordinal secondary, drop "Day N"; Next-session stat spelled out; header gains block date span
- `TrainingTabContent.tsx` — Blocks view gains date span; Sessions view "Block 1 · S1" → position context, date column already primary
- `lib/progress.ts` — date ticks, full tooltip
- `app/hub/(protected)/page.tsx` (dashboard) — date/time already present in today-view; normalise ordinals to "Session N", client cards likewise
- Portal training + home — same rules
- Open question for the build: whether "workout attached on the day" should also change *behaviour* (e.g. hide pre-generated workout names until session day) or is naming-only for now — **naming-only assumed**; behaviour change would be its own CR

## Gates before build

1. **Craig approves this v2 convention.**
2. **Mockups first** (Design Parity): `hub-block-module.html` session rows (CR-EF-063 just rebuilt code to match them exactly) and `hub-client-detail-refined.html` must be updated in Open Design before code changes.
3. Block date spans depend on scheduling data being present (CR-EF-032 interaction) — unscheduled blocks fall back to "not yet scheduled", never a fabricated range.
