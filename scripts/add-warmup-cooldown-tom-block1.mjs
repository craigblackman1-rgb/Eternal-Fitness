#!/usr/bin/env node
// One-off: add the mobility warm-up/cooldown circuit (supplied by Craig, verbatim
// from Trainerize) to every session of Tom Putnam's Block 1. Same 11-move circuit
// for both — warm-up done dynamically, cooldown as static holds of the same moves.
//
// Usage:
//   node scripts/add-warmup-cooldown-tom-block1.mjs --dry-run
//   node scripts/add-warmup-cooldown-tom-block1.mjs

import { Pool } from "pg";
import { pathToFileURL } from "url";

const DRY_RUN = process.argv.includes("--dry-run");
const BLOCK_ID = "113888f0-d504-4694-a0c1-c2f6049a9c03"; // Tom Putnam, Block 1

const WARM_UP = [
  { exercise_name: "Inchworm Walkdown", sets: 1, reps: "1", tempo: "-", rest: "-", coaching_cue: "", modification: "", equipment: [], group_label: "Mobility Warm-Up Circuit" },
  { exercise_name: "Cobra to Childs Pose", sets: 1, reps: "3", tempo: "-", rest: "-", coaching_cue: "", modification: "", equipment: [], group_label: "Mobility Warm-Up Circuit" },
  { exercise_name: "Downward Dog", sets: 1, reps: "peddle feet", tempo: "-", rest: "-", coaching_cue: "", modification: "", equipment: [], group_label: "Mobility Warm-Up Circuit" },
  { exercise_name: "Cat to Cow", sets: 1, reps: "10", tempo: "-", rest: "-", coaching_cue: "", modification: "", equipment: [], group_label: "Mobility Warm-Up Circuit" },
  { exercise_name: "Tail Wag", sets: 1, reps: "5", tempo: "-", rest: "-", coaching_cue: "", modification: "", equipment: [], group_label: "Mobility Warm-Up Circuit" },
  { exercise_name: "Quadruped Scapular Circles", sets: 1, reps: "3 each way", tempo: "-", rest: "-", coaching_cue: "", modification: "", equipment: [], group_label: "Mobility Warm-Up Circuit" },
  { exercise_name: "Thread the Needle Alternating Back Stretch", sets: 1, reps: "3 each side", tempo: "-", rest: "-", coaching_cue: "", modification: "", equipment: [], group_label: "Mobility Warm-Up Circuit" },
  { exercise_name: "Hamstring Rocker Stretch", sets: 1, reps: "3", tempo: "-", rest: "-", coaching_cue: "Incorporate — push knee out to side (hip flexor), rock back (hamstring)", modification: "", equipment: [], group_label: "Mobility Warm-Up Circuit" },
  { exercise_name: "Active Adductor Rock Back", sets: 1, reps: "5 each side", tempo: "-", rest: "-", coaching_cue: "", modification: "", equipment: [], group_label: "Mobility Warm-Up Circuit" },
  { exercise_name: "Upper Body Wall Stretch", sets: 1, reps: "5 each side", tempo: "-", rest: "-", coaching_cue: "", modification: "", equipment: [], group_label: "Mobility Warm-Up Circuit" },
  { exercise_name: "Ankle Rock / Squat Sit", sets: 1, reps: "-", tempo: "-", rest: "-", coaching_cue: "Drop into the bottom of a bodyweight squat, heels flat, then gently rock weight forward over the toes and back, feeling the ankle open up — hold the bottom position between rocks.", modification: "", equipment: [], group_label: "Mobility Warm-Up Circuit" },
];

// Same 11 moves, static holds instead of the dynamic circuit.
const COOLDOWN = WARM_UP.map((ex) => ({
  ...ex,
  reps: "static hold",
  group_label: "Mobility Cooldown (static holds)",
}));

async function main() {
  const cs = process.env.DATABASE_URL;
  if (!cs) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: cs,
    ssl: !/127\.0\.0\.1|localhost/.test(cs) ? { rejectUnauthorized: false } : false,
  });

  const { rows } = await pool.query(
    `SELECT id, session_number, data FROM sessions WHERE block_id = $1 ORDER BY session_number`,
    [BLOCK_ID]
  );
  if (rows.length !== 12) {
    console.error(`Expected 12 sessions on block ${BLOCK_ID}, found ${rows.length}. Aborting.`);
    process.exit(1);
  }

  const updates = rows.map((r) => {
    const data = r.data;
    data.versions.studio.warm_up = WARM_UP;
    data.versions.studio.cooldown = COOLDOWN;
    data.versions.home.warm_up = WARM_UP;
    data.versions.home.cooldown = COOLDOWN;
    data.coaching_notes = data.coaching_notes.replace(
      / Warm-up not captured in source .*? — add before this becomes client-facing\./,
      ""
    );
    return { id: r.id, session_number: r.session_number, data };
  });

  if (DRY_RUN) {
    console.log(`Would update ${updates.length} sessions. Sample (session 1):`);
    console.log(JSON.stringify(updates[0].data.versions.studio, null, 2));
    console.log("\ncoaching_notes after edit:", updates[0].data.coaching_notes);
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const u of updates) {
      await client.query(`UPDATE sessions SET data = $1 WHERE id = $2`, [JSON.stringify(u.data), u.id]);
    }
    await client.query("COMMIT");
    console.log(`Updated warm-up/cooldown on ${updates.length} sessions.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
