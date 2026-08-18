#!/usr/bin/env node
// One-off: build Nathan Wadey's (client 20) Block 1 — the 12-week A/B full-body
// plan Craig supplied 2026-08-18 — as a draft block with 12 sessions.
//
// Shape of the supplied plan, and how it maps onto the block model:
//   * 12 consecutive weeks, 1 session/week (matches his profile: 12-week
//     package, sessions_per_week 1) -> 12 session rows, week = calendar week.
//     Needs the widened sessions_week_check (20260818_sessions_week_range.sql).
//   * Workouts alternate A/B every week -> archetype A on odd weeks, B on even.
//   * Weeks pair into 6 "repeats"; each repeat carries the sets/reps/rest/RPE
//     progression. Repeats 1-4 = the plan's Phase 1, repeats 5-6 = Phase 2.
//   * Phase 2 swaps one lift per workout: A's Goblet Squat -> Barbell Back
//     Squat, B's Landmine Press -> Barbell Overhead Press.
//   * The plank in the activation block changes every week (12 distinct
//     variations), so it is prescribed per session rather than per repeat.
//
// Exercise names are the exact exercise-library names wherever one exists, so
// videos/media resolve. Two plank variations have no library row
// ("Long-Lever Plank", "Weighted Plank") and are flagged in the block note.
//
// Usage:
//   node scripts/create-nathan-block1.mjs --dry-run
//   node scripts/create-nathan-block1.mjs

import { Pool } from "pg";
import { randomUUID } from "crypto";

const DRY_RUN = process.argv.includes("--dry-run");
const CLIENT_NUMBER = 20; // Nathan Wadey

const BLOCK_NOTE = `Draft block built from the 12-week A/B full-body plan Craig supplied 2026-08-18. 12 sessions, one per week, Workout A on odd weeks and Workout B on even weeks.

Structure: warm-up (~8 min) -> core & glute activation -> five movement patterns as two supersets plus a straight-set vertical press -> arm finisher -> cool-down (~8-10 min). Every session covers all five patterns; A and B use different exercises for the same patterns.

Progression: the 12 weeks pair into 6 repeats. Repeats 1-4 (weeks 1-8) are the plan's Phase 1 — 3x10-12 at RPE 5-6 building to 4x8-10 at RPE 7-8. Repeats 5-6 (weeks 9-12) are Phase 2 — 4x8-10 at RPE 8 then 4x6-8 at RPE 8-9, with two exercise upgrades: Goblet Squat -> Barbell Back Squat in A, Landmine Single-Arm Press -> Barbell Overhead Press in B. The plank changes variation every week rather than just holding longer.

Needs Esther's review before this becomes client-facing:
- Starting loads are not specified anywhere in the supplied plan — every main lift says "light-moderate, establish technique" for repeat 1 and then +5-10% per repeat. Set the week 1 working weights with Nathan in the first session.
- Plank sets/hold times are not specified in the supplied plan either (it prescribes the variation and the focus, not the dosage). The times/reps entered here are a reasonable starting dose to be adjusted on the day; week 1 and week 12 are deliberately a max hold to compare against the 1:02 recorded on 11 Aug.
- "Long-Lever Plank" (week 8) and "Weighted Plank" (week 10) are not in the exercise library, so those two have no video attached.
- Week 12 is the reassessment point: repeat the full 11 August 2026 test battery (seated DB press, knee push-ups, sit-to-stand, plank, sit-and-reach, Apley scratch test, balance) alongside the session.
- If Nathan reports hip or knee discomfort at any point, hold or regress that exercise rather than progressing on schedule.`;

