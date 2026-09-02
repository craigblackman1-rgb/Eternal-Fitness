-- Eternal Fitness Training App — Database Schema
-- Apply this in your Supabase project SQL editor

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (true);

-- Blocks
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  block_number INTEGER NOT NULL,
  status TEXT CHECK (status IN ('draft', 'approved', 'active', 'complete')) DEFAULT 'draft',
  block_note TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE INDEX idx_blocks_client_id ON blocks(client_id);
CREATE INDEX idx_blocks_status ON blocks(status);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read blocks"
  ON blocks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert blocks"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update blocks"
  ON blocks FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete blocks"
  ON blocks FOR DELETE
  TO authenticated
  USING (true);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL CHECK (session_number BETWEEN 1 AND 18),
  archetype TEXT CHECK (archetype IN ('A', 'B', 'C')),
  week INTEGER CHECK (week BETWEEN 1 AND 6),
  phase TEXT CHECK (phase IN ('foundation', 'build', 'develop', 'peak', 'deload')),
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_sessions_block_id ON sessions(block_id);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (true);
