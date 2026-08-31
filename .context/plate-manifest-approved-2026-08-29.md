# CR-EF-086 Lane 6 — APPROVED plate manifest (wiring spec)

**Source:** Open Design `site-image-plates.html` (project `90556eb1-3632-4e02-a992-bc510026774c`), authored 2026-08-28, **approved by Craig 2026-08-29**.
**Machine-readable copy:** `.context/site-image-plates-approved-2026-08-29.json` — use this, not the HTML.

31 plates · 10 replace / 17 revise / 4 keep · 27 carry described-image copy · 38 call sites.
All 31 filenames verified present in `public/images/` on 2026-08-29 (the previous plate set failed this check — 11 files never existed).

---

## EF-01 — `who-health.jpg`

- **Kind:** hero · **Routes:** /specialist-training · hero · **Verdict:** **REPLACE**
- **Call sites:**
  - `app/specialist-training/SpecialistTrainingClient.tsx:86`

**Current alt (replace this):**
> Specialist personal training in Worthing

**New alt:**
> A client seated on the bench inside the power rack in the private Worthing studio, back to the camera, drawing a single cable handle down to shoulder height with one hand while the other rests on the thigh.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A one-to-one session at the cable station. The client sits on the bench inside the power rack and draws a single handle down to shoulder height with one hand, the other hand resting on the thigh, so the movement is done seated and one side at a time. Weight plates are stored on the rack’s own pegs on both sides; a barbell and one loose plate are down on the floor at the front of the frame.

*Why:* A search string, not a description. None of the three elements are present.

*⚑ Flag:* The person is back-to-camera and cannot be identified from the frame. Confirm whether this is you or a client — it is the only word in the description that changes.The wall slogan is legible in the top right of this frame, in the largest photograph on the page.

---

## EF-02 — `about-hero-esther-portrait.png`

- **Kind:** hero · **Routes:** /about · hero · **Verdict:** **REPLACE**
- **Call sites:**
  - `app/about/AboutPageClient.tsx:51`

**Current alt (replace this):**
> Esther Fair smiling in her private studio in Worthing

**New alt:**
> Esther standing against the plywood wall of the private Worthing studio with one hand on her hip, smiling straight at the camera, the kettlebells racked in weight order on the shelf beside her.

*Why:* Names who is in frame and where, but nothing about what is happening or what is adapted.

*Note:* Same photograph as esther-headshot-smile.jpg (/contact closing band) and esther-portrait-studio.jpg (/visual-impairment). Three crops, one frame — this description covers the first two.

*⚑ Flag:* The wall slogan fills the top third of this frame — the clearest instance anywhere in the set, on the page about who you are. esther-portrait-studio.jpg is the same photograph cropped tighter, with the slogan out of shot.

---

## EF-03 — `hero-pullup-rack.png`

- **Kind:** hero · **Routes:** / · hero · **Verdict:** **REVISE**
- **Call sites:**
  - `app/HomePageClient.tsx:29`
  - `app/home.css:38`

**Current alt (replace this):**
> Esther Fair smiling mid-stretch at the power rack in her private Worthing studio

**New alt:**
> Esther standing inside the power rack in the private Worthing studio, one hand up on the pull-up bar and the other on the upright beside her, smiling at the camera, with the matting around her clear of kit.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> Esther stands inside the power rack with one hand up on the pull-up bar and the other resting on the upright at shoulder height — the rack itself doubling as something to hold. Behind her, the exercise balls sit in wall cradles and the slam balls on a tiered rack; the barbell is up on the rack’s own hooks. The matting she is standing on is clear.

*Why:* “Mid-stretch” is not what is happening, and no adaptation is named.

*Note:* The slogan is out of frame in this one.

---

## EF-04 — `studio-kettlebell-shelf.jpg`

- **Kind:** hero · **Routes:** /contact · hero · /about · closing band · **Verdict:** **REVISE**
- **Call sites:**
  - `app/about/AboutPageClient.tsx:241`
  - `app/contact/ContactPageClient.tsx:113`

**Current alt (replace this):**
> /contact — “The kettlebell rack in the private Worthing studio”  ·  /about — “Kettlebells racked on the shelf in the Eternal Fitness studio”

