# Design Brief — Site-wide "Featured & Reviewed" banner

Date: 2026-08-09
Repo: `eternal-fitness-website` · Branch: `claude/promotional-banner-design-59654e`
Deliverable owner: external design (open design) · Implementation: this repo
Related: deferred registry item `dmsiuq6y68l` ("might commission a homepage 'as featured in' banner covering both FitPro and the podcast") — this brief supersedes it and widens the scope.

---

## 1. The job

One reusable component that promotes four pieces of third-party credibility across the public marketing site:

| # | Item | What it is | Link |
|---|---|---|---|
| 1 | **FitPro article** | Esther's feature on training blind / partially sighted clients | `https://www.fitpro.com/blog/training-blind-or-partially-sighted-clients/` |
| 2 | **Storm podcast** | Podcast episode Esther appeared on | `https://share.transistor.fm/s/ac03637b` |
| 3 | **Storm blog post** | Esther's published Storm Fitness Academy interview | **URL needed** — see §8 |
| 4 | **Google reviews** | 5-star rating on the Google Business Profile | **URL + real review count needed** — see §8 |

Items 1–3 are **external publications** (press / "as featured in"). Item 4 is **social proof**. They do different jobs and the design needs to acknowledge that — see §4.

**Important:** all three articles/episodes live on other people's sites. This is *not* blocked by the fact that Eternal Fitness's own `/blog` is currently disabled (`next.config.js` redirects `/blog/*` → `/`). No blog re-enabling is required.

---

## 2. Where it goes — placement options

The site's `<Navbar />` is **`position: fixed; top: 0; height: 72px; z-index: 50`** and is rendered per-page (15 call sites), not from the root layout. It is used only by the public marketing + legal pages — the hub (`/hub`) and client portal (`/portal`) don't render it. That's the constraint that drives placement.

### ✅ Option A — In-flow band above the footer (RECOMMENDED)
A full-bleed horizontal band sitting between the last content section and the footer, on every marketing page.

- **Why:** four items need room to breathe. A band gives each one a readable label and a real click target. It also matches an existing precedent on this site (`components/ds/AccreditationStrip.tsx` — hairline-bordered strip, eyebrow label, greyscale logos going full-colour on hover).
- **Implementation cost:** low. One insertion at the top of `components/Footer.tsx` covers all 15 pages. Zero risk to the fixed nav or any page hero.
- **Trade-off:** below the fold on most pages.

### Option B — Sticky announcement bar above the nav
A thin (~44–52px) strip pinned above the navbar.

- **Why not, by default:** four items will not fit legibly in a 48px strip. It works for *one* message ("Listen to Esther on the Storm podcast →"), not four.
- **Implementation cost:** moderate and fiddly. Everything downstream assumes a 72px fixed nav: `Navbar` becomes `top-[Xpx]`, the mobile menu's `top-[72px]` becomes `top-[72+X]`, and every `.ds-hero` (`min-height: min(88vh, 780px)`, content bottom-aligned with `padding: 176px 80px 68px`) gains X of height. Needs a dismiss control and a persisted dismissal, or it nags returning visitors.
- **Use only if** Craig wants a time-limited push on a single item.

### Option C — Both
Band above the footer (permanent, all four items) + optionally a dismissible top bar later for a single campaign. Design the band first; the bar can reuse its tokens.

**Please design Option A. Note in the handback whether the same lockups would survive being compressed into Option B's height, in case that gets commissioned later.**

---

## 3. Brand system — build to these, not by eye

The canonical mockup source for this site is `D:\apps\design-systems\brand-staging-2662e9\*.html`. New UI is reconciled section-by-section against those files. Tokens below are from `app/globals.css` and `app/design-system.css` — use the CSS variables, not raw hex, wherever possible.

**Colour**
```
--color-ink          #131313   headings, primary text
--color-body         #525A61   body copy
--color-muted-text   #7E8088   captions / meta
--color-rose         #C1839F   primary brand accent
--rose-text          #AE547D   rose used as text (AA-safe)
--color-teal         #087E8B   secondary accent, eyebrow labels
--color-amber        #E8A87C   tertiary accent (used sparingly)
--color-cream        #FCF8F4   page tint
--color-warm         #F5EFEA   alt section background
--color-border-warm  #E4DDD7   hairlines, card borders
```

**Type**
- Headings / display: **DM Serif Display** (`--font-serif`), 400, tight tracking (`-.03em`).
- UI + body: **DM Sans** (`--font-dm-sans`), 300–900.
- Eyebrow pattern (`.ds-eyebrow`): 14px / 700 / `letter-spacing: .1em` / uppercase, preceded by a 26×1px rule in the accent colour.
- Body (`.ds-body`): 16px / `line-height: 1.68` / `--color-body`.

