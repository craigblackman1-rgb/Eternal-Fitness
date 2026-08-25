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

// The exact 71 session IDs this bulk-conversion script created templates from
// on its first real run (2026-08-25). source_session_id IS NOT NULL is NOT a
// safe way to identify these -- that field is also set by the normal
// single-session "save as template" feature, and using it as a filter here
// previously renamed 3 unrelated pre-existing templates by mistake.
const BULK_CREATED_SESSION_IDS = [
  "03b847b5-5c81-450f-81ce-3f5e0aad853a", "040872bd-b9de-482e-85a4-226c70662514",
  "08551486-1f3b-4ad7-a1a0-7bb144c872df", "089212f7-596f-480d-8497-dc077dca56a0",
  "0a4005cc-f7f1-45aa-b6ba-166cb9f19a1a", "0aacd418-41e8-497f-8971-ab537982e663",
  "0c4508f2-2f92-48c4-b9c5-ffca4a16e3fe", "0f56e1ed-4ac4-4d08-948e-41e3c087f2f7",
  "10025c46-9d5e-4ebd-ba66-268be3c7e2c9", "10be25b4-866a-43ca-ac80-1e03ae864ae4",
  "138407dd-60c6-4a5b-88b4-b2a297c6a2d7", "1447bce3-6fbe-44a2-82f8-16271270678d",
  "17f09e43-48d0-415e-ae94-5d9831874003", "1b38b8a8-cc96-4289-b622-10a50fdac659",
  "1b533df8-cf54-48a9-ac61-f0565b47da36", "1cae8575-0556-436e-973c-0f2d32664b68",
  "2282e332-7288-4695-a14a-de0a3703d697", "26b5a59f-25ea-4a0a-9a06-01a569c7edee",
  "2a96c0f2-3723-4c04-a8ed-479f4a032874", "2efb8e16-c29d-482b-bcd3-04dbb0642ab8",
  "30d2e5b7-539e-45e9-953d-4c417918f9af", "3234a726-44c9-411d-b0ed-a0540f1ca992",
  "32db8544-0379-4f8b-b37f-1ab73d7af4a2", "33709395-3bcf-4d74-959b-ec1a0ac526a2",
  "35574961-ab4a-4bea-b6b8-e57e4d588868", "360f8721-a698-4ab6-81d4-f35a6afaa98e",
  "3ad3a6ec-7c20-41b9-92d8-a4973c07e5af", "4057c866-5320-450f-8158-2bbd6c432d51",
  "48c717c6-07e0-4ff6-8f99-8080fae54189", "5169c0fe-e9ad-44ee-8630-8ec9d6e44543",
  "53f3a181-66d1-4ba2-a1af-6c32c79e0f17", "5f2b337f-669f-42d3-8fce-977b117ba095",
  "638b05af-fc78-4b37-b9b2-915b8f56e860", "7184eeac-caee-4d54-aab0-a671310b24ed",
  "73d61943-d098-42a8-bd21-d43b8f35fceb", "76a40b7b-84f0-4085-847d-7c4273c4f06a",
  "76afc775-ec02-447b-8edc-82abdabf050f", "77f33bd5-5ede-41b8-a2e8-e40f52a0bc63",
  "843c1b92-64da-487a-b508-16b23f2b9e0e", "8d869829-ed3f-4a50-902e-e4fa86020391",
  "8dd7cce1-abac-4f86-af67-05f354390ebc", "92dd8d4a-bfa5-41df-bbd6-1530fd6f5d87",
  "94994595-b138-40e9-a3bb-f79c6b9a702e", "980aa4bc-56de-4d8f-be22-296cc27e3cab",
  "9818d3a3-906e-47fb-991c-71746bdc1497", "99376065-4ee8-4b35-9231-0b1e7e7ec277",
  "9a401d68-070c-47f1-bfd0-c5e339ff9510", "9ba83bda-67e6-4834-8144-9dd440f8ee95",
  "9bf3ec4c-f1a7-41ff-9ac3-9d8161504c9a", "9dccbd9b-e432-4c39-bff4-5caf54e789a5",
  "9ebe3e13-aee0-404f-88bc-c1f2e622de04", "9ee60540-daa6-448f-b229-ffc615543545",
  "9f592ff7-4fde-4782-9839-188d84e2bd03", "9f9a5b7b-7fcd-4c27-8646-251e4913958d",
  "9fd56914-f6df-4860-b7e9-56f0d23aca67", "a00ec60e-d6e0-4d83-a622-7f678ed23bef",
  "af1d7a4f-f690-49f2-a6bf-4750840c1df1", "b6f2df95-5888-4278-a9b6-4f33d1a1e072",
  "b8546161-c60d-4485-86e4-726a55fb65a1", "ba2b82c4-ecf8-4d4b-9b2e-ea04aa53c6cf",
  "bce31f69-7e2e-4351-9d66-d857ab41bd88", "c0522d8f-5f37-4659-b628-7d096b5ab05a",
  "cc21bc26-e599-4a30-a381-77d0e587df42", "cc7eeb13-18c9-4c9c-b9ac-c437d18909f2",
  "d19504b8-9ce3-4496-85d2-624206fb2e81", "d67b8530-c34a-4476-9e5e-594426170f94",
  "e0a261db-375c-4028-b224-5e27a997124b", "e3a4f183-a8e7-4ca6-a181-6bf144e2f744",
  "e4349a23-3d13-4d68-a4bc-dc869128c21a", "f4e9e2a8-3ea4-43a1-8bf2-f5bdcb7a5a05",
  "ffa797ab-9b05-45a6-865e-0b11b7cdfb99",
];

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

