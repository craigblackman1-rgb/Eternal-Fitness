// CR-EF-092: Bulk-convert every existing workout (past + present, across all
// clients/blocks) into reusable workout_templates.
//
// Sessions store workouts as JSONB in data.versions.{studio|home} with the
// shape {warm_up, main_block, cooldown}. workout_templates stores the same
// shape directly (no versions wrapper). This script extracts one version per
// session, derives facet columns via the exercises table, and inserts into
// workout_templates with dedup by structural hash.
//
// Dedup: sessions with identical exercise-name sets (order-independent,
// normalized) collapse into ONE shared template. Existing templates are
// checked before insert. Safe to re-run (idempotent).
//
// Usage:
//   node scripts/bulk-convert-workouts-to-templates.mjs --dry-run
//   node scripts/bulk-convert-workouts-to-templates.mjs

import fs from "fs";
import crypto from "crypto";
import { Pool } from "pg";

const DRY_RUN = process.argv.includes("--dry-run");

// --- Connection ---
const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}
const pool = new Pool({ connectionString: match[1].trim() });

// --- Helpers ---

function structuralHash(exercises) {
  const names = exercises
    .map((e) => (e.exercise_name || "").toLowerCase().trim())
    .filter(Boolean)
    .sort();
  return crypto.createHash("sha256").update(names.join("|")).digest("hex").slice(0, 16);
}

function extractWorkoutData(sessionData) {
  const versions = sessionData?.versions;
  if (!versions) return null;
  // Prefer studio (primary), fall back to home
  const version = versions.studio || versions.home;
  if (!version || typeof version !== "object") return null;
  const warmUp = Array.isArray(version.warm_up) ? version.warm_up : [];
  const mainBlock = Array.isArray(version.main_block) ? version.main_block : [];
  const cooldown = Array.isArray(version.cooldown) ? version.cooldown : [];
  if (warmUp.length + mainBlock.length + cooldown.length === 0) return null;
  return { warm_up: warmUp, main_block: mainBlock, cooldown: cooldown };
}

function collectExerciseNames(data) {
  const all = [...(data.warm_up || []), ...(data.main_block || []), ...(data.cooldown || [])];
  return [...new Set(all.map((e) => e.exercise_name).filter(Boolean))];
}

function deriveFacets(exercises, exerciseRows) {
  const lookup = new Map();
  for (const row of exerciseRows) lookup.set(row.name.toLowerCase(), row);

  const archetypes = new Set();
  const movementType = new Set();
  const muscleGroups = new Set();
  const equipment = new Set();
  const position = new Set();
  let maxDifficulty = null;

  for (const ex of exercises) {
    if (!ex.exercise_name) continue;
    const matched = lookup.get(ex.exercise_name.toLowerCase());
    if (!matched) continue;
    for (const a of matched.archetypes || []) archetypes.add(a);
    if (matched.movement_type) movementType.add(matched.movement_type);
    for (const m of matched.muscle_groups || []) muscleGroups.add(m);
    for (const e of matched.equipment || []) equipment.add(e);
    if (matched.position) position.add(matched.position);
    if (matched.difficulty != null) {
      if (maxDifficulty === null || matched.difficulty > maxDifficulty) maxDifficulty = matched.difficulty;
    }
  }

  return {
    archetypes: [...archetypes].sort(),
    movement_type: [...movementType].sort(),
    muscle_groups: [...muscleGroups].sort(),
    equipment: [...equipment].sort(),
    position: [...position].sort(
      (a, b) => ["seated", "supported", "standing"].indexOf(a) - ["seated", "supported", "standing"].indexOf(b),
    ),
    difficulty: maxDifficulty,
  };
}

function generateTemplateName(facets, existingNames) {
  const mt = facets.movement_type[0] || "";
  const mg = facets.muscle_groups.slice(0, 2);
  const arch = facets.archetypes[0] || "";

  let base;
  if (mt && mg.length > 0) {
    const muscleStr = mg.length === 1 ? mg[0] : `${mg[0]} & ${mg[1]}`;
    base = `${mt} — ${muscleStr}`;
  } else if (mt && arch) {
    base = `${mt} ${arch}`;
  } else if (mg.length > 0) {
    base = `Workout — ${mg.join(", ")}`;
  } else if (arch) {
    base = `${arch} Workout`;
  } else {
    base = "Workout Template";
  }

  let name = base;
  let suffix = 2;
  while (existingNames.has(name)) {
    name = `${base} ${suffix}`;
    suffix++;
  }
  existingNames.add(name);
  return name;
}

async function getExistingTemplateStructures() {
  const { rows } = await pool.query("SELECT id, data FROM workout_templates");
  const map = new Map();
  for (const row of rows) {
    const d = row.data || {};
    const all = [...(d.warm_up || []), ...(d.main_block || []), ...(d.cooldown || [])];
    const names = all
      .map((e) => (e.exercise_name || "").toLowerCase().trim())
      .filter(Boolean)
      .sort();
    const hash = crypto.createHash("sha256").update(names.join("|")).digest("hex").slice(0, 16);
    map.set(hash, row.id);
  }
  return map;
}