**Layout**
- Content max-width **1320px** (`--ds-max`), centred.
- Section padding: **100px 80px** desktop, **72px 28px** at ≤1000px. A band like this should sit lighter — suggest **48–56px** vertical desktop, **40px 28px** mobile.
- Card treatment (`.ds-card`): `border-radius: 18px`, `1px solid var(--color-border-warm)`, shadow `0 4px 16px rgba(30,24,20,.04), 0 20px 48px rgba(30,24,20,.07)`; hover lifts `translateY(-3px)` with a deeper shadow, 200ms ease.
- Buttons are pills (`.ef-btn`, `.ef-btn-outline`).
- Existing strip precedent: `border-top` + `border-bottom` 1px `--color-border-warm`, 32px vertical padding, teal 11px/700/`.1em` uppercase label on the left, logos at ~34px height, `grayscale opacity-60` → `grayscale-0 opacity-100` on hover over 300ms.

---

## 4. Content & structure requirements

1. **Two of the three press items share a publisher.** The Storm podcast and the Storm blog post are both Storm Fitness Academy. Do **not** render "Storm Fitness Academy" twice as two peer logos — it reads as a mistake. Design a single Storm lockup carrying two distinct links (e.g. one logo, two labelled actions: "Listen to the episode" / "Read the interview"), or clearly differentiate them with a format tag (`PODCAST` / `INTERVIEW`).

2. **Google is not press.** It needs a visually distinct treatment from the three publications — a rating block (5 stars, the numeral, the review count, "Google Reviews") rather than a logo-plus-headline lockup. Consider a two-zone band: press on the left, rating on the right, separated by a hairline.

3. **Every item is a link** and must open in a new tab (`target="_blank" rel="noopener noreferrer"`) — they all leave the site.

4. **Each press item needs a one-line hook**, not just a logo. "FitPro" alone means nothing to a prospective client in Worthing; "FitPro — on training blind and partially sighted clients" does. Keep hooks under ~55 characters. Draft copy will be supplied on request; design to that length.

5. **Tone rules that apply to all copy on this site:**
   - Esther's Level 4 is the **CanRehab Cancer and Exercise Rehabilitation** qualification specifically. Never "Level 4 Personal Trainer" or "highest in the UK" — that claim has regressed before.
   - No condition roll-calls in marketing copy; generalise. (There is a standing exception on the Specialist Training sections, which does not extend to this banner.)

6. **Google brand usage.** Don't recolour, redraw or distort Google's logo. Safest treatment: five stars + "5.0" + "Google Reviews" set in DM Sans, with the official "G" mark only if it's used unmodified from Google's brand assets. Flag which route you've taken.

---

## 5. Responsive & states

| Breakpoint | Behaviour |
|---|---|
| ≥1200px | Single row. Press lockups left, rating block right. |
| 1000–1199px | Same row, tighter gaps; hooks may truncate to one line. |
| 640–999px | Two rows: press items wrap to a 2-up grid; rating block full-width below, or vice versa. |
| <640px | Fully stacked. Rating block first (strongest social proof on mobile) — or justify a different order. |

**States to deliver:** default · hover · focus-visible · reduced-motion. The site respects `prefers-reduced-motion` in its GSAP animations; any motion here must have a static fallback.

