# Lane 5 brief — EF-A11Y six-rule layer, site-wide

Part of CR-EF-086 / wo-ef-image-plates-2026-08-28. Depends on Lane 1 (already merged into `staging` you're branched from) — `--ef-img-*` tokens exist in `app/globals.css`.

**Rescoped 2026-08-28:** the alt-text-wiring half of this lane (wiring `photo-approval-plates.html`'s 11 hand-written descriptions onto real images) is **blocked and removed from this lane** — those 11 photos were never actually uploaded to `public/images/` (confirmed by exact filename search: `coaching-barbell-technique-drill.jpg` etc. don't exist anywhere in the repo). That's tracked separately (`wo defer dmtd2xq1coh`), not your job. **Do not go looking for those files or try to guess a substitute mapping.**

## What this lane actually builds

1. **Described-images pattern, site-wide.** `app/visual-impairment/vi.css` lines ~171-184 has a working `<details class="vi-desc">` component — a collapsible summary/description block that serves low-vision users who aren't running a screen reader (distinct from `alt`, which only serves screen-reader users). Promote a non-`vi-`-prefixed version (`.ef-desc` or similar) into `app/design-system.css`, and add the actual `<details>` markup near any image where a real, non-trivial description would help (technique photos, process-step images) — same judgement call as picking which images get it on `/visual-impairment` today. Check that page for exactly where it's used as your pattern.

2. **Contrast repairs, site-wide.** `app/visual-impairment/vi.css` lines ~25-42 fixes an AA-contrast fail: `--color-rose` at full strength fails as a background for white text (2.98:1) — the page-scoped fix swaps `.ef-btn-primary`/`:focus-visible`/`.ds-badge-circle`/`.ds-figcaption` to use `--rose-text` (an accessible sibling token, already defined globally per the file's own comment) instead. Audit every other place in the codebase using `--color-rose` as a background under white/light text or as a focus ring color, and apply the same `--rose-text` swap there too — grep for `var(--color-rose)` usage first to find every call site before deciding which actually need the swap (decorative-only uses of `--color-rose` should stay as-is; only text-carrying/focus-ring uses need it).

3. **`prefers-contrast: more` media query, site-wide.** Lane 1 already made `--ef-img-*` and the vignette token respond to `prefers-contrast: more` globally. Check whether any of the treatment classes you or other lanes added (session plate, mount, focus ring, the split) need their own explicit adjustments under that same query, matching the pattern `vi.css` lines ~207-219 sets for `.vi-plate .vi-ticks`/`.vi-tech .vi-pin`.

4. **Alt-text audit for EXISTING site images** (the real, larger scope gap CR-EF-086 identified: most images already live on the site have generic or missing alt text — this is separate from, and bigger than, the 11-new-photo problem). Grep every `<img>`/`next/image` call site across `app/` and `components/` for its current `alt` value. Produce a plain list (in your commit message or a small markdown file under `.context/`) of every image whose alt is empty, a filename-derived string, or otherwise non-descriptive — do **not** invent/write new alt text yourself for these; that's a content-authoring pass for a human or a separate step, not something to guess in this lane. Just the audit list.

## Verify

- `npx tsc --noEmit` clean.

## MUST NOT

- Do not touch `.vi-page`'s own markup.
- Do not build session-plate/mount/split/focus-ring treatments — separate lanes.
- Do not invent alt-text copy — audit only.
- Do not try to source or reference the 11 missing new-shoot photos.

Commit referencing CR-EF-086 Lane 5.
