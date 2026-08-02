// Import script: Trainerize JSON data → PostgreSQL archive tables
// Reads .context/trainerize-import-<clientId>.json and upserts into DB.
// Idempotent — re-running produces no duplicate rows (ON CONFLICT or
// pre-check deletes existing data for the same source records).
//
// Usage:
//   node scripts/load-trainerize-history.mjs [--client 22276427] [--dry-run]
//
// Requires .env.local with DATABASE_URL (tunneled to prod).

import { createRequire } from "module";
import { join } from "path";
import { readFileSync, existsSync } from "fs";

const require = createRequire(import.meta.url);
const { Pool } = require("pg");

// Minimal .env parser — avoids adding a `dotenv` dependency (not installed anywhere
// in this project's pnpm store; pnpm install is always a gate) for something this small.
function parse(contents) {
  const out = {};
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const CLIENT_ID_ARG = process.argv.indexOf("--client");
const CLIENT_ID = CLIENT_ID_ARG !== -1 ? process.argv[CLIENT_ID_ARG + 1] : "22276427";
const DRY_RUN = process.argv.includes("--dry-run");
const DB_CLIENT_ID_ARG = process.argv.indexOf("--db-client-id");
const DB_CLIENT_ID = DB_CLIENT_ID_ARG !== -1 ? process.argv[DB_CLIENT_ID_ARG + 1] : null;

const OUT_DIR = join(process.cwd(), ".context");
const JSON_FILE = join(OUT_DIR, `trainerize-import-${CLIENT_ID}.json`);

if (!existsSync(JSON_FILE)) {
  console.error(`JSON file not found: ${JSON_FILE}`);
  console.error("Run scripts/import-trainerize-block-data.mjs first.");
  process.exit(1);
}

// Read .env.local for DB connection
const envFile = join(process.cwd(), ".env.local");
if (!existsSync(envFile)) {
  console.error(".env.local not found");
  process.exit(1);
}
const env = parse(readFileSync(envFile, "utf-8"));
const connStr = env.DATABASE_URL;
if (!connStr) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString: connStr });

