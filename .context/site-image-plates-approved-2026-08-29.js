const PLATES = [

/* ─── HEROES ─────────────────────────────────────────────────── */
{
  id:'EF-01', file:'who-health.jpg', kind:'hero', routes:['/specialist-training · hero'],
  title:'Single-handed pulldown, seated at the rack',
  verdict:'replace',
  was:'Specialist personal training in Worthing',
  alt:'A client seated on the bench inside the power rack in the private Worthing studio, back to the camera, drawing a single cable handle down to shoulder height with one hand while the other rests on the thigh.',
  desc:'A one-to-one session at the cable station. The client sits on the bench inside the power rack and draws a single handle down to shoulder height with one hand, the other hand resting on the thigh, so the movement is done seated and one side at a time. Weight plates are stored on the rack&rsquo;s own pegs on both sides; a barbell and one loose plate are down on the floor at the front of the frame.',
  flag:'<p>The person is back-to-camera and cannot be identified from the frame. Confirm whether this is you or a client — it is the only word in the description that changes.</p><p>The wall slogan is legible in the top right of this frame, in the largest photograph on the page.</p>',
  reason:'A search string, not a description. None of the three elements are present.'
},
{
  id:'EF-02', file:'about-hero-esther-portrait.png', kind:'hero', routes:['/about · hero'],
  title:'Portrait against the studio wall',
  verdict:'replace',
  was:'Esther Fair smiling in her private studio in Worthing',
  alt:'Esther standing against the plywood wall of the private Worthing studio with one hand on her hip, smiling straight at the camera, the kettlebells racked in weight order on the shelf beside her.',
  desc:null,
  descNote:'No disclosure. A portrait carries a likeness and nothing operational — the alt is enough, and the third crop of this photograph already has a one-line description on /visual-impairment.',
  note:'Same photograph as <code>esther-headshot-smile.jpg</code> (/contact closing band) and <code>esther-portrait-studio.jpg</code> (/visual-impairment). Three crops, one frame — this description covers the first two.',
  flag:'<p>The wall slogan fills the top third of this frame — the clearest instance anywhere in the set, on the page about who you are. <code>esther-portrait-studio.jpg</code> is the same photograph cropped tighter, with the slogan out of shot.</p>',
  reason:'Names who is in frame and where, but nothing about what is happening or what is adapted.'
},
{
  id:'EF-03', file:'hero-pullup-rack.png', kind:'hero', routes:['/ · hero'],
  title:'At the power rack, floor clear',
  verdict:'revise',
  was:'Esther Fair smiling mid-stretch at the power rack in her private Worthing studio',
  alt:'Esther standing inside the power rack in the private Worthing studio, one hand up on the pull-up bar and the other on the upright beside her, smiling at the camera, with the matting around her clear of kit.',
  desc:'Esther stands inside the power rack with one hand up on the pull-up bar and the other resting on the upright at shoulder height — the rack itself doubling as something to hold. Behind her, the exercise balls sit in wall cradles and the slam balls on a tiered rack; the barbell is up on the rack&rsquo;s own hooks. The matting she is standing on is clear.',
  note:'The slogan is out of frame in this one.',
  reason:'&ldquo;Mid-stretch&rdquo; is not what is happening, and no adaptation is named.'
},
{
  id:'EF-04', file:'studio-kettlebell-shelf.jpg', kind:'hero', routes:['/contact · hero','/about · closing band'],
  title:'The kettlebell shelves, in weight order',
  verdict:'revise',
  was:'/contact — “The kettlebell rack in the private Worthing studio”  ·  /about — “Kettlebells racked on the shelf in the Eternal Fitness studio”',
  alt:'The kettlebell shelves in the private Worthing studio: two steel tiers holding the bells in weight order, the lighter ones marked with coloured bands on the top shelf and the heavier ones printed with their weight below, with the aerobic steps stacked underneath and the floor in front clear.',
  desc:'Two tiers of steel shelving against the studio&rsquo;s plywood wall. The kettlebells stand in a row in weight order — the lighter bells along the top shelf, each marked with a coloured band, the heavier ones on the shelf below with their weights printed in large figures on the side. Aerobic steps are stacked in the space under the bottom shelf, and the rubber floor in front of the shelves is clear.',
  note:'One of the two photographs the brief flagged as carrying different alt text on two pages. This description now serves both.',
  reason:'Both existing strings name the object and stop. The order, the colour bands and the printed weights are the point of the picture.'
},
{
  id:'EF-05', file:'consultation-warm-chat.jpg', kind:'hero', routes:['/faqs · hero','/testimonials · closing band'],
  title:'A conversation between exercises',
  verdict:'revise',
  was:'/faqs — “Esther chatting warmly with a client in the private Worthing studio”  ·  /testimonials — “Esther Fair chatting warmly with clients during a session”',
  alt:'Esther standing talking with a client between exercises in the private Worthing studio, both of them laughing, in the open gap between the power rack on one side and the kettlebell shelves on the other.',
  desc:'A pause in a one-to-one session. Esther and a client stand facing each other in the open middle of the studio floor, both laughing, in the gap between the power rack on one side and the kettlebell shelves on the other. Nothing is being lifted. A barbell is down on the floor at the edge of the frame, off to one side of where they are standing.',
  note:'The second photograph the brief flagged as double-described. The /testimonials string also says &ldquo;clients&rdquo; — there is one client in the frame.',
  flag:'<p>The wall slogan fills the top right quarter of this frame and is fully legible. It is the hero of <code>/faqs</code>.</p>',
  reason:'Warm and accurate as far as it goes, but names no adaptation, and the plural on /testimonials is wrong.'
},
{
  id:'EF-06', file:'coaching-bench-press-spot.jpg', kind:'hero', routes:['/personal-training · hero'],
  title:'Coaching from the client&rsquo;s eye level',
  verdict:'revise',
  was:'Esther coaching a client through an incline dumbbell press in her private Worthing studio',
  alt:'A client lying back on the adjustable bench in the private Worthing studio pressing a single dumbbell, with Esther crouched down beside the bench at the client&rsquo;s eye level rather than standing over her, both of them laughing.',
  desc:'A one-to-one session at the bench. The client lies back on the adjustable bench and presses a single selector dumbbell; her other hand is open and free above her. Esther has crouched right down beside the bench so that she is at the client&rsquo;s eye level rather than standing over her, one hand on her own knee and neither hand on the client. The kettlebell shelves, a water bottle and a phone are on the wall shelf behind them.',
  flag:'<p>The live alt calls this an incline dumbbell press. In this frame the bench back is low, only one dumbbell is in play and the client&rsquo;s other arm is empty. Confirm the movement before this goes on the page — the rest of the description does not depend on it.</p><p>The tail of the wall slogan runs along the top edge of the frame.</p>',
  reason:'Names the exercise and the room but no adaptation, and the exercise name looks wrong.'
},
{
  id:'EF-07', file:'pricing-hero-coaching.jpg', kind:'hero', routes:['/pricing · hero'],
  title:'Half-kneeling, with a hand held out as the target',
  verdict:'revise',
  was:'Esther coaching a client through a split squat with a barbell in the private Worthing studio',
  alt:'A client half-kneeling on a padded mat in the private Worthing studio holding a barbell anchored at one end into the rack, while Esther stands two paces in front with a flat hand held out at chest height as a target to work to.',
  desc:'A one-to-one session in the middle of the studio. The client kneels on one knee on a padded mat, holding the free end of a barbell whose other end is anchored into the rack behind her. Esther stands two paces in front holding one hand out flat at chest height as a height to work to, and is not touching the client at any point. The whiteboard, the kettlebell shelves and the mirror run along the wall behind them.',
  flag:'<p>The live alt calls this a split squat with a barbell. The client is half-kneeling on a pad with a bar anchored at one end, which is a different movement. Confirm the name before it goes live.</p><p>The wall slogan is fully legible across the top left of the frame.</p>',
  reason:'The exercise named is not the exercise in the frame, and the kneeling pad and the held-out hand — the two adaptations — go unmentioned.'
},
{
  id:'EF-08', file:'consultation-programme-review.jpg', kind:'hero', routes:['/testimonials · hero'],
  title:'The programme in the coach&rsquo;s hands, mid-set',
  verdict:'revise',
  was:'Esther Fair reviewing a client&rsquo;s programme together in her private Worthing studio',
  alt:'Esther standing in the private Worthing studio holding the session&rsquo;s written programme and a pen, laughing with a client who is mid-set at the power rack with a dumbbell up at her shoulder.',
  desc:'A one-to-one session in progress at the power rack. The client stands with a dumbbell up at her shoulder, part-way through a set. Esther stands a couple of paces away holding the session&rsquo;s programme on paper with a pen in her hand, laughing with her — the plan stays in the coach&rsquo;s hands and gets called out, rather than being something the client has to read between sets. The trap bar and a loaded barbell are on their wall hooks behind them.',
  flag:'<p>The wall slogan reads clearly across the top right of this frame — the hero of <code>/testimonials</code>.</p>',
  reason:'They are not reviewing anything together — the client is mid-set. The alt describes a different moment.'
},
{
  id:'EF-09', file:'hero-vi-kettlebell-rack.jpg', kind:'hero', routes:['/visual-impairment · hero'],
  title:'A hand on a bell that is racked in its usual place',
  verdict:'keep',
  was:'Esther standing at the kettlebell rack in the private Worthing studio, smiling towards the camera with one hand resting on a bell that is racked in its usual place',
  alt:'Esther standing at the kettlebell rack in the private Worthing studio, smiling towards the camera with one hand resting on a bell that is racked in its usual place',
  altSame:true,
  desc:'Esther stands at the kettlebell shelf with one hand resting on a bell in the top row. The bells sit in weight order along the shelf, the lighter ones marked with coloured bands, each one in the place it is always kept. The floor in front of the shelf is clear.',
  descNew:true,
  note:'Reference plate — the alt is the standard this sheet was written against and is carried through unchanged. It has no disclosure on the page today, so one is proposed here; the alt is untouched.',
  reason:'All three elements present. Nothing to change.'
},

/* ─── CLOSING BANDS ──────────────────────────────────────────── */
{
  id:'EF-10', file:'studio-1.jpg', kind:'cta', routes:['/ · closing band','/specialist-training · closing band'],
  title:'At the shelves, the wider frame',
  verdict:'replace',
  was:'Eternal Fitness private studio in Worthing',
  alt:'Esther standing at the kettlebell shelves in the private Worthing studio with a hand resting on the bells, smiling towards the camera, the mirror, whiteboard and adjustable bench along the wall behind her.',
  desc:'Esther stands at the kettlebell shelves with a hand resting on the bells along the top row, turned back towards the camera. The bells sit in weight order, the lighter ones marked with coloured bands. Along the wall behind her are the mirror, the whiteboard, the suspension straps and the adjustable bench, each in its own fixed place; the floor between them is clear.',
  flag:'<p>This is not an empty studio, which is what the brief assumed from the filename. It is the wider frame of the same setup as <code>hero-vi-kettlebell-rack.jpg</code> — so <code>/</code>, <code>/specialist-training</code> and <code>/visual-impairment</code> currently all lead on the same photograph.</p><p>The tail of the wall slogan is legible in the top left corner.</p>',
  reason:'A search string, and describing the wrong subject entirely.'
},
{
  id:'EF-11', file:'esther-headshot-smile.jpg', kind:'cta', routes:['/contact · closing band'],
  title:'Portrait, the contact-page crop',
  verdict:'replace',
  was:'Esther Fair smiling',
  alt:'Esther standing against the plywood wall of the private Worthing studio with one hand on her hip, smiling straight at the camera, the kettlebells racked in weight order on the shelf beside her.',
  desc:null,
  descNote:'No disclosure — a portrait, same reasoning as the /about crop.',
  note:'The same photograph as the <code>/about</code> hero at a near-identical crop. One description, used on both.',
  flag:'<p>The wall slogan fills the top third of this crop too.</p>',
  reason:'Two words. Says nothing about the room, the frame or the person beyond a name.'
},
{
  id:'EF-12', file:'coaching-deadlift-setup.jpg', kind:'cta', routes:['/faqs · closing band'],
  title:'Leaning in level with the bar',
  verdict:'revise',
  was:'Esther coaching a client through a deadlift setup',
  alt:'A client hinged over a loaded barbell in the private Worthing studio taking his grip, with Esther leaning in from the side so her eyes are level with the bar, one hand out towards it and neither hand on him.',
  desc:'A one-to-one session at the barbell. The client stands over a loaded bar and takes his grip; the plates are marked 5 KG in large white figures on black. Esther has leaned in from the side so her eyes are level with the bar rather than watching from standing, one hand out towards it and neither hand touching him. Resistance bands hang from the wall on the right and the kettlebells are on their shelf behind.',
  flag:'<p>The wall slogan reads clearly across the top of this frame.</p>',
  reason:'Names the movement, nothing else. The lean-in is the whole picture.'
},
{
  id:'EF-13', file:'studio-slam-balls-rack.jpg', kind:'cta', routes:['/personal-training · closing band'],
  title:'Stored up the wall, heaviest at the bottom',
  verdict:'revise',
  was:'Slam balls racked in the Eternal Fitness studio',
  alt:'The slam balls in the private Worthing studio stored on a wall rack in a vertical stack with the heaviest at the bottom and its weight printed on the side, and the battle rope coiled on the floor at the foot of the rack.',
  desc:'A corner of the studio with nothing in use. Four slam balls sit on a wall-mounted rack in a vertical stack, one above another, heaviest at the bottom and marked 15 KG. The battle rope is coiled on the floor at the foot of the rack — the one thing in this corner that is down at floor level. Behind it the weight plates are on the rack&rsquo;s own pegs and the bench is pushed in under the frame.',
  reason:'Names the object. The vertical order, the printed weight and the rope on the floor are what someone actually needs from this frame.'
},
{
  id:'EF-14', file:'pricing-studio.jpg', kind:'cta', routes:['/pricing · closing band'],
  title:'Walking the lunge alongside',
  verdict:'replace',
  was:'Esther coaching a client through a walking barbell lunge…',
  alt:'A client walking a lunge across the open floor of the private Worthing studio with his hands on his thighs and no weight, and Esther stepping the same lunge alongside him half a pace behind.',
  desc:'A one-to-one session on the open floor. The client steps forward into a lunge with his hands resting on his thighs and nothing in them. Esther walks the same lunge alongside him, half a pace behind, matching the step rather than calling it from across the room. A barbell lies on the floor behind them, well out of the line they are walking.',
  flag:'<p>The live alt calls this a walking <em>barbell</em> lunge. Neither person is holding a barbell — it is bodyweight. This is the second of the two live strings describing equipment that is not in the frame.</p><p>The wall slogan is fully legible across the upper left.</p>',
  reason:'Factually wrong about what is being carried. Replaced, not revised.'
},
{
  id:'EF-15', file:'studio-lunge-pair.jpg', kind:'cta', routes:['/visual-impairment · closing band'],
  title:'Behind the text — and not what the filename says',
  verdict:'keep',
  was:'alt="" — empty, decorative',
  alt:'alt="" — unchanged. Correct for a background behind text.',
  altSame:true,
  previewAlt:'Esther kneeling on the blue studio mats, laughing, with two large curly-coated dogs jumping up at her.',
  desc:null,
  descNote:'No disclosure. A decorative background needs an empty alt and nothing else — adding a description here would be noise for a screen-reader user, not help.',
  flag:'<p>The filename is wrong and so is the assumption behind it. This is not a lunge pair: it is Esther kneeling on the blue mats laughing while two large curly-coated dogs jump up at her. There is no lunge, no client and no training content in the frame.</p><p>The attribute is right, so nothing is broken. But this is the full-bleed band closing the page written for people with sight loss, and it is a photograph of dogs. Worth a decision on the photograph itself rather than on its alt text.</p>',
  reason:'The empty alt is correct and stays. The flag is about the choice of image, not the markup.'
},

/* ─── INLINE ─────────────────────────────────────────────────── */
{
  id:'EF-16', file:'why-coaching-review.jpg', kind:'inline', routes:['/ · why-coaching split'],
  title:'The written plan, held by the coach',
  verdict:'revise',
  was:'Esther Fair coaching a client through a session, reviewing their programme notes in the private Worthing studio',
  alt:'Esther laughing with a client in the private Worthing studio, the session&rsquo;s written programme and a pen in her hands, while the client stands at the power rack with a dumbbell up at her shoulder.',
  desc:'A one-to-one session at the power rack, seen from a little further back. The client stands with a dumbbell up at her shoulder mid-set. Esther is a couple of paces away holding the printed programme and a pen, laughing with her — the plan lives in the coach&rsquo;s hands and gets called out rather than read. The trap bar and a barbell hang on their wall hooks behind them.',
  note:'The wider frame of the same moment as <code>consultation-programme-review.jpg</code> on <code>/testimonials</code>. Both descriptions are written to agree.',
  flag:'<p>The wall slogan reads clearly across the top right of this frame.</p>',
  reason:'Close, but they are not reviewing notes together — one is mid-set — and no adaptation is named.'
},
{
  id:'EF-17', file:'approach-step1-plank-coaching.jpg', kind:'inline', routes:['/ · approach step 1'],
  title:'A flat hand on the upper back',
  verdict:'replace',
  was:'Esther adjusting a client&rsquo;s form during a plank in the private Worthing studio',
  alt:'Esther kneeling beside a client holding a forearm plank on the studio mats, resting a flat hand on his upper back to show him where the line of his body should sit',
  desc:'A one-to-one session on the studio mats. The client holds a forearm plank. Esther kneels alongside him and rests one flat, open hand on his upper back &mdash; a cue to activate the muscles here. Her other hand stays clear of him. Behind them the room is quiet &mdash; racked resistance bands on one wall, a foam roller, nothing on the floor.',
  note:'Both the alt and the description are adopted word for word from the same photograph&rsquo;s treatment on <code>/visual-impairment</code>, where it is already to standard. Nothing new is written here on purpose — one photograph, one description.',
  reason:'The right words for this photograph already exist on another page. This one carries the weak version.'
},
{
  id:'EF-18', file:'approach-step2-lunges-together.png', kind:'inline', routes:['/ · approach step 2'],
  title:'The same position, side by side',
  verdict:'revise',
  was:'Esther and a client doing lunges together, laughing, in the private Worthing studio',
  alt:'Esther and a client side by side on the studio mats, both down in a half-kneeling lunge with a hand resting on the front thigh, Esther holding the same position alongside rather than watching from standing.',
  desc:'Two people on the blue mats, side by side, both in a half-kneeling lunge with the back knee down on the padding and a hand resting on the front thigh. Esther is in the same position as the client rather than standing over her, so the shape can be copied from alongside. Both are laughing. The foam rollers are racked on the wall behind them and the mats are clear.',
  note:'Near-identical frame to <code>mobility-hip-flexor-stretch.jpg</code> on <code>/contact</code>. One of the three duplicated pairs the brief did not list; both now carry this description.',
  reason:'Accurate, and the friendliest of the current strings — but &ldquo;together&rdquo; is doing all the work that &ldquo;in the same position, on padding&rdquo; should be doing.'
},
{
  id:'EF-19', file:'approach-step3-deadlift-clients.jpg', kind:'inline', routes:['/ · approach step 3'],
  title:'Showing the hinge by doing it',
  verdict:'replace',
  was:'Two clients working through a dumbbell deadlift together in the private Worthing studio',
  alt:'Esther and a client hinged forward side by side in the private Worthing studio, the client holding one small dumbbell and Esther running her hands down her own thighs to show the path the hinge takes.',
  desc:'A one-to-one session on the studio floor. The client hinges forward at the hips holding a single small dumbbell in one hand. Esther stands beside him in the same hinge, hands sliding down her own thighs to show the path the movement takes rather than describing it. Neither is lifting from the floor; a loaded barbell rests on the mat at the edge of the frame.',
  flag:'<p>The live alt says &ldquo;two clients&rdquo;. One of the two is you.</p><p>The wall slogan reads clearly across the top of this frame.</p>',
  reason:'Wrong about who is in the frame — the reason this needs replacing rather than revising.'
},
{
  id:'EF-20', file:'specialist-training-esther-client.jpg', kind:'inline', routes:['/ · specialist training card'],
  title:'Facing each other, arms out — held for confirmation',
  verdict:'replace',
  was:'Esther guiding a client through specialist training in the private Worthing studio',
  alt:'Esther and a client standing facing each other by the power rack in the private Worthing studio, both with an arm raised out to the side, Esther holding the same position she is asking for.',
  desc:null,
  descNote:'Held back. No description is proposed until the file is confirmed — writing one from a frame that cannot be read straight is exactly the failure this sheet exists to avoid.',
  flag:'<p>The copy of this file staged for review is rotated a quarter turn, so the posture cannot be read with confidence. The alt above is provisional and this plate should be marked <em>Ask me</em> until two things are checked: what the movement actually is, and whether the version the site serves is the right way up.</p>',
  reason:'The current string is a search phrase, but the replacement cannot be settled until the file is confirmed.'
},
{
  id:'EF-21', file:'about-story-deadlift.jpg', kind:'inline', routes:['/about · story split'],
  title:'Stepped back to watch the whole lift',
  verdict:'revise',
  was:'Esther Fair coaching a client through a deadlift in her private studio in Worthing',
  alt:'A client hinged over a loaded barbell in the private Worthing studio taking his grip, with Esther standing a step back so she can see the whole lift rather than leaning in.',
  desc:'A one-to-one session at the barbell, a beat after the setup. The client is hinged over the bar with both hands on it; the plates are marked 5 KG in large white figures. Esther has stepped back a pace so she can see the whole lift, hands at her sides, and is not touching him. Resistance bands hang from the wall on the right; the floor around the bar is clear.',
  note:'The same session as <code>coaching-deadlift-setup.jpg</code> on <code>/faqs</code>, one frame apart — the descriptions differ only where the photographs do.',
  flag:'<p>The wall slogan reads clearly across the top of this frame.</p>',
  reason:'Names the lift and the room. Where the coach is standing, and why, is the missing third.'
},
{
  id:'EF-22', file:'about-quals-barbell-hands.jpg', kind:'inline', routes:['/about · qualifications split'],
  title:'Holding the bar still while he finds his grip',
  verdict:'revise',
  was:'Esther steadying a barbell for a client in the studio',
  alt:'A client setting his grip on a bare barbell stood upright on its end, with Esther holding the same bar with both hands just below his so it stays still while he finds the position by feel.',
  desc:'A close-in moment before a set. A bare barbell is stood upright on the floor on one end. The client has one hand around it at chest height; Esther holds the same bar with both hands just below his, keeping it completely still while he finds his grip. Both are looking down at the bar. Nothing is loaded on it yet.',
  note:'One of the strongest adaptation photographs in the set — the current alt is the closest of any on the site to naming one, and only needs finishing.',
  flag:'<p>The wall slogan runs across the top of this frame at its largest.</p>',
  reason:'&ldquo;Steadying&rdquo; is the right verb; what it is being steadied for is the part worth saying.'
},
{
  id:'EF-23', file:'about-experience-coaching.png', kind:'inline', routes:['/about · experience split'],
  title:'A hand under each elbow, the whole way',
  verdict:'replace',
  was:'Esther coaching a client through a dumbbell exercise in the studio',
  alt:'A client seated on the upright bench in the private Worthing studio pressing two dumbbells overhead, with Esther standing behind the bench and a hand under each of his elbows through the whole movement.',
  desc:'A one-to-one session at the bench, seen from behind. The client presses two dumbbells up from shoulder height, sitting back against the upright bench. Esther stands behind him with a hand under each elbow all the way up and all the way down, so he knows where the support is without having to look for it. The studio door and the window are ahead of them; the floor behind the bench is clear.',
  reason:'&ldquo;A dumbbell exercise&rdquo; describes nothing. The spot at the elbows is the picture.'
},
{
  id:'EF-24', file:'about-studio-band-stretch.jpg', kind:'inline', routes:['/about · studio pair'],
  title:'One band, held between the two of them',
  verdict:'revise',
  was:'Esther guiding a client through a resistance band stretch beside the squat rack in the studio',
  alt:'Esther and a client facing each other across the studio floor with one long resistance band held between them, Esther down in the same half-squat she is asking the client to hold.',
  desc:'Two people facing each other across the studio floor with a single long resistance band stretched between them, one end each. Esther holds her end in at her chest and sits down into a half-squat — the same position the client is working in — so the shape is being shown rather than described. The kettlebell shelves, the whiteboard and the suspension straps are along the wall behind.',
  flag:'<p>The wall slogan is fully legible across the top left.</p>',
  reason:'&ldquo;Guiding through&rdquo; hides the adaptation: she is in the position, not beside it.'
},
{
  id:'EF-25', file:'about-studio-kettlebells.jpg', kind:'inline', routes:['/about · studio pair'],
  title:'Same rotation, one mat each',
  verdict:'revise',
  was:'Esther guiding a client through a mobility stretch on the studio mats',
  alt:'Esther and a client on the blue mats side by side, both in the same half-kneeling rotation with one hand planted on the mat and the other arm reaching straight up, each following their own raised hand with their eyes.',
  desc:'Two people on the blue mats, one mat each, both in the same half-kneeling rotation: one hand planted on the mat, the other arm reaching straight up, eyes following the raised hand. Esther is doing the movement alongside the client rather than watching it. The plyo boxes and the dumbbell tree stand against the wall behind; the mats are padded and the floor around them is clear.',
  flag:'<p>The filename says kettlebells. There is not a kettlebell in the frame. Worth renaming when this is wired in, so the next person to touch it does not write from the filename.</p>',
  reason:'&ldquo;A mobility stretch&rdquo; could be anything. Which stretch, and that she is in it too, is what is missing.'
},
{
  id:'EF-26', file:'mobility-hip-flexor-stretch.jpg', kind:'inline', routes:['/contact · mobility split'],
  title:'The half-kneeling frame, second use',
  verdict:'revise',
  was:'Esther and a client working through a kneeling hip stretch on the mats in the private Worthing studio',
  alt:'Esther and a client side by side on the studio mats, both down in a half-kneeling lunge with a hand resting on the front thigh, Esther holding the same position alongside rather than watching from standing.',
  desc:'Two people on the blue mats, side by side, both in a half-kneeling lunge with the back knee down on the padding and a hand resting on the front thigh. Esther is in the same position as the client rather than standing over her, so the shape can be copied from alongside. Both are laughing. The foam rollers are racked on the wall behind them and the mats are clear.',
  note:'Near-identical frame to <code>approach-step2-lunges-together.png</code> on <code>/</code>, and described identically here on purpose. A third duplicate the brief did not list.',
  reason:'The better of the two current strings for this frame, but still silent on the adaptation — and it disagrees with the one on the homepage.'
},
{
  id:'EF-27', file:'consultation-programme-notes.jpg', kind:'inline', routes:['/personal-training · consultation split'],
  title:'Sitting at the same height to talk it through',
  verdict:'revise',
  was:'Esther going through the session plan with a client before they start',
  alt:'Esther and a client sitting facing each other at the same height in the private Worthing studio, Esther with the printed programme and a pen on her lap and the client on the bench with a 10 kg dumbbell in each hand.',
  desc:'A one-to-one session, paused. The client sits on the bench holding a 10 kg dumbbell in each hand, the weights printed in large figures on the ends. Esther sits opposite him on a plyo box at the same height, the printed programme on her lap and a pen in her hand, talking it through at eye level rather than standing over him. The kettlebells are on their shelf behind them.',
  flag:'<p>Minor: the current alt says &ldquo;before they start&rdquo;. He already has the weights in his hands, so this reads as a pause mid-session rather than a briefing. Small, but it is the sort of thing that sets a wrong expectation.</p>',
  reason:'The moment is slightly misdescribed, and sitting at the same height — the adaptation — is not named.'
},
{
  id:'EF-28', file:'studio-kneel-stretch.jpg', kind:'inline', routes:['/specialist-training · split'],
  title:'Stretching out at the end, with the dog',
  verdict:'replace',
  was:'Esther Fair coaching a client in the Eternal Fitness studio in Worthing',
  alt:'Esther and a client sitting on the studio mats in a wide seated stretch, both leaning onto one hand and laughing, with the studio&rsquo;s black curly-coated dog sitting on the mat against Esther&rsquo;s side.',
  desc:'The end of a session on the mats. Esther and a client sit on the blue matting in a wide seated stretch, each leaning onto one hand, both laughing. The studio dog — large, black and curly-coated — has come and sat on the mat and is leaning against Esther. The resistance bands are racked on the wall and the floor beyond the mats is clear.',
  flag:'<p>There is a dog in this photograph, and another in <code>studio-lunge-pair.jpg</code>. That is genuine access information for some clients — whether they would want to know before they arrive, or would rather not — and nothing on the site currently says a dog is sometimes in the room. The description above names it plainly. Tell us if you would rather it were handled differently, or said somewhere in the copy as well.</p>',
  reason:'A search string. Nothing about what is happening, and it omits the most noticeable thing in the frame.'
},
{
  id:'EF-29', file:'coaching-plank-lowback-cue.jpg', kind:'inline', routes:['/visual-impairment · technique split'],
  title:'The cue you can feel',
  verdict:'keep',
  was:'Esther kneeling beside a client holding a forearm plank on the studio mats, resting a flat hand on his upper back to show him where the line of his body should sit',
  alt:'Esther kneeling beside a client holding a forearm plank on the studio mats, resting a flat hand on his upper back to show him where the line of his body should sit',
  altSame:true,
  desc:'A one-to-one session on the studio mats. The client holds a forearm plank. Esther kneels alongside him and rests one flat, open hand on his upper back &mdash; a cue to activate the muscles here. Her other hand stays clear of him. Behind them the room is quiet &mdash; racked resistance bands on one wall, a foam roller, nothing on the floor.',
  note:'Already to standard, alt and description both, and already live. Carried through unchanged. It is the same photograph as <code>approach-step1-plank-coaching.jpg</code> on <code>/</code>, which is why that plate adopts these words rather than writing new ones.',
  reason:'All three elements present, and the description names both what her hands are doing and what is on the floor. Nothing to change.'
},
{
  id:'EF-30', file:'esther-portrait-studio.jpg', kind:'inline', routes:['/visual-impairment · trainer mount'],
  title:'Portrait, the crop without the slogan',
  verdict:'revise',
  was:'Esther Fair smiling in the private Worthing studio',
  alt:'A head-and-shoulders portrait of Esther against the plywood wall of the private Worthing studio, one hand on her hip, smiling straight at the camera, with a single kettlebell on its rack at the edge of the frame.',
  desc:'A head-and-shoulders portrait of Esther, smiling, standing against the studio&rsquo;s plywood wall.',
  descNote:'The live description is the right length for a portrait and is kept exactly as it is. Only the alt is revised.',
  note:'The third crop of the same photograph as the <code>/about</code> hero and the <code>/contact</code> band — and the only one of the three with the wall slogan out of frame. If a portrait is needed on a page where the slogan is a problem, this is the crop.',
  reason:'The description on this page is already right. The alt beside it is the weakest of the three on /visual-impairment and names neither the framing nor anything else usable.'
},
{
  id:'EF-31', file:'studio-fixed-positions.jpg', kind:'inline', routes:['/visual-impairment · studio split'],
  title:'The room with nothing left out',
  verdict:'keep',
  was:'The private studio between sessions, empty: bare rubber matting on the floor with nothing left out on it, and weights, exercise balls and resistance bands stored on wall racks',
  alt:'The private studio between sessions, empty: bare rubber matting on the floor with nothing left out on it, and weights, exercise balls and resistance bands stored on wall racks',
  altSame:true,
  desc:'The private studio with no one in it. The floor is bare rubber matting &mdash; no loose plates, no dumbbells left out, nothing to walk into. Weights, exercise balls and resistance bands stored in racks.',
  note:'Reference plate — alt and description both already to standard and already live. Carried through unchanged.',
  reason:'The adaptation is the whole sentence. Nothing to change.'
}

];
