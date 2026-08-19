// One-off runner for supabase/migrations/20260819_endurance_block_document.sql.
// Wraps the migration in a transaction, confirms the expected before/after
// state, and only COMMITs if the checks pass.
//
// Run from the repo root: node scripts/run-endurance-block-migration.mjs

import fs from "fs";
import pg from "pg";

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const migrationSql = fs.readFileSync(
  "supabase/migrations/20260819_endurance_block_document.sql",
  "utf8"
);

const client = new pg.Client({ connectionString: match[1].trim() });

async function main() {
  await client.connect();
  client.on("notice", (msg) => console.log("DB NOTICE:", msg.message));

  const before = await client.query(
    `SELECT id, kind, name, version FROM document_templates WHERE kind = 'endurance_block'`
  );
  console.log(`BEFORE: endurance_block template rows = ${before.rows.length} (expect 0)`);

  const countBefore = await client.query(`SELECT count(*)::int AS n FROM document_templates`);
  console.log(`BEFORE: total document_templates rows = ${countBefore.rows[0].n}`);

  await client.query("BEGIN");
  try {
    await client.query(migrationSql);

    const after = await client.query(
      `SELECT id, kind, name, version, requires_client_signature, requires_trainer_signature, is_active, body FROM document_templates WHERE kind = 'endurance_block'`
    );
    console.log(`AFTER: endurance_block template rows = ${after.rows.length} (expect 1)`);
    if (after.rows.length !== 1) {
      throw new Error(`Expected exactly 1 endurance_block template row, got ${after.rows.length}`);
    }
    const row = after.rows[0];
    console.log("Inserted row:", JSON.stringify(row, null, 2));
    if (row.requires_client_signature !== false || row.requires_trainer_signature !== false) {
      throw new Error("Signature flags not both false as expected");
    }
    if (!row.body?.enduranceBlock) {
      throw new Error("body.enduranceBlock missing on inserted row");
    }

    const countAfter = await client.query(`SELECT count(*)::int AS n FROM document_templates`);
    console.log(`AFTER: total document_templates rows = ${countAfter.rows[0].n} (expect +1)`);
    if (countAfter.rows[0].n !== countBefore.rows[0].n + 1) {
      throw new Error("Row count didn't increase by exactly 1 — aborting");
    }

    await client.query("COMMIT");
    console.log("COMMITTED.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ROLLED BACK due to:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
