-- Seed the Client Feedback Questionnaire document template (client-only, no
-- legal signature — "signature" is just the respondent's typed name).
-- Content/wording matches brand-staging-2662e9/documents/client-feedback-questionnaire.html
-- verbatim. Guarded so it is safe to re-run.
INSERT INTO document_templates (kind, name, version, requires_client_signature, requires_trainer_signature, body)
SELECT 'feedback', 'Tell us about your online training', 1, true, false, $json$
{
  "intro": "<p>A few honest questions about how online sessions have gone for you. Some of what you tell us may end up on the website or in our marketing — always with your permission, and only in the way you're comfortable with. Nothing here affects your programme either way.</p><p><strong>Before you start:</strong> answer as much or as little as feels right — skip anything that doesn't apply to you. There's no right answer here; the more honest, the more useful. If you'd rather talk it through than write it down, mention it at your next session and we'll do it that way instead.</p>",
  "sections": [],
  "feedbackSections": [
    {
      "id": "your-experience",
      "num": "Section 1",
      "title": "Your experience so far",
      "intro": "Think back to when you first started training online, and how it's gone since.",
      "questions": [
        { "id": "expectationVsReality", "type": "text", "label": "How have you found training online compared with what you expected going in?" },
        { "id": "whyOnline", "type": "text", "label": "What made you decide to give online sessions a go?" },
        { "id": "surprises", "type": "text", "label": "Has anything surprised you about it — good or bad?" },
        { "id": "gettingUsedTo", "type": "text", "label": "Is there anything that took a bit of getting used to?" }
      ]
    },
    {
      "id": "would-it-suit",
      "num": "Section 2",
      "title": "Would it work for someone else?",
      "intro": "This is the part that helps someone else who's considering it decide if it's for them.",
      "questions": [
        { "id": "recommend", "type": "choice", "label": "Would you recommend online training to someone in a similar position to you?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "whoItSuits", "type": "text", "label": "Who do you think it'd suit, and why?" },
        { "id": "unexpectedUpside", "type": "text", "label": "Is there anything online training's let you do that you weren't expecting?" }
      ]
    },
    {
      "id": "day-to-day",
      "num": "Section 3",
      "title": "How the sessions themselves feel",
      "intro": "A quick check on whether the sessions are still working as hard as they should.",
      "questions": [
        { "id": "challenge", "type": "choice", "label": "Do you find your training sessions challenging enough given the equipment you have available to you?", "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
        { "id": "challengeDetail", "type": "text", "label": "Tell us more — what's working, or what would help" }
      ]
    },
    {
      "id": "share-permission",
      "num": "Section 4",
      "title": "Can we share what you've told us?",
      "intro": "Entirely your choice — leave both boxes unticked if you'd rather your answers stayed between us.",
      "questions": [
        { "id": "attribution", "type": "choice", "label": "If we do use your words, how would you like to be credited?", "options": [{ "value": "full-name", "label": "Full name" }, { "value": "first-name", "label": "First name only" }, { "value": "initials", "label": "Initials only" }, { "value": "anonymous", "label": "Keep me anonymous" }] }
      ]
    },
    {
      "id": "your-details",
      "num": "Section 5",
      "title": "Your details",
      "intro": "So we know whose words these are, and how to reach you if you've said yes above.",
      "questions": [
        { "id": "clientEmail", "type": "text", "label": "Email address (optional)" },
        { "id": "trainingLength", "type": "text", "label": "Roughly how long have you been training online? (optional)" }
      ]
    }
  ],
  "feedbackConsents": [
    { "id": "consentUseFeedback", "label": "Yes, Esther can use my answers — in full or in part — as feedback on the Eternal Fitness website or in marketing materials. (optional)" },
    { "id": "consentCaseStudy", "label": "I'm happy to be contacted about turning this into a longer case study. (optional)" }
  ]
}
$json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE kind = 'feedback');
