# Lane 3 follow-up — scope correction: split must be opt-in, not a global default

## What happened

Your commit made `layout` default to `"split"` on both `PageHero` and `CTABand`. Since no page's `.tsx` was updated to pass `layout` explicitly, this makes **every** caller switch to the brand-new, unreviewed split layout automatically — `grep -rln "<PageHero" app` shows 10 call sites, `<CTABand` shows 9. That's a much bigger blast radius than "the six page heroes" the brief asked for, and it silently changes `/visual-impairment`'s hero too — that page must never be touched by any lane in this WO without an explicit decision to do so (I should have said this in your original brief and didn't — my mistake, not yours).

## Fix

1. Change the default back to `layout = "overlay"` on both `PageHero` and `CTABand` (i.e. flip the default value only — keep every branch of code you already wrote, both layouts stay fully implemented and available). This means every page keeps its exact current live behaviour unless a page explicitly opts in.
2. In the six pages the mockup names as launch pages (per this repo's own CLAUDE.md: About, Contact, Personal Training, Specialist Training, FAQs, Pricing), explicitly pass `layout="split"` on the `<PageHero>` call. Their files: `app/about/AboutPageClient.tsx`, `app/contact/ContactPageClient.tsx`, `app/personal-training/PersonalTrainingClient.tsx`, `app/specialist-training/SpecialistTrainingClient.tsx`, `app/faqs/FAQsPageClient.tsx`, `app/pricing/PricingPageClient.tsx`.
3. Do the same for their `<CTABand>` calls if those pages have one (check each file — not all may).
4. **Explicitly leave these on the overlay default** (do not touch their `.tsx` files): `app/testimonials/TestimonialsPageClient.tsx`, `app/visual-impairment/VisualImpairmentClient.tsx`, `app/cancer-rehabilitation/CancerRehabClient.tsx` (redirected/dead route, per `next.config.js`), `app/falls-prevention/FallsPreventionClient.tsx` (also redirected/dead route).

## Verify

- `npx tsc --noEmit` clean.
- Confirm in your diff that exactly 6 `.tsx` files gained a `layout="split"` prop and nothing else changed in them.
- Confirm `/visual-impairment` and `/testimonials`' page files are untouched.

Commit as a follow-up on the same branch (new commit, don't amend).
