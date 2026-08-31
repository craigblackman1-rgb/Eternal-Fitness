# Lane 1 follow-up — homepage doesn't use the shared ds-* image classes

## What happened

Your first commit (`feat(CR-EF-086): promote image-treatment tokens site-wide`) correctly added `filter: var(--ef-img-grade)` to `.ds-hero-bg img`, `.ds-cta-bg img`, `.ds-imgcard-media img`, `.ds-split-img img` in `app/design-system.css`. Live-verified: this reaches every page using the shared `components/ds/PageHero.tsx`/`CTABand.tsx` (confirmed on `/about`).

**Gap found on live verification:** the homepage (`app/HomePageClient.tsx`) does NOT use those shared components — it has its own bespoke image container classes defined in `app/home.css`, scoped under `.efhome`:

- `.efhome .hero-media img` (hero)
- `.efhome .ctabg img` (CTA band)
- `.efhome .wimg img` (a split-style image)
- `.efhome .si img` (process-step images)
- `.efhome .spec-photo img` (specialist portrait)

None of these currently get the studio-grade filter, so the homepage — the highest-traffic page — is not actually covered by "site-wide" yet.

## What to do

Add the same filter rule to `app/home.css`:

```css
.efhome .hero-media img,
.efhome .ctabg img,
.efhome .wimg img,
.efhome .si img,
.efhome .spec-photo img { filter: var(--ef-img-grade); }
```

Add it near the top of the file (or wherever fits the file's existing organisation) — not inside any of the individual per-class blocks, so it stays one visible rule like the `design-system.css` version.

## Verify

- `npx tsc --noEmit` clean.
- This is CSS-only — no markup changes.

## MUST NOT

- Do not touch `.tsx` files.
- Do not modify the individual selector blocks already in `home.css` beyond adding this one new rule.

Commit as a follow-up to your existing Lane 1 commit (same branch, new commit — do not amend).
