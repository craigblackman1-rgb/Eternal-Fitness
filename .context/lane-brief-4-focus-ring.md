# Lane 4 brief — Focus ring (EF-IMG-04)

Part of CR-EF-086 / wo-ef-image-plates-2026-08-28. Depends on Lane 1 (already merged into `staging` you're branched from) — the `--ef-img-*` tokens already exist in `app/globals.css`.

## Reference implementation (already built, `/visual-impairment`-only)

`app/visual-impairment/vi.css`, lines ~137-159 — `.vi-tech`: a radial vignette veil that darkens everything except a focal ellipse (positioned via `--fx`/`--fy` CSS custom properties per image), a small arc/dashed-circle SVG marker at that focal point, and a pinned instruction label top-left (dot + text on an ink pill). This is "the treatment that carries instruction" — used where the photo needs to direct the eye to a specific technique detail.

## What to build

1. Add a generic, non-`vi-`-prefixed, site-wide version in `app/design-system.css`: `.ef-tech`/`.ef-veil`/`.ef-arc`/`.ef-pin`/`.ef-dot`, same CSS as `.vi-tech` etc., reading from the global `--ef-img-*`/`--ef-vignette` tokens.
2. Apply to: homepage process steps (the `.si` images in `app/home.css`), technique/exercise imagery, and Hub exercise thumbnails. Find the real components (grep for `.si`, exercise-library/thumbnail components under `app/hub/exercises` or similar).
3. **Focus point per image:** each instance needs a real `--fx`/`--fy` value (percentage) pointing at the actual technique detail in that specific photo — not a default centre guess. Where you cannot determine a sensible focal point from the image content/filename/context, default to 50% 50% (centre) and list every such image in your final commit message as "needs a manual focus point — defaulted to centre" so this can be revisited with real image review, rather than silently guessing wrong.
4. The pin label text should be short and instructional (e.g. "Neutral spine", "Bar path") — infer something reasonable from context (exercise name, section heading) where possible; otherwise leave the pin element present but flag the copy as a placeholder needing review, same as the focus-point caveat above.

## Verify

- `npx tsc --noEmit` clean.

## MUST NOT

- Do not touch `/visual-impairment`'s own markup or `.vi-tech` definitions.
- Do not build session-plate/mount (Lane 2) or the split (Lane 3).

Commit referencing CR-EF-086 Lane 4.