**New alt:**
> The kettlebell shelves in the private Worthing studio: two steel tiers holding the bells in weight order, the lighter ones marked with coloured bands on the top shelf and the heavier ones printed with their weight below, with the aerobic steps stacked underneath and the floor in front clear.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> Two tiers of steel shelving against the studio’s plywood wall. The kettlebells stand in a row in weight order — the lighter bells along the top shelf, each marked with a coloured band, the heavier ones on the shelf below with their weights printed in large figures on the side. Aerobic steps are stacked in the space under the bottom shelf, and the rubber floor in front of the shelves is clear.

*Why:* Both existing strings name the object and stop. The order, the colour bands and the printed weights are the point of the picture.

*Note:* One of the two photographs the brief flagged as carrying different alt text on two pages. This description now serves both.

---

## EF-05 — `consultation-warm-chat.jpg`

- **Kind:** hero · **Routes:** /faqs · hero · /testimonials · closing band · **Verdict:** **REVISE**
- **Call sites:**
  - `app/faqs/FAQsPageClient.tsx:164`
  - `app/testimonials/TestimonialsPageClient.tsx:263`

**Current alt (replace this):**
> /faqs — “Esther chatting warmly with a client in the private Worthing studio”  ·  /testimonials — “Esther Fair chatting warmly with clients during a session”

**New alt:**
> Esther standing talking with a client between exercises in the private Worthing studio, both of them laughing, in the open gap between the power rack on one side and the kettlebell shelves on the other.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A pause in a one-to-one session. Esther and a client stand facing each other in the open middle of the studio floor, both laughing, in the gap between the power rack on one side and the kettlebell shelves on the other. Nothing is being lifted. A barbell is down on the floor at the edge of the frame, off to one side of where they are standing.

*Why:* Warm and accurate as far as it goes, but names no adaptation, and the plural on /testimonials is wrong.

*Note:* The second photograph the brief flagged as double-described. The /testimonials string also says “clients” — there is one client in the frame.

*⚑ Flag:* The wall slogan fills the top right quarter of this frame and is fully legible. It is the hero of /faqs.

---

## EF-06 — `coaching-bench-press-spot.jpg`

- **Kind:** hero · **Routes:** /personal-training · hero · **Verdict:** **REVISE**
- **Call sites:**
  - `app/personal-training/PersonalTrainingClient.tsx:77`

**Current alt (replace this):**
> Esther coaching a client through an incline dumbbell press in her private Worthing studio

**New alt:**
> A client lying back on the adjustable bench in the private Worthing studio pressing a single dumbbell, with Esther crouched down beside the bench at the client’s eye level rather than standing over her, both of them laughing.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A one-to-one session at the bench. The client lies back on the adjustable bench and presses a single selector dumbbell; her other hand is open and free above her. Esther has crouched right down beside the bench so that she is at the client’s eye level rather than standing over her, one hand on her own knee and neither hand on the client. The kettlebell shelves, a water bottle and a phone are on the wall shelf behind them.

*Why:* Names the exercise and the room but no adaptation, and the exercise name looks wrong.

*⚑ Flag:* The live alt calls this an incline dumbbell press. In this frame the bench back is low, only one dumbbell is in play and the client’s other arm is empty. Confirm the movement before this goes on the page — the rest of the description does not depend on it.The tail of the wall slogan runs along the top edge of the frame.

---

## EF-07 — `pricing-hero-coaching.jpg`

- **Kind:** hero · **Routes:** /pricing · hero · **Verdict:** **REVISE**
- **Call sites:**
  - `app/pricing/PricingPageClient.tsx:90`

**Current alt (replace this):**
> Esther coaching a client through a split squat with a barbell in the private Worthing studio

**New alt:**
> A client half-kneeling on a padded mat in the private Worthing studio holding a barbell anchored at one end into the rack, while Esther stands two paces in front with a flat hand held out at chest height as a target to work to.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A one-to-one session in the middle of the studio. The client kneels on one knee on a padded mat, holding the free end of a barbell whose other end is anchored into the rack behind her. Esther stands two paces in front holding one hand out flat at chest height as a height to work to, and is not touching the client at any point. The whiteboard, the kettlebell shelves and the mirror run along the wall behind them.

