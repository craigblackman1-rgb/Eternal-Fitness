# Lane brief — CR-EF-086 Lane 6 unit 3: wire the approved plates

**WO:** `wo-ef-image-plates-2026-08-28` · **CR:** CR-EF-086 · **Tag:** [AUTO]
**Branch off:** `origin/staging` — **NOT `main`**. The `.ef-desc` CSS this lane depends on shipped in Lane 5 and exists only on `staging` (`app/design-system.css:664-675`). Branching off `main` will produce unstyled disclosures.

---

## GOAL

Wire the **approved** Open Design image plates into the marketing site: replace failing `alt` strings with the approved ones, and add a described-image `<details class="ef-desc">` disclosure under each significant photograph.

## SOURCE OF TRUTH — read this, do not invent copy

`.context/site-image-plates-approved-2026-08-29.json` — 31 objects, each with:

| Field | Use |
|---|---|
| `file` | the image filename, e.g. `who-health.jpg` |
| `routes` | which page(s)/slot(s) it appears in — context only |
| `verdict` | `replace` / `revise` / `keep` |
| `was` | the **exact** alt string currently in the code — use it to locate and confirm the site |
| `alt` | the **approved replacement** alt string |
| `desc` | the approved described-image copy (empty string = no disclosure for this photo) |
| `callSites` | `path:line:content` from `git grep`, captured 2026-08-29 |

`.context/plate-manifest-approved-2026-08-29.md` is the same data, human-readable, if you want to read it as prose.

**Hard rule: every `alt` and every `desc` string you write must be copied verbatim from the JSON.** Do not paraphrase, do not "improve", do not compose a description from a filename. This copy was authored by a designer looking at the photographs. Writing your own is exactly the failure mode this project has been burned by four times (the "Joan" and "Section 7 — Medical Clearance Record" incidents — see CLAUDE.md).

---

## MUST

1. **Skip `EF-20` entirely** (`specialist-training-esther-client.jpg`, `app/HomePageClient.tsx`). Its plate is marked "Ask me" — the source file was stored rotated and its provisional alt is wrong. It has been rotated upright but the plate needs re-authoring. **Leave its current alt string exactly as it is.** 30 plates in scope, not 31.

2. **Alt text.** For every plate with `verdict` of `replace` or `revise`, replace the `alt` value at each of its `callSites` with the JSON's `alt`. For `verdict: "keep"`, change nothing.
   - Some photos appear at more than one call site with *different* current alt strings — that is a known finding, and the point of the plate is that one photograph gets **one** canonical description. Apply the same approved `alt` at every call site for that file.
   - `callSites` line numbers were captured on 2026-08-29 and may drift. Match on the **filename plus the `was` string**, not on line number.

3. **Described images.** For every plate with a non-empty `desc`, render under that photograph:
   ```jsx
   <details className="ef-desc">
     <summary>Describe this image</summary>
     <p>{/* the approved desc copy, verbatim */}</p>
   </details>
   ```
   Follow the established pattern in `app/visual-impairment/VisualImpairmentClient.tsx:156-162` — the disclosure sits inside the `<figure>`, after the image. That page is the quality bar.

4. **Shared components need a prop, not a fork.** Heroes and CTA bands render through `components/ds/PageHero.tsx` and `components/ds/CTABand.tsx`, used by many pages. Add an **optional** prop (e.g. `imageDescription?: string`) that renders the disclosure when supplied and renders nothing when omitted. Per CLAUDE.md: extend these primitives **additively** — do not remove or rename existing props, and do not change default behaviour for any caller that does not pass the new prop.

5. **Do not touch `/visual-impairment`.** It already has its own three `vi-desc` disclosures and its own `vi.css`. It is the reference implementation, not a target. Plates `EF-29`, `EF-30`, `EF-31` are on that route — **leave those three alone**; they are already compliant. (So: 30 in scope minus those 3 already-done routes if their call sites are `/visual-impairment`-only — check `callSites` and skip any that resolve solely into `app/visual-impairment/`.)

6. **Escaping.** The copy contains real typographic punctuation — curly quotes, apostrophes, en/em dashes. In JSX, bare `'` and `"` in text nodes will trip `react/no-unescaped-entities`. Use the correct HTML entities (`&rsquo;`, `&ldquo;`, `&rdquo;`, `&mdash;`) as the existing code does, and **do not alter the wording to dodge the escaping**.

7. **`npx tsc --noEmit` must be clean** before you commit.

---

## DO NOT

- Do not run a dev server, do not launch a browser, do not attempt to verify visually. That is Claude's job (standing rule). Implement and stop.
- Do not "fix" any other alt text you notice that is not in the JSON.
- Do not resize, recompress, rename or move any image file.
- Do not touch `next.config.js`, redirects, or any route config.
- Do not reformat or reflow files you are otherwise editing — keep the diff to the alt strings and the added disclosures.

## VERIFY (your own checks before committing)

- Every `replace`/`revise` plate in scope: its `was` string no longer appears in the codebase, and its `alt` string does.
- Every plate with a non-empty `desc` in scope: that copy appears exactly once per rendering page.
- `EF-20`'s original alt string is still present, unchanged.
- `npx tsc --noEmit` clean.
- Report honestly: list any plate you could **not** wire and why. A documented skip is fine; a silent one is not.

## COMMIT

One commit, message:
```
feat(CR-EF-086): wire approved image plates -- rule-4 alt text + described-image disclosures (Lane 6)
```
