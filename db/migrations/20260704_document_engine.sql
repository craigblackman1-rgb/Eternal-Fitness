-- Client Document Engine
-- Generic, versioned, signable documents. Templates hold editable content per
-- kind; client_documents are per-client snapshots that are sent, signed, and
-- version-tracked. See eternal-fitness/.context/charter-document-engine.md

CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,                       -- 'terms' | 'risk_assessment' | 'annual_review' | ...
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  -- { intro?: string, sections: [{ id, title, html }] }
  body JSONB NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  requires_client_signature BOOLEAN NOT NULL DEFAULT true,
  requires_trainer_signature BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  template_id UUID REFERENCES document_templates(id),
  template_version INTEGER,
  body JSONB NOT NULL DEFAULT '{"sections":[]}'::jsonb,   -- editable snapshot
  requires_client_signature BOOLEAN NOT NULL DEFAULT true,
  requires_trainer_signature BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'signed', 'superseded')),
  version INTEGER NOT NULL DEFAULT 1,
  supersedes_id UUID REFERENCES client_documents(id),
  client_name TEXT,
  client_signature TEXT,
  client_signed_date DATE,
  trainer_name TEXT,
  trainer_signature TEXT,
  trainer_signed_date DATE,
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_kind ON client_documents(kind);

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

-- Authenticated (Esther) has full access. Public/client signing is mediated by
-- service-role API routes keyed on the document UUID, so no anon policies here.
CREATE POLICY "Authenticated manage templates" ON document_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated manage client documents" ON client_documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Seed: DUMMY Terms & Conditions template (placeholder pending Craig's real copy)
-- ---------------------------------------------------------------------------
INSERT INTO document_templates (kind, name, version, requires_client_signature, requires_trainer_signature, body)
SELECT
  'terms',
  'Terms & Conditions',
  1,
  true,
  false,
  $json$
  {
    "intro": "<p><strong>[DUMMY — placeholder text pending final copy]</strong> These Terms &amp; Conditions govern the personal training services provided by Eternal Fitness (Esther Fair) to the client named below. Please read them carefully before signing.</p>",
    "sections": [
      { "id": "services", "title": "1. Services", "html": "<p>Eternal Fitness provides one-to-one supervised personal training sessions at its private studio in Worthing, West Sussex. Sessions are delivered by Esther Fair, a Level 4 qualified personal trainer.</p>" },
      { "id": "scheduling", "title": "2. Sessions &amp; Scheduling", "html": "<p>Sessions are booked in advance by mutual agreement. Session times are held for the client and cannot be transferred to another person without prior agreement.</p>" },
      { "id": "cancellations", "title": "3. Cancellations &amp; Missed Sessions", "html": "<p>At least 24 hours&rsquo; notice is required to cancel or reschedule a session. Sessions cancelled with less than 24 hours&rsquo; notice, or missed without notice, may be charged in full. <em>[DUMMY — confirm notice period and charging policy.]</em></p>" },
      { "id": "payment", "title": "4. Payment Terms", "html": "<p>Session blocks are paid for in advance. Blocks are valid for the period stated at the time of purchase. Fees are as set out in the current price list. <em>[DUMMY — confirm block validity and refund policy.]</em></p>" },
      { "id": "health", "title": "5. Health, Risk &amp; Liability", "html": "<p>The client confirms they have completed a PAR-Q honestly and will inform the trainer of any change to their health. Training carries inherent risks; the client participates voluntarily. Eternal Fitness maintains professional insurance and delivers all sessions with reasonable care and skill. <em>[DUMMY — confirm liability wording.]</em></p>" },
      { "id": "data", "title": "6. Data Protection", "html": "<p>Personal and health information is held securely and processed in accordance with UK GDPR and the Data Protection Act 2018, and is never shared with third parties without the client&rsquo;s written consent, except where required for medical clearance with the client&rsquo;s knowledge.</p>" },
      { "id": "general", "title": "7. General", "html": "<p>These terms are governed by the laws of England and Wales. Eternal Fitness may update these terms from time to time; the version in force is the one signed by the client. <em>[DUMMY — placeholder pending final copy.]</em></p>" }
    ]
  }
  $json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE kind = 'terms');