*Why:* The exercise named is not the exercise in the frame, and the kneeling pad and the held-out hand — the two adaptations — go unmentioned.

*⚑ Flag:* The live alt calls this a split squat with a barbell. The client is half-kneeling on a pad with a bar anchored at one end, which is a different movement. Confirm the name before it goes live.The wall slogan is fully legible across the top left of the frame.

---

## EF-08 — `consultation-programme-review.jpg`

- **Kind:** hero · **Routes:** /testimonials · hero · **Verdict:** **REVISE**
- **Call sites:**
  - `app/testimonials/TestimonialsPageClient.tsx:59`

**Current alt (replace this):**
> Esther Fair reviewing a client’s programme together in her private Worthing studio

**New alt:**
> Esther standing in the private Worthing studio holding the session’s written programme and a pen, laughing with a client who is mid-set at the power rack with a dumbbell up at her shoulder.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A one-to-one session in progress at the power rack. The client stands with a dumbbell up at her shoulder, part-way through a set. Esther stands a couple of paces away holding the session’s programme on paper with a pen in her hand, laughing with her — the plan stays in the coach’s hands and gets called out, rather than being something the client has to read between sets. The trap bar and a loaded barbell are on their wall hooks behind them.

*Why:* They are not reviewing anything together — the client is mid-set. The alt describes a different moment.

*⚑ Flag:* The wall slogan reads clearly across the top right of this frame — the hero of /testimonials.

---

## EF-09 — `hero-vi-kettlebell-rack.jpg`

- **Kind:** hero · **Routes:** /visual-impairment · hero · **Verdict:** **KEEP**
- **Call sites:**
  - `app/visual-impairment/VisualImpairmentClient.tsx:63`

**Current alt (replace this):**
> Esther standing at the kettlebell rack in the private Worthing studio, smiling towards the camera with one hand resting on a bell that is racked in its usual place

**New alt:**
> Esther standing at the kettlebell rack in the private Worthing studio, smiling towards the camera with one hand resting on a bell that is racked in its usual place

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> Esther stands at the kettlebell shelf with one hand resting on a bell in the top row. The bells sit in weight order along the shelf, the lighter ones marked with coloured bands, each one in the place it is always kept. The floor in front of the shelf is clear.

*Why:* All three elements present. Nothing to change.

*Note:* Reference plate — the alt is the standard this sheet was written against and is carried through unchanged. It has no disclosure on the page today, so one is proposed here; the alt is untouched.

---

## EF-10 — `studio-1.jpg`

- **Kind:** cta · **Routes:** / · closing band · /specialist-training · closing band · **Verdict:** **REPLACE**
- **Call sites:**
  - `app/HomePageClient.tsx:236`
  - `app/falls-prevention/FallsPreventionClient.tsx:79`
  - `app/specialist-training/SpecialistTrainingClient.tsx:178`
  - `components/CTASection.tsx:13`

**Current alt (replace this):**
> Eternal Fitness private studio in Worthing

**New alt:**
> Esther standing at the kettlebell shelves in the private Worthing studio with a hand resting on the bells, smiling towards the camera, the mirror, whiteboard and adjustable bench along the wall behind her.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> Esther stands at the kettlebell shelves with a hand resting on the bells along the top row, turned back towards the camera. The bells sit in weight order, the lighter ones marked with coloured bands. Along the wall behind her are the mirror, the whiteboard, the suspension straps and the adjustable bench, each in its own fixed place; the floor between them is clear.

*Why:* A search string, and describing the wrong subject entirely.

*⚑ Flag:* This is not an empty studio, which is what the brief assumed from the filename. It is the wider frame of the same setup as hero-vi-kettlebell-rack.jpg — so /, /specialist-training and /visual-impairment currently all lead on the same photograph.The tail of the wall slogan is legible in the top left corner.

---

## EF-11 — `esther-headshot-smile.jpg`

- **Kind:** cta · **Routes:** /contact · closing band · **Verdict:** **REPLACE**
- **Call sites:**
  - `app/contact/ContactPageClient.tsx:405`

**Current alt (replace this):**
> Esther Fair smiling

