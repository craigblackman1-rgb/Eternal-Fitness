# Lane: capture the re-parent guard as a migration file

**WO:** wo-ef-full-grind-2026-09-02 · Model: opencode-go/mimo-v2.5 · branch `lane/ef-reparent-migration`

## Background
Today a COMPLETED session holding 22 real set_logs was silently re-parented into a supplementary slot
of another session, which broke every count on the block page (BUG-EF-112). Craig's ruling: **a completed
session must never be re-parented. A session is a parent in its own right unless a supplementary is
deliberately added.**

That guard has already been applied by hand to both the production and staging databases and verified
working. It is NOT yet in version control. Your only job is to capture it faithfully as a migration file
so it exists in the repo and applies to any fresh database.

## Create `db/migrations/20260902_block_reparent_completed.sql` containing exactly this behaviour

```sql
CREATE OR REPLACE FUNCTION sessions_block_reparent_completed() RETURNS trigger AS $$
BEGIN
  IF OLD.completed_at IS NOT NULL
     AND OLD.parent_session_id IS NULL
     AND NEW.parent_session_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot re-parent a completed session (id %). A completed session stays a session in its own right; add a supplementary alongside it instead.',
      OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sessions_block_reparent_completed ON sessions;
CREATE TRIGGER trg_sessions_block_reparent_completed
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION sessions_block_reparent_completed();
```

Add a comment block at the top explaining WHY it is a trigger and not a CHECK constraint: a CHECK of
"parent_session_id IS NULL OR completed_at IS NULL" would also forbid a LEGITIMATE supplementary session
from ever being completed, and those are real (Monique Weardon has one holding 98 set_logs). The rule is
about the TRANSITION, not the end state.

## FORBIDDEN
Any file other than that one migration. Do not touch application code, do not run the migration,
do not connect to any database. No dev server, browser, or install.

## VERIFY
Read the file back and confirm it is valid SQL and matches the behaviour above exactly.

## COMMIT — DO NOT SKIP
`git add -A && git commit -m "migration: block re-parenting of a completed session"`
Do not push.
