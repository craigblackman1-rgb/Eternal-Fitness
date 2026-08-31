// One-off: migrate Monique Weardon's medications_relevant free-text strings into
// structured medications entries (CR-EF-105).
//
// Source data:
//   "Type 2 diabetes (Metformin)"
//   "Bisoprolol, Atorvastatin, Amlodipine, Nortriptyline"
//
// Produces 5 structured MedicationEntry rows, with name populated and
// form/frequency/treats/side_effects left blank for Esther to fill in.
//
// Run directly:  node scripts/run-medication-migration.mjs
// Guarded against module bundler import (see reference pattern in run-client-notes-migration-staging.mjs).
import { fileURLToPath } from "node:url";
import pg from "pg";

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (!isMain) {
  console.log("Guarded: run this directly with `node scripts/run-medication-migration.mjs`.");
  process.exit(0);
}

// ---- Monique Weardon's structured medication rows ----
// Parsed from her two medications_relevant strings.
// name is populated; all other fields are blank for Esther to fill in.
const MONIQUE_MEDICATIONS = [
  { id: crypto.randomUUID(), name: "Metformin", form: "", frequency: "", treats: "", start_date: null, end_date: null, side_effects: "" },
  { id: crypto.randomUUID(), name: "Bisoprolol", form: "", frequency: "", treats: "", start_date: null, end_date: null, side_effects: "" },
  { id: crypto.randomUUID(), name: "Atorvastatin", form: "", frequency: "", treats: "", start_date: null, end_date: null, side_effects: "" },
  { id: crypto.randomUUID(), name: "Amlodipine", form: "", frequency: "", treats: "", start_date: null, end_date: null, side_effects: "" },
  { id: crypto.randomUUID(), name: "Nortriptyline", form: "", frequency: "", treats: "", start_date: null, end_date: null, side_effects: "" },
];

// ---- Connection — uses the same staging tunnel as the notes migration ----
const client = new pg.Client({
  connectionString: "postgresql://ef_staging_app:uZ81HJRRFbBprNVMOzNiaBQr8teMrnpM@localhost:5433/eternal_fitness_staging",
});

async function main() {
  await client.connect();

  // 1. Find Monique by name
  const { rows } = await client.query(
    "SELECT id, name FROM clients WHERE name ILIKE '%monique%weardon%' LIMIT 1"
  );
  if (rows.length === 0) {
    console.error("Monique Weardon not found — aborting.");
    process.exit(1);
  }
  const monique = rows[0];
  console.log(`Found client: ${monique.name} (${monique.id})`);

  // 2. Read current profile
  const { rows: clientRows } = await client.query(
    "SELECT profile FROM clients WHERE id = $1",
    [monique.id]
  );
  if (clientRows.length === 0) {
    console.error("Could not read client profile.");
    process.exit(1);
  }
  const profile = clientRows[0].profile || {};

  // 3. Inject structured medications into profile.health
  if (!profile.health) profile.health = {};
  profile.health.medications = MONIQUE_MEDICATIONS;

  // 4. Write back
  await client.query(
    "UPDATE clients SET profile = $1 WHERE id = $2",
    [JSON.stringify(profile), monique.id]
  );

  console.log(`Updated ${monique.name} with ${MONIQUE_MEDICATIONS.length} structured medication entries.`);
  console.log("Medication entries:");
  console.log(JSON.stringify(MONIQUE_MEDICATIONS, null, 2));

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
