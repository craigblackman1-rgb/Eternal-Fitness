-- Client Feedback Questionnaire document kind — new document_templates row is
-- in 20260721_seed_feedback_template.sql. This column stores the client's
-- free-text/choice answers + consent checkboxes, parallel to consent_choices.
-- Purely additive, safe to re-run.
ALTER TABLE client_documents ADD COLUMN IF NOT EXISTS feedback_responses jsonb;