/** Per-repeat progression. `weeks` are the calendar weeks the repeat covers. */
const REPEATS = [
  {
    repeat: 1, weeks: [1, 2], phase: "foundation", focus: "Technique",
    sets: 3, reps: "10-12", rest: "60 sec", rpe: "5-6",
    load: "Light-moderate — establish technique before load.",
    glute: { name: "Glute Bridge", sets: 2, reps: "15", band: "Bodyweight — no band this repeat.", equipment: ["Mats"] },
    arm: { sets: 2, reps: "12", note: "Light." },
  },
  {
    repeat: 2, weeks: [3, 4], phase: "build", focus: "Build intensity",
    sets: 3, reps: "10-12", rest: "60 sec", rpe: "6-7",
    load: "Same as repeat 1 or a slight increase.",
    glute: { name: "Mini Band Glute Bridge", sets: 2, reps: "15", band: "Light band.", equipment: ["Booty bands", "Mats"] },
    arm: { sets: 2, reps: "12", note: "" },
  },
  {
    repeat: 3, weeks: [5, 6], phase: "develop", focus: "Add load",
    sets: 3, reps: "8-10", rest: "45-60 sec", rpe: "7",
    load: "+5-10% on repeat 2.",
    glute: { name: "Mini Band Glute Bridge", sets: 3, reps: "12", band: "Medium band.", equipment: ["Booty bands", "Mats"] },
    arm: { sets: 3, reps: "10", note: "" },
  },
  {
    repeat: 4, weeks: [7, 8], phase: "develop", focus: "Add load + tempo",
    sets: 4, reps: "8-10", rest: "45 sec", rpe: "7-8",
    load: "+5-10% on repeat 3.",
    glute: { name: "Mini Band Glute Bridge", sets: 3, reps: "12", band: "Medium band, 2 sec pause at the top.", equipment: ["Booty bands", "Mats"] },
    arm: { sets: 3, reps: "10", note: "Slightly heavier." },
  },
  {
    repeat: 5, weeks: [9, 10], phase: "peak", focus: "Add load (Phase 2)",
    sets: 4, reps: "8-10", rest: "45 sec", rpe: "8",
    load: "+5-10% on repeat 4.",
    glute: { name: "Mini Band Glute Bridge", sets: 3, reps: "12", band: "Heavier band.", equipment: ["Booty bands", "Mats"] },
    arm: { sets: 3, reps: "10", note: "" },
  },
  {
    repeat: 6, weeks: [11, 12], phase: "peak", focus: "Peak intensity (Phase 2)",
    sets: 4, reps: "6-8", rest: "30-45 sec", rpe: "8-9",
    load: "+5-10% on repeat 5.",
    glute: { name: "Mini Band Glute Bridge", sets: 3, reps: "12", band: "Heavier band, slower tempo.", equipment: ["Booty bands", "Mats"] },
    arm: { sets: 3, reps: "10", note: "Heavier." },
  },
];

/** One plank variation per calendar week — the plan changes the challenge each
 *  week rather than just extending the hold. Keyed by week number. */
const PLANK_BY_WEEK = {
  1: { name: "Plank", sets: 2, reps: "max hold", time: true, focus: "Baseline — matches his 11 Aug assessment (1:02).", equipment: ["Mats"] },
  2: { name: "Plank with shoulder taps", sets: 2, reps: "10-12 taps/side", focus: "Anti-rotation, shoulder stability.", equipment: ["Mats"] },
  3: { name: "Side Plank", sets: 2, reps: "30-45 sec each side", time: true, focus: "Obliques, lateral chain.", equipment: ["Mats"] },
  4: { name: "Plank Alternating Arm & Leg Lift", sets: 2, reps: "8-10/side", focus: "Bird-dog plank — anti-rotation plus hip control.", equipment: ["Mats"] },
  5: { name: "Plank with Alternating Reach Through", sets: 2, reps: "10-12/side", focus: "Reach-through (thread the needle) — rotational control.", equipment: ["Mats"] },
  6: { name: "Stability Ball Plank", sets: 2, reps: "30-45 sec hold", time: true, focus: "Forearms on the ball — anti-extension with added instability.", equipment: ["Swiss exercise balls", "Mats"] },
  7: { name: "Forearm plank to push up", sets: 2, reps: "8-10 up-downs", focus: "Plank up-down, forearm to hand — dynamic strength-endurance.", equipment: ["Mats"] },
  8: { name: "Long-Lever Plank", sets: 2, reps: "20-30 sec hold", time: true, focus: "Hands extended forward — increased anti-extension demand. Not in the exercise library, so no video attached.", equipment: ["Mats"] },
  9: { name: "Stability Ball Stir The Pot", sets: 2, reps: "8-10 circles each direction", focus: "Stir-the-pot — dynamic core control, Phase 2.", equipment: ["Swiss exercise balls", "Mats"] },
  10: { name: "Weighted Plank", sets: 2, reps: "30-45 sec hold", time: true, focus: "Light plate on the upper back — loaded anti-extension, Phase 2. Not in the exercise library, so no video attached.", equipment: ["Weight plates", "Mats"] },
  11: { name: "Walkouts", sets: 2, reps: "8-10", focus: "Plank walkout from standing — dynamic strength through range, Phase 2.", equipment: ["Mats"] },
  12: { name: "Plank", sets: 1, reps: "max hold — retest", time: true, focus: "Direct comparison to the 1:02 recorded on 11 Aug, as part of the week 12 reassessment.", equipment: ["Mats"] },
};

