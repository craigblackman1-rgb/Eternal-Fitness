# Lane 2 brief — Session plate (EF-IMG-02) + The mount (EF-IMG-05)

Part of CR-EF-086 / wo-ef-image-plates-2026-08-28. Depends on Lane 1 (already merged into `staging` you're branched from) — the `--ef-img-*` tokens already exist in `app/globals.css`, do not redefine them.

## Reference implementation (already built, `/visual-impairment`-only)

`app/visual-impairment/vi.css` has working CSS for both treatments, scoped under `.vi-page`. Read that file in full before starting — it is your exact visual spec. Key blocks:

**Session plate** (lines ~116-135): `.vi-plate` — a 4:3 rounded card, corner "tick" marks, and a caption on an opaque-ink pill anchored bottom, never directly on the photo. Uses `filter: var(--vi-img-grade)` (now `--ef-img-grade`) plus a wash overlay and hairline border.

**The mount** (lines ~161-169): `.vi-mount` — a held-back card (max-width 430px, warm background, padding), with a windowed 3:4 photo inset and a caption printed below the photo (never over it) in a "mat" area.

## What to build

1. In `app/design-system.css` (or a new small shared partial if that fits the codebase's existing pattern better — check how other treatment classes are organized first), add **generic, non-`vi-`-prefixed, site-wide versions** of `.vi-plate`/`.vi-ticks`/`.vi-cap` and `.vi-mount`/`.vi-mount-win`/`.vi-mount-mat` — e.g. `.ef-plate`, `.ef-mount`. Same CSS, reading from the already-global `--ef-img-*` tokens (no `vi-` prefix needed since those tokens are already global from Lane 1).
2. Apply the **session plate** treatment to: the "who it's for" grid, process steps, testimonials, About page imagery, and the Hub exercise library. Find the real component/class for each (grep for the actual containers — e.g. `SpecialistGrid.tsx`, `ProcessFlow.tsx`/`NumberedSteps.tsx`, testimonial components, `AboutPageClient.tsx`, and the hub exercise library page). Wrap or restyle each image container with the new `.ef-plate` classes — check whether it's cleaner to add the class in the `.tsx` markup or to add a scoped CSS rule that targets the existing container class, matching whatever pattern the codebase already uses (prefer the existing container class + a new CSS rule over touching every JSX call site, if that reaches the same visual result).
3. Apply the **mount** treatment to: Esther's portrait, testimonial cards, pricing cards, email signature, case-study headers. Same approach — find real components, apply via CSS targeting existing containers where possible.

## Verify

- `npx tsc --noEmit` clean.
- List every file you touched and why in your final commit message.

## MUST NOT

- Do not touch `/visual-impairment`'s own markup or `vi.css`'s `.vi-plate`/`.vi-mount` definitions — leave that page exactly as is.
- Do not build the split (EF-IMG-03) or focus ring (EF-IMG-04) — those are separate lanes.
- Do not touch alt text — separate lane.

Commit referencing CR-EF-086 Lane 2.
