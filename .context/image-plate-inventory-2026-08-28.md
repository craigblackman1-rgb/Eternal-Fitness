# Image plate inventory — the real site photographs (CR-EF-086 Lane 6)

Generated 2026-08-28 by parsing every `<Image>`/`<img>` on the **9 live marketing routes**
(excludes `/cancer-rehabilitation`, `/falls-prevention`, `/blog` — all redirected in
`next.config.js`; excludes hub/portal, which are behind auth and not in this scope).

This is the input for the Open Design authoring pass. It exists because the current plates
(`photo-approval-plates.html`) describe **11 new-shoot photographs that were never uploaded**,
while the photographs actually on the site have never been plated.

---

## Totals

| | |
|---|---|
| Placements | 35 |
| **Unique photographs** | **32** |
| Logos / accreditation marks (short alt correct, out of scope) | 3 |
| Correctly-empty decorative (`alt=""` behind text) | 1 |
| **Real content photographs needing a plate** | **~28** |
| Described-image disclosures (`.ef-desc`) outside `/visual-impairment` | **0** |
| Photographs whose alt names no adaptation (Rule 4, 3rd element) | **~21** |
| Photographs carrying *different* alt text on different pages | 2 |

---

## The gap in one comparison

Two photographs of the same subject — the empty studio — described completely differently:

**`/visual-impairment` → `studio-fixed-positions.jpg`**
> "The private studio between sessions, empty: bare rubber matting on the floor with nothing
> left out on it, and weights, exercise balls and resistance bands stored on wall racks"

That *is* the adaptation: clear floor, fixed storage positions. A VI client learns something
they need from it.

**`/` and `/specialist-training` → `studio-1.jpg`**
> "Eternal Fitness private studio in Worthing"

An SEO string. Same room, tells a low-vision reader nothing.

The `/visual-impairment` page is the quality bar; it was authored to it in August. Nothing
else on the site was.

---

## Rule 4 — worst offenders (alt fails 2 or 3 of the 3 elements)

Rule 4: *"what is happening, who is in frame, and what the adaptation is."*

| Photograph | Route(s) | Current alt | Fails |
|---|---|---|---|
| `who-health.jpg` | `/specialist-training` **(hero)** | "Specialist personal training in Worthing" | all 3 — SEO string |
| `studio-1.jpg` | `/`, `/specialist-training` | "Eternal Fitness private studio in Worthing" | all 3 — SEO string |
| `esther-headshot-smile.jpg` | `/contact` (CTA) | "Esther Fair smiling" | what + adaptation |
| `about-hero-esther-portrait.png` | `/about` **(hero)** | "Esther Fair smiling in her private studio in Worthing" | what + adaptation |
| `esther-portrait-studio.jpg` | — | "Esther Fair smiling in the private Worthing studio" | what + adaptation |
| `studio-kneel-stretch.jpg` | `/specialist-training` | "Esther Fair coaching a client in the Eternal Fitness studio in Worthing" | what + adaptation |
| `studio-kettlebell-shelf.jpg` | `/about`, `/contact` **(hero)** | inconsistent (see below) | adaptation |

**Heroes are the worst-served** — exactly as Craig spotted. `/specialist-training` and `/about`
open on the largest photograph on the page carrying the weakest description on the site.

---

## Same photograph, two different descriptions

A photograph should have one canonical description. These don't — which is the argument for
plates as the source of truth rather than per-call-site alt strings:

**`consultation-warm-chat.jpg`**
- `/faqs` — "Esther chatting warmly with a client in the private Worthing studio"
- `/testimonials` — "Esther Fair chatting warmly with clients during a session"

**`studio-kettlebell-shelf.jpg`**
- `/about` — "Kettlebells racked on the shelf in the Eternal Fitness studio"
- `/contact` — "The kettlebell rack in the private Worthing studio"

---

## Full inventory by route