**New alt:**
> Esther standing against the plywood wall of the private Worthing studio with one hand on her hip, smiling straight at the camera, the kettlebells racked in weight order on the shelf beside her.

*Why:* Two words. Says nothing about the room, the frame or the person beyond a name.

*Note:* The same photograph as the /about hero at a near-identical crop. One description, used on both.

*⚑ Flag:* The wall slogan fills the top third of this crop too.

---

## EF-12 — `coaching-deadlift-setup.jpg`

- **Kind:** cta · **Routes:** /faqs · closing band · **Verdict:** **REVISE**
- **Call sites:**
  - `app/faqs/FAQsPageClient.tsx:319`

**Current alt (replace this):**
> Esther coaching a client through a deadlift setup

**New alt:**
> A client hinged over a loaded barbell in the private Worthing studio taking his grip, with Esther leaning in from the side so her eyes are level with the bar, one hand out towards it and neither hand on him.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A one-to-one session at the barbell. The client stands over a loaded bar and takes his grip; the plates are marked 5 KG in large white figures on black. Esther has leaned in from the side so her eyes are level with the bar rather than watching from standing, one hand out towards it and neither hand touching him. Resistance bands hang from the wall on the right and the kettlebells are on their shelf behind.

*Why:* Names the movement, nothing else. The lean-in is the whole picture.

*⚑ Flag:* The wall slogan reads clearly across the top of this frame.

---

## EF-13 — `studio-slam-balls-rack.jpg`

- **Kind:** cta · **Routes:** /personal-training · closing band · **Verdict:** **REVISE**
- **Call sites:**
  - `app/personal-training/PersonalTrainingClient.tsx:221`

**Current alt (replace this):**
> Slam balls racked in the Eternal Fitness studio

**New alt:**
> The slam balls in the private Worthing studio stored on a wall rack in a vertical stack with the heaviest at the bottom and its weight printed on the side, and the battle rope coiled on the floor at the foot of the rack.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A corner of the studio with nothing in use. Four slam balls sit on a wall-mounted rack in a vertical stack, one above another, heaviest at the bottom and marked 15 KG. The battle rope is coiled on the floor at the foot of the rack — the one thing in this corner that is down at floor level. Behind it the weight plates are on the rack’s own pegs and the bench is pushed in under the frame.

*Why:* Names the object. The vertical order, the printed weight and the rope on the floor are what someone actually needs from this frame.

---

## EF-14 — `pricing-studio.jpg`

- **Kind:** cta · **Routes:** /pricing · closing band · **Verdict:** **REPLACE**
- **Call sites:**
  - `app/pricing/PricingPageClient.tsx:235`

**Current alt (replace this):**
> Esther coaching a client through a walking barbell lunge…

**New alt:**
> A client walking a lunge across the open floor of the private Worthing studio with his hands on his thighs and no weight, and Esther stepping the same lunge alongside him half a pace behind.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A one-to-one session on the open floor. The client steps forward into a lunge with his hands resting on his thighs and nothing in them. Esther walks the same lunge alongside him, half a pace behind, matching the step rather than calling it from across the room. A barbell lies on the floor behind them, well out of the line they are walking.

*Why:* Factually wrong about what is being carried. Replaced, not revised.

*⚑ Flag:* The live alt calls this a walking barbell lunge. Neither person is holding a barbell — it is bodyweight. This is the second of the two live strings describing equipment that is not in the frame.The wall slogan is fully legible across the upper left.

---

## EF-15 — `studio-lunge-pair.jpg`

- **Kind:** cta · **Routes:** /visual-impairment · closing band · **Verdict:** **KEEP**
- **Call sites:**
  - `app/cancer-rehabilitation/CancerRehabClient.tsx:59`
  - `app/visual-impairment/VisualImpairmentClient.tsx:331`

**Current alt (replace this):**
> alt="" — empty, decorative

**New alt:**
> alt="" — unchanged. Correct for a background behind text.

*Why:* The empty alt is correct and stays. The flag is about the choice of image, not the markup.

*⚑ Flag:* The filename is wrong and so is the assumption behind it. This is not a lunge pair: it is Esther kneeling on the blue mats laughing while two large curly-coated dogs jump up at her. There is no lunge, no client and no training content in the frame.The attribute is right, so nothing is broken. But this is the full-bleed band closing the page written for people with sight loss, and it is a photograph of dogs. Worth a decision on the photograph itself rather than on its alt text.

