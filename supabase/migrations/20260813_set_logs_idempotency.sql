-- Adds a client-supplied idempotency key (client_op_id) to set_logs so a retried
-- or replayed create from a mobile client cannot produce a duplicate set-log row.
-- Offline-first mobile logging tags each create with a client-generated UUID; when
-- the same operation is replayed after a network retry or a dropped response, the
-- partial unique index below turns the second insert into a no-op instead of a
-- second row. The API route then re-reads the already-existing row and returns it
-- byte-identically to a fresh insert.
--
-- client_op_id is deliberately nullable: every existing row, and every existing
-- caller that predates this key, has no client_op_id. The unique index is therefore
-- partial (WHERE client_op_id IS NOT NULL) so NULL never collides with NULL. New
-- callers write ON CONFLICT (client_op_id) WHERE client_op_id IS NOT NULL DO NOTHING
-- then SELECT the existing row; old callers omit client_op_id entirely and behave
-- exactly as before.
--
-- Idempotent throughout: safe to re-run. Both statements are guarded with IF NOT
-- EXISTS; nothing is dropped and no existing column or row is altered destructively.

ALTER TABLE set_logs ADD COLUMN IF NOT EXISTS client_op_id UUID;

COMMENT ON COLUMN set_logs.client_op_id IS
  'Client-generated idempotency key for a create operation. Two writes carrying the same client_op_id are one logical set-log; the partial unique index below enforces this. NULL for rows created before this column existed and for callers that do not send it.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_set_logs_client_op_id
  ON set_logs(client_op_id)
  WHERE client_op_id IS NOT NULL;
