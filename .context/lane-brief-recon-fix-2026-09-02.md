# Lane brief — FIX `scripts/reconcile-trainerize-hub.mjs`

**WO:** wo-ef-full-grind-2026-09-02 · unit T3 fix · **Model:** opencode-go/mimo-v2.5
**Worktree:** this one (`ef-recon-script`, branch `lane/ef-recon-script`). Your previous commit was `f4ffebd`.

## What went wrong

Your script fails at runtime on the very first query:

```
error: column "client_name" does not exist
  at resolveClients (scripts/reconcile-trainerize-hub.mjs:102)
```

Line ~102 does:

```js
"SELECT DISTINCT client_id, client_name FROM trainerize_training_blocks ORDER BY client_name"
```

**`trainerize_training_blocks` has no `client_name` column.** Verified actual columns:

```
trainerize_training_blocks: id, client_id, trainerize_phase_id, phase_name,
                            start_date, end_date, plan_type, instruction, raw_data, created_at
trainerize_workouts:        id, trainerize_block_id, trainerize_workout_id, workout_name,
                            workout_index, duration_seconds, workout_type, instruction,
                            raw_data, created_at
```

## The important correction

`trainerize_training_blocks.client_id` is **already a UUID foreign key to `clients(id)`** — the loader
resolves the hub client at import time. So for archive→hub work the identity problem **does not
exist**: join on it directly.

Rewrite `resolveClients` accordingly:

- Get archive clients with
  `SELECT DISTINCT b.client_id, c.name FROM trainerize_training_blocks b JOIN clients c ON c.id = b.client_id`.
- That join is the `exact_id` path. Report `match_rule: "archive_fk"` with full confidence.
- **Delete the surname and first-name fallback matching entirely.** It was written for a problem that
  isn't there, and a fuzzy fallback over an authoritative FK can only introduce error.
- Keep an `unlinked` section for any `trainerize_training_blocks` row whose `client_id` does not join
  to a `clients` row (shouldn't happen; report it if it does rather than dropping it).
- Keep `clients.trainerize_client_id` (populated for 20 of 22 clients) purely as **reporting
  metadata** on each client — it is how a hub client maps to the Trainerize *account*, useful in the
  output. It is not needed for the join.

Everything else in the brief stands: NEW/CHANGED/MATCHED/HUB_ONLY classification, the
`session_number` 1–18 `unpromotable` flag, JSON + markdown output, strictly read-only.

## VERIFY — this is the part that failed last time

`node --check` passing is **not** evidence. You must actually run it:

```
node scripts/reconcile-trainerize-hub.mjs --since 2026-08-02
```

It must complete with exit 0 and write both output files. `.env.local` in this worktree does not
exist — create one containing only:

```
DATABASE_URL=postgresql://ef_staging_app:<REDACTED-see-infrastructure/credentials>@localhost:5433/eternal_fitness_staging
```

That is the **staging** database. Never point it at `eternal_fitness`. `.env.local` is gitignored —
do not commit it.

You will need `pg`. It is not resolvable in this worktree; junction it from the working copy already
prepared at:
`D:\apps\worktrees\eternal-fitness-website\ef-grind-staging\node_modules`
(or `npm install pg@8.22.0 --no-save` into an isolated dir and link it). Do not run `pnpm install`.

Then paste the actual stdout summary into your final message so it can be checked.

## COMMIT

```
git add scripts/reconcile-trainerize-hub.mjs .context/lane-brief-recon-fix-2026-09-02.md
git commit -m "T3 fix: join archive to hub on client_id FK, drop unnecessary fuzzy name matching"
```

Do not push. Do not run a dev server or a browser.
