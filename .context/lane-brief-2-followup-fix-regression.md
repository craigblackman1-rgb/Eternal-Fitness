# Lane 2 follow-up — restore the lost numbered index, extend coverage

## Problem found on review

Your `SpecialistGrid.tsx` change replaced `.ds-spc-img`/`.ds-spc-n`/`.ds-spc-t`/`.ds-spc-d` with the mount treatment's `.ef-mount-win`/`.ef-mount-mat` structure — and in doing so **deleted the numbered index badge** (`.ds-spc-n`, the "01"/"02"/"03" label above each card's title) with no replacement anywhere, plus the CSS that gave the 2nd/3rd cards a staggered `margin-top` offset. Neither of those was asked for — the brief said apply the **mount treatment** (the image/caption visual style), not restructure the card's content or remove the stagger layout. The index number is real information (position in the list), not decoration — removing it silently is a content regression, not a style change.

## Fix

1. Add the numbered index back. Put it where it fits the mount pattern naturally — e.g. inside `.ef-mount-mat`, above the `<b>{item.title}</b>` line, styled similarly to how `.ds-spc-n` looked before (small, uppercase, letter-spaced, rose-text colored — use `--rose-text` not `--color-rose` per this WO's Lane 5 contrast-repair pattern, since it's small text). Keep the `.ef-mount-win`/`.ef-mount-mat` structure otherwise as you built it.
2. Restore the `:nth-child(2)`/`:nth-child(3)` staggered `margin-top` (and its mobile reset) exactly as it was, unless you have a specific reason tied to the mount treatment's own visual logic that the stagger should go — if so, say so explicitly in your commit message rather than dropping it silently.

## Also still missing from your original brief (not touched at all)

Your diff only covered `SpecialistGrid.tsx` (mount) and one Hub exercise detail image (plate) — process steps (`.ds-step-img`/`.ds-flow-step-img`) got the plate's visual layer via a shared-selector CSS rule, which is fine. But **testimonials** and **About page imagery** — both explicitly named in the brief — were not touched at all, and no reasoning was given for skipping them. Find the real testimonial card component(s) and `app/about/AboutPageClient.tsx`'s imagery, and apply the session-plate or mount treatment (pick whichever the image's actual context calls for — a testimonial photo reads more like a mount, a "who it's for" style image reads more like a plate) the same way you did for the specialist grid. If you judge a specific image shouldn't get either treatment, say why in the commit message rather than leaving it silently undone.

## Verify

- `npx tsc --noEmit` clean.
- Confirm the numbered index renders again on `/specialist-training` (or wherever `SpecialistGrid` is used — check `grep -rl "SpecialistGrid" app`).

Commit as a follow-up on the same branch (new commit, don't amend).