---

## EF-16 — `why-coaching-review.jpg`

- **Kind:** inline · **Routes:** / · why-coaching split · **Verdict:** **REVISE**
- **Call sites:**
  - `app/HomePageClient.tsx:87`

**Current alt (replace this):**
> Esther Fair coaching a client through a session, reviewing their programme notes in the private Worthing studio

**New alt:**
> Esther laughing with a client in the private Worthing studio, the session’s written programme and a pen in her hands, while the client stands at the power rack with a dumbbell up at her shoulder.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A one-to-one session at the power rack, seen from a little further back. The client stands with a dumbbell up at her shoulder mid-set. Esther is a couple of paces away holding the printed programme and a pen, laughing with her — the plan lives in the coach’s hands and gets called out rather than read. The trap bar and a barbell hang on their wall hooks behind them.

*Why:* Close, but they are not reviewing notes together — one is mid-set — and no adaptation is named.

*Note:* The wider frame of the same moment as consultation-programme-review.jpg on /testimonials. Both descriptions are written to agree.

*⚑ Flag:* The wall slogan reads clearly across the top right of this frame.

---

## EF-17 — `approach-step1-plank-coaching.jpg`

- **Kind:** inline · **Routes:** / · approach step 1 · **Verdict:** **REPLACE**
- **Call sites:**
  - `app/HomePageClient.tsx:126`

**Current alt (replace this):**
> Esther adjusting a client’s form during a plank in the private Worthing studio

**New alt:**
> Esther kneeling beside a client holding a forearm plank on the studio mats, resting a flat hand on his upper back to show him where the line of his body should sit

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A one-to-one session on the studio mats. The client holds a forearm plank. Esther kneels alongside him and rests one flat, open hand on his upper back — a cue to activate the muscles here. Her other hand stays clear of him. Behind them the room is quiet — racked resistance bands on one wall, a foam roller, nothing on the floor.

*Why:* The right words for this photograph already exist on another page. This one carries the weak version.

*Note:* Both the alt and the description are adopted word for word from the same photograph’s treatment on /visual-impairment, where it is already to standard. Nothing new is written here on purpose — one photograph, one description.

---

## EF-18 — `approach-step2-lunges-together.png`

- **Kind:** inline · **Routes:** / · approach step 2 · **Verdict:** **REVISE**
- **Call sites:**
  - `app/HomePageClient.tsx:131`

**Current alt (replace this):**
> Esther and a client doing lunges together, laughing, in the private Worthing studio

**New alt:**
> Esther and a client side by side on the studio mats, both down in a half-kneeling lunge with a hand resting on the front thigh, Esther holding the same position alongside rather than watching from standing.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> Two people on the blue mats, side by side, both in a half-kneeling lunge with the back knee down on the padding and a hand resting on the front thigh. Esther is in the same position as the client rather than standing over her, so the shape can be copied from alongside. Both are laughing. The foam rollers are racked on the wall behind them and the mats are clear.

*Why:* Accurate, and the friendliest of the current strings — but “together” is doing all the work that “in the same position, on padding” should be doing.

*Note:* Near-identical frame to mobility-hip-flexor-stretch.jpg on /contact. One of the three duplicated pairs the brief did not list; both now carry this description.

---

## EF-19 — `approach-step3-deadlift-clients.jpg`

- **Kind:** inline · **Routes:** / · approach step 3 · **Verdict:** **REPLACE**
- **Call sites:**
  - `app/HomePageClient.tsx:136`

**Current alt (replace this):**
> Two clients working through a dumbbell deadlift together in the private Worthing studio

**New alt:**
> Esther and a client hinged forward side by side in the private Worthing studio, the client holding one small dumbbell and Esther running her hands down her own thighs to show the path the hinge takes.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A one-to-one session on the studio floor. The client hinges forward at the hips holding a single small dumbbell in one hand. Esther stands beside him in the same hinge, hands sliding down her own thighs to show the path the movement takes rather than describing it. Neither is lifting from the floor; a loaded barbell rests on the mat at the edge of the frame.

