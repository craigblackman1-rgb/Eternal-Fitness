#!/usr/bin/env node
/**
 * Test: program paste parser normalisation against Ian's fixture.
 *
 * Usage:  node scripts/test-program-parse.mjs
 *
 * Self-contained — duplicates the normalisation functions from
 * lib/programs/parse.ts so the script runs without TypeScript path
 * aliases or an AI API key. Tests the core shape-parsing pipeline.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

const fixture = readFileSync(join(ROOT, "scripts", "fixtures", "ian-program.txt"), "utf-8");

// ─────────────────────────────────────────────────────────────────────
// Inline normalisation (mirrors lib/programs/parse.ts)
// ─────────────────────────────────────────────────────────────────────

function asString(v) { return typeof v === "string" ? v : v == null ? "" : String(v); }
function asNum(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") { const n = parseInt(v, 10); if (Number.isFinite(n) && n > 0) return n; }
  return undefined;
}

function normExercise(raw) {
  const o = (raw && typeof raw === "object" ? raw : {});
  const name = asString(o.exercise_name).trim() || asString(o.name).trim() || "Untitled exercise";
  const per_side = asString(o.per_side).trim() || undefined;
  return {
    exercise_name: name,
    per_side,
    sets: asNum(o.sets),
    reps: asString(o.reps).trim() || undefined,
    weight: asString(o.weight).trim() || undefined,
    duration: asString(o.duration).trim() || undefined,
    notes: asString(o.notes).trim() || undefined,
  };
}

function normSection(raw) {
  const o = (raw && typeof raw === "object" ? raw : {});
  const kind = asString(o.kind).toLowerCase().trim();
  const valid = ["circuit", "superset", "straight", "warmup", "cooldown"];
  if (!valid.includes(kind)) return null;
  const exercises = Array.isArray(o.exercises)
    ? o.exercises.map(normExercise).filter((e) => e.exercise_name !== "Untitled exercise")
    : [];
  if (exercises.length === 0) return null;
  return {
    kind,
    label: asString(o.label).trim() || undefined,
    rounds: asNum(o.rounds),
    rest: asString(o.rest).trim() || undefined,
    exercises,
  };
}

function normSlot(raw) {
  const o = (raw && typeof raw === "object" ? raw : {});
  const label = asString(o.label).trim() || "Workout";
  const d = (o.data && typeof o.data === "object" ? o.data : {});
  const secs = Array.isArray(d.sections) ? d.sections.map(normSection).filter(Boolean) : [];
  if (secs.length === 0) return null;
  return { label, data: { sections: secs } };
}

function normProgram(raw) {
  const o = (raw && typeof raw === "object" ? raw : {});
  const name = asString(o.name).trim() || undefined;
  const weeks = asNum(o.weeks);
  const slots = Array.isArray(o.slots) ? o.slots.map(normSlot).filter(Boolean) : [];
  return { name, weeks, slots };
}

// ─────────────────────────────────────────────────────────────────────
// Fixture JSON (what the AI should produce for Ian's programme)
// ─────────────────────────────────────────────────────────────────────

const IAN_JSON = {
  name: "Ian bilateral program",
  weeks: null,
  slots: [
    {
      label: "Workout A",
      data: {
        sections: [
          { kind: "warmup", label: "Warm-up", rounds: 2, rest: null, exercises: [
            { exercise_name: "Forward Leg Swing", per_side: null, sets: null, reps: "10", weight: null, duration: null, notes: null },
            { exercise_name: "Lateral Leg Swing", per_side: null, sets: null, reps: "10", weight: null, duration: null, notes: null },
            { exercise_name: "Marching On The Spot", per_side: null, sets: null, reps: null, weight: null, duration: "2 min", notes: null },
            { exercise_name: "Hip Circles", per_side: null, sets: null, reps: "10", weight: null, duration: null, notes: null },
            { exercise_name: "Shoulder Rolls & Arm Swings", per_side: "LEFT shoulder only", sets: null, reps: "10", weight: null, duration: null, notes: null },
            { exercise_name: "Trunk Rotation", per_side: null, sets: null, reps: "10", weight: null, duration: null, notes: null },
            { exercise_name: "Bodyweight Squat", per_side: null, sets: null, reps: "10", weight: null, duration: null, notes: null },
          ]},
          { kind: "superset", label: "Superset 1", rounds: 3, rest: "60-90 sec", exercises: [
            { exercise_name: "Suitcase Deadlift", per_side: "LEFT side only", sets: 3, reps: "10", weight: "16kg", duration: null, notes: null },
            { exercise_name: "Landmine Press", per_side: "LEFT arm only", sets: 3, reps: "10-12", weight: "2.5kg", duration: null, notes: null },
          ]},
          { kind: "superset", label: "Superset 2", rounds: null, rest: null, exercises: [
            { exercise_name: "Half-Kneeling Single Arm Row", per_side: "LEFT arm only", sets: 3, reps: "10", weight: "13.5kg", duration: null, notes: null },
            { exercise_name: "Sissy Squat (supported)", per_side: null, sets: 3, reps: "8-10", weight: "bodyweight", duration: null, notes: "shallow range" },
          ]},
          { kind: "superset", label: "Superset 3", rounds: null, rest: null, exercises: [
            { exercise_name: "Alternating Dumbbell Step Up", per_side: null, sets: 3, reps: "60 sec", weight: null, duration: "60 sec", notes: "Level 3" },
            { exercise_name: "Balance Ladder Drill", per_side: null, sets: 2, reps: null, weight: null, duration: null, notes: null },
          ]},
          { kind: "superset", label: "Superset 4", rounds: null, rest: null, exercises: [
            { exercise_name: "Dumbbell Hammer Curl", per_side: "LEFT", sets: 3, reps: "12", weight: "light", duration: null, notes: null },
            { exercise_name: "Cable Tricep Pushdown", per_side: "LEFT", sets: 3, reps: "12", weight: null, duration: null, notes: null },
            { exercise_name: "Single Arm Lateral Raise", per_side: "LEFT", sets: 3, reps: "12", weight: null, duration: null, notes: null },
          ]},
          { kind: "straight", label: "Standalone", rounds: null, rest: "90 sec", exercises: [
            { exercise_name: "Standing Pallof Press", per_side: null, sets: 3, reps: "10", weight: "light band", duration: null, notes: "both sides, each side" },
          ]},
          { kind: "cooldown", label: "Cool-down", rounds: 1, rest: null, exercises: [
            { exercise_name: "Static Hip Flexor Stretch", per_side: null, sets: null, reps: null, weight: null, duration: "30 sec", notes: null },
            { exercise_name: "Banded Hamstring Stretch", per_side: null, sets: null, reps: null, weight: null, duration: null, notes: null },
            { exercise_name: "Seated Piriformis Stretch", per_side: null, sets: null, reps: null, weight: null, duration: "30 sec", notes: null },
            { exercise_name: "Shoulder CARs", per_side: null, sets: null, reps: null, weight: null, duration: null, notes: null },
            { exercise_name: "Static Neck Flexion Stretch", per_side: null, sets: null, reps: null, weight: null, duration: "30 sec", notes: null },
          ]},
        ],
      },
    },
    {
      label: "Workout B",
      data: {
        sections: [
          { kind: "warmup", label: "Warm-up", rounds: 2, rest: null, exercises: [
            { exercise_name: "Forward Leg Swing", per_side: null, sets: null, reps: "10", weight: null, duration: null, notes: null },
            { exercise_name: "Lateral Leg Swing", per_side: null, sets: null, reps: "10", weight: null, duration: null, notes: null },
            { exercise_name: "Marching On The Spot", per_side: null, sets: null, reps: null, weight: null, duration: "2 min", notes: null },
            { exercise_name: "Hip Circles", per_side: null, sets: null, reps: "10", weight: null, duration: null, notes: null },
            { exercise_name: "Shoulder Rolls & Arm Swings", per_side: "LEFT shoulder only", sets: null, reps: "10", weight: null, duration: null, notes: null },
            { exercise_name: "Trunk Rotation", per_side: null, sets: null, reps: "10", weight: null, duration: null, notes: null },
            { exercise_name: "Bodyweight Squat", per_side: null, sets: null, reps: "10", weight: null, duration: null, notes: null },
          ]},
          { kind: "superset", label: "Superset 1", rounds: null, rest: null, exercises: [
            { exercise_name: "Single Leg RDL (TRX assisted)", per_side: null, sets: 3, reps: "10", weight: null, duration: null, notes: null },
            { exercise_name: "Single Arm Dumbbell Floor Press", per_side: "LEFT", sets: 3, reps: "10-12", weight: null, duration: null, notes: null },
          ]},
          { kind: "superset", label: "Superset 2", rounds: null, rest: null, exercises: [
            { exercise_name: "Single Arm Neutral Grip Lat Pulldown", per_side: "LEFT", sets: 3, reps: "15", weight: "15kg", duration: null, notes: null },
            { exercise_name: "Rear Foot Elevated Goblet Split Squat", per_side: null, sets: 3, reps: "15", weight: "6kg", duration: null, notes: null },
          ]},
          { kind: "superset", label: "Superset 3", rounds: null, rest: null, exercises: [
            { exercise_name: "Goblet Squat", per_side: null, sets: 3, reps: "15", weight: "6kg", duration: null, notes: null },
            { exercise_name: "Clock-Face Ball-Throw Drill", per_side: null, sets: 2, reps: null, weight: null, duration: null, notes: null },
          ]},
          { kind: "superset", label: "Superset 4", rounds: null, rest: null, exercises: [
            { exercise_name: "Band Single Arm Bicep Curl", per_side: "LEFT", sets: 3, reps: "12", weight: null, duration: null, notes: null },
            { exercise_name: "Single Arm Dumbbell Overhead Tricep Extension", per_side: "LEFT", sets: 3, reps: "12", weight: null, duration: null, notes: null },
            { exercise_name: "Single Arm Front Raise", per_side: "LEFT", sets: 3, reps: "12", weight: null, duration: null, notes: null },
          ]},
          { kind: "straight", label: "Standalone", rounds: null, rest: null, exercises: [
            { exercise_name: "Dead Bug With Ball", per_side: null, sets: 3, reps: "10", weight: null, duration: null, notes: "each side" },
          ]},
          { kind: "cooldown", label: "Cool-down", rounds: 1, rest: null, exercises: [
            { exercise_name: "Static Hip Flexor Stretch", per_side: null, sets: null, reps: null, weight: null, duration: "30 sec", notes: null },
            { exercise_name: "Banded Hamstring Stretch", per_side: null, sets: null, reps: null, weight: null, duration: null, notes: null },
            { exercise_name: "Seated Piriformis Stretch", per_side: null, sets: null, reps: null, weight: null, duration: "30 sec", notes: null },
            { exercise_name: "Shoulder CARs", per_side: null, sets: null, reps: null, weight: null, duration: null, notes: null },
            { exercise_name: "Static Neck Flexion Stretch", per_side: null, sets: null, reps: null, weight: null, duration: "30 sec", notes: null },
          ]},
        ],
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// Test runner
// ─────────────────────────────────────────────────────────────────────

// Replicate chunkWorkouts (mirrors lib/programs/parse.ts)
function chunkWorkouts(text) {
  const headingRe = /^\s*workout\s+([A-Z0-9]+)\b[^\n]*$/gim;
  const matches = [...text.matchAll(headingRe)];
  if (matches.length < 2) return null;
  const chunks = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const chunk = text.slice(start, end).trim();
    const labelRaw = matches[i][1] || String(i + 1);
    chunks.push({ label: `Workout ${labelRaw}`, chunk });
  }
  return chunks;
}

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) { passed++; console.log(`  \u2713 ${label}`); }
  else { failed++; console.error(`  \u2717 ${label}`); }
}
function eq(a, b, label) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) { passed++; console.log(`  \u2713 ${label}`); }
  else { failed++; console.error(`  \u2717 ${label}`); console.error(`    expected: ${JSON.stringify(b)}`); console.error(`    actual:   ${JSON.stringify(a)}`); }
}

// Run normalisation
const result = normProgram(IAN_JSON);

console.log("Programme parser normalisation test");
console.log(`Fixture: ${fixture.length} chars, ${fixture.split("\n").length} lines`);
console.log(`\nParsed: ${result.slots.length} slot(s)`);
for (const s of result.slots) {
  const exCount = s.data.sections.reduce((n, sec) => n + sec.exercises.length, 0);
  console.log(`  ${s.label}: ${s.data.sections.length} sections, ${exCount} exercises`);
}

console.log("\nAssertions:");

// 1. 2 slots
eq(result.slots.length, 2, "2 slots detected");
eq(result.slots[0]?.label, "Workout A", "slot A label");
eq(result.slots[1]?.label, "Workout B", "slot B label");

const sA = result.slots[0], sB = result.slots[1];
if (!sA || !sB) { console.error("FATAL: slots missing"); process.exit(1); }

// 2. Warm-up: warmup kind, 2 rounds, 7 exercises
const wA = sA.data.sections.find((s) => s.kind === "warmup");
assert(wA != null, "slot A has warmup section");
if (wA) {
  eq(wA.rounds, 2, "warmup rounds = 2");
  eq(wA.exercises.length, 7, "warmup has 7 exercises");
}

// 3. Supersets
const sups = sA.data.sections.filter((s) => s.kind === "superset");
eq(sups.length, 4, "slot A has 4 supersets");
if (sups[0]) {
  eq(sups[0].rounds, 3, "superset 1 rounds = 3");
  eq(sups[0].rest, "60-90 sec", "superset 1 rest = '60-90 sec'");
}

// 4. per_side LEFT on Suitcase Deadlift
const dl = sA.data.sections.flatMap((s) => s.exercises).find((e) => e.exercise_name.includes("Suitcase Deadlift"));
assert(dl != null, "Suitcase Deadlift found");
if (dl) assert(dl.per_side != null && dl.per_side.includes("LEFT"), "Suitcase Deadlift has LEFT per_side");

// 5. Standalone Pallof Press
const pf = sA.data.sections.flatMap((s) => s.exercises).find((e) => e.exercise_name.includes("Pallof Press"));
assert(pf != null, "Pallof Press found as standalone");

// 6. Cool-down 5 items
const cA = sA.data.sections.find((s) => s.kind === "cooldown");
assert(cA != null, "slot A has cooldown");
if (cA) eq(cA.exercises.length, 5, "cooldown has 5 exercises");

// 7. Slot B warm-up copied from A
const wB = sB.data.sections.find((s) => s.kind === "warmup");
assert(wB != null, "slot B has warmup");
if (wB && wA) {
  eq(wB.exercises.length, wA.exercises.length, "slot B warmup same length as A");
  eq(wB.exercises.map((e) => e.exercise_name), wA.exercises.map((e) => e.exercise_name), "slot B warmup exercises match A");
}

// 8. Slot B cooldown copied from A
const cB = sB.data.sections.find((s) => s.kind === "cooldown");
assert(cB != null, "slot B has cooldown");
if (cB && cA) eq(cB.exercises.length, cA.exercises.length, "slot B cooldown same length as A");

// 9. Slot B supersets
const supsB = sB.data.sections.filter((s) => s.kind === "superset");
eq(supsB.length, 4, "slot B has 4 supersets");

// 10. Chunking regex splits fixture across newlines
const chunks = chunkWorkouts(fixture);
assert(chunks != null, "chunkWorkouts returns chunks for fixture");
assert(chunks && chunks.length === 2, `chunkWorkouts returns exactly 2 chunks (got ${chunks?.length})`);
assert(chunks && chunks[0]?.label === "Workout A", `chunk 0 label = "Workout A" (got "${chunks?.[0]?.label}")`);
assert(chunks && chunks[1]?.label === "Workout B", `chunk 1 label = "Workout B" (got "${chunks?.[1]?.label}")`);

// Inline two-line sample to exercise regex across newlines explicitly
const twoLine = "WORKOUT A: some stuff\nWORKOUT B: other stuff\n";
const twoChunks = chunkWorkouts(twoLine);
assert(twoChunks != null, "chunkWorkouts returns chunks for inline two-line sample");
assert(twoChunks && twoChunks.length === 2, `inline sample splits into 2 chunks (got ${twoChunks?.length})`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
