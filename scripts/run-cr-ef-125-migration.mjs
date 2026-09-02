import fs from "fs";
import pg from "pg";

const APPLY = process.argv.includes("--apply");

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const migrationSql = fs.readFileSync("db/migrations/20260902_client_supplementary_workouts.sql", "utf8");

const client = new pg.Client({ connectionString: match[1].trim() });

async function main() {
  await client.connect();
  client.on("notice", (msg) => console.log("DB NOTICE:", msg.message));

  console.log(`Mode: ${APPLY ? "APPLY (will commit if checks pass)" : "DRY RUN (always rolls back)"}`);

  const beforeTable = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'client_supplementary_workouts'
    ) AS exists
  `);
  const tableExists = beforeTable.rows[0].exists;
  console.log(`BEFORE: client_supplementary_workouts exists = ${tableExists} (expect false)`);

  const beforeCol = await client.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_name = 'sessions' AND column_name = 'supplementary_source_id'
  `);
  console.log(`BEFORE: sessions.supplementary_source_id exists = ${beforeCol.rows.length > 0} (expect false)`);

  await client.query("BEGIN");
  try {
    await client.query(migrationSql);

    // Verify table exists
    const afterTable = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'client_supplementary_workouts'
      ) AS exists
    `);
    if (!afterTable.rows[0].exists) {
      throw new Error("client_supplementary_workouts table was not created");
    }
    console.log("AFTER: client_supplementary_workouts exists = true");

    // Verify column
    const afterCol = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 'sessions' AND column_name = 'supplementary_source_id'
    `);
    if (afterCol.rows.length === 0) {
      throw new Error("sessions.supplementary_source_id column was not created");
    }
    console.log(`AFTER: sessions.supplementary_source_id (${afterCol.rows[0].data_type})`);

    // Verify indexes
    const idxCheck = await client.query(`
      SELECT indexname FROM pg_indexes
       WHERE tablename = 'client_supplementary_workouts'
         AND indexname IN ('client_supplementary_workouts_active_uniq', 'client_supplementary_workouts_client_idx')
       ORDER BY indexname
    `);
    const idxNames = idxCheck.rows.map((r) => r.indexname);
    console.log(`AFTER: supplementary indexes = ${idxNames.join(", ")}`);
    if (idxNames.length < 2) {
      throw new Error(`Expected 2 indexes, found ${idxNames.length}`);
    }

    const sessIdxCheck = await client.query(`
      SELECT indexname FROM pg_indexes
       WHERE tablename = 'sessions' AND indexname = 'sessions_supplementary_source_idx'
    `);
    if (sessIdxCheck.rows.length === 0) {
      throw new Error("sessions_supplementary_source_idx not found");
    }
    console.log("AFTER: sessions_supplementary_source_idx exists");

    // Session count unchanged
    const sessionCount = await client.query("SELECT count(*) FROM sessions");
    console.log(`Sanity: sessions rows = ${sessionCount.rows[0].count}`);

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
