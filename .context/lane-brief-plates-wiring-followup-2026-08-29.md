# Lane brief — CR-EF-086 Lane 6 wiring, FOLLOW-UP 1

**Branch:** you are already on `claude/lane-plates-wiring-2026-08-29`. Commit `2e849b6` is your previous work. Fix it in place with a new commit.

The alt text and the described-image copy are **correct and verbatim** — do not touch the wording. Two mechanical defects need fixing.

---

## DEFECT 1 — every `ef-desc` disclosure is inside a clipping or absolutely-positioned container, so none of them render

All 27 disclosures were placed **inside** the image wrapper. Every one of those wrappers either clips its overflow or is taken out of flow, so the `<details>` is invisible, clipped, or stacked under an overlay. Verified in the CSS:

| Container | CSS | Effect on a `<details>` inside it |
|---|---|---|
| `.efhome .hero-media` | `position: absolute; inset: 0; overflow: hidden` (`app/home.css:43`) | invisible, behind the hero content |
| `.efhome .wimg` | `position: relative; overflow: hidden; aspect-ratio: 3/4` (`app/home.css:133`) | clipped, overlapping the photo |
| `.ef-tech` | `position: relative; overflow: hidden` (`app/design-system.css:621`) | clipped |
| `.ds-cta-bg` | `position: absolute; inset: 0` + an `::after` gradient over `inset: 0` (`app/design-system.css:120-122`) | invisible and unclickable under the gradient |
| `.ds-cta-split-photo` / `.ds-hero-split-photo` | `position: relative; overflow: hidden` (`app/design-system.css:173, 365`) | clipped |

These wrappers exist because `next/image` with `fill` **requires** a positioned parent. That is why the disclosure cannot live inside them.

### The fix

Move every `<details className="ef-desc">` **out of the image wrapper and into normal document flow, as the wrapper's next sibling**, so it sits *below* the photograph. The reference implementation does exactly this — look at `app/visual-impairment/VisualImpairmentClient.tsx`: the `<figure>` contains the media container **and** the `<details>` as siblings, not the details nested inside the media div. Match that shape.

Per component:

- **`components/ds/PageHero.tsx`** — both layouts. Overlay: the media div is out of flow, so render the disclosure at the end of `.ds-hero-inner` (it is `position: relative` with content stacking above the image). Split: render it as the sibling immediately after `.ds-hero-split-photo`, inside that photo's grid cell's parent.
- **`components/ds/CTABand.tsx`** — same treatment. Overlay: end of `.ds-cta-inner` (`position: relative; z-index: 2`). Split: sibling after `.ds-cta-split-photo`.
- **Every page file** — move the disclosure to be the sibling after the image wrapper (`.wimg`, `.ef-tech`, `.hero-media`, etc.), not a child of it. If the wrapper has no sensible flow-level sibling position, wrap the image container and the details together in a `<figure>` and put the details second, as the VI page does.

**On dark grounds** (the overlay CTA's teal gradient, the overlay hero's ink) `.ef-desc` is a white card. That is acceptable and legible — do **not** invent new colour styling for it. If it needs a width constraint to not span the full band, `max-width: 560px` is fine; nothing else.

---

## DEFECT 2 — HTML entities inside braced JSX string literals render literally

There are **5** `imageDescription={"...&rsquo;...&mdash;..."}` props. A braced string literal is **not** JSX text, so entities are not decoded — the page will literally display `&rsquo;` and `&mdash;`.

Find them with:
```bash
grep -rn 'imageDescription={"' app | grep '&'
```

**Fix: replace the entity with the real Unicode character** inside those string literals — `&rsquo;` → `’`, `&mdash;` → `—`, `&ldquo;`/`&rdquo;` → `“`/`”`, `&#x2019;` → `’`. The files are UTF-8; literal characters are correct and are what the rest of this codebase uses in string props.

**Do not** change the wording to avoid the character.

### What is already correct — leave alone

- Entities in **plain attribute form** (`imageAlt="…&#x2019;…"`) — JSX *does* decode these. Correct as-is.
- Entities in **JSX text nodes** (`<p>…&rsquo;…</p>`) — correct as-is.

Only braced string literals (`={"..."}`) are wrong.

---

## MUST NOT change

- Any alt or described-image **wording**. It is verbatim approved copy.
- `app/HomePageClient.tsx`'s `specialist-training-esther-client.jpg` alt (EF-20) — still deliberately untouched.
- Anything under `app/visual-impairment/`.
- Do not revert the `app/falls-prevention/FallsPreventionClient.tsx` change — that route is redirected today but the copy is correct and should stay.

## VERIFY before committing

- `grep -rn 'imageDescription={"' app | grep '&'` returns **nothing**.
- No `<details className="ef-desc">` is a child of `.hero-media`, `.wimg`, `.ef-tech`, `.ds-cta-bg`, `.ds-cta-split-photo` or `.ds-hero-split-photo` — each is a following sibling in normal flow.
- Disclosure count is unchanged (27 total) — you are moving them, not adding or dropping any.
- `npx tsc --noEmit`: the pre-existing "Cannot find module 'react'/'next/image'" and "Property 'children' is missing" errors are **environmental** (junctioned `node_modules` in this worktree) and are not yours. Confirm you have introduced **no new** error beyond that existing set.

Do not run a dev server or a browser — Claude verifies visually.

## COMMIT

```
fix(CR-EF-086): render ef-desc disclosures in flow below photos, not inside clipping image wrappers
```
