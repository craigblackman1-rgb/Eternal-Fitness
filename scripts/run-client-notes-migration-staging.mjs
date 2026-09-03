// One-off: apply 20260817_client_notes.sql to the STAGING db clone specifically.
// Confirmed missing via a live 500 ("relation client_notes does not exist") while
// hand-verifying CR-EF-079 L3 on development.eternal-fitness.co.uk -- the migration
// was run on prod (2026-08-17) but never on the separate staging DB clone.
// Guarded so it can't run by a bare `node` accidental double-click (see
// reference_ef_staging_separate_db.md convention used by prior one-off scripts).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (!isMain) {
  console.log("Guarded: run this directly with `node scripts/run-client-notes-migration-staging.mjs`.");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Export it before running this script.");
  process.exit(1);
}

const sql = readFileSync(new URL("../db/migrations/20260817_client_notes.sql", import.meta.url), "utf8");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  const before = await client.query(
    "select to_regclass('public.client_notes') as exists",
  );
  console.log("Before:", before.rows[0]);
  await client.query(sql);
  const after = await client.query(
    "select to_regclass('public.client_notes') as exists",
  );
  console.log("After:", after.rows[0]);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
