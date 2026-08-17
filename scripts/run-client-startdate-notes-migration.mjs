// One-off runner for CR-EF-022 + CR-EF-017 schema changes:
//   supabase/migrations/20260817_client_start_date.sql
//   supabase/migrations/20260817_client_notes.sql
// Transaction-wrapped, confirms expected before/after state, COMMITs only if checks pass.
//
// Run from the repo root: node scripts/run-client-startdate-notes-migration.mjs

import fs from "fs";
import pg from "pg";

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const startDateSql = fs.readFileSync("supabase/migrations/20260817_client_start_date.sql", "utf8");
const notesSql = fs.readFileSync("supabase/migrations/20260817_client_notes.sql", "utf8");

const client = new pg.Client({ connectionString: match[1].trim() });

async function main() {
  await client.connect();
  client.on("notice", (msg) => console.log("DB NOTICE:", msg.message));

  const before = await client.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'clients' AND column_name = 'start_date'
  `);
  console.log(`BEFORE: clients.start_date present = ${before.rows.length} (expect 0)`);

  const notesBefore = await client.query(`
    SELECT to_regclass('public.client_notes') AS tbl
  `);
  console.log(`BEFORE: client_notes table = ${notesBefore.rows[0].tbl ?? "(none)"}`);

  const clientCountBefore = await client.query("SELECT count(*) FROM clients");
  console.log(`Sanity: clients rows before = ${clientCountBefore.rows[0].count}`);

  await client.query("BEGIN");
  try {
    await client.query(startDateSql);
    await client.query(notesSql);

    const afterCol = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'clients' AND column_name = 'start_date'
    `);
    console.log(`AFTER: clients.start_date = ${afterCol.rows[0]?.column_name} ${afterCol.rows[0]?.data_type ?? "(missing)"}`);

    const afterTbl = await client.query(`
      SELECT to_regclass('public.client_notes') AS tbl
    `);
    console.log(`AFTER: client_notes table = ${afterTbl.rows[0].tbl ?? "(missing)"}`);

    const clientCountAfter = await client.query("SELECT count(*) FROM clients");
    console.log(`Sanity: clients rows after = ${clientCountAfter.rows[0].count}`);

    const ok =
      afterCol.rows.length === 1 &&
      afterTbl.rows[0]?.tbl != null &&
      Number(clientCountAfter.rows[0].count) === Number(clientCountBefore.rows[0].count);

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
