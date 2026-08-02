#!/usr/bin/env node
// Promotes each client's currently-in-progress Trainerize block (start_date <=
// today <= end_date) into a real live `blocks`/`sessions` row in the hub's own
// schema, so the Training tab isn't empty for clients who've only ever had
// Trainerize data imported into the archive tables.
//
// Follows the precedent set by scripts/import-trainerize-migration-tom.mjs:
// status='draft' (hub-only, NOT client-portal-visible -- see lib/portal-data.ts
// .in("status", ["active","approved"])), block_note documents provenance and
// gaps honestly, refuses to touch a client that already has a live block.
//
// Trainerize doesn't have the hub's week/archetype/phase progression model --
// its "workout definitions" are static templates reused across the block, not
// per-week variations. Each distinct workout becomes one session (archetype
// cycled A/B/C by workout_index, week=1, phase='build') rather than guessing
// a progression that was never in the source data.
//
// Usage:
//   node scripts/promote-active-trainerize-blocks.mjs --dry-run
//   node scripts/promote-active-trainerize-blocks.mjs [--client-id <uuid>]

import { Pool } from "pg";

const DRY_RUN = process.argv.includes("--dry-run");
const CLIENT_ID_ARG = process.argv.indexOf("--client-id");
const ONLY_CLIENT_ID = CLIENT_ID_ARG !== -1 ? process.argv[CLIENT_ID_ARG + 1] : null;
const ARCHETYPES = ["A", "B", "C"];

function formatRest(seconds) {
  return seconds && seconds > 0 ? `${seconds}s` : "-";
}

function groupLabel(supersetType, supersetId) {
  if (!supersetType || !supersetId) return undefined;
  const label = supersetType === "circuit" ? "Circuit" : "Superset";
  return `${label} ${supersetId}`;
}

function buildExercise(ex) {
  const raw = ex.raw_data || {};
  return {
    exercise_name: ex.exercise_name || "Unknown exercise",
    sets: ex.sets || 1,
    reps: (ex.target_reps || "").trim() || "-",
    tempo: "-",
    rest: formatRest(ex.rest_time_seconds),
    coaching_cue: "",
    modification: "",
    equipment: [],
    group_label: groupLabel(raw.supersetType, raw.superSetID),
  };
}

// Detects GYM/HOME workout pairs (e.g. "GYM - Workout 2 - Squat & Hinge" /
// "HOME - Workout 2 - Squat & Hinge") and merges them into one session with
// real studio/home versions, instead of two separate sequential sessions --
// this is exactly the hub's own versions.studio/versions.home concept, just
// authored in Trainerize under a naming convention rather than the hub's UI.
// Anything that doesn't pair cleanly stays a standalone studio-only session
// (cloned into home as a placeholder) rather than risk a wrong guess.
function pairGymHomeWorkouts(workoutsWithExercises) {
  // Pair on the "Workout N" number, not the full remaining text -- Trainerize's
  // GYM/HOME naming isn't always word-for-word identical after the prefix
  // (e.g. "GYM - Workout 1 - Landmine & Pull" vs "HOME - Workout 1 - Pull &
  // Hinge" are still the same session's two delivery modes).
  const workoutNumber = (name) => {
    const m = (name || "").match(/workout\s*(\d+)/i);
    return m ? m[1] : null;
  };
  const stripPrefix = (name) => (name || "").replace(/^\s*(GYM|HOME)\s*[-–—]?\s*/i, "").trim().toLowerCase();

  const gymList = workoutsWithExercises.filter((w) => /^\s*GYM\b/i.test(w.workout.workout_name || ""));
  const homeList = workoutsWithExercises.filter((w) => /^\s*HOME\b/i.test(w.workout.workout_name || ""));
  const paired = new Set();
  const merged = [];

  for (const g of gymList) {
    const gNum = workoutNumber(g.workout.workout_name);
    const gKey = stripPrefix(g.workout.workout_name);
    // Prefer an exact match on the remaining text; fall back to matching by
    // workout number alone if there's exactly one home candidate with that
    // number (avoids a wrong pairing when multiple share a number).
    let match = homeList.find((h) => !paired.has(h) && stripPrefix(h.workout.workout_name) === gKey);
    if (!match && gNum) {
      const candidates = homeList.filter((h) => !paired.has(h) && workoutNumber(h.workout.workout_name) === gNum);
      if (candidates.length === 1) match = candidates[0];
    }
    if (match) {
      paired.add(match);
      paired.add(g);
      merged.push({ studio: g, home: match, label: g.workout.workout_name.replace(/^\s*GYM\s*[-–—]?\s*/i, "").trim() });
    }
  }

  const remaining = workoutsWithExercises.filter((w) => !paired.has(w));
  return { merged, remaining };
}

function buildSessionData({ clientId, blockId, sessionNumber, archetype, focusLabel, studioExercises, homeExercises, blockPhaseName, isMergedPair }) {
  return {
    session_id: "",
    block_id: blockId,
    client_id: clientId,
    session_number: sessionNumber,
    archetype,
    week: 1,
    phase: "build",
    focus_label: focusLabel,
    time_tier: "standard",
    versions: {
      studio: { warm_up: [], main_block: studioExercises.map(buildExercise), cooldown: [] },
      home: { warm_up: [], main_block: homeExercises.map(buildExercise), cooldown: [] },
    },
    coaching_notes:
      `Imported from Trainerize block "${blockPhaseName}" (currently in progress). ` +
      "Trainerize doesn't track week-by-week progression the way the hub does -- " +
      "this is the workout template as currently prescribed, not a specific week. " +
      (isMergedPair
        ? "Studio and home versions matched from Trainerize's separate GYM/HOME workout entries. "
        : "No home-version substitute was provided in Trainerize -- studio content cloned as a placeholder. ") +
      "Coaching cues, modifications, and equipment tags were not present in the " +
      "source and still need adding before this is client-facing.",
    client_intro: "",
  };
}

