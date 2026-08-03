#!/usr/bin/env node
// One-off migration: import Tom Putnam's Trainerize 6-week programme (Book1.xlsx)
// verbatim into the hub as his Block 1. First client migrated this way — a test
// of the Trainerize -> hub migration path.
//
// Usage:
//   node scripts/import-trainerize-migration-tom.mjs --dry-run
//   node scripts/import-trainerize-migration-tom.mjs
//
// Reads DATABASE_URL from the environment.

import { Pool } from "pg";

const DRY_RUN = process.argv.includes("--dry-run");
const CLIENT_NAME = "Tom Putnam";

// ---- Source data, transcribed verbatim from Book1.xlsx ("clients" folder) ----
// [superset, exerciseName, [week1..week6 raw cell text]]
const WORKOUT_A = [
  [1, "Barbell Back Squat", [
    "3x8, rest 90s", "3x8 (slight load up), rest 90s", "4x6 (load up), rest 2min",
    "4x5, rest 2min", "4-5x3-5, heaviest, rest 2-2.5min", "2x5 @60-70%, then 1 retest set, rest 90s",
  ]],
  [1, "90/90 Hip Switch with Hold (filler)", [
    "3-4 each side, hold 2-3s", "Same", "Same", "Same", "Same", "Same",
  ]],
  [2, "Stability Ball Hamstring Curl with Glute Bridge, holding DB overhead (or side-anchored band)", [
    "3x10-12, rest 60s", "3x10-12 (load up), rest 60s", "3x8-10 (load up), rest 75s",
    "3x8-10, rest 75s", "3x8, heaviest, rest 90s", "2x10-12 (deload), rest 60s",
  ]],
  [2, "Feet-Up TRX Inverted Row", [
    "3x10-12, rest 60s", "3x10-12 (harder angle), rest 60s", "3x8-10, rest 75s",
    "3x8-10, rest 75s", "3x8, rest 90s", "2x10-12 (deload), rest 60s",
  ]],
  [3, "DB Incline Press", [
    "3x10-12, rest 60s", "3x10-12 (load up), rest 60s", "3x8-10 (load up), rest 75s",
    "3x8-10, rest 75s", "3x8, heaviest, rest 90s", "2x10-12 (deload), rest 60s",
  ]],
  [3, "Half-Kneeling Pallof Press hold", [
    "3x6 each side, 8s hold, rest 60s", "Same", "3x6 each side, 10s hold, rest 60s",
    "Same", "3x6 each side, 12s hold, rest 60s", "2x6 each side, 8s hold, rest 60s",
  ]],
  [4, "Seated DB Shoulder Press, back supported", [
    "3x8, rest 60s", "3x8 (load up), rest 60s", "3x8-10 (load up), rest 60s",
    "Same", "3x10, heaviest, rest 60s", "2x8 (deload), rest 60s",
  ]],
  [4, "DB Bicep Curl", [
    "2x12, rest 45s", "3x12, rest 45s", "3x10 (load up), rest 60s",
    "3x10, rest 60s", "3x8, heaviest, rest 60s", "2x12 (deload), rest 45s",
  ]],
  [5, "Cable Rope Overhead Tricep Extension", [
    "2x12, rest 45s", "3x12, rest 45s", "3x10 (load up), rest 60s",
    "3x10, rest 60s", "3x8, heaviest, rest 60s", "2x12 (deload), rest 45s",
  ]],
  [5, "Weighted March on the Spot", [
    "2x30s, rest 45s", "3x30s, rest 45s", "3x40s, rest 45s",
    "3x40-50s, rest 45s", "3x50s, rest 45s", "2x30s (deload), rest 45s",
  ]],
  ["Conditioning circuit", "Battle Rope -> Slam Ball -> Box Step-Up (30s each, 30s rest between rounds)", [
    "4 rounds", "4 rounds", "5 rounds", "5 rounds", "5 rounds", "3 rounds",
  ]],
];
const WORKOUT_A_COOLDOWN_NOTE =
  "Cooldown (all weeks): same 10-move circuit as warm-up, static holds 20-30s each";