// Warm-up and cool-down are plain sequences in the supplied plan, not paired
// work — and the log screen prefixes every group_label with "SUPERSET", so
// labelling them would mislabel the prescription. Only genuinely paired blocks
// carry a group_label.
const WARM_UP_LABEL = undefined;
const COOLDOWN_LABEL = undefined;
const ACTIVATION_LABEL = "Core & Glute Activation";
const ARM_LABEL = "Arm Finisher (~6 min)";

function ex(o) {
  return {
    uid: randomUUID(),
    exercise_name: o.name,
    sets: o.sets,
    reps: o.reps,
    tempo: o.tempo ?? "-",
    rest: o.rest ?? "-",
    coaching_cue: o.cue ?? "",
    modification: o.mod ?? "",
    equipment: o.equipment ?? [],
    // A group of one is dissolved by computeGroups/normalizeGroups, so the
    // straight-set vertical press deliberately carries no group_label.
    ...(o.group ? { group_label: o.group } : {}),
    log_type: o.time ? "time" : "reps",
  };
}

/** Identical every session (~8 min). */
function buildWarmUp() {
  return [
    ex({ name: "Marching On The Spot", sets: 1, reps: "2-3 min", time: true, group: WARM_UP_LABEL,
      cue: "Easy pace, gentle pulse raise — keep it conversational, mind his smoking history.",
      mod: "Step-ups onto a low box instead if he prefers." }),
    ex({ name: "Cat-Cow", sets: 1, reps: "8", group: WARM_UP_LABEL, equipment: ["Mats"] }),
    ex({ name: "Side Lying Thoracic Rotation", sets: 1, reps: "8/side", group: WARM_UP_LABEL, equipment: ["Mats"],
      cue: "Open-book rotation — follow the top hand with the eyes." }),
    ex({ name: "Band Pull-Apart", sets: 1, reps: "15", group: WARM_UP_LABEL, equipment: ["Resistance bands"],
      cue: "Light resistance band." }),
    ex({ name: "World's Greatest Stretch", sets: 1, reps: "5/side", group: WARM_UP_LABEL, equipment: ["Mats"],
      mod: "Hip flexor / hamstring dynamic reach if the full position isn't comfortable." }),
    ex({ name: "Body Weight Squat", sets: 1, reps: "8", group: WARM_UP_LABEL, cue: "Controlled tempo." }),
  ];
}

/** Identical every session (~8-10 min). */
function buildCooldown() {
  return [
    ex({ name: "Standing Hamstring Stretch", sets: 1, reps: "30 sec/side", time: true, group: COOLDOWN_LABEL,
      equipment: ["Resistance bands"], cue: "Extra time on the right side.",
      mod: "Seated hamstring reach as an alternative." }),
    ex({ name: "Doorway chest stretch", sets: 1, reps: "30 sec/side", time: true, group: COOLDOWN_LABEL,
      mod: "Band-assisted shoulder stretch as an alternative." }),
    ex({ name: "Static Hip Flexor Stretch", sets: 1, reps: "30 sec/side", time: true, group: COOLDOWN_LABEL,
      equipment: ["Mats"], cue: "Kneeling. Left side priority." }),
    ex({ name: "Diaphragmatic Breathing", sets: 1, reps: "2 min", time: true, group: COOLDOWN_LABEL,
      equipment: ["Mats"], cue: "Box breathing — bring the heart rate down." }),
  ];
}

