# Keyword & Content Plan — Three Specialisms + Blog Repurposing

**Date:** 2026-08-10
**Context:** The business narrowed from 8 advertised conditions to three specialisms:
blind & partially sighted, cancer rehabilitation, and strength/balance for older adults.
This document is the keyword research and content angles behind that restructure.

**Status of the data below:** all research was done via live web search (UK-focused).
No paid keyword tool (Ahrefs/Semrush) was authorised, so **there are no verified search
volumes here**. Competition assessments are directional — based on how dense and how
authoritative the actual SERP results were — not tool-verified numbers. Where a number
would have been a guess, it has been left out on purpose.

**Where this should end up:** the `page_keywords` table (47 pages, editable at
`/hub/site-content`) is currently an inventory with no research behind it. That is the
right home for the targets below.

---

## ⚠️ Cross-cutting compliance rules (UK ASA/CAP)

These apply to all three pages. Esther is a personal trainer, not a clinician.

- **Never claim to treat, cure, prevent, or reduce the medical risk of anything.**
  "May help reduce your risk", attributed to a named source, is the ceiling.
- **Never make absolute safety claims** ("safe exercise for X"). Frame safety as a claim
  about *her training and approach*, not a guarantee about the client's outcome.
- **Qualification precision.** She holds **Exercise Referral** and the **Level 4 Cancer
  and Exercise Rehabilitation (CanRehab)** qualification. She is *not* a "Level 4 Personal
  Trainer", and Exercise Referral is *not* the Level 4 — the retired `/exercise-for-health`
  page's schema conflated these two. That conflation is a known regression pattern.
- **No condition roll-calls** beyond the existing explicit exception on Home/Personal Training.

---

## 1. Blind & Partially Sighted — `/visual-impairment`

**Primary target:** `personal trainer for visually impaired people`
Competition is genuinely low. The SERP is a handful of niche providers (one UK, one US)
plus PT *training-course* content — no gym chain or directory owns this term.

**Secondary cluster:** personal training for blind clients · fitness coach for people with
sight loss · exercise for partially sighted adults · accessible personal training studio ·
private gym for visually impaired · strength training for blind adults · Showdown coach ·
personal trainer registered blind · exercise referral visual impairment

**Question keywords (FAQ + AI-citation targets):** Can blind people do weight training? ·
How do you exercise if you're partially sighted? · What exercise is safe for someone
registered blind? · Do I need a sighted guide to go to the gym? · Can a trainer help me
familiarise myself with the equipment? · Are training plans available in screen-reader
formats? · What is Showdown? · How do blind and partially sighted people get referred for
exercise support?

**Local:** Worthing · West Sussex · Sussex · Adur · Littlehampton · Brighton.
Note this audience often travels for the right specialist rather than using the nearest
option, so a wider Sussex catchment is worth targeting than for a general PT page.

**Referrer / B2B — probably worth more than raw SEO here:**
`ROVI` (Rehabilitation Officer Visual Impairment — West Sussex County Council's actual job
title, use it verbatim) · `ECLO` (Eye Clinic Liaison Officer) · social prescribing ·
"accessible exercise provider to refer clients to". **Sight Support Worthing** and
**4Sight Vision Support** are the two local charities to get listed with — referral in this
sector is largely relationship-driven and offline.

**Language notes (matters for copy, not just keywords):**
- "Blind and partially sighted" is the paired phrase RNIB and British Blind Sport use — use both.
- "Sight loss" is the preferred umbrella noun for the condition.
- "Visually impaired" is the dominant search term — safe as the primary on-page term.
- "Low vision" is clinical register; use sparingly.
- **Avoid "the visually impaired" as a collective noun** — "visually impaired people" or
  "people with sight loss" matches charity style guides.

**Content angles:** what a session actually looks like (verbal cueing, concretely described) ·
private studio vs gym floor, and why consistent equipment placement matters · familiarisation
visits · **screen-reader-friendly training documents — a rare, concrete differentiator** ·
Showdown · tactile guidance, client-led · referral pathway for ROVIs/ECLOs/charities.

**Specific compliance note:** do not present Exercise Referral or the CanRehab Level 4 as
authority over eye health — neither is a vision-specific qualification. The expertise claim
here is *inclusive coaching practice and sport experience*, which is genuine and sufficient.

---

## 2. Cancer Rehabilitation — `/cancer-rehabilitation`

**Primary target:** `personal trainer for cancer rehabilitation Worthing` (+ `cancer exercise
specialist Sussex`). Searches for a cancer exercise specialist in Brighton/Worthing returned
**no dedicated local providers** — only out-of-area NHS programmes and generic directories.
This is winnable outright. The head term `cancer rehabilitation` is owned by Macmillan/CRUK/NHS
and is not worth contesting.

