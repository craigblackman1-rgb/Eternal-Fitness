-- Seed the Leg Pain Questionnaire document template on the document engine,
-- using the same interactive feedbackSections/feedbackConsents schema as
-- PAR-Q and Client Feedback (20260721_seed_parq_template.sql,
-- 20260721_seed_feedback_template.sql). A symptom-screening form, not a
-- compliance document — created ad hoc from the client's page when a client
-- flags leg pain, same flow as any other document kind.
--
-- Content/wording matches
-- D:\apps\design-systems\ef-control-hub\documents\leg-pain-questionnaire.html
-- (the generic v1.0 template, not the per-client "Monique Wearden" instance),
-- restructured into feedbackSections questions. Two source deviations,
-- both deliberate:
--   1. The masthead's "Level 4 Personal Trainer" line is not reproduced —
--      the document engine's shared masthead/footer already carries Esther's
--      org line (components/documents/DocumentView.tsx), so no per-template
--      copy is needed here. (Note: that shared masthead itself still has the
--      known-wrong "Level 4 Personal Trainer" phrasing per CLAUDE.md — a
--      pre-existing issue across every document kind, out of scope for this
--      migration.)
--   2. The mockup's front/back body-map SVG diagrams are not reproduced —
--      the checkbox list captures the same data; the diagrams were a visual
--      aid, not additional structured content.
-- The "tick all that apply" checkbox questions use the new "multi" question
-- type (lib/documents/types.ts); the 0-10 pain-scale questions map to the
-- existing "choice" radio-group type with 0-10 options (no dedicated slider
-- widget) — same simplification precedent as every other rating-style
-- question in the existing PAR-Q/feedback templates.
-- Guarded so it is safe to re-run.
INSERT INTO document_templates (kind, name, version, requires_client_signature, requires_trainer_signature, body)
SELECT 'leg_pain_questionnaire', 'Leg Pain Questionnaire', 1, true, false, $json$
{
  "intro": "<p>Thank you for flagging this. Please fill this in as fully as you can. There are no right or wrong answers — the more detail you give me, the better I can understand what's going on and make sure we're training in a way that helps rather than hinders.</p><p><strong>Before you start:</strong> if you're not sure about something, just give your best description — \"a dull ache somewhere behind the knee\" is genuinely more useful to me than a blank box. Skip anything that doesn't apply. If you'd rather talk it through than write it down, bring this to your next session and we'll do it together instead.</p><p>This is not a diagnosis and it doesn't replace seeing your GP or a physiotherapist. It tells me what to adapt, what to leave alone, and when to ask you to get something checked.</p>",
  "sections": [],
  "feedbackSections": [
    {
      "id": "where",
      "num": "Section 1",
      "title": "Where is the pain?",
      "intro": "Start with roughly where it sits, then add anything more specific underneath.",
      "questions": [
        { "id": "whichLeg", "type": "choice", "label": "Which leg is affected?", "options": [{ "value": "left", "label": "Left" }, { "value": "right", "label": "Right" }, { "value": "both", "label": "Both" }] },
        { "id": "location", "type": "multi", "label": "Where in the leg is the pain?", "note": "Tick everything that applies.", "options": [{ "value": "hip", "label": "Hip, or the very top of the leg" }, { "value": "thigh-front", "label": "Thigh — front" }, { "value": "thigh-back", "label": "Thigh — back" }, { "value": "knee", "label": "Knee" }, { "value": "shin", "label": "Shin, below the knee" }, { "value": "calf", "label": "Calf" }, { "value": "ankle", "label": "Ankle" }, { "value": "foot", "label": "Foot" }] },
        { "id": "locationDetail", "type": "text", "label": "Can you describe the location more precisely?", "note": "For example: the inside of the knee, the outside of the thigh, or running down the back of the leg from the buttock." }
      ]
    },
    {
      "id": "feels-like",
      "num": "Section 2",
      "title": "What does it feel like?",
      "intro": "The character of a pain tells me more than its strength does — an ache and a burn point at very different things.",
      "questions": [
        { "id": "painType", "type": "multi", "label": "How would you describe the pain?", "note": "Tick all that apply.", "options": [{ "value": "aching", "label": "Aching" }, { "value": "sharp", "label": "Sharp" }, { "value": "burning", "label": "Burning" }, { "value": "throbbing", "label": "Throbbing" }, { "value": "stabbing", "label": "Stabbing" }, { "value": "cramping", "label": "Tight or cramping" }, { "value": "tingling", "label": "Tingling, or pins and needles" }, { "value": "numbness", "label": "Numbness" }, { "value": "other", "label": "Something else" }] },
        { "id": "painTypeOther", "type": "text", "label": "If something else, what does it feel like in your own words?" },
        { "id": "painWorst", "type": "choice", "label": "At its worst, how bad does it get?", "note": "0 = no pain at all, 10 = the worst you can imagine.", "options": [{ "value": "0", "label": "0" }, { "value": "1", "label": "1" }, { "value": "2", "label": "2" }, { "value": "3", "label": "3" }, { "value": "4", "label": "4" }, { "value": "5", "label": "5" }, { "value": "6", "label": "6" }, { "value": "7", "label": "7" }, { "value": "8", "label": "8" }, { "value": "9", "label": "9" }, { "value": "10", "label": "10" }] },
        { "id": "painTypical", "type": "choice", "label": "And on an ordinary day?", "note": "0 = no pain at all, 10 = the worst you can imagine.", "options": [{ "value": "0", "label": "0" }, { "value": "1", "label": "1" }, { "value": "2", "label": "2" }, { "value": "3", "label": "3" }, { "value": "4", "label": "4" }, { "value": "5", "label": "5" }, { "value": "6", "label": "6" }, { "value": "7", "label": "7" }, { "value": "8", "label": "8" }, { "value": "9", "label": "9" }, { "value": "10", "label": "10" }] },
        { "id": "painTravels", "type": "choice", "label": "Does the pain stay in one place, or does it travel?", "options": [{ "value": "same-place", "label": "Stays put" }, { "value": "spreads", "label": "Spreads" }, { "value": "moves", "label": "Moves around" }, { "value": "unsure", "label": "Not sure" }] }
      ]
    },
    {
      "id": "when",
      "num": "Section 3",
      "title": "When does it happen?",
      "intro": "Timing is the most useful single thing on this form. A pain that is worst first thing behaves very differently from one that builds through the day.",
      "questions": [
        { "id": "whenWorst", "type": "multi", "label": "When do you notice it most?", "note": "Tick all that apply.", "options": [{ "value": "morning", "label": "First thing in the morning" }, { "value": "daytime", "label": "Building through the day" }, { "value": "on-feet", "label": "After a while on your feet" }, { "value": "during-exercise", "label": "During exercise" }, { "value": "after-exercise", "label": "The day after exercise" }, { "value": "evening", "label": "In the evening" }, { "value": "night", "label": "At night, in bed" }, { "value": "constant", "label": "It's there most of the time" }] },
        { "id": "duration", "type": "choice", "label": "How long has this been going on?", "options": [{ "value": "under-week", "label": "Under a week" }, { "value": "1-4-weeks", "label": "1–4 weeks" }, { "value": "1-3-months", "label": "1–3 months" }, { "value": "over-3-months", "label": "Longer" }] },
        { "id": "onset", "type": "choice", "label": "Did it come on suddenly, or creep up on you?", "options": [{ "value": "sudden", "label": "Suddenly" }, { "value": "gradual", "label": "Gradually" }, { "value": "unsure", "label": "Not sure" }] },
        { "id": "trigger", "type": "text", "label": "Do you remember anything that set it off?", "note": "A trip or a fall, a long walk, a new pair of shoes, a change at work — or nothing you can put your finger on, which is a perfectly normal answer." }
      ]
    },
    {
      "id": "better-worse",
      "num": "Section 4",
      "title": "What makes it better or worse?",
      "intro": "This is what I'll use to decide what stays in your programme, what gets adapted, and what we park for now.",
      "questions": [
        { "id": "worse", "type": "multi", "label": "What makes it worse?", "note": "Tick all that apply.", "options": [{ "value": "walking", "label": "Walking" }, { "value": "standing", "label": "Standing still" }, { "value": "sitting", "label": "Sitting for a while" }, { "value": "stairs", "label": "Stairs" }, { "value": "standing-up", "label": "Getting up from a chair" }, { "value": "exercise", "label": "Exercise" }, { "value": "rest", "label": "Rest, or sitting still too long" }, { "value": "cold", "label": "Cold or damp weather" }, { "value": "other", "label": "Something else" }] },
        { "id": "worseOther", "type": "text", "label": "If something else, what else makes it worse?" },
        { "id": "better", "type": "multi", "label": "What makes it better?", "note": "Tick all that apply.", "options": [{ "value": "rest", "label": "Rest" }, { "value": "movement", "label": "Gentle movement" }, { "value": "heat", "label": "Heat" }, { "value": "ice", "label": "Ice" }, { "value": "stretching", "label": "Stretching" }, { "value": "elevation", "label": "Putting the leg up" }, { "value": "pain-relief", "label": "Pain relief" }, { "value": "nothing", "label": "Nothing much helps" }, { "value": "other", "label": "Something else" }] },
        { "id": "betterOther", "type": "text", "label": "If something else, what else helps?" },
        { "id": "selfTreatment", "type": "text", "label": "What have you already tried yourself?", "note": "Including anything that didn't work — that's just as useful to know." }
      ]
    },
    {
      "id": "impact",
      "num": "Section 5",
      "title": "How it's affecting you",
      "intro": "Not how bad it is, but what it's actually stopping you doing. Anything you answer yes to, I'll pick up with you before we next train.",
      "questions": [
        { "id": "sleep", "type": "choice", "label": "Is it disturbing your sleep?", "note": "I'll ask you about this before we train.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "walking", "type": "choice", "label": "Is it limiting how far you can walk?", "note": "Compared with what you'd have managed comfortably a few months ago. I'll ask you about this before we train.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "avoiding", "type": "choice", "label": "Are you avoiding anything day to day because of it?", "note": "I'll ask you about this before we train.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "trainingChange", "type": "choice", "label": "Have you changed anything in your training because of it?", "note": "Skipping an exercise, going lighter, or stopping early all count. I'll ask you about this before we train.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "impactDetail", "type": "text", "label": "Tell me more about what you've had to change" }
      ]
    },
    {
      "id": "safety-checks",
      "num": "Section 6",
      "title": "A few safety checks",
      "intro": "These are the questions any trainer or physiotherapist would ask before loading a painful leg. Ticking yes to one of these doesn't mean something is wrong — it means I'd rather you had it looked at before we train that leg hard, and I'll adapt the session in the meantime rather than cancel it. If something changes quickly — a calf that becomes swollen, hot and painful, or you become short of breath or get chest pain — don't wait for our next session: contact NHS 111 or your GP the same day, or call 999 in an emergency.",
      "questions": [
        { "id": "calfSwelling", "type": "choice", "label": "Is the calf swollen, red, or noticeably warmer than the other leg?", "note": "Please tell me today, before your next session — this one needs checking first.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "immobility", "type": "choice", "label": "Did it start after a long flight, a long drive, or a spell off your feet?", "note": "Please tell me today, before your next session — this one needs checking first.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "claudication", "type": "choice", "label": "Do both legs ache when you walk, and settle again when you stop?", "note": "Please tell me today, before your next session — this one needs checking first.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "weakness", "type": "choice", "label": "Any new weakness — a foot that catches, or a leg that gives way?", "note": "Please tell me today, before your next session — this one needs checking first.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "saddle", "type": "choice", "label": "Any numbness between the legs, or a change in bladder or bowel control?", "note": "Please tell me today, before your next session — this one needs checking first.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "restPain", "type": "choice", "label": "Is it there even when you're completely still, or waking you every night?", "note": "Please tell me today, before your next session — this one needs checking first.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "systemic", "type": "choice", "label": "Any fever, or weight loss you can't account for, alongside the pain?", "note": "Please tell me today, before your next session — this one needs checking first.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] }
      ]
    },
    {
      "id": "already-done",
      "num": "Section 7",
      "title": "What you've already done about it",
      "intro": "If someone else is already involved, I'd rather work alongside them than cut across what they've told you.",
      "questions": [
        { "id": "seen", "type": "multi", "label": "Have you seen anyone about it?", "note": "Tick all that apply.", "options": [{ "value": "gp", "label": "GP" }, { "value": "physio", "label": "Physiotherapist" }, { "value": "osteo", "label": "Osteopath or chiropractor" }, { "value": "hospital", "label": "Hospital or A&E" }, { "value": "nobody", "label": "Nobody yet" }, { "value": "other", "label": "Someone else" }] },
        { "id": "seenOther", "type": "text", "label": "If someone else, who else have you seen?" },
        { "id": "diagnosis", "type": "text", "label": "Were you given a diagnosis, or told what it might be?", "note": "Their words are fine, even if you're not sure you've remembered the term exactly." },
        { "id": "medication", "type": "text", "label": "Are you taking anything for it?", "note": "Include anything from the chemist — painkillers, anti-inflammatory gels, supplements." },
        { "id": "previousInjury", "type": "choice", "label": "Have you had trouble with this leg before?", "note": "An old injury, an operation, or the same pain coming back.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "previousDetail", "type": "text", "label": "If yes, what happened, and roughly when?" }
      ]
    },
    {
      "id": "anything-else",
      "num": "Section 8",
      "title": "Anything else",
      "intro": "The last box is the one people most often have something useful in.",
      "questions": [
        { "id": "anythingElse", "type": "text", "label": "Anything else I should know?" },
        { "id": "contactPreference", "type": "text", "label": "Best way to reach you about this (optional)" }
      ]
    }
  ],
  "feedbackConsents": [
    { "id": "consentShare", "label": "I'm happy for Esther to share what I've written here with my GP or physiotherapist if it would help them. (optional)" }
  ]
}
$json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE kind = 'leg_pain_questionnaire');