async function main() {
  const data = JSON.parse(readFileSync(JSON_FILE, "utf-8"));
  console.log(`Loaded JSON — client: ${data.clientName}`);

  if (DRY_RUN) {
    console.log("DRY RUN — will print summary only, no writes.");
    console.log(`  Training plans: ${data.trainingPlans.length}`);
    console.log(`  Workout phases: ${data.workoutsByPlan.length}`);
    console.log(`  Accomplishments: ${data.accomplishments.length}`);
    console.log(`  Notes: ${data.notes.length}`);
    await pool.end();
    return;
  }

  // 1. Look up the client UUID by client_number, name, or an explicit --db-client-id
  //    override (needed when the Trainerize spelling of a name doesn't match our DB,
  //    e.g. Trainerize "Monique Wearden" vs our "Monique Weardon").
  let clients;
  if (DB_CLIENT_ID) {
    ({ rows: clients } = await pool.query("SELECT id, name, client_number FROM clients WHERE id = $1", [DB_CLIENT_ID]));
  } else {
    ({ rows: clients } = await pool.query(
      "SELECT id, name, client_number FROM clients WHERE name ILIKE $1",
      [`%${data.clientName}%`],
    ));
  }

  if (clients.length === 0) {
    console.error(`Client "${data.clientName}" not found in DB. Create them first, or pass --db-client-id.`);
    await pool.end();
    process.exit(1);
  }

  const client = clients[0];
  console.log(`Matched client: ${client.name} (UUID: ${client.id}, #${client.client_number})\n`);

  // 2. Upsert personal_records (PBs from accomplishments)
  // personal_records is owned by Lane 2 (live PB flagging) — real columns are
  // (client_id, exercise, metric, value, rep_count, achieved_at, source), source
  // CHECK IN ('live_log','trainerize_import'), unique on (client_id, exercise, metric,
  // rep_count) with NULLS NOT DISTINCT. Do not write exercise_name/record_type/unit —
  // those columns don't exist on the real table.
  const REP_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20 };
  function parseRepCount(brokenRecordType) {
    const m = /^([a-z]+)RepMax$/i.exec(brokenRecordType || "");
    return m ? (REP_WORDS[m[1].toLowerCase()] ?? null) : null;
  }

  console.log(`── Importing ${data.accomplishments.length} personal records ──`);
  let pbCount = 0;
  // Process oldest-first so the final upsert per (exercise, metric, rep_count) is the
  // most recent Trainerize-reported PB, not an earlier superseded one.
  const sortedAccomplishments = [...data.accomplishments].sort(
    (a, b) => new Date(a.dateTime || a.itemDate || 0) - new Date(b.dateTime || b.itemDate || 0),
  );
  for (const acc of sortedAccomplishments) {
    if (acc.type !== "brokenRecords" || !acc.data) continue;
    const d = acc.data;
    if (!d.exerciseName || !d.brokenRecordType) continue;

    const repCount = parseRepCount(d.brokenRecordType);
    const metric = "weight"; // all brokenRecords accomplishments seen so far are strength/weight PBs (unit kg)
    const achievedAt = acc.dateTime ? `${acc.dateTime.replace(" ", "T")}Z` : (acc.itemDate ? `${acc.itemDate}T00:00:00Z` : null);

    await pool.query(
      `INSERT INTO personal_records (client_id, exercise, metric, value, rep_count, achieved_at, source)
       VALUES ($1, $2, $3, $4, $5, $6, 'trainerize_import')
       ON CONFLICT (client_id, exercise, metric, rep_count)
       DO UPDATE SET value = EXCLUDED.value, achieved_at = EXCLUDED.achieved_at`,
      [client.id, d.exerciseName, metric, d.data, repCount, achievedAt],
    );
    pbCount++;
  }
  console.log(`  ${pbCount} personal records upserted.`);

  // 3. Import training blocks (phases) and workouts
  console.log(`\n── Importing training blocks and workouts ──`);
  let blockCount = 0;
  let workoutCount = 0;
  let exerciseCount = 0;

  for (const wp of data.workoutsByPlan) {
    // Find the plan metadata
    const plan = data.trainingPlans.find(p => p.id === wp.planId);
    if (!plan || plan.planType === "timeOff") continue;

    // Upsert the training block (training phase)
    const { rows: blocks } = await pool.query(
      `INSERT INTO trainerize_training_blocks (client_id, trainerize_phase_id, phase_name, start_date, end_date, plan_type, instruction, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (client_id, trainerize_phase_id)
       DO UPDATE SET phase_name = EXCLUDED.phase_name, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date,
                     instruction = EXCLUDED.instruction, raw_data = EXCLUDED.raw_data
       RETURNING id`,
      [client.id, wp.planId, wp.planName, wp.startDate || null, wp.endDate || null, wp.planType || "regular", wp.instruction || null, JSON.stringify(plan)],
    );
    const blockId = blocks[0].id;
    blockCount++;

    // Insert workouts for this block — delete existing first (cascade-safe)
    // to handle re-ordering/removed workouts
    for (let wi = 0; wi < wp.workouts.length; wi++) {
      const wo = wp.workouts[wi];
      const { rows: workouts } = await pool.query(
        `INSERT INTO trainerize_workouts (trainerize_block_id, trainerize_workout_id, workout_name, workout_index, duration_seconds, workout_type, instruction, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (trainerize_block_id, trainerize_workout_id)
         DO UPDATE SET workout_name = EXCLUDED.workout_name, workout_index = EXCLUDED.workout_index,
                       duration_seconds = EXCLUDED.duration_seconds, workout_type = EXCLUDED.workout_type,
                       instruction = EXCLUDED.instruction, raw_data = EXCLUDED.raw_data
         RETURNING id`,
        [blockId, wo.id, wo.name, wi, wo.duration || 0, wo.type || null, wo.instruction || null, JSON.stringify(wo)],
      );
      const workoutId = workouts[0].id;
      workoutCount++;

      // Delete existing exercises first (cascade is fine since we re-insert all)
      await pool.query("DELETE FROM trainerize_exercises WHERE trainerize_workout_id = $1", [workoutId]);

      // Insert exercises
      for (let ei = 0; ei < (wo.exercises || []).length; ei++) {
        const ex = wo.exercises[ei];
        await pool.query(
          `INSERT INTO trainerize_exercises (trainerize_workout_id, trainerize_exercise_id, exercise_name, exercise_order, sets, target_reps, target_type, rest_time_seconds, record_type, raw_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [workoutId, ex.id, ex.name, ei, ex.sets || 1, String(ex.target || ""), ex.targetDetail?.type || null, ex.restTime || 0, ex.recordType || null, JSON.stringify(ex)],
        );
        exerciseCount++;
      }
    }
  }
  console.log(`  ${blockCount} training blocks, ${workoutCount} workouts, ${exerciseCount} exercises imported.`);

  // 4. Import client notes
  console.log(`\n── Importing ${data.notes.length} client notes ──`);
  let noteCount = 0;
  for (const note of data.notes) {
    if (!note.content && !note.body) continue;
    const content = note.content || note.body || "";
    if (!content.trim()) continue;

    const sourceDate = note.sourceDate || note.date || null;
    const senderName = note.sender ? `${note.sender.firstName} ${note.sender.lastName}` : null;

    // For deduplication: check if this note already exists
    const { rows: existing } = await pool.query(
      "SELECT id FROM trainerize_client_notes WHERE client_id = $1 AND trainerize_message_id = $2 AND source = $3",
      [client.id, note.messageID || null, note.source],
    );

    if (existing.length > 0) continue; // already imported

    await pool.query(
      `INSERT INTO trainerize_client_notes (client_id, source, content, source_date, trainerize_message_id, sender_name, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [client.id, note.source, content.substring(0, 10000), sourceDate, note.messageID || null, senderName, JSON.stringify(note)],
    );
    noteCount++;
  }
  console.log(`  ${noteCount} notes imported.`);

  // 5. Import actual workout results (per-set logged data)
  const results = data.workoutResults || [];
  console.log(`\n── Importing ${results.length} logged sets ──`);
  let resultCount = 0;
  for (const r of results) {
    await pool.query(
      `INSERT INTO trainerize_workout_results
         (client_id, trainerize_daily_workout_id, workout_name, performed_date, rpe,
          trainerize_daily_exercise_id, exercise_name, set_number, reps, weight, distance, duration_seconds, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (client_id, trainerize_daily_exercise_id, set_number)
       DO UPDATE SET reps = EXCLUDED.reps, weight = EXCLUDED.weight, distance = EXCLUDED.distance,
                     duration_seconds = EXCLUDED.duration_seconds, raw_data = EXCLUDED.raw_data`,
      [
        client.id, r.dailyWorkoutId, r.workoutName, r.performedDate || null, r.rpe,
        r.dailyExerciseId, r.exerciseName, r.setNumber, r.reps, r.weight, r.distance, r.durationSeconds,
        JSON.stringify(r),
      ],
    );
    resultCount++;
  }
  console.log(`  ${resultCount} logged sets upserted.`);

  console.log(`\nDone! All data imported for ${data.clientName}.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