**Secondary cluster:** exercise after cancer treatment personal trainer · exercise during
chemotherapy · one-to-one exercise cancer recovery · CanRehab qualified personal trainer ·
strength training after cancer surgery · cancer prehabilitation personal trainer · exercise
for cancer-related fatigue · personal trainer experienced with lymphoedema

**Question keywords — lead with the anxious, specific ones:** Is it safe to exercise during
chemotherapy? · Can I exercise with lymphoedema / will lifting weights make it worse? · Do I
need my oncologist's permission? · What exercise is safe after a mastectomy? · How soon can I
exercise after surgery? · Will exercise help fatigue or make it worse? · What is prehabilitation? ·
Can a personal trainer help, or do I need a physiotherapist?

**Local:** Worthing · West Sussex · Sussex · Shoreham/Lancing/Findon. Mention Brighton in copy
("serving Worthing, Brighton and West Sussex") rather than building a separate Brighton page.

**Referrer / B2B:** CanRehab qualified trainer · exercise referral for cancer patients West
Sussex · private prehabilitation provider · "where to refer cancer patients for exercise (non-NHS)".
**"Prehab"/"prehabilitation" is a live and growing term** — NHS prehab capacity is patchy outside
pilot regions, which leaves genuine room for a private local option in Sussex.

**Language notes:** patients do **not** search "cancer rehabilitation" — that's provider
language. They search plain, moment-led phrases: "exercise after chemo", "exercise after
mastectomy", "gentle exercise cancer", and above all safety questions ("is it safe...", "will
it make it worse..."). Macmillan and CRUK consistently use "being active" / "physical activity"
rather than "exercise". **Lead with treatment-stage language and safety reassurance; put the
qualification name second.**

**Content angles:** stage-matched explainer (during treatment / after surgery / remission) ·
lymphoedema-safe strength training, addressing the single biggest anxiety · what to expect in
a first session · GP/oncologist sign-off explainer · a prehabilitation section · fatigue and
bone density specifics · "not a gym" differentiator · a separate professionals-facing referral page.

**Specific compliance notes — highest-risk page on the site:**
- "Can exercise reduce recurrence risk" is a real patient question, but any answer must be
  general evidence language sourced to CRUK/Macmillan — **never** a claim about what this
  service delivers.
- Lymphoedema content stays in the "evidence suggests careful progressive training is lower-risk
  than once thought" register. Never "exercise won't cause lymphoedema".
- FAQ answers to "is it safe during chemo" must **not** give a blanket yes — always route to
  individual medical clearance.
- Every section implying assessment or programme design needs a visible "requires GP/oncology
  sign-off" caveat, not just a footer disclaimer.

---

## 3. Strength, Balance & Falls — `/falls-prevention` *(shell page, noindex)*

### ⚠️ Qualification finding — read before writing any copy

The recognised UK route for delivering falls-prevention exercise professionally is the
**Postural Stability Instructor (PSI)** award, which trains instructors to deliver **FaME**
(Falls Management Exercise), via **Later Life Training**. PSI is ~3 face-to-face days plus
~40 hours non-contact, with practical and theoretical assessment, and carries CIMSPA
recognition.

**Good news:** LLT recommends candidates already hold **Level 3 Exercise Referral** — which
Esther has. She is on the right pathway.

**The catch:** NICE NG249 (2025) does not appear to name PSI as a hard mandatory requirement
in the guideline text, but **PSI/FaME is the de facto standard commissioners look for** for
paid or referral falls work. *Otago* is a separate, largely physio-led home programme and a
lower-barrier secondary route, not a substitute.

**Until the course is confirmed and completed, do not claim FaME, PSI, "Postural Stability
Instructor", or any NHS/local-authority commissioned status.** She *can* legitimately market
general strength-and-balance training now — that requires no additional qualification.

**Local competition already exists:** **Adur & Worthing Wellbeing** (council-run, PSI-delivered,
free/referral) and **Whole Life Fitness** in Chichester (private, explicitly PSI-qualified).
This makes the strongest differentiated angle a **self-funded private alternative** — no waiting
list, one-to-one rather than group, for people who don't qualify for or don't want to wait for
the free council service.

**Primary target:** `falls prevention personal trainer Worthing`. Runner-up once qualified:
`postural stability instructor Worthing`.

**Secondary cluster:** strength and balance training for older adults · balance training
personal trainer Sussex · exercise to prevent falls at home · personal trainer for over 65s
West Sussex · one-to-one balance and strength training · exercise after a fall · regain
confidence after falling

