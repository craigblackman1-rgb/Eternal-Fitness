-- Seed the remaining document templates: Risk Assessment and Annual Review.
-- Both are dual-signed (client + trainer) and versioned via the document engine.
-- Content is a structured starting point Esther edits per client.

-- ---------------------------------------------------------------------------
-- Risk Assessment (modelled on the Eternal Fitness exercise risk assessment)
-- ---------------------------------------------------------------------------
INSERT INTO document_templates (kind, name, version, requires_client_signature, requires_trainer_signature, body)
SELECT 'risk_assessment', 'Exercise Risk Assessment', 1, true, true, $json$
{
  "intro": "<p>This risk assessment documents the trainer's professional reasoning for delivering (or continuing) supervised sessions in light of the client's current health status. It is reviewed on any change to health, or on receipt of GP / specialist medical clearance. <em>This document does not replace medical clearance.</em></p>",
  "sections": [
    { "id": "client-details", "title": "1. Client details", "html": "<table><tbody><tr><td><strong>Full name</strong></td><td>[to complete]</td></tr><tr><td><strong>Date of birth</strong></td><td>[to complete]</td></tr><tr><td><strong>Address</strong></td><td>[to complete]</td></tr><tr><td><strong>GP surgery</strong></td><td>[to complete]</td></tr><tr><td><strong>Emergency contact</strong></td><td>[to complete]</td></tr><tr><td><strong>Trainer</strong></td><td>Esther Fair — Eternal Fitness</td></tr><tr><td><strong>Training frequency</strong></td><td>[to complete]</td></tr><tr><td><strong>Training history</strong></td><td>[to complete]</td></tr></tbody></table>" },
    { "id": "medical-history", "title": "2. Disclosed medical history", "html": "<p>Conditions and medications disclosed on the PAR-Q and relevant to exercise.</p><table><thead><tr><th>Condition / medication</th><th>Detail</th></tr></thead><tbody><tr><td>[condition]</td><td>[detail — year, surgeon/specialist, current status, exercise implications]</td></tr></tbody></table>" },
    { "id": "clearance-status", "title": "3. Medical clearance status and process", "html": "<p>Where clearance is required, the steps taken to obtain it.</p><table><thead><tr><th>Clearance action</th><th>Status / detail</th></tr></thead><tbody><tr><td>PAR-Q completed by client</td><td>[date]</td></tr><tr><td>Clearance identified as required</td><td>[date — by trainer]</td></tr><tr><td>Letter to GP drafted by trainer</td><td>[date]</td></tr><tr><td>Formal request submitted to GP</td><td>[date / status]</td></tr><tr><td>Clearance letter received</td><td>[pending / received on date]</td></tr></tbody></table>" },
    { "id": "risk-table", "title": "4. Risk assessment — continued training pending clearance", "html": "<p>The following documents the trainer's professional reasoning for continuing supervised sessions while any formal clearance process is underway.</p><table><thead><tr><th>Risk factor</th><th>Risk level</th><th>Mitigation in place</th></tr></thead><tbody><tr><td>[risk factor]</td><td>[LOW / MODERATE / HIGH]</td><td>[mitigation]</td></tr></tbody></table>" },
    { "id": "justification", "title": "5. Professional justification for continued training", "html": "<ul><li>[e.g. client has trained safely with this trainer for X years with no adverse incidents]</li><li>[e.g. no medical professional has given exercise restrictions]</li><li>[e.g. any delay in clearance is administrative, not a clinical objection to exercise]</li></ul>" },
    { "id": "modifications", "title": "6. Programme modifications in place", "html": "<ul><li>[e.g. RPE used as the intensity guide throughout (beta-blocker)]</li><li>[e.g. no overhead loading; conservative shoulder load]</li><li>[e.g. stop protocol: chest discomfort, unusual breathlessness or nausea = immediate cessation]</li></ul>" },
    { "id": "emergency", "title": "7. Emergency protocol", "html": "<ul><li>Stop exercise immediately — sit or lie the client down</li><li>Call 999 immediately if chest pain, loss of consciousness or suspected cardiac event</li><li>Emergency contact: [name — number]</li><li>GP: [surgery — number]</li><li>Note relevant medications to paramedics: [e.g. anticoagulant, beta-blocker]</li></ul>" },
    { "id": "declaration", "title": "8. Declaration", "html": "<p>I confirm I have read and understood this risk assessment. I consent to continuing supervised training with Eternal Fitness while any medical clearance is awaited. I confirm that all health information disclosed in my PAR-Q is accurate and complete to the best of my knowledge, and that I have disclosed any recent change in my health to my trainer.</p>" }
  ]
}
$json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE kind = 'risk_assessment');

-- ---------------------------------------------------------------------------
-- Annual Review (the old PAR-Q Section 8, now a tracked, signed record)
-- ---------------------------------------------------------------------------
INSERT INTO document_templates (kind, name, version, requires_client_signature, requires_trainer_signature, body)
SELECT 'annual_review', 'Annual Review', 1, true, true, $json$
{
  "intro": "<p>This form records the annual review of the client's PAR-Q and health status. It must be completed every 12 months or following any change in health.</p>",
  "sections": [
    { "id": "reminder", "title": "1. Review reminder", "html": "<p>This form must be reviewed every 12 months or following any change in health status. You must inform your trainer immediately of any change to your health, new diagnosis, new medication, or any hospital admission — do not wait until your next session.</p>" },
    { "id": "changes", "title": "2. Changes since last review", "html": "<p>[Record any changes to health, medications, conditions, injuries, or medical advice since the last review. If nothing has changed, state 'No changes'.]</p>" },
    { "id": "outcome", "title": "3. Outcome / actions", "html": "<ul><li>[e.g. No change — continue current programme]</li><li>[e.g. New medication disclosed — programme modified as noted]</li><li>[e.g. GP clearance now required — see risk assessment]</li></ul>" },
    { "id": "declaration", "title": "4. Declaration", "html": "<p>I confirm that the health information held by Eternal Fitness remains accurate and complete to the best of my knowledge, and that I have disclosed any change to my health since my last review.</p>" }
  ]
}
$json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE kind = 'annual_review');
