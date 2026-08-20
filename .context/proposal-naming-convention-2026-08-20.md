# CR-EF-073 — Block & session naming convention proposal

**Status:** raised, awaiting Craig's approval · **Date:** 2026-08-20 · **Author:** Claude (session `eternal-fitness-feature-request-f3bea2`)

## The problem

The same session can appear under six different labels depending on the surface. Nothing
joins them up, so a client's programme is unreadable across screens:

| Surface | Current label | Source |
|---|---|---|
| Training tab → Blocks list | "Block 1" | `block_number` (fine) |
| Client profile → Active block panel | "Block 2" | `block_number` (fine) |
| Dashboard → today's sessions | "Block 2, Session 3" + workout name below | `app/hub/(protected)/page.tsx:471` |
| Dashboard → client cards | "Block 2 · Session 3 · 4/12 done" | `app/hub/(protected)/page.tsx:569` |
| Open block view → session rows | "Workout A" name; **no session number anywhere**; day cell is "Day 1"/"Day 2" when unscheduled | `blocks/[blockId]/page.tsx:125` + `SessionRow.tsx` |
| Open block view → Next-session stat | "Sat 22 Aug · S3" or bare "S3" | `blocks/[blockId]/page.tsx:140` |
| Training tab → Sessions view | "Block 1 · S1" | `TrainingTabContent.tsx:543` |
| Progress charts (exercise trends) | "B1 S3" | `lib/progress.ts:157` |
| Session detail page | "Workout A" headline (per CR-EF-034) | `sessions/[sessionNum]/page.tsx` |
| Portal → training plan | "Session 1 · Workout A" | `portal/(protected)/training/TrainingClient.tsx:142` |

The root disconnect Craig hit: the block view identifies rows by **workout name only**
("Workout A", "Workout B") while the Sessions tab identifies the same rows by
**number only** ("Block 1 · S1") — there is no shared key visible on both.

## Proposed convention — four rules

**1. A session's *identity* is "Session N". Its *name* (the `focus_label`, e.g.
"Workout A — Full Body") is a descriptor, shown alongside the number, never instead
of it.** Canonical list form: **"Session 3 · Workout A"**. Exception (keep CR-EF-034):
on the session's own page, the workout name stays the headline and "Session 3 of 12"
is the subtitle — you're already inside it, the name is the useful bit there.

**2. Block context appears only on cross-block surfaces.** Inside a block page,
never repeat "Block 2" on every row. On the dashboard, Sessions tab, and progress
charts, prefix it: **"Block 2 · Session 3"** (workout name on a secondary line
where the layout has one).

**3. Abbreviations ("S1", "B2 S3") are banned everywhere except chart axis ticks**,
where space genuinely forces it — there "B2·S3" is allowed with the full form in the
tooltip. "Block 1 · S1" in a full-width table row saves four characters and costs
comprehension; spell it out.

**4. "Day N" is not a session label.** The day/date cell shows the scheduled
date+time when scheduled, and **"Not scheduled"** when not. Ordering context comes
from "Session N", which the block-view rows should carry anyway (they currently
don't show the number at all).

## Resulting canonical forms

- Block: **Block 2** (with `block_note` as free-text descriptor where shown)
- Session, inside its block: **Session 3 · Workout A**
- Session, cross-block: **Block 2 · Session 3** (+ workout name secondary)
- Chart tick only: **B2·S3** (tooltip spells it out)

## Touched if approved

- `app/hub/(protected)/clients/[id]/blocks/[blockId]/page.tsx` — "Day N" fallback (line 125), "S3" next-session stat (line 140), add session number to `SessionRow`
- `app/hub/(protected)/clients/[id]/blocks/[blockId]/SessionRow.tsx` — row layout gains "Session N ·" prefix
- `app/hub/(protected)/clients/[id]/TrainingTabContent.tsx:543` — "Block 1 · S1" → "Block 1 · Session 1"
- `lib/progress.ts:157` — keep compact tick, add full label to tooltip payload
- Dashboard (`app/hub/(protected)/page.tsx`) — already conforms ("Block N, Session N"); normalise separator to "·"
- Portal — already conforms ("Session 1 · Workout A"); no change

## Gates before build

1. **Craig approves the convention** (this doc).
2. **Mockups first** (Design Parity): `hub-block-module.html` session rows were just
   rebuilt to match the mockup exactly (CR-EF-063) — the mockup's `sessionHtml()` must
   be updated in Open Design before the code changes, or the parity gate re-flags it.
   `hub-client-detail-refined.html` Sessions-view labels likewise.
3. Build is then lane-able: named files, one repo, verifiable by tsc + screenshot diff.
