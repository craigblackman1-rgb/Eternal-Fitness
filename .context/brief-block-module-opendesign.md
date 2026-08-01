# Functionality brief: training block module — overview, edit-block, and session-edit entry (for OpenDesign)

This is a **functionality + constraints spec**, not a visual spec — no layout, colour, or component
opinions here. Hand this to OpenDesign to produce mockups; bring them back and I'll implement against
the real hub codebase and data.

## What this is

A client's 6-week training block is split into weeks, each with 2 sessions/week. Getting from "I'm
looking at a client's block" to "I've made the change I wanted" currently takes too many clicks and
too much scrolling. Three things need redesigning as one coherent module, not three unrelated pages:

1. **Block overview** (`/hub/clients/[id]/blocks/[blockId]`) — currently a wall of every session in
   every week, all expanded by default, with a full exercise table inside each one. For a 12-session
   block that's enormous — Esther has to scroll past exercise tables for weeks she doesn't care about
   just to find one session.
2. **Edit a block** — **does not exist today.** The only block-level actions are Print, Review &
   Approve / Schedule, Export, and Delete. There's no way to edit the block's own note/summary, or to
   correct/adjust the block once it exists, without going session-by-session.
3. **Edit a session** — exists, but takes one click more than it should. From the block overview,
   "Edit session" navigates to the session page in **read-only** mode; the trainer then has to click a
   *second* "Edit session" button to actually enter edit mode. That's two clicks to do the one thing
   the first link promised.

A fourth capability, **reassign schedule** (rescheduling/cancelling individual sessions, or applying a
repeating weekly pattern to the whole block), already exists and works reasonably well on the
`/review` page (`BlockScheduler` component) — it does not need a redesign, but note it in the mockup
as the destination of whatever "Schedule" entry point survives the overview redesign, so navigation
between the three pages stays coherent.

Where it lives:
- Overview: `app/hub/(protected)/clients/[id]/blocks/[blockId]/page.tsx`
- Review/schedule: `app/hub/(protected)/clients/[id]/blocks/[blockId]/review/page.tsx` (keep as-is,
  just confirm the nav path into it)
- Session edit: `app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/page.tsx` +
  `SessionEditor.tsx` (the exercise-editing UI itself was already redesigned in a prior pass — this
  brief is only about the entry point into it, not the editor's internals)

## Required functionality

### 1. Block overview — collapse by default, surface actions

- Each week's sessions currently render as `<details open>` — always expanded. Change the default to
  **collapsed**, showing just enough per session to decide whether to open it: day label, archetype
  badge, focus/name, and completed/not-logged status. Expanding one session reveals the full exercise
  table, same as today.
- Design a sensible default for **which weeks/sessions are open on load** (e.g. nothing open, or just
  the next upcoming/incomplete session) — call this out explicitly in the mockup as a decision, not an
  accident.
- Per-session actions ("Log this session", "Edit session") currently sit inside the expanded panel as
  small text links, easy to miss. Make them visually prominent regardless of expand state — e.g.
  available directly on the collapsed row, not gated behind expanding it first.
- Block-level actions (Print, Review & Approve/Schedule, Export, Delete) sit in a header row today.
  Add an **Edit Block** action here (see #2) and reconsider whether the header row is still the right
  place for all of these once Edit Block exists, or whether some belong in an overflow/menu — your
  call, just make the primary action (whatever a trainer does most often when opening a block) the
  most visually prominent thing on the page.

### 2. Edit Block — new capability, needs a design

There is currently no way to edit a block's own properties. Design either a dedicated page or an
inline/modal edit mode (your call — note which in the mockup) covering:

- `block_note` (free text — currently only shown, not editable, from the overview page's "Block Note"
  card)
- `summary` (free text — not currently surfaced in the hub UI at all; check whether it's worth
  exposing here now that there's an edit surface)
- Block status (`draft` / `approved` / `active` / `complete`) — today status only changes as a
  side-effect of the Approve action on the review page. Decide whether manual status override belongs
  here (e.g. correcting a status set in error) or whether that's out of scope and status should stay
  system-driven — flag your call explicitly.

Do **not** design editing of `block_number`, `client_id`, or the sessions/exercises themselves here —
block_number is a fixed identifier and per-session content editing is fully covered by the existing
session editor (#3 below).

### 3. Session-edit entry — cut the extra click

The block overview's "Edit session" link should land the trainer directly in an editable state, not a
read-only view that requires a second click to unlock. Two options, either is fine — pick whichever
reads better and say which in the mockup:

- (a) The "Edit session" link on the overview jumps straight into the session page with edit mode
  already active (skip the read-only landing entirely when arriving via this link specifically); or
- (b) Merge the read-only view and the edit toggle into a single lower-friction control (e.g. the page
  opens in a lightly-editable state by default, with an explicit "Done editing" rather than a
  separate "start editing" step).

Preserve the existing distinction between viewing a session (RPE/fatigue log, coaching notes, per-set
logging) and editing its exercise prescription (studio/home version lock, drag-reorder, add/remove) —
this brief is about how fast a trainer *reaches* edit mode, not about merging those two concerns.

## Constraints / things to preserve

- Match the hub's existing design system/tokens — check existing hub pages (client detail, the
  already-redesigned session editor) for the card/table/badge idiom in use rather than introducing a
  new visual style for just this module.
- Studio/Home version distinction, per-set logging, swap-exercise, and video-URL affordances on the
  session page must keep working exactly as today — this brief only touches the overview page layout,
  adds a net-new block-edit surface, and shortens the path into the existing session editor.
- `BlockScheduler` (the reschedule/cancel/repeating-pattern UI on `/review`) is explicitly **not** in
  scope for a redesign — only its entry point/navigation from the redesigned overview needs
  confirming.
- Don't design changes to how the Plan Agent generates blocks/sessions — this only touches how an
  already-generated block is viewed, edited, and scheduled.

## Out of scope (don't design for these)

- Any change to the session prescription editor's internals (drag-and-drop, superset handling,
  add/remove exercise) — already built and out of scope here.
- Any change to per-set live logging (`/hub/log/[sessionId]`) — separate flow, already built.
- Bulk/cross-block operations (e.g. editing block 3 and block 4 at once) — one block at a time only.
