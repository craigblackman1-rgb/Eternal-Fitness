-- Lane C, Unit 2 — Seed the PAR-Q document_templates entry for the document engine.
--
-- FILE-BASED / PLANNING ONLY. NOT RUN THIS SESSION.
-- No database connection was made. The body JSON below follows the mapping
-- defined in .context/lane-c-parq-migration-plan.md §3. The document engine
-- already supports a 'parq' kind; this migration simply adds the template row
-- so scripts/migrate-parq-to-engine.mjs (also not run) can resolve its id.
--
-- Re-verify against the live schema (Coolify SSH tunnel, psql \d document_templates)
-- before running — a parallel migration may have altered the engine outside this repo.
--
-- Apply via the Supabase CLI / dashboard with Craig's explicit per-session go-ahead.

INSERT INTO document_templates (kind, name, version, requires_client_signature, requires_trainer_signature, body)
SELECT 'parq', 'PAR-Q Medical Screening', 1, true, false, $json$
{
  "intro": "<p>The Physical Activity Readiness Questionnaire (PAR-Q) is designed to help determine if you should check with your doctor before becoming much more physically active. Please read the questions carefully and answer each one honestly. If you answer YES to one or more questions, you should consult your GP before starting or intensifying exercise.</p><p>This screening is client-declared. A separate Exercise Risk Assessment captures the trainer's professional reasoning and countersignature where medical clearance is required.</p>",
  "sections": [
    {
      "id": "personal",
      "title": "Personal details",
      "html": "<table><tbody><tr><td><strong>Full name</strong></td><td>[full_name]</td></tr><tr><td><strong>Date of birth</strong></td><td>[date_of_birth]</td></tr><tr><td><strong>Address</strong></td><td>[address]</td></tr><tr><td><strong>Email</strong></td><td>[email]</td></tr><tr><td><strong>Phone</strong></td><td>[phone]</td></tr><tr><td><strong>Emergency contact</strong></td><td>[emergency_contact_name] — [emergency_contact_phone]</td></tr><tr><td><strong>GP name</strong></td><td>[gp_name]</td></tr><tr><td><strong>GP surgery</strong></td><td>[gp_surgery]</td></tr><tr><td><strong>GP phone</strong></td><td>[gp_phone]</td></tr></tbody></table>"
    },
    {
      "id": "s2",
      "title": "Section 2 — Cardiovascular & general health",
      "html": "<ol><li>Has your doctor ever said you have a heart condition and recommended only medically supervised physical activity?</li><li>Do you have chest pain when you do physical activity?</li><li>Have you had chest pain in the past month when you were not doing physical activity?</li><li>Do you lose balance because of dizziness or do you ever lose consciousness?</li><li>Do you have a bone or joint problem (e.g. back, knee, hip) that could be aggravated by physical activity?</li><li>Is your doctor currently prescribing medication for your blood pressure or heart condition?</li><li>Do you know of any other reason why you should not do physical activity?</li><li>Are you pregnant or have you given birth in the last 6 months?</li><li>Have you recently had a fever, infection, or illness that affected your breathing?</li><li>Do you currently smoke or have you stopped smoking in the last 6 months?</li><li>Are you currently experiencing high levels of sustained stress?</li></ol>"
    },
    {
      "id": "s3",
      "title": "Section 3 — Musculoskeletal, neurological & surgical",
      "html": "<ol start='12'><li>Have you had a muscle, tendon, ligament or joint injury in the last 12 months that limited your training?</li><li>Do you have a long-term musculoskeletal condition (e.g. arthritis, osteoporosis)?</li><li>Have you had surgery in the last 12 months, or are you awaiting surgery?</li><li>Do you have a neurological condition (e.g. epilepsy, MS, Parkinson's)?</li><li>Do you have a disc problem, sciatica, or persistent back pain?</li><li>Do you have any chronic pain condition?</li><li>Have you had a significant fall or fracture in the last 12 months?</li></ol>"
    },
    {
      "id": "s4",
      "title": "Section 4 — Blood conditions, medications & diagnosed conditions",
      "html": "<ol start='19'><li>Do you have, or have you had, any blood condition (e.g. anaemia, clotting disorder)?</li><li>Are you currently taking any prescription medication?</li><li>Have you been diagnosed with diabetes (type 1 or type 2)?</li><li>Have you been diagnosed with high blood pressure or high cholesterol?</li><li>Have you been diagnosed with a respiratory condition (e.g. asthma, COPD)?</li><li>Have you been diagnosed with a mental health condition that affects your activity?</li><li>Have you been diagnosed with any cancer, or are you currently receiving treatment for cancer?</li><li>Do you have any other diagnosed medical condition not listed above?</li></ol>"
    },
    {
      "id": "s5",
      "title": "Section 5 — Full details",
      "html": "<table><thead><tr><th>Field</th><th>Detail</th></tr></thead><tbody><tr><td>Conditions disclosed</td><td>[conditions]</td></tr><tr><td>Medications</td><td>[medications]</td></tr><tr><td>Devices / implants</td><td>[devices]</td></tr><tr><td>Exercise restrictions</td><td>[exercise_restrictions]</td></tr><tr><td>Surgeries</td><td>[surgeries]</td></tr><tr><td>Other relevant info</td><td>[other_info]</td></tr></tbody></table>"
    },
    {
      "id": "s6",
      "title": "Section 6 — Lifestyle & physical activity",
      "html": "<p><strong>Current exercise:</strong> [current_exercise]</p><p><strong>Training goals:</strong> [training_goals]</p><ol start='27'><li>Has your physical activity level decreased in the last 12 months for any reason?</li><li>Do you currently meet the UK Chief Medical Officers' guideline of 150 minutes of moderate activity per week?</li><li>Are you starting a new or significantly more intense exercise programme?</li></ol>"
    },
    {
      "id": "decl",
      "title": "Declaration & signature",
      "html": "<p>I confirm that the information I have provided in this PAR-Q is accurate and complete to the best of my knowledge. I understand that I should inform my trainer of any change to my health, and that if my health changes I may need to complete a new PAR-Q.</p><table><tbody><tr><td><strong>Name (printed)</strong></td><td>[client_name_print]</td></tr><tr><td><strong>Signature</strong></td><td>[client_typed_signature]</td></tr><tr><td><strong>Date</strong></td><td>[client_signature_date]</td></tr></tbody></table>"
    },
    {
      "id": "data",
      "title": "Structured answers (machine-readable)",
      "html": "<p><em>This section preserves the raw q1–q29 answers and detail fields for clearance logic. It is stored in <code>body.data</code> and mirrored here for completeness.</em></p><pre>[structured_data]</pre>"
    }
  ],
  "data": {
    "answers": {
      "q1": "[q1]", "q2": "[q2]", "q3": "[q3]", "q4": "[q4]", "q5": "[q5]",
      "q6": "[q6]", "q7": "[q7]", "q8": "[q8]", "q9": "[q9]", "q10": "[q10]",
      "q11": "[q11]", "q12": "[q12]", "q13": "[q13]", "q14": "[q14]", "q15": "[q15]",
      "q16": "[q16]", "q17": "[q17]", "q18": "[q18]", "q19": "[q19]", "q20": "[q20]",
      "q21": "[q21]", "q22": "[q22]", "q23": "[q23]", "q24": "[q24]", "q25": "[q25]",
      "q26": "[q26]", "q27": "[q27]", "q28": "[q28]", "q29": "[q29]"
    },
    "details": {
      "conditions": "[conditions]",
      "medications": "[medications]",
      "devices": "[devices]",
      "exercise_restrictions": "[exercise_restrictions]",
      "surgeries": "[surgeries]",
      "other_info": "[other_info]",
      "current_exercise": "[current_exercise]",
      "training_goals": "[training_goals]"
    },
    "personal": {
      "full_name": "[full_name]",
      "date_of_birth": "[date_of_birth]",
      "address": "[address]",
      "email": "[email]",
      "phone": "[phone]",
      "emergency_contact_name": "[emergency_contact_name]",
      "emergency_contact_phone": "[emergency_contact_phone]",
      "gp_name": "[gp_name]",
      "gp_surgery": "[gp_surgery]",
      "gp_phone": "[gp_phone]"
    },
    "signature": {
      "client_name_print": "[client_name_print]",
      "client_signature_date": "[client_signature_date]",
      "client_typed_signature": "[client_typed_signature]",
      "client_signature_data": "[client_signature_data]"
    }
  }
}
$json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE kind = 'parq');
