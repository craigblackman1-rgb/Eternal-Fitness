// One-off runner for supabase/migrations/20260817_update_interval_custom.sql.
// Wraps the migration in a transaction, confirms the expected before/after
// schema state, and only COMMITs if the checks pass.
//
// Run from the repo root: node scripts/run-update-interval-migration.mjs

import fs from "fs";
import pg from "pg";

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const migrationSql = fs.readFileSync(
  "supabase/migrations/20260817_update_interval_custom.sql",
  "utf8"
);

const client = new pg.Client({ connectionString: match[1].trim() });

async function main() {
  await client.connect();
  client.on("notice", (msg) => console.log("DB NOTICE:", msg.message));

  const before = await client.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'clients' AND column_name IN ('update_interval_weeks', 'update_interval_next_date')
  `);
  console.log(`BEFORE: new columns present = ${before.rows.length} (expect 0)`);

  const constraintBefore = await client.query(`
    SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'clients_update_interval_check'
  `);
  console.log(`BEFORE constraint: ${constraintBefore.rows[0]?.def ?? "(none found)"}`);

  await client.query("BEGIN");
  try {
    await client.query(migrationSql);

    const after = await client.query(`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'clients' AND column_name IN ('update_interval_weeks', 'update_interval_next_date')
       ORDER BY column_name
    `);
    console.log(`AFTER: new columns present = ${after.rows.map((r) => r.column_name).join(", ")}`);

    const constraintAfter = await client.query(`
      SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'clients_update_interval_check'
    `);
    console.log(`AFTER constraint: ${constraintAfter.rows[0]?.def}`);

    const clientCountAfter = await client.query("SELECT count(*) FROM clients");
    console.log(`Sanity check: clients table still has ${clientCountAfter.rows[0].count} rows`);

    const ok =
      after.rows.length === 2 &&
      constraintAfter.rows[0]?.def?.includes("custom_weeks") &&
      constraintAfter.rows[0]?.def?.includes("fixed_date");

    if (!ok) {
      console.error("Post-migration checks FAILED — rolling back.");
      await client.query("ROLLBACK");
      process.exit(1);
    }

    await client.query("COMMIT");
    console.log("COMMITTED.");
  } catch (e) {
    console.error("Migration errored — rolling back.", e);
    await client.query("ROLLBACK");
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
