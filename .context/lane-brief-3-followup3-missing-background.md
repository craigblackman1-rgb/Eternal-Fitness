# Lane 3 follow-up 3 — the isolation fix wasn't enough, real root cause found

## The previous fix was incomplete

Adding `isolation: isolate;` to `.ds-hero-split-photo`/`.ds-cta-split-photo` did NOT fix the black rendering — verified live in a real browser (Chrome, not headless): the hero photo on `/about` still renders solid black. Confirmed empirically by injecting `.ds-hero-split-photo::after { display: none }` via devtools — with the wash overlay removed, **the real photo appears correctly** (Esther smiling in the studio). So the `::after` wash overlay (`mix-blend-mode: multiply`) is still crushing the image to black despite isolation.

## Actual root cause

Compare against every OTHER working treatment class in this codebase that uses the identical wash pattern (`position:relative; overflow:hidden; isolation:isolate;` + `::after { mix-blend-mode: multiply }`):

- `.ef-mount-win` (`app/design-system.css`) — has `background: var(--color-ink);`
- `.ef-plate` — has `background: var(--color-ink);`
- `.ef-tech` — has `background: var(--color-ink);`
- `.ds-step-img`/`.ds-flow-step-img`/`.ds-split-img` — has `background: var(--color-ink);`

**`.ds-hero-split-photo` and `.ds-cta-split-photo` are the only two treatment containers in the whole WO that never set a `background` on themselves.** Without an opaque backdrop already painted in the isolated group before the multiply-blended `::after` layer composites, the blend appears to crush to black in this browser/rendering path.

## Fix

Add `background: var(--color-ink);` to both:
- `.ds-hero-split-photo`
- `.ds-cta-split-photo`

Same one-line addition, matching the exact pattern every other treatment class already follows.

## Verify

- `npx tsc --noEmit` clean.
- If you can run the dev server, load `/about` and confirm the hero photo (Esther, studio background) is visible, not black.

Commit as a follow-up on the same branch (new commit, don't amend).