| Route | Photograph | Current alt |
|---|---|---|
| `/` | `hero-pullup-rack.png` **(hero)** | Esther Fair smiling mid-stretch at the power rack in her private Worthing studio |
| `/` | `why-coaching-review.jpg` | Esther Fair coaching a client through a session, reviewing their programme notes… |
| `/` | `approach-step1-plank-coaching.jpg` | Esther adjusting a client's form during a plank in the private Worthing studio |
| `/` | `approach-step2-lunges-together.png` | Esther and a client doing lunges together, laughing, in the private Worthing studio |
| `/` | `approach-step3-deadlift-clients.jpg` | Two clients working through a dumbbell deadlift together… |
| `/` | `specialist-training-esther-client.jpg` | Esther guiding a client through specialist training in the private Worthing studio |
| `/` | `studio-1.jpg` (CTA) | Eternal Fitness private studio in Worthing |
| `/about` | `about-hero-esther-portrait.png` **(hero)** | Esther Fair smiling in her private studio in Worthing |
| `/about` | `about-story-deadlift.jpg` | Esther Fair coaching a client through a deadlift in her private studio in Worthing |
| `/about` | `about-quals-barbell-hands.jpg` | Esther steadying a barbell for a client in the studio |
| `/about` | `about-experience-coaching.png` | Esther coaching a client through a dumbbell exercise in the studio |
| `/about` | `about-studio-band-stretch.jpg` | Esther guiding a client through a resistance band stretch beside the squat rack |
| `/about` | `about-studio-kettlebells.jpg` | Esther guiding a client through a mobility stretch on the studio mats |
| `/about` | `studio-kettlebell-shelf.jpg` (CTA) | Kettlebells racked on the shelf in the Eternal Fitness studio |
| `/contact` | `studio-kettlebell-shelf.jpg` **(hero)** | The kettlebell rack in the private Worthing studio |
| `/contact` | `mobility-hip-flexor-stretch.jpg` | Esther and a client working through a kneeling hip stretch on the mats |
| `/contact` | `esther-headshot-smile.jpg` (CTA) | Esther Fair smiling |
| `/faqs` | `consultation-warm-chat.jpg` **(hero)** | Esther chatting warmly with a client in the private Worthing studio |
| `/faqs` | `coaching-deadlift-setup.jpg` (CTA) | Esther coaching a client through a deadlift setup |
| `/personal-training` | `coaching-bench-press-spot.jpg` **(hero)** | Esther coaching a client through an incline dumbbell press… |
| `/personal-training` | `consultation-programme-notes.jpg` | Esther going through the session plan with a client before they start |
| `/personal-training` | `studio-slam-balls-rack.jpg` (CTA) | Slam balls racked in the Eternal Fitness studio |
| `/pricing` | `pricing-hero-coaching.jpg` **(hero)** | Esther coaching a client through a split squat with a barbell… |
| `/pricing` | `pricing-studio.jpg` (CTA) | Esther coaching a client through a walking barbell lunge… |
| `/specialist-training` | `who-health.jpg` **(hero)** | Specialist personal training in Worthing |
| `/specialist-training` | `studio-kneel-stretch.jpg` | Esther Fair coaching a client in the Eternal Fitness studio in Worthing |
| `/specialist-training` | `studio-1.jpg` (CTA) | Eternal Fitness private studio in Worthing |
| `/testimonials` | `consultation-programme-review.jpg` **(hero)** | Esther Fair reviewing a client's programme together… |
| `/testimonials` | `consultation-warm-chat.jpg` (CTA) | Esther Fair chatting warmly with clients during a session |
| `/visual-impairment` | `hero-vi-kettlebell-rack.jpg` **(hero)** | ✅ rule-4 quality (the bar) |
| `/visual-impairment` | `studio-fixed-positions.jpg` | ✅ rule-4 quality (the bar) |
| `/visual-impairment` | `studio-lunge-pair.jpg` (CTA) | `alt=""` — correctly decorative behind text |

---

## What the Open Design pass must produce, per photograph

1. **Rule-4 alt text** — what is happening · who is in frame · what the adaptation is.
2. **Described-image copy** — the `<details>` disclosure body, for significant photographs.
3. **Bound by the brand vocabulary ban** (Rule 4 explicitly extends it to alt text):
   never `transformation`, `before-and-after`, `weight loss`, `aesthetic`, `quick fixes`,
   `boot-camp`, `push yourself`, `no pain no gain`, `gym-floor intimidation`,
   `just push harder`. No body descriptions.

**This must be authored by looking at the photographs.** Writing a description of a photograph
from its filename is how fabricated content ships — the standing repo gotcha (the "Joan" and
"Section 7 — Medical Clearance Record" incidents). Not an OpenCode lane, not inferred by me.
