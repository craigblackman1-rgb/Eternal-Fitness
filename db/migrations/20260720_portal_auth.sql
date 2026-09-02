-- ============================================================================
-- Lane K — Portal auth rework: magic-link → password + reset
-- ----------------------------------------------------------------------------
-- Separate, isolated password-based auth instance for the client portal.
-- Deliberately distinct from the staff/trainer auth (lib/auth.ts).
-- This instance owns its own tables with a `portal_` prefix and its own cookie.
--
-- Access control is enforced at the application layer (staff-session check in
-- API routes), not Postgres RLS — matching the working pattern used everywhere
-- else in this app (client_documents, etc).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- portal_accounts — one row per client portal identity, bound 1:1 to clients.id
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  disabled_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_accounts_client_id ON portal_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_accounts_email ON portal_accounts(email);

-- ----------------------------------------------------------------------------
-- portal_sessions — session tokens for the client portal instance
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_portal_sessions_account_id ON portal_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token ON portal_sessions(token);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires ON portal_sessions(expires_at);

-- ----------------------------------------------------------------------------
-- portal_reset_tokens — single-use, short-lived password-reset tokens
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_reset_tokens_account_id ON portal_reset_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_portal_reset_tokens_token_hash ON portal_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_portal_reset_tokens_expires ON portal_reset_tokens(expires_at);
