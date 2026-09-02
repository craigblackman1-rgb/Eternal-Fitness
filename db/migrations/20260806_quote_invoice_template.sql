-- Seed a "Quote" template into invoice_templates.
--
-- A quote uses the same line-item structure as an invoice — same JSONB shape,
-- same picker in NewInvoiceDrawer.  The content and framing are what make it a
-- quote: the description clarifies it is an estimate to send before confirming
-- a booking, and the line items match the mockup at
-- D:\apps\design-systems\ef-control-hub\documents\invoice-template.html.

INSERT INTO invoice_templates (name, description, line_items)
SELECT
  'Quote',
  'A quote for personal training sessions and packages — send before confirming a booking so your client sees the estimated costs before committing.',
  $json$
  [
    { "description": "1:1 Personal Training — 60-minute session", "quantity": 8, "unit_price": 30.00 }
  ]
  $json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM invoice_templates WHERE name = 'Quote');
