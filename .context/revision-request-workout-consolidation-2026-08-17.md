# Revision request: 2 mockups need a second pass (for Open Design)

Design Parity Gate review of the 2026-08-17 delivery against
`brief-workout-consolidation-opendesign.md`. Craig has signed off on the direction — these are the
specific fixes needed before build starts. `hub-block-module.html` and `hub-schedule.html` are approved
as-is, no changes needed there.

## `hub-session.html` (consolidated desktop logger) — 2 fixes

1. **Add offline queueing.** The mockup never shows or mentions it. The brief's capability matrix
   explicitly recommends the consolidated screen adopt this — desktop shouldn't ship strictly worse
   than the mobile Train Screen on write-safety. Mirror what Train Screen already does: an offline queue
   with `client_op_id`-based idempotent writes, so a flaky desk connection can't produce a duplicate
   logged set. Doesn't need to be visually prominent — a subtle "queued, will sync" state is enough,
   same restraint as the rest of the screen.
2. **Add kg/lb unit switching to the desktop logger.** Currently mobile-only. Confirmed: this should be
   on desktop too, not a deliberate mobile-exclusive feature.

## `hub-workout-templates.html` (templates browser skin pass) — 2 fixes

1. **Restore the two missing filters.** The live page (`workout-template-browser.tsx`) filters on 6
   facets: archetype, movement type, muscle group, equipment, difficulty, condition. The mockup only
   shows 4 — **movement type** and **muscle group** are missing entirely. This is a skin-only pass, not
   a redesign — every existing filter needs to survive, not just the ones that fit a cleaner layout.
2. **Fix the archetype filter values.** The mockup invented condition-style labels ("Cancer rehab", "GP
   referral", "Cardiac"). That's wrong on two counts:
   - It's not what archetype means. Archetype (A/B/C) is the AI Plan Agent's **session-type emphasis**
     — what a session focuses on, not who it's for. The real, already-configurable labels (Esther can
     rename these under Plan Agent Settings → Advanced → "Archetype Focus Labels") are:
     - **A** — Mobility & Movement Quality
     - **B** — Strength & Stability
     - **C** — Power & Conditioning
   - **Clinical/referral condition is a completely separate, already-existing filter** ("condition" in
     the 6-facet list above) — that's where a "Cancer rehab" / "GP referral" style label would actually
     belong, if anywhere. Don't merge the two concepts into one filter.
   - Use the three real archetype labels above (or the bare "Type A/B/C" the live page currently shows,
     if a cleaner default is preferred) — not invented condition names.

## Handback

Same as the original brief — self-contained `.html` revisions in
`D:\apps\design-systems\ef-control-hub\desktop\training\`, same filenames (revise in place). No other
changes needed to either file beyond the above.
