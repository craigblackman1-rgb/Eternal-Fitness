# Lane 1 brief — Image plates foundation (CR-EF-086 / wo-ef-image-plates-2026-08-28)

## Goal

Promote the image-treatment tokens and studio-grade filter that currently only exist scoped to `.vi-page` in `app/visual-impairment/vi.css` into a site-wide home, and apply the studio-grade filter to every photograph on the site. This is the foundation lane — later lanes (session plate, the split, focus ring, the mount, a11y/alt-text) build on top of these same tokens, so get this one exactly right.

## Source of truth

Reference mockup: the "01 · Studio grade" and "The part that actually serves sight loss" sections of `image-treatment-plates.html` (an Open Design mockup — ask if you need its content re-described, do not guess at values not given below).

## What exists today (read this file first)

`app/visual-impairment/vi.css`, lines 14-23:

```css
.vi-page {
  --vi-img-grade: saturate(.94) contrast(1.05) brightness(1.02);
  --vi-img-wash: var(--color-warm);
  --vi-img-wash-o: .05;
  --vi-img-hair: color-mix(in srgb, var(--color-ink) 12%, transparent);
  --vi-img-hair-w: 1px;
  --vi-plate-o: .92;
  --vi-vignette: color-mix(in srgb, var(--color-ink) 42%, transparent);
}
```

And the studio-grade rule, lines 44-53:

```css
.vi-plate img, .vi-tech img, .vi-mount .vi-mount-win img { filter: var(--vi-img-grade); }
.vi-plate::after, .vi-tech::after, .vi-mount .vi-mount-win::after {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none; border-radius: inherit;
  background: var(--vi-img-wash); opacity: var(--vi-img-wash-o); mix-blend-mode: multiply;
}
.vi-plate::before, .vi-tech::before, .vi-mount .vi-mount-win::before {
  content: ''; position: absolute; inset: 0; z-index: 5; pointer-events: none; border-radius: inherit;
  box-shadow: inset 0 0 0 var(--vi-img-hair-w) var(--vi-img-hair);
}
```

And the `prefers-contrast: more` override, lines 207-219.

## What to build

1. In `app/globals.css` (where the other `--color-*` tokens live), add these same tokens **without the `vi-` prefix** and **without `.vi-page` scoping** — i.e. on `:root` (or wherever the existing brand tokens are declared), so every page can read them:
   - `--ef-img-grade`, `--ef-img-wash`, `--ef-img-wash-o`, `--ef-img-hair`, `--ef-img-hair-w`, `--ef-plate-o`, `--ef-vignette` — same values as above.
   - Also move the `@media (prefers-contrast: more)` override for these tokens to be global (not `.vi-page`-scoped).
2. Apply the studio-grade filter (`filter: var(--ef-img-grade)`) to **every photograph site-wide**. The mockup's own application-map note says this is "four selectors in `ef-site.css`" — find the actual equivalent selectors in this codebase for: page hero images (`PageHero.tsx` / `.ds-hero`), CTA band images (`CTABand.tsx` / `.ds-cta`), image cards (`.ds-imgcard-media`), and split images (`.ds-split-img`). Apply the filter directly to `img` inside those containers in `app/design-system.css`.
3. **Do not modify `app/visual-impairment/vi.css`'s existing selectors or remove the `--vi-*` variable names** — instead, redefine them to reference the new global tokens (e.g. `--vi-img-grade: var(--ef-img-grade);`) inside `.vi-page`, so that page keeps working unchanged while now sourcing from one shared definition instead of duplicating it. This avoids a two-source-of-truth drift.
4. Leave `.vi-plate`, `.vi-tech`, `.vi-mount` class definitions themselves alone — those are session-plate/focus-ring/mount treatments for a later lane, not this one.

## Verify before you finish

- `npx tsc --noEmit` clean (should be unaffected — this is CSS only, but confirm nothing else broke).
- Visually confirm in the built CSS that `.vi-page`'s computed `--vi-img-grade` still resolves to `saturate(.94) contrast(1.05) brightness(1.02)` (via the new indirection) — no visual change to `/visual-impairment`.
- Confirm the site-wide selectors you added target real, existing image containers — grep the codebase for `.ds-hero`, `.ds-cta`, `.ds-imgcard-media`, `.ds-split-img` to find every real component using them (there may be more than the four named files) and make sure the filter reaches all of them.

## MUST NOT

- Do not touch component `.tsx` files' markup/props — CSS-only lane.
- Do not apply the session-plate/focus-ring/mount treatments (`.vi-plate`, `.vi-tech`, `.vi-mount` classes) anywhere outside `/visual-impairment` — that's Lane 2/4/2 in the parent WO, not this lane.
- Do not touch `next.config.js`, migrations, or anything outside `app/globals.css`, `app/design-system.css`, `app/visual-impairment/vi.css`.

Commit with a message referencing CR-EF-086 / wo-ef-image-plates-2026-08-28 Lane 1.