const MOVEMENT_TYPE_LABELS = {
  spinal_mobility: "Spinal Mobility", upper_body_mobility: "Upper Body Mobility",
  lower_body_mobility: "Lower Body Mobility", full_body_mobility: "Full Body Mobility",
  rest_recovery: "Rest & Recovery", hinge_pattern: "Hinge Pattern", squat_pattern: "Squat Pattern",
  lunge_pattern: "Lunge Pattern", horizontal_push: "Horizontal Push", horizontal_pull: "Horizontal Pull",
  vertical_push: "Vertical Push", pull_accessory: "Pull Accessory", push_accessory: "Push Accessory",
  loaded_carry: "Loaded Carry", core_anterior: "Core — Anterior", core_posterior: "Core — Posterior",
  core_lateral: "Core — Lateral", power_output: "Power Output", lateral_movement: "Lateral Movement",
  locomotion: "Locomotion", cardio: "Cardio", mobility_dynamic: "Dynamic Mobility",
};
function humanizeMovementType(mt) {
  return MOVEMENT_TYPE_LABELS[mt] || titleCase(mt);
}
function titleCase(s) {
  return (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateTemplateNameV2(facets, existingNames, exerciseCount) {
  const mt = facets.movement_type[0] ? humanizeMovementType(facets.movement_type[0]) : "";
  const mg = facets.muscle_groups.slice(0, 2);
  const mg3 = facets.muscle_groups[2];
  const arch = facets.archetypes[0] ? titleCase(facets.archetypes[0]) : "";

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

  if (!existingNames.has(base)) { existingNames.add(base); return base; }

  // Collision: try adding a 3rd muscle group first.
  if (mg3) {
    const withThird = `${base} & ${mg3}`;
    if (!existingNames.has(withThird)) { existingNames.add(withThird); return withThird; }
  }

  // Still colliding: try exercise count.
  const withCount = `${base} (${exerciseCount} exercises)`;
  if (!existingNames.has(withCount)) { existingNames.add(withCount); return withCount; }

  // Last resort: numeric suffix.
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
    const name = generateTemplateNameV2(facets, existingNames, exercises.length);

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

async function renameExisting() {
  const { rows } = await pool.query(
    `SELECT id, name, data, archetypes, movement_type, muscle_groups
     FROM workout_templates WHERE source_session_id = ANY($1) ORDER BY created_at`,
    [BULK_CREATED_SESSION_IDS],
  );
  console.log(`Rows eligible for rename (source_session_id = ANY(bulk list)): ${rows.length}\n`);

  const existingNames = new Set();
  const { rows: untouched } = await pool.query(
    `SELECT name FROM workout_templates WHERE NOT (source_session_id = ANY($1))`,
    [BULK_CREATED_SESSION_IDS],
  );
  for (const r of untouched) existingNames.add(r.name);

  const updates = [];
  for (const row of rows) {
    const d = row.data || {};
    const exerciseCount = [...(d.warm_up || []), ...(d.main_block || []), ...(d.cooldown || [])].length;
    const facets = {
      movement_type: row.movement_type || [],
      muscle_groups: row.muscle_groups || [],
      archetypes: row.archetypes || [],
    };
    const newName = generateTemplateNameV2(facets, existingNames, exerciseCount);
    if (newName !== row.name) updates.push({ id: row.id, oldName: row.name, newName });
  }

  console.log(`Names that would change: ${updates.length}\n`);
  for (const u of updates.slice(0, 20)) console.log(`  "${u.oldName}" -> "${u.newName}"`);
  if (updates.length > 20) console.log(`  ... and ${updates.length - 20} more`);

  const suffixCount = updates.filter((u) => /\s\d+$/.test(u.newName)).length;
  console.log(`\nRemaining numeric-suffix collisions: ${suffixCount} (was ${rows.filter(r => /\s\d+$/.test(r.name)).length})`);

  if (DRY_RUN) { console.log("\n=== DRY RUN — no rows updated ==="); await pool.end(); return; }

  for (const u of updates) {
    await pool.query(`UPDATE workout_templates SET name = $1 WHERE id = $2`, [u.newName, u.id]);
  }
  console.log(`\nDone — ${updates.length} rows renamed.`);
  await pool.end();
}

if (process.argv.includes("--rename-existing")) {
  renameExisting().catch((e) => { console.error(e); process.exit(1); });
} else {
  main().catch((e) => { console.error(e); process.exit(1); });
}
