-- Seed the PAR-Q document template on the document engine, using the SAME
-- interactive feedbackSections/feedbackConsents schema built for the Client
-- Feedback Questionnaire (20260721_seed_feedback_template.sql) — real
-- typed/radio-group fields, not a static HTML dump. This supersedes the
-- earlier Lane C plan's raw-HTML-table body shape (that draft is documented
-- in scripts/migrate-parq-to-engine.mjs's old header comment; the script
-- itself has been rewritten to target this schema instead).
--
-- Question wording/order/notes copied verbatim from lib/parq-data.ts.
-- Guarded so it is safe to re-run.
INSERT INTO document_templates (kind, name, version, requires_client_signature, requires_trainer_signature, body)
SELECT 'parq', 'PAR-Q — Physical Activity Readiness Questionnaire', 1, true, false, $json$
{
  "intro": "<p>This Physical Activity Readiness Questionnaire (PAR-Q) helps me understand your health background so every session I plan is safe and appropriate for you. Please answer every question as accurately as you can — anything you tell me is treated in confidence.</p>",
  "sections": [],
  "feedbackSections": [
    {
      "id": "personal",
      "num": "Section 1",
      "title": "Personal details",
      "questions": [
        { "id": "full_name", "type": "text", "label": "Full name" },
        { "id": "date_of_birth", "type": "text", "label": "Date of birth" },
        { "id": "address", "type": "text", "label": "Address" },
        { "id": "email", "type": "text", "label": "Email address" },
        { "id": "phone", "type": "text", "label": "Phone number" },
        { "id": "emergency_contact_name", "type": "text", "label": "Emergency contact — name" },
        { "id": "emergency_contact_phone", "type": "text", "label": "Emergency contact — phone" },
        { "id": "gp_name", "type": "text", "label": "GP name" },
        { "id": "gp_surgery", "type": "text", "label": "GP surgery" },
        { "id": "gp_phone", "type": "text", "label": "GP phone" }
      ]
    },
    {
      "id": "s2",
      "num": "Section 2",
      "title": "Cardiovascular and general health",
      "questions": [
        { "id": "q1", "type": "choice", "label": "Has your doctor ever told you that you have a heart condition or cardiovascular disease?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q2", "type": "choice", "label": "Do you feel pain, pressure, tightness, or heaviness in your chest during physical activity?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q3", "type": "choice", "label": "Do you experience chest pain or discomfort at rest or when NOT exercising?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q4", "type": "choice", "label": "Do you ever feel dizzy, faint, or lose consciousness during or after exercise?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q5", "type": "choice", "label": "Do you experience unexplained shortness of breath at rest or with minimal exertion?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q6", "type": "choice", "label": "Do you have high cholesterol or are you being treated for it?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q7", "type": "choice", "label": "Do you have high blood pressure or are you being treated for it?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q8", "type": "choice", "label": "Do you experience palpitations, irregular heartbeat, or a racing heart?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q9", "type": "choice", "label": "Have you had a stroke or TIA (transient ischaemic attack)?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q10", "type": "choice", "label": "Do you have diabetes (Type 1 or Type 2)?", "note": "If yes, please give full details in Section 5.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q11", "type": "choice", "label": "Do you smoke or have you smoked in the last 5 years?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] }
      ]
    },
    {
      "id": "s3",
      "num": "Section 3",
      "title": "Musculoskeletal, neurological, and surgical",
      "questions": [
        { "id": "q12", "type": "choice", "label": "Do you have any bone, joint, or muscle condition that could be affected by exercise?", "note": "E.g. arthritis, osteoporosis, previous fractures, joint replacements.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q13", "type": "choice", "label": "Have you had any surgery in the last 5 years?", "note": "If yes, please give details including dates in Section 5.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q14", "type": "choice", "label": "Do you have any implanted medical devices?", "note": "E.g. pacemaker, defibrillator, neurostimulator, cochlear implant, spinal shunt, lumbar peritoneal shunt, VP shunt, insulin pump, or any other surgically implanted device. Please give full details in Section 5.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q15", "type": "choice", "label": "Have you ever had a spinal injury, spinal surgery, or been told to avoid spinal loading or high-impact activity?", "note": "If yes, give full details in Section 5 including any restrictions given by your consultant.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q16", "type": "choice", "label": "Do you have any neurological condition?", "note": "E.g. epilepsy, multiple sclerosis, Parkinson's disease, or any condition affecting balance, coordination, or sensation.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q17", "type": "choice", "label": "Do you experience chronic pain that affects your ability to exercise?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q18", "type": "choice", "label": "Do you have any condition affecting your vision, hearing, or other senses that your trainer should be aware of?", "note": "If yes, please give full details in Section 5.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] }
      ]
    },
    {
      "id": "s4",
      "num": "Section 4",
      "title": "Blood conditions, medications, and diagnosed conditions",
      "questions": [
        { "id": "q19", "type": "choice", "label": "Are you taking any blood-thinning medication (anticoagulants)?", "note": "E.g. Warfarin, Apixaban, Rivaroxaban, Dabigatran, Clopidogrel, prescribed Aspirin. If yes — this significantly affects your risk of bruising and bleeding from falls or impacts. Your trainer must know.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q20", "type": "choice", "label": "Do you have any blood disorder or condition affecting your blood?", "note": "E.g. polycythaemia rubra vera, haemophilia, anaemia, thrombocytopenia, leukaemia, sickle cell. If yes, give full details in Section 5.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q21", "type": "choice", "label": "Are you receiving any injection-based medication on a regular basis?", "note": "E.g. insulin, Peg Interferon, biological therapy, B12. If yes, specify in Section 5 — some injection medications cause significant fatigue on injection day.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q22", "type": "choice", "label": "Are you taking any statin medication?", "note": "E.g. Simvastatin, Atorvastatin, Rosuvastatin. Statins can cause muscle pain (myopathy). Please inform your trainer of any unusual muscle pain during or after sessions.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q23", "type": "choice", "label": "Are you taking any other prescription medication not listed above?", "note": "If yes, list all medications in Section 5 including dosage and what they are prescribed for.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q24", "type": "choice", "label": "Do you have any diagnosed medical condition not already disclosed above?", "note": "If yes, give full details in Section 5.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q25", "type": "choice", "label": "Have you been advised by any doctor, consultant, or medical professional to avoid or restrict certain types of exercise?", "note": "If yes, describe the restrictions exactly and state who gave them in Section 5. Verbal restrictions are equally important to document.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q26", "type": "choice", "label": "Have you had any major illness, hospital admission, or operation in the last 5 years?", "note": "If yes, give details in Section 5 including dates and treating hospital or consultant.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] }
      ]
    },
    {
      "id": "s5",
      "num": "Section 5",
      "title": "Full details",
      "intro": "Please expand on any \"Yes\" answers above.",
      "questions": [
        { "id": "conditions", "type": "text", "label": "Conditions" },
        { "id": "medications", "type": "text", "label": "Medications" },
        { "id": "devices", "type": "text", "label": "Implanted devices" },
        { "id": "exercise_restrictions", "type": "text", "label": "Exercise restrictions" },
        { "id": "surgeries", "type": "text", "label": "Surgeries" },
        { "id": "other_info", "type": "text", "label": "Other information" }
      ]
    },
    {
      "id": "s6",
      "num": "Section 6",
      "title": "Lifestyle and physical activity",
      "questions": [
        { "id": "current_exercise", "type": "text", "label": "Current exercise" },
        { "id": "training_goals", "type": "text", "label": "Training goals" },
        { "id": "q27", "type": "choice", "label": "Are you currently pregnant or have you given birth in the last 6 months?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q28", "type": "choice", "label": "Do you have any dietary restrictions, allergies, or eating disorder history your trainer should be aware of?", "note": "Your trainer will treat all disclosures in confidence.", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "q29", "type": "choice", "label": "Do you have any other reason — physical, medical, or personal — why you feel you may not be able to participate safely in an exercise programme?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] }
      ]
    }
  ]
}
$json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE kind = 'parq');