*Why:* Wrong about who is in the frame — the reason this needs replacing rather than revising.

*⚑ Flag:* The live alt says “two clients”. One of the two is you.The wall slogan reads clearly across the top of this frame.

---

## EF-20 — `specialist-training-esther-client.jpg`

- **Kind:** inline · **Routes:** / · specialist training card · **Verdict:** **REPLACE**
- **Call sites:**
  - `app/HomePageClient.tsx:192`

**Current alt (replace this):**
> Esther guiding a client through specialist training in the private Worthing studio

**New alt:**
> Esther and a client standing facing each other by the power rack in the private Worthing studio, both with an arm raised out to the side, Esther holding the same position she is asking for.

*Why:* The current string is a search phrase, but the replacement cannot be settled until the file is confirmed.

*⚑ Flag:* The copy of this file staged for review is rotated a quarter turn, so the posture cannot be read with confidence. The alt above is provisional and this plate should be marked Ask me until two things are checked: what the movement actually is, and whether the version the site serves is the right way up.

---

## EF-21 — `about-story-deadlift.jpg`

- **Kind:** inline · **Routes:** /about · story split · **Verdict:** **REVISE**
- **Call sites:**
  - `app/about/AboutPageClient.tsx:70`

**Current alt (replace this):**
> Esther Fair coaching a client through a deadlift in her private studio in Worthing

**New alt:**
> A client hinged over a loaded barbell in the private Worthing studio taking his grip, with Esther standing a step back so she can see the whole lift rather than leaning in.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A one-to-one session at the barbell, a beat after the setup. The client is hinged over the bar with both hands on it; the plates are marked 5 KG in large white figures. Esther has stepped back a pace so she can see the whole lift, hands at her sides, and is not touching him. Resistance bands hang from the wall on the right; the floor around the bar is clear.

*Why:* Names the lift and the room. Where the coach is standing, and why, is the missing third.

*Note:* The same session as coaching-deadlift-setup.jpg on /faqs, one frame apart — the descriptions differ only where the photographs do.

*⚑ Flag:* The wall slogan reads clearly across the top of this frame.

---

## EF-22 — `about-quals-barbell-hands.jpg`

- **Kind:** inline · **Routes:** /about · qualifications split · **Verdict:** **REVISE**
- **Call sites:**
  - `app/about/AboutPageClient.tsx:105`

**Current alt (replace this):**
> Esther steadying a barbell for a client in the studio

**New alt:**
> A client setting his grip on a bare barbell stood upright on its end, with Esther holding the same bar with both hands just below his so it stays still while he finds the position by feel.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A close-in moment before a set. A bare barbell is stood upright on the floor on one end. The client has one hand around it at chest height; Esther holds the same bar with both hands just below his, keeping it completely still while he finds his grip. Both are looking down at the bar. Nothing is loaded on it yet.

*Why:* “Steadying” is the right verb; what it is being steadied for is the part worth saying.

*Note:* One of the strongest adaptation photographs in the set — the current alt is the closest of any on the site to naming one, and only needs finishing.

*⚑ Flag:* The wall slogan runs across the top of this frame at its largest.

---

## EF-23 — `about-experience-coaching.png`

- **Kind:** inline · **Routes:** /about · experience split · **Verdict:** **REPLACE**
- **Call sites:**
  - `app/about/AboutPageClient.tsx:125`

**Current alt (replace this):**
> Esther coaching a client through a dumbbell exercise in the studio

**New alt:**
> A client seated on the upright bench in the private Worthing studio pressing two dumbbells overhead, with Esther standing behind the bench and a hand under each of his elbows through the whole movement.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A one-to-one session at the bench, seen from behind. The client presses two dumbbells up from shoulder height, sitting back against the upright bench. Esther stands behind him with a hand under each elbow all the way up and all the way down, so he knows where the support is without having to look for it. The studio door and the window are ahead of them; the floor behind the bench is clear.

*Why:* “A dumbbell exercise” describes nothing. The spot at the elbows is the picture.

---

## EF-24 — `about-studio-band-stretch.jpg`

- **Kind:** inline · **Routes:** /about · studio pair · **Verdict:** **REVISE**
- **Call sites:**
  - `app/about/AboutPageClient.tsx:188`

