-- Cash flow forecast — bills + cash_settings (pounds-based, no RLS, single hub user).
-- Ported from Decoded Ops hub forecast shape but EF-native conventions:
-- NUMERIC pounds (not INTEGER pence), no owner_id/RLS, adapted for PT studio.
-- This migration is NOT applied — review and run manually.

-- Recurring/pending non-invoice outgoings (studio rent, insurance, etc.)
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled')),
  due_date DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT
    CHECK (recurrence_rule IS NULL OR recurrence_rule IN ('monthly', 'quarterly', 'annually')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);

-- Single-row settings store — Esther's manually updated current balance.
-- id=1 is the canonical row; upsert with ON CONFLICT (id) DO UPDATE.
CREATE TABLE IF NOT EXISTS cash_settings (
  id INTEGER PRIMARY KEY DEFAULT 1
    CHECK (id = 1),
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_as_of DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the single settings row if it doesn't exist yet
INSERT INTO cash_settings (id, current_balance, balance_as_of)
VALUES (1, 0, CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;
