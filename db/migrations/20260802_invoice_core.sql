-- Invoice core — structured invoicing with relational line items.
--
-- Replaces the flat-amount pattern used in the Decoded Ops hub with proper
-- invoice_line_items (description × quantity × unit_price).  Esther is not
-- VAT-registered, so vat_rate defaults to 0 and remains inert; the column
-- exists only for future-proofing.
--
-- Delivered through the existing client_documents document engine (7th kind:
-- 'invoice') — reuse send/resend/email-tracking, not a parallel pipeline.

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void')),
  currency TEXT NOT NULL DEFAULT 'GBP',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  client_document_id UUID REFERENCES client_documents(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: one invoice template so the picker is never empty.
INSERT INTO invoice_templates (name, description, line_items)
SELECT
  'Standard PT Session Block',
  'Default line items for a block of personal training sessions.',
  $json$
  [
    { "description": "Personal Training — 60-minute session", "quantity": 10, "unit_price": 0 }
  ]
  $json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM invoice_templates WHERE name = 'Standard PT Session Block');
