# Lane brief — CR-EF-086: the "Describe this image" disclosure must sit UNDER ITS OWN IMAGE

**Branch off:** `origin/staging`.
**Raised by Craig, 2026-08-29, looking at the deployed staging site.** His words: *"the describe this image should always sit under the image, they are not."* He is right.

---

## THE RULE (the only requirement)

> Every `<details class="ef-desc">` renders **immediately below the photograph it describes**, left-aligned with that photograph and no wider than it.

Not under the section. Not under the text column. Under **its own image**.

---

## Measured evidence (local dev server, 1440×900 viewport, 2026-08-29)

Numbers are `[left, right]` in px, and the vertical gap from the image's bottom to the disclosure's top.

### `/` — 1 of 6 correct

| # | Image | Disclosure X | Image X | Gap | Verdict |
|---|---|---|---|---|---|
| 0 | `hero-pullup-rack` (overlay hero) | 0–164 | 38–1862 | **−185** | ❌ sits *over* the image |
| 1 | `why-coaching-review` (`.wimg`) | 80–619 | 80–619 | +12 | ✅ **correct — this is the target shape** |
| 2 | `approach-step1` (`.ef-tech`) | 80–220 | 985–1345 | +56 | ❌ far left of its image |
| 3 | `approach-step2` (`.ef-tech`) | 80–220 | 985–1345 | +56 | ❌ |
| 4 | `approach-step3` (`.ef-tech`) | 80–220 | 985–1345 | +56 | ❌ |
| 5 | `studio-1` (CTA band, `.ctabg`) | 0–1425 | 0–1425 | **−613** | ❌ inside the band, over the image |

### `/contact` — 1 of 2 correct

| # | Image | Disclosure X | Image X | Gap | Verdict |
|---|---|---|---|---|---|
| 0 | `studio-kettlebell-shelf` (split hero) | 53–633 | 633–1373 | +12 | ❌ **in the text column; the photo is the other column** |
| 1 | `mobility-hip-flexor-stretch` | 80–681 | 80–681 | +12 | ✅ correct |

### `/about` — 2 of 6 correct

| # | Image | Disclosure X | Image X | Gap | Verdict |
|---|---|---|---|---|---|
| 0 | `about-story-deadlift` | 80–619 | 80–619 | **−28** | ❌ aligned but overlapping the image |
| 1 | `about-quals-barbell-hands` | 80–619 | 699–1345 | +52 | ❌ wrong column |
| 2 | `about-experience-coaching` | 699–1345 | 80–619 | −259 | ❌ **inverted** — alternating split, disclosure on the text side |
| 3 | `about-studio-band-stretch` | 80–703 | 80–703 | +12 | ✅ correct |
| 4 | `about-studio-kettlebells` | 723–1345 | 723–1345 | +12 | ✅ correct |
| 5 | `studio-kettlebell-shelf` (split CTA) | 53–633 | 633–1373 | +12 | ❌ wrong column |

**Also check and fix the same way:** `/personal-training`, `/specialist-training`, `/pricing`, `/faqs`, `/testimonials`, `/falls-prevention`. They were not measured but use the same components, so expect the same faults.

---

## The fix

### Contained images — wrap image + disclosure in one `<figure>`

The four already-correct cases work because the disclosure is a **flow sibling of the image container inside the same layout slot**. Everywhere the disclosure lands in the wrong column, it is because it was added as an **extra child of a two-column grid/flex parent**, so it became a new grid item in the *first* column instead of joining the photo's cell.

For every contained image, wrap the existing image container **and** its disclosure in a single element that takes the image's place in the parent layout:

```jsx
<figure className="ef-figure">
  <div className="ds-hero-split-photo"> …existing image markup, unchanged… </div>
  <details className="ef-desc">
    <summary>Describe this image</summary>
    <p>…approved copy, unchanged…</p>
  </details>
</figure>
```

`figure` needs `margin: 0` and must not introduce its own width — it simply occupies the grid/flex slot the image container used to occupy, so the disclosure inherits the photo's column and width. Add a minimal `.ef-figure { margin: 0; min-width: 0; display: flex; flex-direction: column; }` to `app/design-system.css` if needed; do not restyle `.ef-desc` itself.

Applies to: `.ds-hero-split-photo`, `.ds-cta-split-photo`, `.ef-tech` (the three homepage process steps), and `/about`'s alternating split images.

**`/about` #0 (`about-story-deadlift`, gap −28)** is aligned but overlapping — the disclosure is escaping upward into the image box. The same `<figure>` wrap fixes it; confirm the gap becomes positive.

### Full-bleed background images — put the disclosure below the band

`.efhome .hero-media`, `.efhome .ctabg` and `.ds-cta-bg` are `position: absolute; inset: 0` backgrounds spanning the whole section. There is no "column" to align to — the image *is* the band. So the disclosure must render **immediately after the closing `</section>`**, as a full-width strip in normal flow, so it reads as sitting under the photograph rather than floating on top of it.

It must **not** be inside `.ds-cta-inner`, `.ds-hero-inner` or `.ctac` — that is where it is now, which puts it over the image.

### Do not touch

- Any alt or described-image **wording** — it is approved copy.
- The four already-correct cases listed above; use them as the reference.
- `app/HomePageClient.tsx`'s `specialist-training-esther-client.jpg` alt (EF-20).
- Anything under `app/visual-impairment/`.

---

## VERIFY before committing

`npx tsc --noEmit` clean, and confirm by reasoning over the markup that for **every** disclosure the image container and the disclosure are siblings inside one wrapper occupying the image's layout slot (contained case), or the disclosure is outside the section (full-bleed case).

Do not run a dev server or a browser — Claude re-runs the positional audit and will check every disclosure against `alignedX && gap between 0 and 80px`.

## COMMIT

```
fix(CR-EF-086): render each ef-desc disclosure under its own image, not the text column
```
