// One-off runner for CR-EF-037 Phase 1:
//   db/migrations/20260818_session_status_model.sql
//
// Transaction-wrapped. Unlike the other run-*-migration.mjs scripts in this
// folder, this one defaults to DRY RUN (always rolls back) because it touches
// the core session model, not just an additive column nobody reads yet --
// pass --apply to actually commit. Always run without --apply first and read
// the status distribution before trusting it enough to --apply.
//
// Run from the repo root:
//   node scripts/run-session-status-migration.mjs             (dry run, rolls back)
//   node scripts/run-session-status-migration.mjs --apply      (commits if checks pass)

import fs from "fs";
import pg from "pg";

const APPLY = process.argv.includes("--apply");

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const migrationSql = fs.readFileSync("db/migrations/20260818_session_status_model.sql", "utf8");

const client = new pg.Client({ connectionString: match[1].trim() });

async function main() {
  await client.connect();
  client.on("notice", (msg) => console.log("DB NOTICE:", msg.message));

  console.log(`Mode: ${APPLY ? "APPLY (will commit if checks pass)" : "DRY RUN (always rolls back)"}`);

  const before = await client.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'sessions' AND column_name IN ('status', 'started_at', 'completed_at')
  `);
  console.log(`BEFORE: sessions status columns present = ${before.rows.length} (expect 0)`);

  const sessionCountBefore = await client.query("SELECT count(*) FROM sessions");
  console.log(`Sanity: sessions rows before = ${sessionCountBefore.rows[0].count}`);

  await client.query("BEGIN");
  try {
    await client.query(migrationSql);

    const afterCols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'sessions' AND column_name IN ('status', 'started_at', 'completed_at')
       ORDER BY column_name
    `);
    console.log(`AFTER: columns = ${afterCols.rows.map((r) => `${r.column_name} (${r.data_type})`).join(", ")}`);

    const sessionCountAfter = await client.query("SELECT count(*) FROM sessions");
    console.log(`Sanity: sessions rows after = ${sessionCountAfter.rows[0].count}`);

    const distribution = await client.query(`
      SELECT status, count(*) AS n FROM sessions GROUP BY status ORDER BY n DESC
    `);
    console.log("Status distribution after backfill:");
    for (const row of distribution.rows) {
      console.log(`  ${row.status.padEnd(12)} ${row.n}`);
    }

    // Cross-check against the pre-existing signals this was backfilled from,
    // so a mismatch is visible before commit, not discovered live later.
    const crossCheck = await client.query(`
      SELECT
        count(*) FILTER (WHERE cancelled_at IS NOT NULL AND status != 'cancelled') AS cancelled_mismatch,
        count(*) FILTER (WHERE data #>> '{session_log,completed_at}' IS NOT NULL AND status NOT IN ('completed', 'cancelled')) AS completed_mismatch,
        count(*) FILTER (WHERE status IS NULL) AS null_status
      FROM sessions
    `);
    const cc = crossCheck.rows[0];
    console.log(`Cross-check: cancelled_mismatch=${cc.cancelled_mismatch}, completed_mismatch=${cc.completed_mismatch}, null_status=${cc.null_status} (all expect 0)`);

    const ok =
      afterCols.rows.length === 3 &&
      Number(sessionCountAfter.rows[0].count) === Number(sessionCountBefore.rows[0].count) &&
      Number(cc.cancelled_mismatch) === 0 &&
      Number(cc.completed_mismatch) === 0 &&
      Number(cc.null_status) === 0;

    if (!ok) {
      console.error("Post-migration checks FAILED — rolling back regardless of --apply.");
      await client.query("ROLLBACK");
      process.exit(1);
    }

    if (APPLY) {
      await client.query("COMMIT");
      console.log("COMMITTED.");
    } else {
      await client.query("ROLLBACK");
      console.log("Checks passed. DRY RUN — rolled back, nothing committed. Re-run with --apply to commit.");
    }
  } catch (e) {
    console.error("Migration errored — rolling back.", e);
    await client.query("ROLLBACK");
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
