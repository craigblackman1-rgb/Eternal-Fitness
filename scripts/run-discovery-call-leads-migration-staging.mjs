// One-off: apply 20260828_discovery_call_leads.sql to the STAGING db clone.
// CR-EF-097 u4/u5 -- staging has its own separate DB (reference_ef_staging_separate_db.md),
// migrations run once here, once against prod separately after main promotion.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (!isMain) {
  console.log("Guarded: run this directly with `node scripts/run-discovery-call-leads-migration-staging.mjs`.");
  process.exit(0);
}

const sql = readFileSync(new URL("../supabase/migrations/20260828_discovery_call_leads.sql", import.meta.url), "utf8");

const client = new pg.Client({
  connectionString: "postgresql://ef_staging_app:uZ81HJRRFbBprNVMOzNiaBQr8teMrnpM@localhost:5433/eternal_fitness_staging",
});

async function main() {
  await client.connect();
  const before = await client.query(
    "select to_regclass('public.discovery_call_leads') as exists",
  );
  console.log("Before:", before.rows[0]);
  await client.query(sql);
  const after = await client.query(
    "select to_regclass('public.discovery_call_leads') as exists",
  );
  console.log("After:", after.rows[0]);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