const WORKOUT_B = [
  [1, "Trap Bar Deadlift", [
    "3x8, rest 90s", "3x8 (slight load up), rest 90s", "4x6 (load up), rest 2min",
    "4x5, rest 2min", "4-5x3-5, switch to standard tempo, rest 2-2.5min", "2x5 @60-70%, then 1 retest set, rest 90s",
  ]],
  [1, "Thoracic Opener on Swiss Ball (filler)", [
    "3-4 sets, 8 breaths", "Same", "Same", "Same", "Same", "Same",
  ]],
  [2, "Sissy Squat", [
    "3x8-12, rest 60s", "3x8-12 (harder lean/load up), rest 60s", "3x8-10 (load up), rest 75s",
    "3x8-10, rest 75s", "3x8, heaviest, rest 90s", "2x10-12 (deload), rest 60s",
  ]],
  [2, "Seated Piriformis Stretch (filler)", [
    "30s each side", "Same", "Same", "Same", "Same", "Same",
  ]],
  [3, "DB Flat Bench Press", [
    "3x10-12, rest 60s", "3x10-12 (load up), rest 60s", "3x8-10 (load up), rest 75s",
    "3x8-10, rest 75s", "3x8, heaviest, rest 90s", "2x10-12 (deload), rest 60s",
  ]],
  [3, "DB Lateral Raise", [
    "2x12, rest 45s", "3x12, rest 45s", "3x10 (load up), rest 60s",
    "3x10, rest 60s", "3x8, heaviest, rest 60s", "2x12 (deload), rest 45s",
  ]],
  [4, "Seated Cable Row, bilateral", [
    "3x10-12, rest 60s", "3x10-12 (load up), rest 60s", "3x8-10 (load up), rest 75s",
    "3x8-10, rest 75s", "3x8, heaviest, rest 90s", "2x10-12 (deload), rest 60s",
  ]],
  [4, "DB Skull Crusher", [
    "2x12, rest 45s", "3x12, rest 45s", "3x10 (load up), rest 60s",
    "3x10, rest 60s", "3x8, heaviest, rest 60s", "2x12 (deload), rest 45s",
  ]],
  [5, "Single-Leg Hip Thrust", [
    "3x8-10 each side, rest 60s", "3x8-10 (load up), rest 60s", "3x8-10 (load up), rest 75s",
    "Same", "3x8, heaviest, rest 90s", "2x10 (deload), rest 60s",
  ]],
  [5, "Hammer Curl", [
    "2x12, rest 45s", "3x12, rest 45s", "3x10 (load up), rest 60s",
    "3x10, rest 60s", "3x8, heaviest, rest 60s", "2x12 (deload), rest 45s",
  ]],
  [6, "Renegade Row", [
    "2x8 each side, rest 45s", "3x8 each side, rest 45s", "3x10 each side, rest 45s",
    "3x10 each side, rest 45s", "3x10 each side, rest 45s", "2x8 each side (deload), rest 45s",
  ]],
  [6, "Side Plank", [
    "2x30s each side, rest 45s", "3x30s each side, rest 45s", "3x40s each side, rest 45s",
    "3x40-50s each side, rest 45s", "3x50s each side, rest 45s", "2x30s each side (deload), rest 45s",
  ]],
  ["Conditioning circuit", "KB Swing -> Box Step-Up -> Band Resisted March (30s each, 30s rest between rounds)", [
    "4 rounds", "4 rounds", "5 rounds", "5 rounds", "5 rounds", "3 rounds",
  ]],
];
const WORKOUT_B_COOLDOWN_NOTE =
  "Cooldown (all weeks): same circuit as warm-up, static holds";

const WEEK_PHASES = ["foundation", "foundation", "build", "develop", "peak", "deload"];

// ---- Parsing: never drop information. Split cleanly where the cell follows
// "NxREPS, rest REST" exactly; otherwise keep the full original text verbatim
// in `reps` rather than guess. ----
function parseCell(raw) {
  const m = raw.match(/^(\d+)x(.+)$/i);
  if (!m) {
    return { sets: 1, reps: raw, rest: "-" };
  }
  const sets = parseInt(m[1], 10);
  const restOf = m[2];
  const restMatch = restOf.match(/^(.*?),?\s*rest\s+(.+)$/i);
  if (restMatch) {
    return { sets, reps: restMatch[1].trim(), rest: restMatch[2].trim() };
  }
  return { sets, reps: restOf.trim(), rest: "-" };
}

// Resolve "Same" cells to the previous week's actual text, once per workout,
// so each row ends up with 6 fully-resolved cells.
function resolveSameCells(rows) {
  return rows.map(([superset, name, weeks]) => {
    const resolved = [];
    let last = null;
    for (const cell of weeks) {
      last = cell === "Same" ? last : cell;
      resolved.push(last);
    }
    return [superset, name, resolved];
  });
}

function buildMainBlock(rows, weekIndex) {
  const exercises = [];
  rows.forEach((row) => {
    const [superset, name, weeks] = row;
    const raw = weeks[weekIndex];

    const { sets, reps, rest } = parseCell(raw);
    exercises.push({
      exercise_name: name,
      sets,
      reps,
      tempo: "-",
      rest,
      coaching_cue: "",
      modification: "",
      equipment: [],
      group_label: superset === "Conditioning circuit" ? "Conditioning Circuit" : `Superset ${superset}`,
    });
  });
  return exercises;
}

