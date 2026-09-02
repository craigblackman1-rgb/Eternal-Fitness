// One-off runner for the Kneel-to-Stand Progression workout template seed:
//   db/migrations/20260818_seed_kneel_to_stand_workout_template.sql
// Transaction-wrapped, confirms expected before/after state, COMMITs only if checks pass.
//
// Run from the repo root: node scripts/run-kneel-to-stand-template-migration.mjs

import fs from "fs";
import pg from "pg";

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const sql = fs.readFileSync(
  "db/migrations/20260818_seed_kneel_to_stand_workout_template.sql",
  "utf8",
);

const client = new pg.Client({ connectionString: match[1].trim() });

async function main() {
  await client.connect();
  client.on("notice", (msg) => console.log("DB NOTICE:", msg.message));

  const before = await client.query(
    "SELECT id FROM workout_templates WHERE name = 'Kneel-to-Stand Progression'",
  );
  console.log(`BEFORE: existing rows named 'Kneel-to-Stand Progression' = ${before.rows.length} (expect 0)`);

  await client.query("BEGIN");
  try {
    await client.query(sql);

    const after = await client.query(
      "SELECT id, name, jsonb_array_length(data->'main_block') AS exercise_count FROM workout_templates WHERE name = 'Kneel-to-Stand Progression'",
    );
    console.log(`AFTER: rows = ${after.rows.length} (expect 1), exercise_count = ${after.rows[0]?.exercise_count} (expect 34)`);

    const ok = after.rows.length === 1 && Number(after.rows[0]?.exercise_count) === 34;

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
