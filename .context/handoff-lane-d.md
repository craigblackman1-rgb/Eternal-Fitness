# Lane D handoff — FAQs update (build only, hold for review)

**Date:** 2026-07-29
**Commit:** `4400365` (branch `task/faqs-update-2026-07-29`, not pushed)
**Status:** Built and verified locally. **Do NOT publish** — held for Esther/Craig review per brief.

## What changed

Two image swaps in `app/faqs/FAQsPageClient.tsx` — the only two differences found between the current code and the mockup at `D:\apps\design-systems\brand-staging-2662e9\faqs.html`:

| Section | Before | After (matches mockup) |
|---|---|---|
| Hero | `studio-kettlebell-facing.jpg` | `coaching-plank-client.jpg` |
| CTA band | `studio-bench-pose.jpg` | `studio-lunge-pair.jpg` |

Both images already exist in `public/images/`. No new assets added, no dependencies changed.

## What was checked and found to already match

- **Layout:** Hero split layout (PageHero variant="split"), FAQ section grid (340px sidebar + fluid right), sticky sidebar, jump nav, grouped accordion. All match the mockup structurally.
- **Hero divider:** The shared `PageHero` component automatically renders the rose divider (`ds-hero-split-rule`) when a subhead is supplied — same as the mockup's `phero-rule`.
- **Group header number colors:** Alternating teal/rose (`gi % 2 === 0`) — matches mockup's `grp-n-teal` / `grp-n-rose` pattern.
- **"Still not sure?" contact-prompt band:** Cream bg, 18px border-radius, 34px 36px padding, heading, copy, and two buttons all match.
- **CTA band:** Eyebrow, heading, body, primary/secondary CTAs all match. Only the image differed.
- **FAQSection.tsx:** A separate component used on the homepage (smaller "Before you book" FAQ section) — not rendered on the FAQs page. Not part of this scope.

## Known differences not actioned

| Item | Why not |
|---|---|
| Accordion icon (chevron vs plus/cross) | Documented GATE in the code at `FAQsPageClient.tsx:218-224`. Requires modifying the shared Radix AccordionTrigger component. Out of scope. |
| Sticky sidebar offset (96px vs 110px) | Depends on navbar height — the shared `Navbar` component sets the actual offset, not the FAQs page. Minor visual delta, pre-existing. |

## Verification

- `tsc --noEmit` — clean (no errors)
- `next build` — clean (`✓ Compiled successfully`, `✓ Generating static pages (74/74)`)
- ECONNREFUSED / Better Auth warnings during build are pre-existing environment issues (no DB/credentials on this machine), unrelated to the change.

## To publish (when approved)

```bash
git merge task/faqs-update-2026-07-29   # or cherry-pick 4400365
git push origin main
```

Coolify auto-deploys on push to main — no manual deploy step needed.
