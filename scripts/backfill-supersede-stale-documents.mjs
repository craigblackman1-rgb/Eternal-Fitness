// One-off backfill for CR-EF-026: marks any client_documents row that is
// still 'draft' or 'sent' as 'superseded' when a 'signed' row of the same
// kind already exists for that client — the same rule the app now applies
// going forward (app/api/documents/upload/route.ts,
// app/api/documents/[id]/sign/route.ts). Existing stale rows (e.g. Saffron
// Somerset's abandoned "Sent" PAR-Q, superseded in practice by a later
// signed scan) predate that rule and were never cleaned up.
//
// Dry-runs by default (SELECT only, no writes). Pass --apply to actually run
// the UPDATE inside a transaction, print before/after, and COMMIT.
//
// Run from the repo root: node scripts/backfill-supersede-stale-documents.mjs [--apply]

import fs from "fs";
import pg from "pg";

const APPLY = process.argv.includes("--apply");

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const client = new pg.Client({ connectionString: match[1].trim() });

const FIND_STALE_SQL = `
  SELECT stale.id, stale.client_id, c.name AS client_name, stale.kind, stale.status,
         stale.created_at, signed.id AS signed_id, signed.created_at AS signed_created_at
    FROM client_documents stale
    JOIN client_documents signed
      ON signed.client_id = stale.client_id
     AND signed.kind = stale.kind
     AND signed.status = 'signed'
     AND signed.id != stale.id
    JOIN clients c ON c.id = stale.client_id
   WHERE stale.status IN ('draft', 'sent')
   ORDER BY c.name, stale.kind
`;

async function main() {
  await client.connect();

  const stale = await client.query(FIND_STALE_SQL);
  console.log(`Found ${stale.rows.length} stale document(s) with a signed row of the same kind already on file:`);
  for (const r of stale.rows) {
    console.log(
      `  ${r.client_name} — ${r.kind}: ${r.status} doc ${r.id} (${new Date(r.created_at).toISOString().slice(0, 10)}) ` +
        `superseded by signed doc ${r.signed_id} (${new Date(r.signed_created_at).toISOString().slice(0, 10)})`,
    );
  }

  if (stale.rows.length === 0) {
    console.log("Nothing to backfill.");
    await client.end();
    return;
  }

  if (!APPLY) {
    console.log("\nDry run only — no changes made. Re-run with --apply to update these rows.");
    await client.end();
    return;
  }

  await client.query("BEGIN");
  try {
    const ids = stale.rows.map((r) => r.id);
    const res = await client.query(
      `UPDATE client_documents SET status = 'superseded', updated_at = now() WHERE id = ANY($1::uuid[])`,
      [ids],
    );
    console.log(`\nUpdated ${res.rowCount} row(s).`);

    const recheck = await client.query(FIND_STALE_SQL);
    if (recheck.rows.length !== 0) {
      console.error("Post-update check found remaining stale rows — rolling back.");
      await client.query("ROLLBACK");
      process.exit(1);
    }

    await client.query("COMMIT");
    console.log("COMMITTED.");
  } catch (e) {
    console.error("Backfill errored — rolling back.", e);
    await client.query("ROLLBACK");
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
