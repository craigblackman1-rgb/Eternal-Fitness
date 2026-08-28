# Open Design brief — Eternal Fitness image plates (CR-EF-086 Lane 6)

**Project:** `ef-marketing-site` (Open Design project `90556eb1-3632-4e02-a992-bc510026774c`)
**Raised by:** Craig, 2026-08-28, after testing the image-treatment rollout on staging
**Blocks:** production release of CR-EF-086 — nothing ships to `eternal-fitness.co.uk` until this lands

---

## 1. What to produce

**One artifact: `site-image-plates.html`** — an approval sheet pairing every photograph
currently on the live marketing site with the copy it needs to be accessible.

For each photograph, the plate must carry:

| Field | What it is |
|---|---|
| **Alt text** | Rule 4 compliant (see §3). Replaces what's on the site today. |
| **Described-image copy** | The body of a `<details>` disclosure shown under the photograph on the page. 1–3 sentences. This is the piece that does not exist anywhere on the site today. |
| **Verdict on the current alt** | keep / revise / replace — so we can see what actually changes |

Follow the visual pattern of the existing `photo-approval-plates.html` in this project
(photo, filename caption, copy beside it). Extend it with the described-image field, which
that file does not have.

---

## 2. Why — the gap

The site has just had a full image-treatment system applied (studio grade, session plate,
the split, focus ring, mount — all live on staging). The **visual** layer is done.

The **accessibility** layer underneath it is not, and that layer is the entire point.
`image-treatment-plates.html` says so itself:

> "A treatment is a look. This is the layer that makes the look accountable... Eternal Fitness
> trains people through cancer rehabilitation, exercise referral and complex needs; diabetic
> retinopathy, cataracts and post-stroke field loss are ordinary in that room, not hypothetical.
> **This is the differentiator hiding in the brief.**"

Current state, measured 2026-08-28 across the 9 live routes:

- **Rule 3 (described images) is implemented on 1 of 9 routes.** `/visual-impairment` has three
  `<details>` disclosures. Every other page has zero. The CSS for it shipped; it was never
  applied to a single photograph.
- **~21 of 31 photographs' alt text names no adaptation** — Rule 4's third element.
- **Heroes are the worst-served.** The largest photograph on the page carries the weakest
  description: `/specialist-training` opens on *"Specialist personal training in Worthing"*.
- **Two photographs carry different alt text on different pages** — which is why this needs to
  be a plate (one canonical description per photograph) rather than strings written per page.

**Why the existing plates don't cover this:** `photo-approval-plates.html` describes 11
new-shoot photographs beautifully — but none of them were ever uploaded to the site. The
photographs that are actually on the site have never been plated. That mismatch is the
whole problem.

---

## 3. The standard — Rules 3 and 4, verbatim from `image-treatment-plates.html`

> **Described images, visibly**
> A `<details>` disclosure under significant photographs carrying a real written description.
> `alt` serves screen-reader users; this serves the much larger group with low vision who are
> not running one and currently get nothing.

> **Alt text follows the brand's own vocabulary ban**
> What is happening, who is in frame, and what the adaptation is. Never "transformation",
> never "before", never a body description. The words in `brand.json`'s avoid list are banned
> in alt text too — that is where they usually leak back in.

**Three elements, all three required:** what is happening · who is in frame · **what the
adaptation is.** The third is the one currently missing almost everywhere, and it is the one
that makes this Eternal Fitness rather than generic compliance.

**Banned in alt text and described copy** (`brand.json` → `voice.vocabulary.avoid`):
`transformation` · `before-and-after` · `weight loss` · `aesthetic` · `quick fixes` ·
`boot-camp` · `push yourself` · `no pain no gain` · `gym-floor intimidation` · `just push harder`
No body descriptions of anyone in frame.

---

## 4. The quality bar — already achieved on `/visual-impairment`

These two are **already to standard. Do not rewrite them.** They define the target:

**`hero-vi-kettlebell-rack.jpg`**
> "Esther standing at the kettlebell rack in the private Worthing studio, smiling towards the
> camera with one hand resting on a bell that is racked in its usual place"

The adaptation is in the last six words — bells live in fixed, known positions.

**`studio-fixed-positions.jpg`**
> "The private studio between sessions, empty: bare rubber matting on the floor with nothing
> left out on it, and weights, exercise balls and resistance bands stored on wall racks"

The adaptation is the whole sentence — clear floor, nothing underfoot, fixed storage.

**Contrast that with the same subject elsewhere.** `studio-1.jpg` — also an empty studio, used
on `/` and `/specialist-training` — currently reads *"Eternal Fitness private studio in
Worthing."* Same room. One tells a low-vision reader what they need to know; the other is a
search string.

---

## 5. The photographs

**All 31 are staged at:**
`imagery/site-current-2026-08-28/` inside this Open Design project.

These are the actual files served by the live site, copied from the repo. **Look at them.**
Every description must come from the photograph in front of you.

### Heroes — highest priority (largest image on each page, weakest copy today)

