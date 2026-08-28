# Work Order: Eternal Fitness — Image plates (CR-EF-086)

**Slug:** `wo-ef-image-plates-2026-08-28`
**Status:** ACTIVE
**Owner:** claude (this session)
**Apps:** eternal-fitness-website
**Scope:** CR-EF-086 — site-wide VI (visual impairment) accessibility pass. Craig's decision 2026-08-28: build both (a) real screen-reader-quality alt text site-wide and (b) the full `image-treatment-plates.html` visual grading system site-wide, replacing the current `/visual-impairment`-only pilot.

Source mockups (Open Design project `90556eb1-3632-4e02-a992-bc510026774c`, delivered 2026-08-25):
- `photo-approval-plates.html` — alt-text descriptions, 11 new-shoot photos
- `image-treatment-plates.html` — 5 treatments (EF-IMG-01..05) + 6-rule a11y layer (EF-A11Y), with an application map and effort estimates
- `homepage-image-plates.html` — homepage-specific plates
- Existing partial pilot: `app/visual-impairment/vi.css` (4 of 5 treatments, ported 2026-08-11, scoped to `.vi-page` only)

---

## DONE (definition)

- [ ] Alt-text audit complete: every `<img>`/`next/image` site-wide has a real, descriptive `alt` (not empty/generic/filename-derived).
- [ ] EF-IMG-01 (studio grade) applied to every photograph site-wide via shared tokens (promoted out of `.vi-page` scope into `design-system.css`/`globals.css`).
- [ ] EF-IMG-02 (session plate) applied to "who it's for" grid, process steps, testimonials, About, Hub exercise library.
- [ ] EF-IMG-03 (the split) applied to the six page heroes + CTA band, replacing the scrim/`--pan` hack.
- [ ] EF-IMG-04 (focus ring) applied to homepage process steps, technique imagery, Hub exercise thumbnails — each with a real focus point, not a default centre.
- [ ] EF-IMG-05 (the mount) applied to Esther's portrait, testimonial cards, pricing cards, email signature, case-study headers.
- [ ] EF-A11Y six-rule layer (contrast steps, described images via `<details class="vi-desc">` pattern) applied site-wide, not just `/visual-impairment`.
- [ ] Design Parity check against the mockups (section-by-section, not eyeballed) before any lane is marked done.
- [ ] Live-verified in browser (desktop + mobile) on staging before prod promotion.

---

## LANES

### Lane 1 — [AUTO] Foundation: shared tokens + studio grade + a11y contrast layer

Promote the `--vi-img-*`/`--vi-vignette`/contrast tokens currently defined inside `.vi-page` in `app/visual-impairment/vi.css` into a site-wide home (`app/design-system.css` or `app/globals.css`) under non-`vi-`-prefixed names (e.g. `--ef-img-grade`). Apply EF-IMG-01's studio-grade filter to every photograph site-wide (four selectors per the mockup's effort note). Wire the `prefers-contrast: more` media query site-wide, not scoped to `.vi-page`. Do **not** touch `/visual-impairment` page's own behaviour — it should keep working, now reading from the promoted tokens instead of its local ones.

**MUST:** land first — every other lane in this WO builds on these tokens.
**VERIFY:** every photo on the homepage still renders (no missing filter var), `/visual-impairment` page unchanged visually.

### Lane 2 — [AUTO, depends on Lane 1] EF-IMG-02 session plate + EF-IMG-05 the mount

Apply `.vi-plate`-equivalent treatment (ticks + opaque-ink caption) to: "who it's for" grid, process steps, testimonials, About, Hub exercise library. Apply `.vi-mount`-equivalent treatment (caption below, held-back mat) to: Esther's portrait, testimonial cards, pricing cards, email signature, case-study headers. Reference `image-treatment-plates.html` sections 02 and 05 for exact visual spec.

### Lane 3 — [AUTO, depends on Lane 1] EF-IMG-03 the split (page heroes + CTA band)

Bigger layout change (per mockup: "a day — a layout change, not a filter"). Replaces the scrim stack and `--pan` hack on the six page heroes (`PageHero.tsx`) and `CTABand.tsx`. Reference `image-treatment-plates.html` section 03. Watch the known crop traps already documented in that mockup: the `.ds-split-img` four-ratio override problem on About, and the hero's `--hero-pos`/`--hero-pos-wide` split.

### Lane 4 — [AUTO, depends on Lane 1] EF-IMG-04 focus ring

Homepage process steps, technique imagery, Hub exercise thumbnails. Needs a real focus point per image (not default-centre) — pull from `image-treatment-plates.html`'s focus-point data if specified per image, otherwise flag images needing a manual point as a deferred follow-up rather than guessing.

### Lane 5 — [AUTO, depends on Lane 1] EF-A11Y site-wide + alt-text wiring

1. Wire the 11 `photo-approval-plates.html` descriptions onto their matching site images.
2. Audit every remaining image in `public/images/` and every `<img>`/`next/image` call site for missing/generic alt text (Claude does this authoring pass directly — content, not app code — before handing wiring to the lane).
3. Apply the described-images `<details class="vi-desc">` pattern site-wide (currently `/visual-impairment`-only).
4. Promote the contrast-repair rules (`.vi-page .ef-btn-primary` etc.) site-wide where the same AA-fail pattern exists outside `/visual-impairment`.

---

## LEDGER

- 2026-08-28: WO created. CR-EF-086 register reconciliation done (see `workorder-ef-consolidated-2026-08-27.md` D11). Craig chose "alt-text + full visual rollout" scope. Lanes scoped from `image-treatment-plates.html`'s own application map (EF-IMG-01..05, EF-A11Y).