/** Glute bridge (per repeat) + the week's plank variation. */
function buildActivation(r, week) {
  const plank = PLANK_BY_WEEK[week];
  return [
    ex({ name: r.glute.name, sets: r.glute.sets, reps: r.glute.reps, rest: "-", group: ACTIVATION_LABEL,
      equipment: r.glute.equipment,
      cue: `Direct glute activation — builds strength and stability around the hips before loading. ${r.glute.band}` }),
    ex({ name: plank.name, sets: plank.sets, reps: plank.reps, time: plank.time, rest: "-", group: ACTIVATION_LABEL,
      equipment: plank.equipment,
      cue: `Week ${week} plank variation. ${plank.focus} Hold time / reps here are a starting dose — adjust on the day.` }),
  ];
}

function buildArmFinisher(r, archetype) {
  const { sets, reps, note } = r.arm;
  const suffix = note ? ` ${note}` : "";
  if (archetype === "A") {
    return [
      ex({ name: "Dumbbell Bicep Curl", sets, reps, rest: "-", group: ARM_LABEL, equipment: ["Dumbbells"],
        cue: `Direct arm work. Superset with the pushdown — alternate sets to keep time on track.${suffix}` }),
      ex({ name: "Cable Rope Tricep Extension", sets, reps, rest: "-", group: ARM_LABEL, equipment: ["Cable machine"],
        cue: `Direct arm work — triceps pushdown on the high cable.${suffix}`, mod: "Rope attachment." }),
    ];
  }
  return [
    ex({ name: "Dumbbell Hammer Curl", sets, reps, rest: "-", group: ARM_LABEL, equipment: ["Dumbbells"],
      cue: `Different angle from the bicep curl — targets brachialis/forearm. Superset with the overhead extension.${suffix}` }),
    ex({ name: "Dumbbell Seated Overhead Tricep Extension", sets, reps, rest: "-", group: ARM_LABEL,
      equipment: ["Bench", "Dumbbells"],
      cue: `Direct arm work, different angle from A's pushdown.${suffix}`,
      mod: "High cable + rope as an alternative." }),
  ];
}

/** Workout A main strength — lower push, lower pull, upper push (horizontal),
 *  upper pull, upper press (vertical). */
function buildMainA(r) {
  const { sets, reps, rest, rpe, load } = r;
  const phase2 = r.repeat >= 5;
  const squat = phase2
    ? ex({ name: "Barbell Back Squat", sets, reps, rest, group: "Superset 1",
        equipment: ["Olympic bar", "Weight plates", "Squat rack"],
        cue: `Lower push. RPE ${rpe}. ${load} Phase 2 upgrade from the goblet squat — mechanics have been solid since day 1 and through repeats 1-4, so he's ready for a barbell load off the rack.` })
    : ex({ name: "Goblet Squat", sets, reps, rest, group: "Superset 1", equipment: ["Kettlebells", "Dumbbells"],
        cue: `Lower push. RPE ${rpe}. ${load} Solid mechanics on assessment — no need to regress depth or use a box.`,
        mod: "KB or DB, whichever sits better in the hands." });

  return [
    squat,
    ex({ name: "Barbell Hip Thrust", sets, reps, rest, group: "Superset 1",
      equipment: ["Hip thrust bench", "Olympic bar", "Weight plates"],
      cue: `Lower pull, glute-focused — builds on the glute bridge activation work. RPE ${rpe}. ${load}`,
      mod: "Dumbbell across the hips if the barbell setup is in use." }),
    ex({ name: "Incline Push Up", sets, reps, rest, group: "Superset 2", equipment: ["Bench"],
      cue: `Upper push, horizontal — hands on the bench. Progression from the knee push-ups tested on assessment. Aim for the top of the rep range; if he can't reach it, raise the hands.`,
      mod: "Regress the angle (hands higher) if needed." }),
    ex({ name: "Cable Seated Row", sets, reps, rest, group: "Superset 2", equipment: ["Cable machine"],
      cue: `Upper pull. Squeeze the shoulder blades, avoid shrugging. RPE ${rpe}. ${load}`,
      mod: "Neutral-grip handle." }),
    ex({ name: "Dumbbell Seated Shoulder Press", sets, reps, rest, group: undefined,
      equipment: ["Bench", "Dumbbells"],
      cue: `Upper press, vertical — straight sets, not supersetted. Mirrors his day-1 assessment (14 reps @ 2x6kg in 30 sec), so it's the movement to track against baseline. RPE ${rpe}. ${load}` }),
  ];
}

