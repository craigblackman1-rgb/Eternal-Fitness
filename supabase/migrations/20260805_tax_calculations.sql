-- Tax calculations + payments — pounds-based, no RLS, single hub user (Esther).
-- Ported from Decoded Ops hub (20260629_cashflow_module.sql) but adapted:
--   - NUMERIC pounds instead of INTEGER pence
--   - No owner_id / no auth.uid() RLS patterns
--   - Expense categories mirror Lane A's bank_transactions CHECK constraint
--     (studio_rent / equipment / insurance / software / marketing / professional_fees / other)

CREATE TABLE IF NOT EXISTS tax_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'annual',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Income
  total_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  invoice_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Allowable expenses
  total_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  studio_rent_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  equipment_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  insurance_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  software_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  marketing_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  professional_fees_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Profit
  taxable_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Income Tax (2025-26 UK rates, hardcoded)
  basic_rate_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  higher_rate_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_income_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- NICs
  class2_weeks INTEGER NOT NULL DEFAULT 0,
  class2_nic NUMERIC(12,2) NOT NULL DEFAULT 0,
  class4_nic NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_nic NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Totals
  total_tax_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  payments_made NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tax_year, period_type, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_tax_calculations_year ON tax_calculations(tax_year);

-- Payments made toward tax liability (manual entry — no live feed from HMRC)
CREATE TABLE IF NOT EXISTS tax_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_calculation_id UUID REFERENCES tax_calculations(id) ON DELETE SET NULL,
  tax_year TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid_at DATE NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_payments_year ON tax_payments(tax_year);
