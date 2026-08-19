-- Seed the Endurance Training Block document template on the document engine
-- (CR-EF-048). A manually-editable, calendar-based training block for
-- endurance/multi-discipline clients (triathlon, running races). Distinct from
-- the strength `blocks`/`sessions` system — no AI generation, no session
-- logging, no signature requirement. Everything lives in the document engine's
-- arbitrary `body` JSONB under the `enduranceBlock` key.
--
-- The starter body is deliberately blank: an empty `sections` array plus an
-- `enduranceBlock` object with empty `disciplineTargets`/`rows` and empty
-- strings, so a freshly created document renders as a clean editor starting
-- point. The `document_templates` row is what lets the generic create flow
-- (app/api/documents/route.ts) snapshot this kind with no new API route.
--
-- Guarded so it is safe to re-run.
INSERT INTO document_templates (kind, name, version, requires_client_signature, requires_trainer_signature, body)
SELECT 'endurance_block', 'Endurance Training Block', 1, false, false, $json$
{
  "sections": [],
  "enduranceBlock": {
    "targetEvent": "",
    "startDate": "",
    "endDate": "",
    "directionIntro": "",
    "disciplineTargets": [],
    "coachingNotes": "",
    "rows": []
  }
}
$json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE kind = 'endurance_block');