/** Workout B main strength — same five patterns, different exercises. */
function buildMainB(r) {
  const { sets, reps, rest, rpe, load } = r;
  const phase2 = r.repeat >= 5;
  const press = phase2
    ? ex({ name: "Barbell Overhead Press", sets, reps, rest, group: undefined,
        equipment: ["Olympic bar", "Weight plates"],
        cue: `Upper press, vertical — standing, straight sets. Phase 2 upgrade from the landmine press; shoulders have shown good mobility and capacity throughout. RPE ${rpe}. ${load}`,
        mod: "Standing DB overhead press as an alternative." })
    : ex({ name: "Landmine Single-Arm Press", sets, reps: `${reps}/side`, rest, group: undefined,
        equipment: ["Landmine", "Olympic bar"],
        cue: `Upper press, vertical — straight sets. Different feel from A's seated DB press; shoulders have the mobility for it. RPE ${rpe}. ${load}` });

  return [
    ex({ name: "Dumbbell Step Up", sets, reps: `${reps}/side`, rest, group: "Superset 1",
      equipment: ["Wooden boxes", "Dumbbells"],
      cue: `Lower push, unilateral. Movement quality is solid — no special knee caution, just good control. Supplied baseline was 3 x 8/side; per-side reps follow the block progression from there. RPE ${rpe}. ${load}`,
      mod: "Bodyweight if load isn't needed. Choose a comfortable box height." }),
    ex({ name: "Trap Bar Deadlift", sets, reps, rest, group: "Superset 1",
      equipment: ["Trap bar", "Weight plates"],
      cue: `Lower pull. Trap bar suits his limited hamstring flexibility. RPE ${rpe}. ${load}`,
      mod: "Elevate on plates if ROM is restricted." }),
    ex({ name: "Dumbbell Bench Press", sets, reps, rest, group: "Superset 2", equipment: ["Bench", "Dumbbells"],
      cue: `Upper push, horizontal — flat bench. Different angle and loading from A's incline push-up. RPE ${rpe}. ${load}` }),
    ex({ name: "Wide Grip Lat Pulldown", sets, reps, rest, group: "Superset 2", equipment: ["Cable machine"],
      cue: `Upper pull. Standard wide grip — shoulder mobility is good, no need to restrict the grip. RPE ${rpe}. ${load}` }),
    press,
  ];
}