async function main() {
  const cs = process.env.DATABASE_URL;
  if (!cs) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: cs });

  const clientFilter = ONLY_CLIENT_ID ? `AND c.id = '${ONLY_CLIENT_ID}'` : "";
  const { rows: activeBlocks } = await pool.query(`
    SELECT c.id AS client_id, c.name AS client_name, c.client_number,
           b.id AS trainerize_block_id, b.phase_name, b.start_date, b.end_date
    FROM clients c
    JOIN trainerize_training_blocks b ON b.client_id = c.id
    WHERE b.start_date <= CURRENT_DATE AND b.end_date >= CURRENT_DATE
    ${clientFilter}
    ORDER BY c.client_number
  `);

  console.log(`Found ${activeBlocks.length} client(s) with a Trainerize block covering today.\n`);

  for (const row of activeBlocks) {
    const { rows: existing } = await pool.query(
      "SELECT id, block_number, status FROM blocks WHERE client_id = $1",
      [row.client_id],
    );
    if (existing.length > 0) {
      console.log(`SKIP ${row.client_name} — already has ${existing.length} live block(s): ${JSON.stringify(existing)}`);
      continue;
    }

    const { rows: workouts } = await pool.query(
      "SELECT * FROM trainerize_workouts WHERE trainerize_block_id = $1 ORDER BY workout_index",
      [row.trainerize_block_id],
    );
    if (workouts.length === 0) {
      console.log(`SKIP ${row.client_name} — active Trainerize block has no workout definitions captured.`);
      continue;
    }

    const workoutsWithExercises = [];
    for (const w of workouts) {
      const { rows: exercises } = await pool.query(
        "SELECT * FROM trainerize_exercises WHERE trainerize_workout_id = $1 ORDER BY exercise_order",
        [w.id],
      );
      workoutsWithExercises.push({ workout: w, exercises });
    }

    const { merged, remaining } = pairGymHomeWorkouts(workoutsWithExercises);
    const sessionCount = merged.length + remaining.length;

    const blockNote =
      `Promoted from Trainerize's currently-in-progress block "${row.phase_name}" ` +
      `(${row.start_date.toISOString().slice(0, 10)} – ${row.end_date.toISOString().slice(0, 10)}). ` +
      `${sessionCount} session(s) imported${merged.length > 0 ? ` (${merged.length} with matched GYM/HOME studio+home versions)` : ""}. ` +
      "Draft status — review and approve before this becomes client-facing. Week/phase " +
      "progression was not captured from Trainerize (its workouts are static templates, " +
      "not per-week variations).";
    const summary = `${sessionCount} sessions imported from Trainerize block "${row.phase_name}".`;

    console.log(`${row.client_name}: ${sessionCount} sessions from "${row.phase_name}"${merged.length > 0 ? ` (${merged.length} GYM/HOME pairs merged)` : ""}`);

    if (DRY_RUN) {
      let i = 0;
      for (const m of merged) {
        i++;
        console.log(`  [${i}] ${m.label} — studio: ${m.studio.exercises.length} ex, home: ${m.home.exercises.length} ex, archetype ${ARCHETYPES[(i - 1) % 3]} (MERGED PAIR)`);
      }
      for (const w of remaining) {
        i++;
        console.log(`  [${i}] ${w.workout.workout_name} — ${w.exercises.length} exercises, archetype ${ARCHETYPES[(i - 1) % 3]}`);
      }
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows: inserted } = await client.query(
        `INSERT INTO blocks (client_id, block_number, status, block_note, summary)
         VALUES ($1, 1, 'draft', $2, $3)
         RETURNING id`,
        [row.client_id, blockNote, summary],
      );
      const newBlockId = inserted[0].id;

      let sessionNumber = 0;
      for (const m of merged) {
        sessionNumber++;
        const archetype = ARCHETYPES[(sessionNumber - 1) % 3];
        const data = buildSessionData({
          clientId: row.client_id,
          blockId: newBlockId,
          sessionNumber,
          archetype,
          focusLabel: m.label,
          studioExercises: m.studio.exercises,
          homeExercises: m.home.exercises,
          blockPhaseName: row.phase_name,
          isMergedPair: true,
        });
        await client.query(
          `INSERT INTO sessions (block_id, session_number, archetype, week, phase, data)
           VALUES ($1, $2, $3, 1, 'build', $4)`,
          [newBlockId, sessionNumber, archetype, JSON.stringify(data)],
        );
      }
      for (const w of remaining) {
        sessionNumber++;
        const archetype = ARCHETYPES[(sessionNumber - 1) % 3];
        const data = buildSessionData({
          clientId: row.client_id,
          blockId: newBlockId,
          sessionNumber,
          archetype,
          focusLabel: w.workout.workout_name || `Workout ${sessionNumber}`,
          studioExercises: w.exercises,
          homeExercises: w.exercises,
          blockPhaseName: row.phase_name,
          isMergedPair: false,
        });
        await client.query(
          `INSERT INTO sessions (block_id, session_number, archetype, week, phase, data)
           VALUES ($1, $2, $3, 1, 'build', $4)`,
          [newBlockId, sessionNumber, archetype, JSON.stringify(data)],
        );
      }

      await client.query("COMMIT");
      console.log(`  → inserted block ${newBlockId} with ${sessionCount} sessions`);
    } catch (e) {
      await client.query("ROLLBACK");
      console.error(`  FAILED for ${row.client_name}:`, e.message);
    } finally {
      client.release();
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
