# Functionality brief: editable session/workout editor (for OpenDesign)

This is a **functionality + constraints spec**, not a visual spec — no layout, colour, or component
opinions here. Hand this to OpenDesign to produce a mockup; bring the mockup back and I'll implement
it against the real hub codebase and data.

## What this is

Today, a client's prescribed workout (a "session") can only be viewed in the hub, plus two narrow
edits: swapping one exercise for another (same slot), and attaching/editing a video URL. Esther/Craig
want a real editor for the exercise prescription itself, used at a desk while planning a block —
**not** a live, in-studio, mid-session tool. Design for mouse/keyboard-on-a-laptop, not one-handed
phone use.

Where it lives: extends the existing session page
(`app/hub/(protected)/clients/[id]/blocks/[blockId]/sessions/[sessionNum]/page.tsx`). Open question
for OpenDesign either way: should editing be a mode toggled on this same page (e.g. "Edit" button
reveals drag handles/inline fields), or a separate view navigated to from it? Either is fine
functionally — pick whichever reads better, but note the answer clearly in the mockup since it
changes the shape of the implementation.

## Data shape (what's actually being edited)

A session has **two independent prescriptions that can diverge**: a `studio` version and a `home`
version (for clients who sometimes train at home) — same exercise slots aren't guaranteed to match
between them. The editor needs a way to make clear which version is being edited, and edits to one
must never silently touch the other.

Each version has **three fixed sections in a fixed order**: Warm-up → Main Block → Cooldown. Within
a section, an exercise is:

- name, sets, reps, tempo, rest (all free-text/number, already editable via a full swap, just not
  individually yet)
- an optional coaching cue and modification note (display-only in the editor, not part of this scope)
- optional video link (already editable — keep that control as-is if it survives into the new
  layout)
- an optional `group_label` — consecutive exercises sharing the same label are a superset/tri-set/
  circuit and are meant to be performed together. This ONLY appears in Main Block. Warm-up and
  Cooldown never have groups.

## Required functionality

1. **Reorder exercises within a section** (drag-and-drop, or an equivalent affordance — up/down
   arrows are an acceptable fallback if drag-and-drop turns out to be awkward for a long list).
   Reordering happens within one section at a time.
2. **Move an exercise between sections** — e.g. moving something from Main Block into Cooldown.
   Confirm in the mockup how this is triggered (drag across section boundaries, or a "move to..."
   action) — either works.
3. **Add an exercise** — inserted at a chosen position in a chosen section, picked from the existing
   exercise library (same library/search already used by the "Swap exercise" dialog — reuse that
   picker's pattern rather than inventing a new one).
4. **Remove an exercise** from a section.
5. **Edit sets/reps/tempo/rest inline** — directly in the list, not via a separate swap flow.
6. **Section order itself does not need to be reorderable** — Warm-up → Main → Cooldown is a fixed
   convention in this app; don't spend design effort on reordering the three sections relative to
   each other. Moving individual *exercises* between sections (item 2 above) is what's actually
   needed.

## Constraints / things to preserve

- **Superset grouping (`group_label`) must survive reordering.** If exercises are visually grouped
  as a superset today, the editor needs to make it obvious which exercises are grouped together, and
  reordering/adding/removing must not silently break an existing group (e.g. dragging one exercise
  out of a 2-exercise superset should visibly resolve what happens to the group, not leave orphaned
  state). If full group re-authoring (creating/dissolving a superset) feels like scope creep for a
  first version, it's fine to leave "create a new superset" out and just make sure existing groups
  render clearly and survive edits that don't touch them — flag this explicitly in the mockup either
  way so it's a conscious call, not an oversight.
- **Edits are scoped to this one session only** — no "apply to future weeks" propagation. Keep the UI
  free of anything implying block-wide changes.
- The existing "Swap exercise", "video URL", and "log sets" affordances on this page must keep
  working — this is additive to the page, not a replacement of what's already useful there.
- Match the hub's existing design system/tokens (this app already has a full component library and
  visual language across `/hub/*` — check existing hub pages, e.g. the client detail page, for the
  card/table/badge idiom already in use, rather than introducing a new visual style for just this
  page).

## Out of scope (don't design for these)

- Live/in-session editing UX (thumb-friendly, one-handed) — that's the existing per-set logging flow,
  already built, not this.
- Creating brand-new supersets/groupings from scratch (see note above — flag as a decision, don't
  silently include or exclude).
- Any change to how blocks are generated by the Plan Agent — this only edits an already-generated
  session's content.
