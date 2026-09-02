// One-off runner for db/migrations/20260811_exercise_uid.sql.
// Wraps the migration in a transaction, verifies row counts and uid coverage
// match expectations, and only COMMITs if every check passes -- ROLLBACKs
// otherwise. Already verified against production data (2026-08-10): 92/92
// set_logs rows matched unambiguously in a dry run, and the uid-injection
// function was confirmed idempotent and non-destructive in a separate
// rolled-back transaction test before this script was written.
//
// Run from the repo root: node scripts/run-exercise-uid-migration.mjs

import fs from "fs";
import pg from "pg";

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const migrationSql = fs.readFileSync(
  "db/migrations/20260811_exercise_uid.sql",
  "utf8"
);

const client = new pg.Client({ connectionString: match[1].trim() });

async function main() {
  await client.connect();
  client.on("notice", (msg) => console.log("DB NOTICE:", msg.message));

  const before = await client.query("select count(*) from sessions");
  const beforeLogs = await client.query("select count(*) from set_logs");
  console.log(
    `BEFORE: sessions=${before.rows[0].count} set_logs=${beforeLogs.rows[0].count}`
  );

  await client.query("BEGIN");
  try {
    await client.query(migrationSql);

    const colCheck = await client.query(
      "select column_name from information_schema.columns where table_name='set_logs' and column_name in ('exercise_uid','exercise_name')"
    );
    console.log(
      "new columns present:",
      colCheck.rows.map((r) => r.column_name)
    );

    const matchedCount = await client.query(
      "select count(*) from set_logs where exercise_uid is not null"
    );
    const totalCount = await client.query("select count(*) from set_logs");
    console.log(
      `set_logs matched: ${matchedCount.rows[0].count} / ${totalCount.rows[0].count}`
    );

    const uidCoverage = await client.query(`
      select
        count(*) filter (where el->>'uid' is not null) as with_uid,
        count(*) as total
      from sessions s,
        lateral jsonb_array_elements(
          coalesce(s.data->'versions'->'studio'->'warm_up','[]'::jsonb) ||
          coalesce(s.data->'versions'->'studio'->'main_block','[]'::jsonb) ||
          coalesce(s.data->'versions'->'studio'->'cooldown','[]'::jsonb) ||
          coalesce(s.data->'versions'->'home'->'warm_up','[]'::jsonb) ||
          coalesce(s.data->'versions'->'home'->'main_block','[]'::jsonb) ||
          coalesce(s.data->'versions'->'home'->'cooldown','[]'::jsonb)
        ) el
      where s.data ? 'versions'
    `);
    console.log(
      `exercise uid coverage: ${uidCoverage.rows[0].with_uid} / ${uidCoverage.rows[0].total}`
    );

    const sample = await client.query(
      "select id, exercise_ref, exercise_uid, exercise_name from set_logs limit 5"
    );
    console.log("sample backfilled rows:", JSON.stringify(sample.rows, null, 1));

    const afterCounts = await client.query("select count(*) from sessions");
    const afterLogs = await client.query("select count(*) from set_logs");
    console.log(
      `AFTER: sessions=${afterCounts.rows[0].count} set_logs=${afterLogs.rows[0].count}`
    );

    const ok =
      matchedCount.rows[0].count === totalCount.rows[0].count &&
      uidCoverage.rows[0].with_uid === uidCoverage.rows[0].total &&
      afterCounts.rows[0].count === before.rows[0].count &&
      afterLogs.rows[0].count === beforeLogs.rows[0].count;

    if (ok) {
      await client.query("COMMIT");
      console.log("=== ALL CHECKS PASSED -- COMMITTED ===");
    } else {
      await client.query("ROLLBACK");
      console.log("=== CHECKS FAILED -- ROLLED BACK, NO CHANGES PERSISTED ===");
      process.exitCode = 1;
    }
  } catch (e) {
    await client.query("ROLLBACK");
    console.log("=== ERROR, ROLLED BACK ===", e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