function buildSession(clientId, blockId, week) {
  const r = REPEATS.find((x) => x.weeks.includes(week));
  const archetype = week % 2 === 1 ? "A" : "B";
  const studio = {
    warm_up: buildWarmUp(),
    main_block: [
      ...buildActivation(r, week),
      ...(archetype === "A" ? buildMainA(r) : buildMainB(r)),
      ...buildArmFinisher(r, archetype),
    ],
    cooldown: buildCooldown(),
  };
  const plank = PLANK_BY_WEEK[week];
  const isReassessment = week === 12;

  const coachingNotes = [
    `Week ${week} of 12 · Workout ${archetype} · repeat ${r.repeat} (weeks ${r.weeks.join("-")}) · ${r.repeat >= 5 ? "Phase 2" : "Phase 1"}.`,
    `Repeat focus: ${r.focus}. Main lifts ${r.sets} x ${r.reps} at RPE ${r.rpe}, ${r.rest} rest within each superset pair. Load: ${r.load}`,
    `Plank this week: ${plank.name} — ${plank.focus}`,
    `Starting loads were not specified in the supplied plan; set the week 1 working weights with Nathan and progress +5-10% per repeat from there.`,
    isReassessment
      ? `Week 12 — repeat the full 11 August 2026 test battery (seated DB press, knee push-ups, sit-to-stand, plank, sit-and-reach, Apley scratch test, balance) to measure progress against baseline and plan the next block.`
      : `If Nathan reports hip or knee discomfort, hold or regress that exercise rather than progressing on schedule.`,
  ].join("\n\n");

  return {
    week,
    archetype,
    phase: r.phase,
    session_number: week,
    data: {
      session_id: randomUUID(),
      block_id: blockId,
      client_id: clientId,
      session_number: week,
      archetype,
      week,
      phase: r.phase,
      focus_label: `Workout ${archetype} — Full Body (Repeat ${r.repeat})`,
      time_tier: "standard",
      versions: {
        studio,
        // Studio-only client (delivery_mode studio_1to1) — the home version is
        // never surfaced to him, so it mirrors studio rather than being a
        // separate home-equipment prescription.
        home: JSON.parse(JSON.stringify(studio)),
      },
      coaching_notes: coachingNotes,
      client_intro: "",
    },
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

  const { rows: clients } = await pool.query(
    `SELECT id, name FROM clients WHERE client_number = $1`,
    [CLIENT_NUMBER]
  );
  if (clients.length !== 1) {
    console.error(`Expected exactly 1 client with client_number ${CLIENT_NUMBER}, found ${clients.length}.`);
    process.exit(1);
  }
  const client = clients[0];

  const { rows: existing } = await pool.query(
    `SELECT block_number FROM blocks WHERE client_id = $1 ORDER BY block_number DESC LIMIT 1`,
    [client.id]
  );
  const blockNumber = (existing[0]?.block_number ?? 0) + 1;

  const blockId = randomUUID();
  const sessions = Array.from({ length: 12 }, (_, i) => buildSession(client.id, blockId, i + 1));

  console.log(`${client.name} (client ${CLIENT_NUMBER}) — Block ${blockNumber}, ${sessions.length} sessions`);
  for (const s of sessions) {
    const v = s.data.versions.studio;
    console.log(
      `  wk ${String(s.week).padStart(2)} · ${s.archetype} · ${s.phase.padEnd(10)} · ` +
      `${v.warm_up.length} warm-up / ${v.main_block.length} main / ${v.cooldown.length} cooldown · ` +
      `plank: ${PLANK_BY_WEEK[s.week].name}`
    );
  }

  if (DRY_RUN) {
    console.log("\n--- dry run: session 1 main block ---");
    console.log(JSON.stringify(sessions[0].data.versions.studio.main_block, null, 2));
    console.log("\n--- dry run: session 1 coaching notes ---\n" + sessions[0].data.coaching_notes);
    console.log("\n--- dry run: block note ---\n" + BLOCK_NOTE);
    console.log("\nNothing written.");
    await pool.end();
    return;
  }

  const conn = await pool.connect();
  try {
    await conn.query("BEGIN");
    await conn.query(
      `INSERT INTO blocks (id, client_id, block_number, status, block_note) VALUES ($1, $2, $3, 'draft', $4)`,
      [blockId, client.id, blockNumber, BLOCK_NOTE]
    );
    for (const s of sessions) {
      await conn.query(
        `INSERT INTO sessions (block_id, session_number, archetype, week, phase, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [blockId, s.session_number, s.archetype, s.week, s.phase, JSON.stringify(s.data)]
      );
    }
    await conn.query("COMMIT");
    console.log(`\nInserted block ${blockId} (Block ${blockNumber}) with ${sessions.length} sessions.`);
  } catch (err) {
    await conn.query("ROLLBACK");
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
