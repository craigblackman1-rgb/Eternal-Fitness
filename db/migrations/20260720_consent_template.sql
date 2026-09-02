-- Seed the Consent document template (client-only signature).
-- Mirrors the patterns in 20260704_risk_and_review_templates.sql — guarded so it
-- is safe to re-run. body.intro + a 'What you need to know' section (the
-- note--plain wording from brand-staging-2662e9/documents/client-consent.html)
-- + the three consentGroups checkbox groups (content use / platforms /
-- identification) with the exact option wording from the reference design.
INSERT INTO document_templates (kind, name, version, requires_client_signature, requires_trainer_signature, body)
SELECT 'consent', 'Client Consent', 1, true, false, $json$
{
  "intro": "<p>This form lets you choose how I can use your story. Tick what you are comfortable with — there is no obligation to say yes to anything, and it does not affect your training with me either way.</p>",
  "sections": [
    { "id": "what-you-need-to-know", "title": "What you need to know", "html": "<p>I will always show you the final wording (and any photo) before anything is published. You can withdraw this consent at any time just by telling me — I will take it down from anything still in my control going forward, though this cannot undo anything already seen or shared by someone else in the meantime. None of this affects your training with me either way.</p>" }
  ],
  "consentGroups": [
    {
      "id": "content-use",
      "legend": "I am happy for Esther to use:",
      "options": [
        { "key": "usePhotos", "label": "Photos of me" },
        { "key": "useQuotes", "label": "Quotes from me" },
        { "key": "useCaseStudy", "label": "A case study about my experience" }
      ]
    },
    {
      "id": "platforms",
      "legend": "I am happy for this to be used on:",
      "options": [
        { "key": "useWebsite", "label": "My website" },
        { "key": "useFacebook", "label": "Facebook" }
      ]
    },
    {
      "id": "identification",
      "legend": "I am happy to be identified by:",
      "options": [
        { "key": "idFirstName", "label": "My first name" },
        { "key": "idAnonymous", "label": "Anonymous — no name" }
      ]
    }
  ]
}
$json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE kind = 'consent');