// --- Main ---

async function main() {
  console.log(`Bulk convert workouts → templates${DRY_RUN ? " (DRY RUN)" : ""}\n`);

  // 1. Fetch all sessions with data
  const { rows: sessions } = await pool.query(`
    SELECT s.id AS session_id, s.data, s.block_id,
           b.client_id
    FROM sessions s
    LEFT JOIN blocks b ON b.id = s.block_id
    WHERE s.data ? 'versions'
    ORDER BY s.id
  `);
  console.log(`Sessions with 'versions' key: ${sessions.length}`);

  // 2. Extract workout data, skip empty scaffolds
  const processed = [];
  let emptySkipped = 0;
  for (const session of sessions) {
    const wd = extractWorkoutData(session.data);
    if (!wd) { emptySkipped++; continue; }
    const exNames = collectExerciseNames(wd);
    if (exNames.length === 0) { emptySkipped++; continue; }
    const allExercises = [...wd.warm_up, ...wd.main_block, ...wd.cooldown];
    processed.push({
      sessionId: session.session_id,
      clientId: session.client_id,
      data: wd,
      exerciseNames: exNames,
      hash: structuralHash(allExercises),
    });
  }
  console.log(`Sessions with real exercises: ${processed.length}`);
  console.log(`Empty scaffolds skipped: ${emptySkipped}\n`);

  // 3. Group by structural hash
  const byHash = new Map();
  for (const p of processed) {
    if (!byHash.has(p.hash)) byHash.set(p.hash, []);
    byHash.get(p.hash).push(p);
  }
  console.log(`Unique structural hashes: ${byHash.size}`);

  // 4. Build exercise lookup from DB
  const allNames = [...new Set(processed.flatMap((p) => p.exerciseNames))];
  const { rows: exerciseRows } = await pool.query(
    `SELECT name, archetypes, movement_type, muscle_groups, equipment, difficulty, position
     FROM exercises WHERE active = true AND name = ANY($1)`,
    [allNames],
  );
  const exLookup = new Map(exerciseRows.map((r) => [r.name.toLowerCase(), r]));
  console.log(`Exercise DB rows matched: ${exerciseRows.length} / ${allNames.length} unique names\n`);

  // 5. Check existing templates for structural overlap
  const existingStructures = await getExistingTemplateStructures();
  const { rows: existingTplRows } = await pool.query("SELECT name FROM workout_templates");
  const existingNames = new Set(existingTplRows.map((r) => r.name));

  let structOverlapSkipped = 0;
  const toInsert = [];
  for (const [hash, group] of byHash) {
    if (existingStructures.has(hash)) {
      structOverlapSkipped++;
      continue;
    }

    // Pick representative session (earliest created)
    const representative = group[0];
    const exercises = [
      ...representative.data.warm_up,
      ...representative.data.main_block,
      ...representative.data.cooldown,
    ];
    const matchedRows = [...new Set(exercises.map((e) => e.exercise_name).filter(Boolean))]
      .map((n) => exLookup.get(n.toLowerCase()))
      .filter(Boolean);

    const facets = deriveFacets(exercises, matchedRows);
    const name = generateTemplateName(facets, existingNames);

    toInsert.push({
      name,
      data: representative.data,
      facets,
      sourceClientId: representative.clientId,
      sourceSessionId: representative.sessionId,
      sessionCount: group.length,
      exerciseCount: exercises.length,
    });
  }

  console.log(`Structures already covered by existing templates: ${structOverlapSkipped}`);
  console.log(`New templates to create: ${toInsert.length}\n`);

  // 6. Report
  for (const t of toInsert) {
    console.log(`  + "${t.name}"`);
    console.log(`    sessions: ${t.sessionCount}, exercises: ${t.exerciseCount}, difficulty: ${t.facets.difficulty ?? "null"}`);
    console.log(`    movement: [${t.facets.movement_type.join(", ")}]`);
    console.log(`    muscles:  [${t.facets.muscle_groups.join(", ")}]`);
    console.log(`    archetypes: [${t.facets.archetypes.join(", ")}]`);
    console.log(`    source_session: ${t.sourceSessionId}`);
    console.log();
  }

  if (DRY_RUN) {
    console.log("=== DRY RUN — no rows inserted ===");
    await pool.end();
    return;
  }

  // 7. Insert
  let created = 0;
  const createdNames = [];
  for (const t of toInsert) {
    await pool.query(
      `INSERT INTO workout_templates
         (name, data, archetypes, movement_type, muscle_groups, equipment,
          difficulty, position, condition_tags, source_client_id, source_session_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        t.name,
        JSON.stringify(t.data),
        t.facets.archetypes,
        t.facets.movement_type,
        t.facets.muscle_groups,
        t.facets.equipment,
        t.facets.difficulty,
        t.facets.position,
        [],
        t.sourceClientId,
        t.sourceSessionId,
      ],
    );
    created++;
    createdNames.push(t.name);
    console.log(`  inserted: "${t.name}" (session ${t.sourceSessionId})`);
  }

  await pool.end();
  console.log(`\nDone — ${created} templates created.`);
  console.log("Names:", createdNames.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
