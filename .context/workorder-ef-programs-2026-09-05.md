# WO: Programs — separate training content from the commercial block

Slug: wo-ef-programs-2026-09-05 · CR: CR-EF-154 · App: eternal-fitness-website · Raised: 2026-09-05
Owner: — · Status: planned

Raised from a working conversation with Craig, 5 Sep 2026, triggered by Odul Bozkurt's
6-week Strength & Mobility Transition plan having nowhere to live in the hub.

---

## The problem, stated plainly

Esther writes plans like this by hand:

```
A1. Barbell Zombie Squat
    Weeks 1–2: 2 sets × 8      Weeks 3–4: 3 × 8      Weeks 5–6: 3 × 10
A2. Active Rest — Shoulder Mobility Progression
    Weeks 1–2: Bench Thoracic Extension 30 sec
    Weeks 3–4: PVC Pass-Throughs 10 reps
    Weeks 5–6: Prone Y Liftoffs 8 reps
```

**None of that can be stored today.** Verified against the code:

- An `Exercise` has ONE `sets` (number) and ONE `reps` (string). There is no week dimension.
- `versions` has exactly two keys, `studio` and `home` — delivery variants, not progression.
- `sessions.week` / `sessions.phase` columns exist, but nothing maintains them and
  `derivedWeekLabel()` discards `week` entirely once a session is scheduled.
- `uid` is deliberately forced unique per session (the BUG-EF-111 fix), which actively
  severs any thread between "Zombie Squat in week 1" and "Zombie Squat in week 5".
- `group_label` supports supersets in the editor, but the paste parser's JSON schema has
  eight fields and `group_label` is not one of them — supersets are dropped on import.
- "Active rest" does not exist anywhere. `grep -i "active.rest"` returns zero hits.

Three routes exist to create training, at three different altitudes, with nothing telling
Esther which to use:

| Route | Produces | Reusable |
|---|---|---|
| `/clients/[id]/add-workout` (CR-EF-120's three guided routes) | one session, one client | no |
| `/hub/workouts/new` (paste & structure) | one template | yes — but reaches a block only via AI regeneration that discards the pasted exercises |
| `/clients/[id]/plan-agent` ("Plan next block") | a whole block | no — generated, saved as nothing |

## The model Craig defined

**A block is the commercial container.** A set of dates, or a fixed number of sessions paid
for. Nothing more. The 18-session cap is a commercial limit, not a training one.

**A program is the training content.** A named, reusable set of workouts with per-week
progression bands.

They are independent. A program is applied to a block's sessions.

### The queue rule (this is the load-bearing decision)

A program is an **ordered queue of slots**, consumed in order, advanced **only by a completed
session**. Craig's three rulings collapse into this one rule:

- Rotation is **positional**, always A then B. If a day is moved or cancelled, the next
  delivered session picks up where the queue left off.
- Progression follows **completed weeks**, not the calendar. A client who misses a fortnight
  returns to the week they were on — the missed week is done on return, not skipped.
- When the program runs out before the block does, remaining sessions are left **unassigned**
  and Esther assigns a new program or workouts.
- **Supplementary sessions do NOT consume a slot.** They run alongside the program.

**Consequence: the program cannot be baked into sessions at assign time.** If Thursday is
cancelled, workout A must slide to the next delivered session, so assignment can only resolve
at delivery. Sessions hold a pointer (program, next unconsumed slot), not a copy.

This is consistent with the domain rule already established for this project — *a workout
attaches on the day, never in advance* (see [[project_block_session_workout_model]]). The
program simply gives that attachment a defined source.

### What this fixes for free

- Odul's 15 sessions reading "None" stops being a defect. The block is booked; no program has
  been applied. That is a legitimate state the UI currently cannot express.
- Emma's block 3 hitting the 18-session cap and spilling into block 4 becomes expected: her
  "6-week band block, 3 a week" is ONE program spanning TWO commercial blocks.
- "Assign workout on the day" stops being a chore and becomes the queue resolving.

## DONE (checkable)

- [ ] Esther can paste Odul's plan and get two workouts with supersets and week bands intact
- [ ] Those two workouts, as a program, apply to Odul's block A/B/A/B with the right numbers per week
- [ ] Cancelling a session shifts everything downstream by one, with no re-planning
- [ ] A client who misses two weeks returns to the week they were on
- [ ] When the program runs out, the remaining sessions say so rather than reading "None"
- [ ] A session completed with no results logged is flagged

## LANES

### P1 [GATE] Design — needs a mockup before build
New user-facing surfaces: the program builder, the program-applied block view, and the
guided chooser that replaces three unlabelled routes. Per the pipeline, a mockup is required
before build; no "it's just a form" exemption. Craig drafts, we build.

### P2 [AUTO] Schema
`programs` (name, notes, length_weeks, created_from) ·
`program_slots` (program_id, position, workout_template_id, week_band, sets, reps) ·
`sessions.program_id` + `sessions.program_slot_id` (the thread that is missing today).
Plain Postgres, RLS disabled, no `CREATE POLICY ... TO authenticated`.
VERIFY: Odul's plan round-trips — 2 workouts, 3 bands each, 12 slots.

### P3 [AUTO] Queue resolution (depends P2)
Resolve the next unconsumed slot at delivery. Completed advances; cancelled does not;
supplementary does not. Projection for future dates is provisional, not committed.
VERIFY: cancel a mid-block session on real data and confirm everything downstream shifts by
one and nothing is orphaned.

### P4 [AUTO] Paste parser keeps structure (depends P2)
`/api/workout-templates/structure` currently returns eight fields and drops `group_label`.
Add `group_label` and week bands to the schema and the prompt. It is an AI call with a
one-shot repair round-trip — keep that shape.
VERIFY: paste Odul's real plan verbatim; supersets and all three bands survive.

### P5 [AUTO] Flag completed-with-no-results
A session marked complete with zero `set_logs`. Craig, 5 Sep: "if a workout is logged
completed with no results then it needs flagging." Surface on the client record and Today.
VERIFY: Nathan Wadey and Monique Wearden have real completed sessions WITH logs — do not
flag those. Find a genuine zero-log completion first and confirm only it flags.

### P6 [GATE] The guided chooser
One entry point that asks a few questions and routes to paste / build / agent, replacing
three peer routes at three altitudes. This is the thing Craig remembered designing —
CR-EF-120 built it, but only for ONE workout on ONE day. Same idea, block altitude.

### P7 [AUTO] Retire what this supersedes (depends P3)
The plan agent's "Create Block" currently truncates the conversation to 500 chars and
regenerates from parameters, explicitly instructed never to reuse pasted exercise names.
Once programs exist, decide whether it becomes a program *drafter* or is retired.

## LEDGER

2026-09-05 Raised. Model agreed with Craig in conversation. P1 and P6 gated on design.
