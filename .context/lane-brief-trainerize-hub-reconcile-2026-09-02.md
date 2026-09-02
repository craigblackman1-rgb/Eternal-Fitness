# Lane brief — `scripts/reconcile-trainerize-hub.mjs`

**WO:** wo-ef-full-grind-2026-09-02 · unit T3 · **Model:** opencode-go/mimo-v2.5
**Worktree:** `D:\apps\worktrees\eternal-fitness-website\ef-recon-script` · branch `lane/ef-recon-script` off `origin/main`

## Why this exists

Trainerize history was imported into archive tables on 2026-08-02 and 12 clients' blocks were
promoted into the hub. Since then **nothing has been re-pulled and there is no way to tell what
changed.** Every existing Trainerize script is a one-shot import. There is no delta path and no
join between an archive row and the live `blocks`/`sessions` row it produced.

You are building that missing piece: a **read-only reporting script** that says, per client, what
exists in Trainerize but not in the hub.

## MUST build

### 1. Migration `db/migrations/20260902_trainerize_mapping.sql`

The only write in this unit. Additive, nullable, no backfill of live data:

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS trainerize_client_id BIGINT;
ALTER TABLE blocks  ADD COLUMN IF NOT EXISTS trainerize_phase_id  BIGINT;
CREATE INDEX IF NOT EXISTS idx_clients_trainerize_client_id ON clients(trainerize_client_id);
CREATE INDEX IF NOT EXISTS idx_blocks_trainerize_phase_id  ON blocks(trainerize_phase_id);
```

Add a comment block at the top explaining this replaces name-string matching and the free-text
provenance in `blocks.block_note`. **Do not run it** — Claude applies migrations.

### 2. `scripts/reconcile-trainerize-hub.mjs`

Follow the house style of `scripts/load-trainerize-history.mjs` exactly: same minimal `.env.local`
parser (do NOT add a `dotenv` dependency), same `pg` `Pool` usage, same `--dry-run`/`--client` arg
handling, same `import.meta.url === process.argv[1]` guard.

**Arguments:** `--since <ISO date>` (default `2026-08-02`), `--client <uuid>`, `--json`, `--out <path>`.

**It must be strictly read-only against the database.** No INSERT, UPDATE, DELETE, TRUNCATE.
It reports; it does not fix.

**Client identity resolution** — this is the part that matters most. In order:
1. `clients.trainerize_client_id` where set (exact, trusted).
2. Exact case-insensitive full-name match `clients.name` ↔ `trainerize_*` client name.
3. Unique surname match.
4. Unique first-name match.

Record which rule matched in the output as `match_rule` and `match_confidence`
(`exact_id` | `exact_name` | `surname` | `first_name`). **Any client resolving by rule 3 or 4, and
any name matching more than one candidate, goes into a separate `ambiguous` section and is NOT
counted as matched.** Real collisions already exist in this data — "Thomas Putnam" vs "Tom Putnam",
and bare first names. Never silently pick one. An ambiguous match reported honestly is the correct
output; a guess is a defect.

**Block/workout classification.** For each resolved client, compare `trainerize_training_blocks`
(and their `trainerize_workouts`) with `start_date >= --since` against hub `blocks`/`sessions`:

| Class | Meaning |
|---|---|
| `NEW` | in Trainerize, no corresponding hub block |
| `CHANGED` | mapped hub block exists but workout count, names or date range differ |
| `MATCHED` | mapped hub block agrees |
| `HUB_ONLY` | hub block with no Trainerize counterpart (hub-authored — expected, not an error) |

Match a hub block to an archive block by `blocks.trainerize_phase_id` first; where null, fall back
to overlapping `scheduled_start`/date range **and** say so via `block_match_rule`.

**Flag, do not fail on:** any Trainerize block whose workout count would exceed the hub's
`sessions.session_number` CHECK **BETWEEN 1 AND 18**. These cannot be promoted as-is. Put them in
an `unpromotable` section with the count. A full block previously error-looped the auto-confirm
cron, so this must be visible before any promotion runs.

**Output:** JSON to `--out` (default `.context/trainerize-hub-reconcile-<YYYY-MM-DD>.json`) plus a
human-readable markdown summary alongside it. Top-level totals, then per client. Also print a
one-line-per-client summary to stdout.

## FORBIDDEN

- Any write to the database other than the migration **file** (which you do not execute).
- Adding npm dependencies. `pg` and node builtins only.
- Modifying any existing script, route, component or migration.
- Running a dev server, `npm run dev`, Playwright, or any browser.
- Inventing a `trainerize_*` column that does not exist — read
  `db/migrations/20260802_trainerize_history.sql` and `20260802_trainerize_workout_results.sql`
  and use the real column names.

## VERIFY before you finish

1. `node --check scripts/reconcile-trainerize-hub.mjs` passes.
2. `grep -inE "insert |update |delete |truncate |drop " scripts/reconcile-trainerize-hub.mjs`
   returns nothing outside comments and string literals.
3. `git diff --cached | grep -iE "postgresql://|password"` returns nothing — credentials come from
   `.env.local`/env at runtime, never baked into the file.
4. Only two files added, nothing else touched: `git status --short`.

## COMMIT

Commit your work before finishing — an uncommitted lane is a lane that silently loses its work, and
the next lane branching off will not see it.

```
git add scripts/reconcile-trainerize-hub.mjs db/migrations/20260902_trainerize_mapping.sql .context/lane-brief-trainerize-hub-reconcile-2026-09-02.md
git commit -m "T3: derived Trainerize<->hub reconciliation report + identity mapping columns"
```

**Do not push.** Claude verifies and merges.