**Current alt (replace this):**
> Esther guiding a client through a resistance band stretch beside the squat rack in the studio

**New alt:**
> Esther and a client facing each other across the studio floor with one long resistance band held between them, Esther down in the same half-squat she is asking the client to hold.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> Two people facing each other across the studio floor with a single long resistance band stretched between them, one end each. Esther holds her end in at her chest and sits down into a half-squat — the same position the client is working in — so the shape is being shown rather than described. The kettlebell shelves, the whiteboard and the suspension straps are along the wall behind.

*Why:* “Guiding through” hides the adaptation: she is in the position, not beside it.

*⚑ Flag:* The wall slogan is fully legible across the top left.

---

## EF-25 — `about-studio-kettlebells.jpg`

- **Kind:** inline · **Routes:** /about · studio pair · **Verdict:** **REVISE**
- **Call sites:**
  - `app/about/AboutPageClient.tsx:191`

**Current alt (replace this):**
> Esther guiding a client through a mobility stretch on the studio mats

**New alt:**
> Esther and a client on the blue mats side by side, both in the same half-kneeling rotation with one hand planted on the mat and the other arm reaching straight up, each following their own raised hand with their eyes.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> Two people on the blue mats, one mat each, both in the same half-kneeling rotation: one hand planted on the mat, the other arm reaching straight up, eyes following the raised hand. Esther is doing the movement alongside the client rather than watching it. The plyo boxes and the dumbbell tree stand against the wall behind; the mats are padded and the floor around them is clear.

*Why:* “A mobility stretch” could be anything. Which stretch, and that she is in it too, is what is missing.

*⚑ Flag:* The filename says kettlebells. There is not a kettlebell in the frame. Worth renaming when this is wired in, so the next person to touch it does not write from the filename.

---

## EF-26 — `mobility-hip-flexor-stretch.jpg`

- **Kind:** inline · **Routes:** /contact · mobility split · **Verdict:** **REVISE**
- **Call sites:**
  - `app/contact/ContactPageClient.tsx:370`

**Current alt (replace this):**
> Esther and a client working through a kneeling hip stretch on the mats in the private Worthing studio

**New alt:**
> Esther and a client side by side on the studio mats, both down in a half-kneeling lunge with a hand resting on the front thigh, Esther holding the same position alongside rather than watching from standing.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> Two people on the blue mats, side by side, both in a half-kneeling lunge with the back knee down on the padding and a hand resting on the front thigh. Esther is in the same position as the client rather than standing over her, so the shape can be copied from alongside. Both are laughing. The foam rollers are racked on the wall behind them and the mats are clear.

*Why:* The better of the two current strings for this frame, but still silent on the adaptation — and it disagrees with the one on the homepage.

*Note:* Near-identical frame to approach-step2-lunges-together.png on /, and described identically here on purpose. A third duplicate the brief did not list.

---

## EF-27 — `consultation-programme-notes.jpg`

- **Kind:** inline · **Routes:** /personal-training · consultation split · **Verdict:** **REVISE**
- **Call sites:**
  - `app/personal-training/PersonalTrainingClient.tsx:123`

**Current alt (replace this):**
> Esther going through the session plan with a client before they start

**New alt:**
> Esther and a client sitting facing each other at the same height in the private Worthing studio, Esther with the printed programme and a pen on her lap and the client on the bench with a 10 kg dumbbell in each hand.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A one-to-one session, paused. The client sits on the bench holding a 10 kg dumbbell in each hand, the weights printed in large figures on the ends. Esther sits opposite him on a plyo box at the same height, the printed programme on her lap and a pen in her hand, talking it through at eye level rather than standing over him. The kettlebells are on their shelf behind them.

*Why:* The moment is slightly misdescribed, and sitting at the same height — the adaptation — is not named.

*⚑ Flag:* Minor: the current alt says “before they start”. He already has the weights in his hands, so this reads as a pause mid-session rather than a briefing. Small, but it is the sort of thing that sets a wrong expectation.

---

## EF-28 — `studio-kneel-stretch.jpg`

- **Kind:** inline · **Routes:** /specialist-training · split · **Verdict:** **REPLACE**
- **Call sites:**
  - `app/specialist-training/SpecialistTrainingClient.tsx:103`

