// CR-EF-128: Backfill structured medication entries from signed PAR-Qs.
//
// DRY RUN by default — prints what would be merged for each client.
// Pass --apply to actually write the merged medications into client profiles.
//
// Usage:
//   node scripts/backfill-medications-from-parq.mjs          # dry run
//   node scripts/backfill-medications-from-parq.mjs --apply   # write changes
//
// Requires DATABASE_URL in the environment (same pattern as other scripts).
import { fileURLToPath } from "node:url";
import pg from "pg";

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (!isMain) {
  console.log("Guarded: run this directly with `node scripts/backfill-medications-from-parq.mjs`.");
  process.exit(0);
}

const APPLY = process.argv.includes("--apply");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Export it before running this script.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

/**
 * Parse a free-text medications string into individual name tokens.
 * Mirrors lib/medications-from-parq.ts parseMedicationsText.
 */
function parseMedicationsText(text) {
  if (!text?.trim()) return [];
  return text
    .split(/[,;\n]|\s+and\s+/i)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Merge incoming medication names into existing MedicationEntry[],
 * deduplicating by case-insensitive name.
 */
function mergeMedications(existing, incomingNames) {
  const existingNames = new Set(existing.map((m) => m.name.toLowerCase()));
  const newEntries = incomingNames
    .filter((name) => !existingNames.has(name.toLowerCase()))
    .map((name) => ({
      id: crypto.randomUUID(),
      name,
      form: "",
      frequency: "",
      treats: "",
      start_date: null,
      end_date: null,
      side_effects: "",
    }));
  return { merged: [...existing, ...newEntries], added: newEntries.length };
}

async function main() {
  await client.connect();

  // Find all signed PAR-Qs with non-empty medications text in feedback_responses.
  const { rows: parqs } = await client.query(`
    SELECT
      cd.id AS doc_id,
      cd.client_id,
      cd.feedback_responses -> 'answers' ->> 'medications' AS medications_text
    FROM client_documents cd
    WHERE cd.kind = 'parq'
      AND cd.status = 'signed'
      AND cd.feedback_responses -> 'answers' ->> 'medications' IS NOT NULL
      AND trim(cd.feedback_responses -> 'answers' ->> 'medications') <> ''
  `);

  console.log(`Found ${parqs.length} signed PAR-Q(s) with non-empty medications text.\n`);

  let totalAdded = 0;
  let totalSkipped = 0;

  for (const parq of parqs) {
    const medicationsText = parq.medications_text;
    const incomingNames = parseMedicationsText(medicationsText);

    if (incomingNames.length === 0) {
      console.log(`  [${parq.client_id}] PAR-Q ${parq.doc_id}: medications text parsed to 0 tokens — skipping.`);
      totalSkipped++;
      continue;
    }

    // Read the client's current profile.
    const { rows: clientRows } = await client.query(
      "SELECT profile FROM clients WHERE id = $1",
      [parq.client_id],
    );

    if (clientRows.length === 0) {
      console.log(`  [${parq.client_id}] PAR-Q ${parq.doc_id}: client not found — skipping.`);
      totalSkipped++;
      continue;
    }

    const profile = clientRows[0].profile || {};
    const health = profile.health || {};
    const existing = Array.isArray(health.medications) ? health.medications : [];

    const { merged, added } = mergeMedications(existing, incomingNames);

    if (added === 0) {
      console.log(
        `  [${parq.client_id}] PAR-Q ${parq.doc_id}: ` +
        `${incomingNames.length} medication(s) parsed, all already present — no changes.`,
      );
      totalSkipped++;
      continue;
    }

    console.log(
      `  [${parq.client_id}] PAR-Q ${parq.doc_id}: ` +
      `would add ${added} new medication(s) (${incomingNames.join(", ")}).`,
    );

    if (APPLY) {
      health.medications = merged;
      profile.health = health;
      await client.query(
        "UPDATE clients SET profile = $1 WHERE id = $2",
        [JSON.stringify(profile), parq.client_id],
      );
      console.log(`    -> Applied. Client now has ${merged.length} medication(s).`);
    }

    totalAdded += added;
  }

  console.log(
    `\nDone. ${totalAdded} medication(s) would be added across ${parqs.length - totalSkipped} client(s).` +
    (APPLY ? "" : " Run with --apply to write changes."),
  );

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