**Accessibility (WCAG 2.2 AA — non-negotiable, this site has had a live contrast audit):**
- All text ≥4.5:1 against its actual background. Watch `--color-muted-text` (#7E8088) on `--color-warm` (#F5EFEA) — verify it, don't assume.
- Focus-visible ring on every link, not just hover.
- Logos need real `alt` text; the star rating needs an accessible name ("Rated 5.0 out of 5 from N Google reviews"), with the stars themselves `aria-hidden`.
- Minimum 44×44px touch targets on mobile.

---

## 6. Assets

**Available now:** `public/images/accreditations/fitpro.png` (used at 34px height), plus `reps.png` and `safefit.png`.

**Needed:** a Storm Fitness Academy logo (SVG preferred, or PNG at ≥3× the intended display height, transparent background). If one can't be sourced at usable quality, design a typographic fallback — a wordmark set in DM Sans that sits comfortably next to the FitPro raster logo.

Design must survive **mixed logo quality** (one raster PNG next to a possible SVG next to possible type-only). Setting all logos in a fixed-height, greyscale-by-default treatment is the existing site answer to this.

---

## 7. Handback format

The design system here is **HTML/CSS mockups, not Figma** — canonical files live in `D:\apps\design-systems\brand-staging-2662e9\` as standalone `.html`. Please deliver:

1. A self-contained `featured-reviewed-band.html` in that folder's house style, using the CSS variables in §3 (copy them into a `:root` block so it renders standalone).
2. All four breakpoints demonstrated (stacked artboards or a resizable single file).
3. Hover / focus states specified — inline in the CSS is fine.
4. A short note on any token you had to invent, so it can be promoted into `globals.css` properly rather than hardcoded.

Implementation in React (`components/ds/`) will be done in-repo from that mockup. Extend additively — the `ds/` primitives are shared by all 6 launch pages, so nothing existing gets renamed or removed.

---

## 8b. Status — 2026-08-09, built

Design delivered by open design as `D:\apps\design-systems\brand-staging-2662e9\featured-reviewed-band.html`
(full spec sheet: 4 artboards, states, contrast measurements, handback notes). Implemented on branch
`claude/promotional-banner-design-59654e`:

- `components/ds/FeaturedReviewedBand.tsx` — new primitive, exported from `components/ds/index.ts`
- `app/design-system.css` — `.fr-*` block appended
- `components/Footer.tsx` — renders the band above the footer proper

Verified live: renders on all 10 public routes (6 launch pages + 3 legal + home), absent from `/hub` and
`/portal`. All 4 breakpoints match the spec's computed values. `tsc --noEmit` clean, no console errors.

Resolved since §8 was written:
1. ✅ **Storm blog post URL** — supplied by Craig. Confirmed live: *"How to Build a Personal Training
   Business That Fits Your Life: Esther's Story"*, Storm Fitness Academy, 27 July 2026.
2. ✅ **Storm Fitness Academy logo** — supplied by Craig, `public/images/accreditations/storm-fitness-academy.webp`.
3. ⚠️ **Google Business Profile URL** — Craig supplied a Google *search-results* URL, which carried an
   `rlz` parameter (a tracking ID tied to his specific Chrome install) — not safe to bake into every
   page's HTML permanently. Substituted the standard parameter-free deep link,
   `google.com/maps/search/?api=1&query=Eternal+Fitness+Worthing`. **Swap for the real Business Profile
   share link** (Maps → the listing → Share → Copy link, typically `maps.app.goo.gl/...` or `g.page/...`)
   when Craig pulls it — the constant is isolated at the top of `FeaturedReviewedBand.tsx`.
4. ✅ **Real Google review count** — confirmed by Craig: **26**. Set in `FeaturedReviewedBand.tsx` and in
   `TestimonialsSection.tsx`'s schema.org `aggregateRating.reviewCount` (was `"2"`) in the same change.
5. ✅ **Reading confirmed** — the Storm interview and the Storm podcast episode are the *same story in two
   formats*, same title, host Jon Bond. External to this site, so the `/blog/*` redirect is irrelevant.
6. ✅ **Placement** — Option A built.

**Fully resolved — no open items remain**, aside from the Google link note in item 3 above (functional now, just not the canonical share link).

Also supplied and wired in: the real FitPro press logo (`fitpro-press.png` — a plain wordmark, distinct
from the Accreditation strip's `fitpro.png` "member of" badge, kept separate on purpose per O4 below).

Deviations from the mockup, all deliberate:
- **Media queries, not `@container`.** Equivalent here (the band is always full-bleed), but `@container`
  is ignored by older Safari, which would serve the desktop grid to a phone.
- **`.fr-tag` uses `--status-success-text` (#07717D), not `--color-teal`.** Contrast fix, see below.

Two defects found in the design and fixed during implementation:
- **Contrast fail the spec missed.** The spec verified `--color-teal` at 4.55:1 on cream, but the format
  tags sit *inside* `.fr-action`, which takes a `--color-warm` background on hover — where teal measures
  **4.22:1**, under AA for 9.5px text. Switched to the existing `--status-success-text` token (5.42:1 on
  cream, 5.02:1 on warm). Border keeps the lighter teal — non-text, 3:1 threshold.
- **Stranded arrow.** At ~990px the FitPro hook filled its last line exactly and the arrow wrapped alone
  onto the next — the stray glyph the spec's inline-arrow note was written to prevent. Bound the final
  word and arrow with `.fr-nowrap`.

## 8. Open items — needed before this can ship

All resolved as of 2026-08-09 — see §8b. Only remaining nice-to-have: swap the interim Google Maps search
link for the official Business Profile share link (§8b item 3).