**Question keywords — note the two distinct searchers:**
- *First person:* why do I keep losing my balance · how do I stop falling over · what exercises
  help with balance as I get older · how can I improve my balance at home
- *Third person (adult children — treat as equally important):* my mum keeps falling, what should
  I do · my dad has started falling over, is it normal · personal trainer for elderly parent ·
  how to convince a parent to do balance exercises · does my mum need a falls assessment

**Referrer / B2B — may matter more than consumer here:** falls prevention exercise provider West
Sussex · care home exercise provider Sussex · community falls exercise class provider ·
"self-funded alternative to NHS waiting list". Physios and Age UK staff search by *programme
name* (FaME/PSI/Otago), so once qualified, name the programme explicitly.

**Language notes — sensitive:** older adults reject "elderly", "frail", and "falls risk" as
identity labels. "Falls prevention" is fine in headings because it's the searched term, but
soften it in body copy and CTAs. Lead with independence, confidence, staying steady.

**Content angles:** what falls-prevention PT actually involves · private 1:1 vs the free
council service, and who each suits · **a guide for adult children worried about a parent** ·
what to expect in a first session · qualifications explainer (once confirmed) · **regaining
confidence after an actual fall** — high-empathy, distinct from post-surgery recovery.

---

## 4. Blog repurposing — triage of the 27 legacy posts

The legacy posts were written for clicks against a general fitness audience. Verdicts below:
**13 repurpose** (2 already done), **4 merge into 2 pieces**, **10 retire** (2 already deleted).

### Rewrite these 8 first — least effort, best fit

| # | Current title | Audience | New angle |
|---|---|---|---|
| 1 | What are the benefits of lifting weights? | Falls | Already contains balance/reaction-time content — lightest lift |
| 2 | Myth Buster: Is running bad for your knees? | Cancer | Already name-checks cancer treatment and bone density |
| 3 | Menopause and exercise | Falls | Substantial osteoporosis/falls material already present |
| 4 | Why you should be lifting heavier weights | Falls | Reframe from aesthetics to protecting independence |
| 5 | Protein — what it is & why you need it | Cancer | Cancer-specific protein need already flagged in the text |
| 6 | Rate of perceived exertion (RPE) | Cancer | Pacing during treatment; ties to the existing ME/CFS post |
| 7 | The importance of sleep for health | Cancer | Sleep and treatment fatigue |
| 8 | Myth Buster: resistance training & blood pressure | Falls | Quick safety-reassurance win |

### Merges
- *New Year's Resolutions* + *Why is goal setting so important* → **"Setting Realistic Goals When
  You're Managing a Health Condition"**
- *Fat — what it is* + *Carbohydrate — what it is* → **"Nutrition Fundamentals for Training
  Through a Health Condition"**

### Retire (no credible path to the new audiences)
Exercise & Illness · Is a warmup really necessary · Should I stretch before my workout ·
No pain no gain · Will lifting weights make me bulky · Christmas weight gain · Will ab exercises
give me a flat stomach · Does muscle weigh more than fat.
*(Spot-reduction and "are you sabotaging your weight loss" were already deleted.)*

### Content gaps — nothing currently covers these
1. **Sight loss and exercise — the single biggest gap.** Not one of the 32 posts addresses this
   audience at all.
2. How falls risk is actually assessed before a training block.
3. Chemotherapy side-effect specifics — peripheral neuropathy, lymphoedema post-surgery.
4. Regaining confidence after an actual fall.
5. Carers/family content — supporting someone else to stay active.
6. What exercise referral actually is, and how a GP referral works in practice.
7. Local access content — accessible studio, transport — a local-SEO gap as much as a content one.

### ⚠️ Byline issue
A migration (`20260419_session_2_blog_repositioning.sql`) already switched all 27 legacy posts
from "Craig Blackman" to "Esther Fair". The attribution is now right, **but the first-person
anecdotes inside the posts were never rewritten** — lines like "I'm one of those ex-smokers"
and "my boyfriend" are now attributed to Esther word-for-word despite being someone else's
personal history. **Every post pulled forward for repurposing must be checked line by line, not
just topic-swapped.**

---

## Recommended sequence

1. Confirm which falls qualification Esther is taking — it decides whether that page is
   consumer-facing or B2B/commissioning-facing.
2. Gate the blog to reviewed posts only before anything reaches production.
3. Fill `page_keywords` with the targets above so the plan lives in the hub, not in a file.
4. Write the falls-prevention page once the qualification is known; lift the noindex then.
5. Work the 8 priority blog rewrites in blocks, checking voice line by line.
