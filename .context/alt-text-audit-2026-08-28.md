# Alt-text audit — CR-EF-086 Lane 5

Audit of every `<img>` / `<next/image>` call site across `app/` and `components/` for
current alt text quality. Generated 2026-08-28.

**Method:** Grepped all `.tsx`/`.jsx` files for `<img` and `<Image` tags, read each call
site, categorised the alt value.

---

## Summary

- **Total image call sites:** 38 (14 `<img>`, 24 `<Image>`)
- **Empty alt (`alt=""`):** 3 — all correctly decorative
- **Missing alt attribute:** 0
- **Filename-derived alt:** 0
- **Descriptive / adequate:** 33
- **Fallback-to-title:** 5 (see below)
- **Empty-string default in component:** 1 (CTABand — all callers pass explicit alt)

---

## Findings requiring attention

### 1. Component fallback-to-title pattern (5 sites)

These components use `alt={something.title}` as a fallback when no explicit `imageAlt`
prop is passed. The title is a section heading, not an image description — "Initial
consultation" does not describe what the photo shows. Current callers mostly pass
`imageAlt`, but the fallback is still non-descriptive.

| File | Line | Current fallback | Severity |
|------|------|-----------------|----------|
| `components/ds/NumberedSteps.tsx` | 24 | `alt={step.imageAlt ?? step.title}` | Medium — title ≠ image description |
| `components/ds/SpecialistGrid.tsx` | 25 | `alt={item.imageAlt ?? item.title}` | Medium — same pattern |
| `components/ds/FeatureCard.tsx` | 27 | `alt={imageAlt ?? title}` | Medium — same pattern |
| `components/ds/CTABand.tsx` | 31 | `alt={imageAlt ?? ""}` | Low — all callers pass explicit alt, but empty fallback is a risk |
| `app/blog/[slug]/BlogPostClient.tsx` | 130 | `alt={post.title}` | Medium — blog post title is not an image description |

**Recommendation:** The shared components should require `imageAlt` (make the prop
non-optional) or generate a better fallback. Blog post featured images should use a
dedicated `image_alt` field from the CMS, not the post title.

### 2. Empty alt — decorative images (3 sites, all correct)

| File | Line | Context | Verdict |
|------|------|---------|---------|
| `app/visual-impairment/VisualImpairmentClient.tsx` | 332 | CTA band background photo | Correct — decorative background behind text |
| `app/portal/(protected)/training/TrainingClient.tsx` | 259 | Exercise thumbnail in list | Correct — exercise name displayed as adjacent text |
| `app/hub/m/train/[sessionId]/TrainScreen.tsx` | 1353 | Exercise thumbnail (aria-hidden parent) | Correct — decorative, parent is aria-hidden |

### 3. Short brand-name alt on logos (acceptable)

| File | Line | Alt value | Verdict |
|------|------|-----------|---------|
| `app/visual-impairment/VisualImpairmentClient.tsx` | 192 | `"FitPro"` | Acceptable — brand logo |
| `components/ds/FeaturedReviewedBand.tsx` | 90 | `"FitPro"` | Acceptable — brand logo |
| `components/ds/FeaturedReviewedBand.tsx` | 108 | `"Storm Fitness Academy"` | Acceptable — brand logo |
| `components/ds/AccreditationStrip.tsx` | 16,34 | `"FitPro member"` | Acceptable — brand logo |
| `app/hub/m/TodayScreen.tsx` | 247 | `"Eternal Fitness"` | Acceptable — app logo |
| `app/hub/m/calendar/OutlookTriageClient.tsx` | 127 | `"Eternal Fitness"` | Acceptable — app logo |

### 4. Dynamic content alt (acceptable)

| File | Line | Alt value | Verdict |
|------|------|-----------|---------|
| `app/blog/[slug]/BlogPostClient.tsx` | 106,163 | `{post.author_name}` | Acceptable — author avatar |
| `app/hub/(protected)/exercises/exercise-browser.tsx` | 447,583 | `{ex.name}` / `{selectedExercise.name}` | Acceptable — exercise photo |
| `app/hub/(protected)/clients/.../SessionEditor.tsx` | 1216 | `{ex.exercise_name}` | Acceptable — exercise photo |

### 5. Descriptive alt — no issues (24 sites)

All remaining `<Image>` call sites in `app/HomePageClient.tsx`,
`app/about/AboutPageClient.tsx`, `app/contact/ContactPageClient.tsx`,
`app/personal-training/PersonalTrainingClient.tsx`,
`app/cancer-rehabilitation/CancerRehabClient.tsx`,
`app/blog/BlogPageClient.tsx`, `app/visual-impairment/VisualImpairmentClient.tsx`,
`components/WhySection.tsx`, and all CTABand callers pass descriptive,
context-appropriate alt text.

---

## No action required in this lane

This audit is read-only per the Lane 5 brief. The fallback-to-title pattern (finding 1)
is a code-quality issue for a future content-authoring or component-hardening pass, not
something to invent copy for in this lane.