| File | Route | Current alt | Verdict |
|---|---|---|---|
| `who-health.jpg` | `/specialist-training` | "Specialist personal training in Worthing" | **replace** — SEO string, 0 of 3 |
| `about-hero-esther-portrait.png` | `/about` | "Esther Fair smiling in her private studio in Worthing" | **replace** |
| `hero-pullup-rack.png` | `/` | "Esther Fair smiling mid-stretch at the power rack in her private Worthing studio" | revise — add adaptation |
| `studio-kettlebell-shelf.jpg` | `/contact` | "The kettlebell rack in the private Worthing studio" | revise + reconcile (see below) |
| `consultation-warm-chat.jpg` | `/faqs` | "Esther chatting warmly with a client in the private Worthing studio" | revise + reconcile |
| `coaching-bench-press-spot.jpg` | `/personal-training` | "Esther coaching a client through an incline dumbbell press in her private Worthing studio" | revise — add adaptation |
| `pricing-hero-coaching.jpg` | `/pricing` | "Esther coaching a client through a split squat with a barbell in the private Worthing studio" | revise |
| `consultation-programme-review.jpg` | `/testimonials` | "Esther Fair reviewing a client's programme together in her private Worthing studio" | revise |
| `hero-vi-kettlebell-rack.jpg` | `/visual-impairment` | *(the bar)* | **keep — reference only** |

### Closing CTA bands — full-bleed, second-largest on each page

| File | Route | Current alt |
|---|---|---|
| `studio-1.jpg` | `/`, `/specialist-training` | "Eternal Fitness private studio in Worthing" — **replace, SEO string** |
| `esther-headshot-smile.jpg` | `/contact` | "Esther Fair smiling" — **replace** |
| `studio-kettlebell-shelf.jpg` | `/about` | "Kettlebells racked on the shelf in the Eternal Fitness studio" |
| `coaching-deadlift-setup.jpg` | `/faqs` | "Esther coaching a client through a deadlift setup" |
| `studio-slam-balls-rack.jpg` | `/personal-training` | "Slam balls racked in the Eternal Fitness studio" |
| `pricing-studio.jpg` | `/pricing` | "Esther coaching a client through a walking barbell lunge…" |
| `consultation-warm-chat.jpg` | `/testimonials` | "Esther Fair chatting warmly with clients during a session" |
| `studio-lunge-pair.jpg` | `/visual-impairment` | `alt=""` — **correctly decorative behind text, leave as-is** |

### Section / inline photographs

`why-coaching-review.jpg` · `approach-step1-plank-coaching.jpg` ·
`approach-step2-lunges-together.png` · `approach-step3-deadlift-clients.jpg` ·
`specialist-training-esther-client.jpg` (all `/`) ·
`about-story-deadlift.jpg` · `about-quals-barbell-hands.jpg` · `about-experience-coaching.png` ·
`about-studio-band-stretch.jpg` · `about-studio-kettlebells.jpg` (all `/about`) ·
`mobility-hip-flexor-stretch.jpg` (`/contact`) · `consultation-programme-notes.jpg`
(`/personal-training`) · `studio-kneel-stretch.jpg` (`/specialist-training`) ·
`coaching-plank-lowback-cue.jpg` · `esther-portrait-studio.jpg` · `studio-fixed-positions.jpg`
(all `/visual-impairment` — the last is **reference only, do not rewrite**)

### Two photographs need one canonical description each

Same file, two different alt strings today. Pick one description per photograph; it will be
used on both pages.

- **`consultation-warm-chat.jpg`** — `/faqs` hero *and* `/testimonials` CTA
- **`studio-kettlebell-shelf.jpg`** — `/contact` hero *and* `/about` CTA

---

## 6. Which photographs get a described-image disclosure?

Rule 3 says "significant photographs" — it does not define significant. **Propose the line and
say why**, rather than applying it to all 31 by default. A reasonable starting position: every
hero and every CTA band (the two largest on each page), plus any inline photograph that carries
technique or access information. A decorative background behind text does not need one — it
needs `alt=""`, which `studio-lunge-pair.jpg` already correctly has.

---

## 7. Hard constraints

1. **Author from the photographs, not the filenames.** This is the single most important
   instruction in this brief. Describing a photograph you have not looked at produces
   confident, plausible, wrong copy — this repo has shipped exactly that before (placeholder
   client names and an invented "Medical Clearance Record" section both reached live copy).
   If a photograph is ambiguous, say so on the plate and flag it for Esther rather than
   guessing what is happening in it.
2. **No condition roll-calls.** The site's standing copy rule — generalise. Do not list named
   conditions in a description.
3. **Esther's qualification is CanRehab Level 4 Cancer and Exercise Rehabilitation** — never
   "Level 4 Personal Trainer" or "highest in the UK". That phrasing is a known regression.
4. **Describe adaptation, not ability.** "one hand resting on a bell racked in its usual place"
   is the register. Never describe anyone's body, size, or capability.
5. Everything in §3's vocabulary ban applies to both fields.

---

## 8. Definition of done

- All 31 photographs plated; the 3 marked *reference only* carried through unchanged.
- Each plate has: rule-4 alt, described-image copy (or a reasoned "not significant"), and a
  keep/revise/replace verdict against the current text.
- The two duplicated photographs resolved to one description each.
- A short §-note proposing where the "significant photograph" line falls, per §6.
- Any photograph you could not confidently describe flagged for Esther, not guessed.

**After approval** the copy gets wired into the site by a build lane — the plates are the
source of truth, so nothing needs to be re-decided at implementation time.
