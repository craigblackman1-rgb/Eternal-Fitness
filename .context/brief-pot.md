# Lane: pot counter must use the same status derivation as the page (review finding on commit 3095033)

**WO:** wo-ef-full-grind-2026-09-02 · branch `lane/ef-block-truth` (continue on top of 3095033)

Your patch 3 in `lib/session-pot.ts` is a no-op on real rows: line ~68 reads
`const status = s.status ?? deriveStatusFromColumns(s)`, but `sessions.status` is `NOT NULL DEFAULT 'planned'`
(`db/migrations/20260818_session_status_model.sql`), so `deriveStatusFromColumns` (where you added the
`completed_at` check) never runs. A session with `status='planned'` and `completed_at` set still counts as
unused in the pot while the page header and BlockPoolView call it completed.

## Fix
In `lib/session-pot.ts`, derive the status with the SAME precedence the page uses — call
`deriveSessionStatus` from `lib/session-status.ts` (read it first; pass the fields it needs, including
`completed_at`, `cancelled_at`, `scheduled_at`, `status`) instead of `s.status ?? deriveStatusFromColumns(s)`.
Do not change the `parent_session_id` exclusion or the charged/free logic. Keep `deriveStatusFromColumns`
only if something else imports it; otherwise remove it.

Also: `git checkout origin/main -- tsconfig.tsbuildinfo` before committing so the build cache file is not
part of your commit (it was modified in 3095033 by the tsc run).

## FORBIDDEN
Any file other than `lib/session-pot.ts` (+ the tsbuildinfo revert). No dev server, browser, install.

## VERIFY
Quote the new derivation line(s). Run tsc via
`node D:\apps\worktrees\eternal-fitness-website\ef-grind-staging\node_modules\typescript\bin\tsc --noEmit -p tsconfig.json`
and report the exit code honestly (module-resolution errors from a missing local node_modules are not yours; say so).

## COMMIT — DO NOT SKIP
`git add -A && git commit -m "session pot: derive status with deriveSessionStatus so completed-but-unbooked sessions count as used"`
Do not push.
