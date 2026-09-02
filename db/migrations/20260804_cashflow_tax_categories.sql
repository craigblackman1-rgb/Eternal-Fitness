-- Expense/income categorization for tax liability calc (Work Order:
-- cashflow-tax-forecast-2026-08-04). Mirrors the category taxonomy the
-- Decoded Ops hub uses for its own tax calculation, adapted for a PT studio.

ALTER TABLE bank_transactions
  ADD COLUMN IF NOT EXISTS income_category TEXT
    CHECK (income_category IN ('invoice_payment', 'other_income', 'refund', 'interest')),
  ADD COLUMN IF NOT EXISTS expense_category TEXT
    CHECK (expense_category IN ('studio_rent', 'equipment', 'insurance', 'software', 'marketing', 'professional_fees', 'other')),
  ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bank_txns_categories ON bank_transactions(income_category, expense_category);