function buildSessionData({ clientId, blockId, sessionNumber, week, phase, archetype, workoutLabel, mainBlock, cooldownNote }) {
  const versionContent = {
    warm_up: [],
    main_block: mainBlock,
    cooldown: [],
  };
  return {
    session_id: "",
    block_id: blockId,
    client_id: clientId,
    session_number: sessionNumber,
    archetype,
    week,
    phase,
    focus_label: `${workoutLabel} (Week ${week})`,
    time_tier: "standard",
    versions: {
      studio: versionContent,
      // No home substitutes were provided in the Trainerize export — cloning
      // studio content as a placeholder pending Esther's review, not inventing
      // new exercises.
      home: versionContent,
    },
    coaching_notes:
      "Imported verbatim from Trainerize (Book1.xlsx). Warm-up not captured in source " +
      `("${cooldownNote}") — add before this becomes client-facing. Coaching cues/` +
      "modifications/equipment tags not present in source; add as needed.",
    client_intro: "",
  };
}

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

  const { rows: clientRows } = await pool.query(
    `SELECT id, name FROM clients WHERE name ILIKE $1`,
    [CLIENT_NAME]
  );
  if (clientRows.length !== 1) {
    console.error(`Expected exactly one client matching "${CLIENT_NAME}", found ${clientRows.length}`);
    process.exit(1);
  }
  const clientId = clientRows[0].id;
  console.log(`Client: ${clientRows[0].name} (${clientId})`);

  const { rows: existingBlocks } = await pool.query(
    `SELECT id, block_number, status FROM blocks WHERE client_id = $1 ORDER BY block_number`,
    [clientId]
  );
  if (existingBlocks.length > 0) {
    console.error(
      `Client already has ${existingBlocks.length} block(s): ${JSON.stringify(existingBlocks)}. ` +
      `Refusing to auto-create Block 1 — check before proceeding.`
    );
    process.exit(1);
  }

  const blockId = DRY_RUN ? "00000000-0000-0000-0000-000000000000" : null; // filled after insert
  const blockNote =
    "Migrated verbatim from Trainerize (Book1.xlsx) — first client migrated to the hub as a " +
    "test of the Trainerize -> hub migration path. Sets/reps/rest transcribed exactly from the " +
    "source spreadsheet. Warm-up sequence, coaching cues, exercise modifications, and equipment " +
    "tags were not present in the Trainerize export and still need adding before this is " +
    "client-facing. No home-version substitutes were provided — studio content cloned as a " +
    "placeholder pending review.";
  const summary = "Full Body A/B split, 6-week block, 2 sessions/week (migrated from Trainerize).";

  // Build all 12 sessions: week 1..6, each week session A then B.
  const resolvedA = resolveSameCells(WORKOUT_A);
  const resolvedB = resolveSameCells(WORKOUT_B);
  const sessionRows = [];
  let sessionNumber = 0;
  for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
    const week = weekIndex + 1;
    const phase = WEEK_PHASES[weekIndex];
    for (const [archetype, rows, label, cooldownNote] of [
      ["A", resolvedA, "Full Body A", WORKOUT_A_COOLDOWN_NOTE],
      ["B", resolvedB, "Full Body B", WORKOUT_B_COOLDOWN_NOTE],
    ]) {
      sessionNumber++;
      const sn = sessionNumber; // capture by value — closures below must not read the shared loop counter
      const mainBlock = buildMainBlock(rows, weekIndex);
      sessionRows.push({
        sessionNumber: sn,
        archetype,
        week,
        phase,
        data: (bId) =>
          buildSessionData({
            clientId,
            blockId: bId,
            sessionNumber: sn,
            week,
            phase,
            archetype,
            workoutLabel: label,
            mainBlock,
            cooldownNote,
          }),
      });
    }
  }

  console.log("\n--- session sequence ---");
  console.table(sessionRows.map((s) => ({ session_number: s.sessionNumber, week: s.week, phase: s.phase, archetype: s.archetype })));

  if (DRY_RUN) {
    console.log("\n--- DRY RUN: block ---");
    console.log(JSON.stringify({ client_id: clientId, block_number: 1, status: "draft", block_note: blockNote, summary }, null, 2));
    console.log(`\n--- DRY RUN: ${sessionRows.length} sessions (showing session 1 and 12 as samples) ---`);
    console.log(JSON.stringify({ session_number: 1, archetype: sessionRows[0].archetype, week: sessionRows[0].week, phase: sessionRows[0].phase, data: sessionRows[0].data(blockId) }, null, 2));
    console.log(JSON.stringify({ session_number: 12, archetype: sessionRows[11].archetype, week: sessionRows[11].week, phase: sessionRows[11].phase, data: sessionRows[11].data(blockId) }, null, 2));
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: inserted } = await client.query(
      `INSERT INTO blocks (client_id, block_number, status, block_note, summary)
       VALUES ($1, 1, 'draft', $2, $3)
       RETURNING id`,
      [clientId, blockNote, summary]
    );
    const newBlockId = inserted[0].id;

    for (const s of sessionRows) {
      const data = s.data(newBlockId);
      await client.query(
        `INSERT INTO sessions (block_id, session_number, archetype, week, phase, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newBlockId, s.sessionNumber, s.archetype, s.week, s.phase, JSON.stringify(data)]
      );
    }

    await client.query("COMMIT");
    console.log(`\nInserted block ${newBlockId} with ${sessionRows.length} sessions for ${CLIENT_NAME}.`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
