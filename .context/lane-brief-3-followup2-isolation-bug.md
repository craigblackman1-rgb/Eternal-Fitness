# Lane 3 follow-up 2 — real rendering bug: hero/CTA split photo renders solid black

## Diagnosed on live verification

Loaded `/about` in a real browser. The split hero's photo column renders as solid black — no photo visible at all, even though the `<img>` element is present, correctly sized/positioned, and its raw pixel content (checked via canvas) is a normal warm-toned photo. The DOM confirms the `<img>` is the topmost element at that screen point (nothing else painting over it) — so this isn't a stacking-order bug, it's a paint/blend bug.

**Root cause:** `.ds-hero-split-photo` and `.ds-cta-split-photo` are missing `isolation: isolate`. Every other treatment class in this WO (`.ef-plate`, `.ef-tech`, `.ef-mount-win`, and Lane 2's `.ds-step-img`/`.ds-flow-step-img`/`.ds-split-img`) has it. Without it, the wash overlay's `::after { mix-blend-mode: multiply }` blends against everything behind it in the shared stacking context — including `.ds-hero-split`'s own `background: var(--color-ink)` (near-black) — instead of blending only against the photo directly beneath it. Multiplying against near-black crushes the whole thing to black.

## Fix

Add `isolation: isolate;` to both:
- `.ds-hero-split-photo` (`app/design-system.css`)
- `.ds-cta-split-photo` (`app/design-system.css`)

Same one-line fix as the existing pattern every other treatment class already follows — no other changes needed.

## Verify

- `npx tsc --noEmit` clean.
- This is a visual fix — if you can run the dev server, load `/about` and confirm the hero photo is visible (not black). If you can't verify visually in your environment, just make the change; live verification will happen on review.

Commit as a follow-up on the same branch (new commit, don't amend).
