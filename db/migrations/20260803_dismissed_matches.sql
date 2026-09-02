-- Additive: dismissed_matches table for bank reconciliation
-- Prevents re-surfacing suggestions Esther has already dismissed
CREATE TABLE IF NOT EXISTS dismissed_matches (
  bank_transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bank_transaction_id, invoice_id)
);
