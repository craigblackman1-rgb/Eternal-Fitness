-- Seed the Fortnightly Check-In document template on the document engine,
-- using the same interactive feedbackSections schema as PAR-Q, Client
-- Feedback, and the Leg Pain Questionnaire (20260721_seed_parq_template.sql,
-- 20260721_seed_feedback_template.sql, 20260804_seed_leg_pain_questionnaire_template.sql).
--
-- Content/wording matches
-- C:\Github\eternal-fitness-workspace\clients\rick-f\Rick_Fortnightly_Checkin_Form.docx,
-- generalised for reuse across any remote-coaching client rather than naming
-- Rick specifically — same precedent as the Leg Pain Questionnaire, which was
-- also built for one client's need but seeded as a generic reusable kind. One
-- deviation from the source .docx: a reference to a named third party in the
-- "what's coming up" question has been generalised to "work, travel, or
-- anything else" so the template reads sensibly for any client, not just the
-- one it was drafted for.
-- Guarded so it is safe to re-run.
INSERT INTO document_templates (kind, name, version, requires_client_signature, requires_trainer_signature, body)
SELECT 'fortnightly_checkin', 'Fortnightly Check-In', 1, true, false, $json$
{
  "intro": "<p>Send this alongside your Garmin export before each call. It only needs to cover what changed from the plan — no need to re-list anything already visible in your Garmin data.</p>",
  "sections": [],
  "feedbackSections": [
    {
      "id": "sessions-changed",
      "num": "Section 1",
      "title": "Sessions missed or changed",
      "intro": "Don't re-list what's already in your Garmin export — this is just for anything that deviated from the plan.",
      "questions": [
        { "id": "weeks_covered", "type": "text", "label": "Week(s) covered" },
        { "id": "missed_or_changed", "type": "text", "label": "Anything planned that you missed, cut short, or changed, and why?" }
      ]
    },
    {
      "id": "padel-and-extras",
      "num": "Section 2",
      "title": "Padel & anything else off-plan",
      "questions": [
        { "id": "padel_sessions", "type": "text", "label": "How many padel sessions this fortnight, and roughly how long each?" },
        { "id": "other_activity", "type": "text", "label": "Any other activity not on Garmin (padel, extra swims, anything else)?" }
      ]
    },
    {
      "id": "pain-soreness",
      "num": "Section 3",
      "title": "Pain / soreness",
      "questions": [
        { "id": "pain_where", "type": "text", "label": "Where — which part of your body?" },
        { "id": "pain_when", "type": "text", "label": "When does it show up — during activity, straight after, or all the time regardless?" },
        { "id": "pain_severity", "type": "text", "label": "How bad, 1-10, and is it the same, better, or worse than last time?" },
        { "id": "pain_helps", "type": "text", "label": "What helps it?" },
        { "id": "pain_worse", "type": "text", "label": "What makes it worse?" }
      ]
    },
    {
      "id": "sleep-energy-rhr",
      "num": "Section 4",
      "title": "Sleep, energy & resting heart rate",
      "questions": [
        { "id": "sleep", "type": "text", "label": "Average hours and quality of sleep this fortnight" },
        { "id": "energy", "type": "text", "label": "Overall energy/fatigue levels, 1-10" },
        { "id": "resting_heart_rate", "type": "text", "label": "Resting heart rate this fortnight (Garmin morning reading) — is it steady, climbing, or dropping?" }
      ]
    },
    {
      "id": "swimming",
      "num": "Section 5",
      "title": "Swimming specifically",
      "questions": [
        { "id": "swim_sessions", "type": "text", "label": "How many independent swim sessions, and did anyone check your technique (recording, coach, clinic) or was it unsupervised?" }
      ]
    },
    {
      "id": "whats-coming-up",
      "num": "Section 6",
      "title": "What's coming up",
      "questions": [
        { "id": "upcoming", "type": "text", "label": "Anything in the next fortnight that will change what you can do — work, travel, or anything else?" }
      ]
    },
    {
      "id": "anything-else",
      "num": "Section 7",
      "title": "Anything else",
      "questions": [
        { "id": "flag_before_call", "type": "text", "label": "Anything you want to flag before the call that doesn't fit above" }
      ]
    }
  ]
}
$json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE kind = 'fortnightly_checkin');
