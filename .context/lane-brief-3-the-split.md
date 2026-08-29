# Lane 3 brief — The split (EF-IMG-03): page heroes + CTA band

Part of CR-EF-086 / wo-ef-image-plates-2026-08-28. Depends on Lane 1 (already merged into `staging` you're branched from) — the `--ef-img-*` tokens already exist in `app/globals.css`. This is the biggest lane — a real layout change, not just a filter (per the mockup's own effort note: "a day — a layout change, not a filter").

## Problem being replaced

The site's current hero/CTA treatment uses a dark scrim gradient plus an `imagePan`/`--pan` zoom hack (documented gotcha in this repo's CLAUDE.md and in `image-treatment-plates.html`'s own callouts: "The hero loses height, never width" — `object-fit: cover` crops proportionally more at wide viewports, `--hero-pos`/`--hero-pos-wide` exist as partial mitigation, and `imagePan` widens the wrapper past the viewport on the pricing hero specifically, cropping again on top).

## What "the split" means

Copy sits beside the photograph on its own ground, never on top of it via a scrim. Read `image-treatment-plates.html`'s section 03 ("The split — copy beside the photograph, never on it") for the exact visual spec before starting — this file is an Open Design mockup; if you can't access/render it, stop and flag rather than guessing the layout from the name alone.

## Where it applies

The six page heroes (`components/ds/PageHero.tsx`) and the closing CTA band (`components/ds/CTABand.tsx`). These are shared components used by About, Contact, Personal Training, Specialist Training, and others — check `grep -rl "PageHero\|CTABand" app` for the full call-site list, and confirm each still reads correctly with its existing copy length/props after the layout change (some pages pass longer copy than others).

## Known crop traps to actively avoid re-introducing

- `.ds-split-img` (`app/design-system.css`) is 3:4 portrait by default but the About page overrides it inline to 4:3 in two places and 16:10 in two more — four ratios under one class name. If your new split layout reuses `.ds-split-img`, check every call site's actual rendered ratio, don't assume the base CSS value holds.
- The homepage's own hero (`app/home.css` `.hero-media`) is a **separate, bespoke implementation**, not `PageHero.tsx` — confirm with Craig implicitly by checking whether "six page heroes" in the mockup's application-map table means the six non-home marketing pages (About/Contact/Personal Training/Specialist Training/FAQs/Pricing) or includes the homepage. Default assumption: the six are the shared-`PageHero`-component pages, homepage is out of scope for this lane (it already got the studio-grade filter in Lane 1's follow-up, but not a full split-layout rebuild) — note this assumption explicitly in your commit message so it can be corrected if wrong.

## Verify

- `npx tsc --noEmit` clean.
- List every page you touched (via which shared component) in your commit message, plus your homepage-scope assumption above.

## MUST NOT

- Do not touch the homepage's own hero/CTA markup or `.efhome` classes in `app/home.css` (see scope note above).
- Do not build session-plate/mount (Lane 2) or focus ring (Lane 4).

Commit referencing CR-EF-086 Lane 3.
