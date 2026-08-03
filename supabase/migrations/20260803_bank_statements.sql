-- Bank statement imports + transactions.
--
-- Esther uploads a CSV exported from her business bank account, reviews the
-- parsed transactions, then commits them.  Reconciliation (Lane 6) will later
-- match committed transactions against invoices via matched_invoice_id.
--
-- No real data is imported during migration — this is schema only.

CREATE TABLE IF NOT EXISTS bank_statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'committed', 'discarded')),
  row_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES bank_statement_imports(id) ON DELETE CASCADE,
  txn_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  balance NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'GBP',
  raw_type TEXT,
  raw JSONB,
  matched_invoice_id UUID REFERENCES invoices(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_txns_import_id ON bank_transactions(import_id);
CREATE INDEX IF NOT EXISTS idx_bank_txns_txn_date ON bank_transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_bank_txns_matched_invoice ON bank_transactions(matched_invoice_id);
CREATE INDEX IF NOT EXISTS idx_bank_imports_status ON bank_statement_imports(status);
