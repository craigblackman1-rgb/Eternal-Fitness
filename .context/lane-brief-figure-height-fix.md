# Lane brief — CR-EF-086 hotfix: .ef-figure collapses the split photo to height 0

**Branch:** you are on `claude/lane-plates-placement-2026-08-29`. Fix in place, new commit.

## The regression

The previous commit wrapped image containers in `<figure class="ef-figure">` (`display: flex; flex-direction: column`). That is correct for images with intrinsic height, but it **collapses the two `next/image` `fill` containers to height 0**, so those photographs are now invisible (they render as a solid black box).

Measured, local dev server, 1440x900:

| Page | Container | Height | Result |
|---|---|---|---|
| `/contact` | `.ds-hero-split-photo` | **0** | photo invisible |
| `/contact` | `.ds-cta-split-photo` | **0** | photo invisible |
| `/about` | `.ds-hero-split-photo` | **0** | photo invisible |
| `/about` | `.ds-cta-split-photo` | **0** | photo invisible |
| `/` | `.ef-tech si` x3 | 270 | fine, untouched |
| `/about` | plain image DIVs x3 | 718 / 485 / 404 | fine, untouched |

**Cause:** `<Image fill>` is absolutely positioned, so it contributes no intrinsic height. These containers used to be grid items and took their height from the grid row. Now `.ef-figure` is the grid item and the photo container is a flex child with no height of its own, so it collapses to 0.

## The fix — CSS only

In `app/design-system.css`, make the figure's image container absorb the remaining height:

```css
.ef-figure > :first-child { flex: 1 1 auto; min-height: 0; }
```

Place it directly after the existing `.ef-figure` rule. `.ef-figure` already receives a definite height from the grid row (measured 670px on `/contact`), so the first child grows to fill whatever the disclosure does not use.

## MUST NOT

- Do not change any `.tsx` file. This is a CSS-only fix.
- Do not alter the `<figure class="ef-figure">` wrappers added in the previous commit — they are correct.
- Do not touch `.ef-desc`'s own styling, any alt text, any described-image copy, or anything under `app/visual-impairment/`.

## VERIFY

`npx tsc --noEmit` clean. Do not run a dev server or a browser — Claude re-measures every `.ef-figure` child height and will require all of them non-zero.

## COMMIT

```
fix(CR-EF-086): stop .ef-figure collapsing next/image fill containers to zero height
```
