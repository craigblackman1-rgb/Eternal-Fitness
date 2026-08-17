-- Seed the Coaching Intake Form document template on the document engine,
-- using the same interactive feedbackSections schema as PAR-Q, Client
-- Feedback, and the Leg Pain Questionnaire (20260721_seed_parq_template.sql,
-- 20260721_seed_feedback_template.sql, 20260804_seed_leg_pain_questionnaire_template.sql).
--
-- Content/wording matches
-- C:\Github\eternal-fitness-workspace\clients\rick-f\Rick_Intake_Form.docx,
-- generalised for reuse across any remote-coaching client rather than naming
-- Rick specifically — same precedent as the Leg Pain Questionnaire, which was
-- also built for one client's need but seeded as a generic reusable kind.
-- One deviation from the source .docx: the weekly-availability question was a
-- 3-row table (day columns x hours/constraints rows) — the engine's question
-- schema has no grid/table question type, so it is split into one "text"
-- question per day (hours + constraints combined in one free-text answer),
-- same simplification precedent used for the Leg Pain Questionnaire's pain-
-- scale table.
-- Guarded so it is safe to re-run.
INSERT INTO document_templates (kind, name, version, requires_client_signature, requires_trainer_signature, body)
SELECT 'intake_form', 'Coaching Intake Form', 1, true, false, $json$
{
  "intro": "<p>A one-off intake form — please complete this before your first training block is built. You won't need to fill it in again each fortnight; the <strong>Fortnightly Check-In</strong> covers ongoing updates.</p>",
  "sections": [],
  "feedbackSections": [
    {
      "id": "availability",
      "num": "Section 1",
      "title": "Weekly availability",
      "intro": "Roughly how much time you actually have each day, and anything that rules a discipline in or out that day (e.g. no pool access, need a rest day).",
      "questions": [
        { "id": "mon", "type": "text", "label": "Monday — hours available & any constraints" },
        { "id": "tue", "type": "text", "label": "Tuesday — hours available & any constraints" },
        { "id": "wed", "type": "text", "label": "Wednesday — hours available & any constraints" },
        { "id": "thu", "type": "text", "label": "Thursday — hours available & any constraints" },
        { "id": "fri", "type": "text", "label": "Friday — hours available & any constraints" },
        { "id": "sat", "type": "text", "label": "Saturday — hours available & any constraints" },
        { "id": "sun", "type": "text", "label": "Sunday — hours available & any constraints" },
        { "id": "preferred_days_off", "type": "text", "label": "Any days you'd specifically like kept free if possible?" }
      ]
    },
    {
      "id": "diet",
      "num": "Section 2",
      "title": "Diet",
      "questions": [
        { "id": "meals_per_day", "type": "text", "label": "Number of meals per day" },
        { "id": "calorie_intake", "type": "text", "label": "Calorie intake, if known" },
        { "id": "dietary_restrictions", "type": "text", "label": "Any modified diet or dietary restrictions" },
        { "id": "food_preferences", "type": "text", "label": "Food preferences" },
        { "id": "supplements", "type": "text", "label": "Any dietary supplements you currently take" }
      ]
    },
    {
      "id": "goals",
      "num": "Section 3",
      "title": "Goals & motivation",
      "questions": [
        { "id": "motivation", "type": "text", "label": "What motivates you about this?" },
        { "id": "top_goals", "type": "text", "label": "What are your 3 most important goals, in order of priority?" },
        { "id": "success_definition", "type": "text", "label": "At the end of the season, how will we know if this has been successful? What's the single most important thing we need to get right?" }
      ]
    }
  ]
}
$json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE kind = 'intake_form');