**Current alt (replace this):**
> Esther Fair coaching a client in the Eternal Fitness studio in Worthing

**New alt:**
> Esther and a client sitting on the studio mats in a wide seated stretch, both leaning onto one hand and laughing, with the studio’s black curly-coated dog sitting on the mat against Esther’s side.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> The end of a session on the mats. Esther and a client sit on the blue matting in a wide seated stretch, each leaning onto one hand, both laughing. The studio dog — large, black and curly-coated — has come and sat on the mat and is leaning against Esther. The resistance bands are racked on the wall and the floor beyond the mats is clear.

*Why:* A search string. Nothing about what is happening, and it omits the most noticeable thing in the frame.

*⚑ Flag:* There is a dog in this photograph, and another in studio-lunge-pair.jpg. That is genuine access information for some clients — whether they would want to know before they arrive, or would rather not — and nothing on the site currently says a dog is sometimes in the room. The description above names it plainly. Tell us if you would rather it were handled differently, or said somewhere in the copy as well.

---

## EF-29 — `coaching-plank-lowback-cue.jpg`

- **Kind:** inline · **Routes:** /visual-impairment · technique split · **Verdict:** **KEEP**
- **Call sites:**
  - `app/visual-impairment/VisualImpairmentClient.tsx:209`

**Current alt (replace this):**
> Esther kneeling beside a client holding a forearm plank on the studio mats, resting a flat hand on his upper back to show him where the line of his body should sit

**New alt:**
> Esther kneeling beside a client holding a forearm plank on the studio mats, resting a flat hand on his upper back to show him where the line of his body should sit

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A one-to-one session on the studio mats. The client holds a forearm plank. Esther kneels alongside him and rests one flat, open hand on his upper back — a cue to activate the muscles here. Her other hand stays clear of him. Behind them the room is quiet — racked resistance bands on one wall, a foam roller, nothing on the floor.

*Why:* All three elements present, and the description names both what her hands are doing and what is on the floor. Nothing to change.

*Note:* Already to standard, alt and description both, and already live. Carried through unchanged. It is the same photograph as approach-step1-plank-coaching.jpg on /, which is why that plate adopts these words rather than writing new ones.

---

## EF-30 — `esther-portrait-studio.jpg`

- **Kind:** inline · **Routes:** /visual-impairment · trainer mount · **Verdict:** **REVISE**
- **Call sites:**
  - `app/visual-impairment/VisualImpairmentClient.tsx:270`

**Current alt (replace this):**
> Esther Fair smiling in the private Worthing studio

**New alt:**
> A head-and-shoulders portrait of Esther against the plywood wall of the private Worthing studio, one hand on her hip, smiling straight at the camera, with a single kettlebell on its rack at the edge of the frame.

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> A head-and-shoulders portrait of Esther, smiling, standing against the studio’s plywood wall.

*Why:* The description on this page is already right. The alt beside it is the weakest of the three on /visual-impairment and names neither the framing nor anything else usable.

*Note:* The third crop of the same photograph as the /about hero and the /contact band — and the only one of the three with the wall slogan out of frame. If a portrait is needed on a page where the slogan is a problem, this is the crop.

---

## EF-31 — `studio-fixed-positions.jpg`

- **Kind:** inline · **Routes:** /visual-impairment · studio split · **Verdict:** **KEEP**
- **Call sites:**
  - `app/visual-impairment/VisualImpairmentClient.tsx:142`

**Current alt (replace this):**
> The private studio between sessions, empty: bare rubber matting on the floor with nothing left out on it, and weights, exercise balls and resistance bands stored on wall racks

**New alt:**
> The private studio between sessions, empty: bare rubber matting on the floor with nothing left out on it, and weights, exercise balls and resistance bands stored on wall racks

**Described-image copy** (body of the `<details class="ef-desc">` disclosure):
> The private studio with no one in it. The floor is bare rubber matting — no loose plates, no dumbbells left out, nothing to walk into. Weights, exercise balls and resistance bands stored in racks.

*Why:* The adaptation is the whole sentence. Nothing to change.

*Note:* Reference plate — alt and description both already to standard and already live. Carried through unchanged.

---

