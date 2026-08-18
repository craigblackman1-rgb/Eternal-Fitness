# Functionality brief: unified session state + calendar-spine (for Open Design)

This is a **functionality + constraints spec**, not a visual spec — no layout, colour, or component
opinions. It is the visual-design counterpart of CR-EF-037: the unified session/blocks/calendar model
proposed in `.context/assessment-workout-unification-2026-08-17.md` after every one of Esther's
2026-08-17 field problems was reproduced against production data and root-caused. Read that doc's
Part 1 if you want the "why" behind any requirement here; this brief only carries what a designer needs.

**Relationship to the in-flight consolidation pass** (`brief-workout-consolidation-opendesign.md`):
this brief **extends, not replaces** it. `hub-session.html` and `hub-workout-templates.html` are
already back with Open Design for revision (see `revision-request-workout-consolidation-2026-08-17.md`)
— those revisions stand, and this brief adds session-state requirements to `hub-session.html`'s open
revision rather than starting again. `hub-block-module.html` and `hub-schedule.html` were approved
**on visuals**; this brief is the functional revision pass they now need before build. G1 naming
(Block / Session / Template) from the consolidation brief is locked and applies throughout.

---

## The one new concept everything hangs off: session status

Today a session has no stored status — every screen invents its own answer to "is this done?", and
they disagree (that's the "completed but shows in progress" bug). The build will introduce a real
5-state lifecycle, and **every surface in this brief renders it from one shared visual language**:

| Status | Meaning | How a session gets here |
|---|---|---|
| **Planned** | Exists in a block, no date yet | Block generated/built manually |
| **Scheduled** | Has a date/time | Scheduling on the block page, or drag/booking on the calendar |
| **In progress** | Logging has actually started | First set logged (NOT merely opening the screen — that bug dies here) |
| **Completed** | Esther pressed Complete | Explicit action, records RPE/fatigue/notes |
| **Cancelled** | Called off, reason kept | Explicit action; can carry logged sets from before cancellation |

Two hard rules the design must make visible:

1. **Completed and Cancelled are read-only.** No log buttons, no editable prescription, no re-press of
   Complete. The single escape hatch is an explicit, deliberately-unglamorous **"Reopen session"**
   action (with a one-line "this will let logged data be changed — it's audited" confirm). Design the
   read-only state to *look* settled — this is what stops finished workouts being accidentally re-logged.
2. **One status pill component, used identically everywhere** — block page, session screen, client
   sessions tab, schedule day view, schedule month view. Never a per-screen re-invention (today there
   are four).

## What needs designing

### 1. Block page — `hub-block-module.html` (revise in place)

The structural change: **weeks become real Monday–Sunday calendar weeks derived from session dates**,
not the stored "Week 1..6" ordinal (which in production is wrong for every real client — all their
sessions say week 1).

- **Scheduled block** (sessions have dates): group sessions under real Mon–Sun week headers, e.g.
  "Week of 17 Aug", "Week of 24 Aug", each with its date range and per-week progress (e.g. 2 of 3
  done). A week with an off-pattern pile-up (4–5 sessions) just renders honestly — the design should
  make that visible, not impossible.
- **Unscheduled block** (no dates yet — most real blocks today): group by the plan ordinal, labelled
  **"Plan week N"** so it reads as *intent*, plus an obvious empty-state nudge into scheduling.
- **Scheduling moves onto this page, front and centre** — today it's buried on a review sub-route.
  Core flow: pick a start date + weekday pattern (e.g. Mon/Wed/Fri) → sessions get dates → the page
  reflows from "Plan week" into real calendar weeks. Per-session reschedule (move one session to
  another day) must be a lightweight inline action, and the week grouping follows automatically
  because weeks are derived. Show the block's scheduled start once set.
- Per-session rows carry: the session name (its `focus_label`, e.g. the template name or "Workout A"
  — never a bare "S3"), the status pill, date/time when scheduled, and actions appropriate to status
  (Log / View / Reschedule / read-only when completed or cancelled).
- A cancelled session that has logged sets (this happened in production — Emma, 17 Aug) needs an
  honest rendering: cancelled pill + "has logged data" indicator, not either fact hidden.

### 2. Schedule calendar — `hub-schedule.html` (revise in place)

Today the calendar cannot tell a finished session from an untouched one. Add:

- **Completion state on every entry**, day view and month view — the shared status pill (or its
  compressed month-grid form: e.g. a tick/state dot). Cancelled entries currently vanish; decide and
  show a deliberate treatment (hidden by default with a "show cancelled" toggle is acceptable — say
  which).
- Day-view entries show the session name (`focus_label`) alongside client name — same naming rule as
  everywhere else.
- The calendar is becoming the **spine**: from any entry there is exactly one obvious primary action
  by status — Scheduled → Log it · In progress → Resume · Completed → View. Design that affordance.

### 3. Client detail — Sessions tab (new section mockup)

Today's table shows `Block 2 · S1`, a date that's blank until Esther presses Complete, and no logged
data at all. Redesign the tab's session list so each row carries:

- **Name:** the session's `focus_label` (fallback "Session N") + block context — never `S{n}` alone.
- **Date:** the *scheduled* date as primary; completed date/time secondary where they differ.
- **Status:** the shared pill.
- **The logged evidence:** a compact summary per completed session (e.g. sets logged count, any PBs),
  expandable to the actual logged sets (exercise / set / reps / weight) without leaving the page.
  This is the fix for "the dropdown shows the session but not what was logged".
- Sortable by date and by block/session order (both already exist functionally — keep them).

Handback as its own artboard or as a revision of the client-detail mockup — designer's call, flag which.

### 4. Session screen states — additions to the OPEN `hub-session.html` revision

Fold into the revision already in flight (offline queueing + kg/lb are already requested there):

- The 5 status states of the whole screen, most importantly **Completed = read-only**: logged sets
  visible but not editable, prescription locked, and the "Reopen session" affordance placed so it
  can't be hit by accident.
- **In progress starts at first set logged** — the design should not imply that opening the screen
  starts anything.
- The Complete action records RPE / fatigue / notes (exists today) — but pressing it must feel
  terminal, not like a toggle.

## Honest data cases to design against (all real, from production)

- A block with 5 sessions, no dates, all "Plan week 1" — the most common real state today.
- A scheduled block whose sessions drift off-pattern after reschedules (a "week of" group with 1
  session, the next with 4).
- A cancelled session carrying 30+ logged sets.
- A session scheduled last Thursday but completed (written up) today — scheduled and completed dates
  legitimately differ; both matter.
- An 18-session block (the schema cap) — week grouping must not assume 6 tidy weeks.

## Out of scope (don't design for these)

- **Mobile PWA navigation/IA** — deliberately deferred until the Trainerize walkthrough with Craig and
  Esther; a separate brief will follow. The status pill + read-only-completed rules will apply to the
  Train Screen too, but don't redesign it here.
- Templates browser and paste-and-assign — already covered by the consolidation brief + open revision.
- The portal (client-facing) — follows later, after the staff model lands.
- Anything about *how* status is stored/migrated — build concern, not design.

## Constraints

- Match the hub's existing design system/tokens (`D:\apps\design-systems\ef-control-hub\desktop\` —
  same card/table/badge idiom as `hub-client-detail.html`). No new visual language.
- G1 naming is locked: **Block / Session / Template**, never interchangeably, and a session's display
  name is its `focus_label`.
- Archetype labels, where shown, are the Plan Agent's configurable three — Mobility & Movement
  Quality / Strength & Stability / Power & Conditioning — not invented condition labels (same
  correction as the templates-browser revision).
- Keep every existing capability visible in the current pages — this pass adds state and calendar
  honesty; it removes nothing.

## Handback format

Same as all prior passes: self-contained `.html` revisions in
`D:\apps\design-systems\ef-control-hub\desktop\training\`, same filenames revised in place
(`hub-block-module.html`, `hub-schedule.html`, `hub-session.html` as part of its open revision), plus
the client-detail Sessions tab artboard (new file or client-detail revision — flag which). Flag every
deviation and open question explicitly in the handback — don't let Craig discover a scope decision by
eye later.
