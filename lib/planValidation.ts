import type { Session, Exercise } from "@/types";
import {
  exerciseMuscleGroups,
  type ExerciseLibraryRow,
  type MuscleGroup,
  type SplitDefinition,
} from "@/lib/planAgentPrompt";

/**
 * Deterministic post-generation checks — the prompt *asks* the model to stay in
 * the exercise library, on studio equipment, and to cover every muscle group in
 * the client's split; this module *verifies* it, so plan correctness never
 * depends on the model having read a checklist carefully (that's how the
 * missing-quads/chest Becky plan shipped — see EF_Plan_Agent_Charter_Jul2026.md §1/§3).
 */

export interface PlanViolation {
  type: "unknown_exercise" | "unknown_equipment" | "missing_muscle_groups";
  detail: string;
}

/** Lowercase, drop bracketed/parenthesised suffixes (models sometimes copy the
 *  menu's equipment annotation into the name), expand common abbreviations,
 *  then strip everything non-alphanumeric — tolerant of punctuation, hyphens,
 *  and spacing differences between the model's output and the library. */
export function normalizeExerciseName(name: string): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, "")
    .replace(/\bdb\b/g, "dumbbell")
    .replace(/\bkb\b/g, "kettlebell")
    .replace(/\bbb\b/g, "barbell")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

export interface ExerciseIndex {
  byName: Map<string, ExerciseLibraryRow>;
}

/** Library rows like "Yoga - Cat-Cow Stretch" or "Pilates - Plank to Pike" carry
 *  a category label the model reads as a heading, not part of the name — it
 *  reliably echoes back the exercise without the prefix even when told to copy
 *  names exactly. ~200 rows (mostly Yoga/Pilates) use this pattern, so index
 *  each under its prefix-stripped form too (never overwriting a distinct
 *  exercise that already owns that key) to accept the model's answer. */
const CATEGORY_PREFIX = /^[A-Za-z][A-Za-z ]{1,24}-\s+/;

export function buildExerciseIndex(rows: ExerciseLibraryRow[]): ExerciseIndex {
  const byName = new Map<string, ExerciseLibraryRow>();
  for (const row of rows) {
    byName.set(normalizeExerciseName(row.name), row);
  }
  for (const row of rows) {
    const stripped = row.name.replace(CATEGORY_PREFIX, "");
    if (stripped === row.name) continue;
    const strippedKey = normalizeExerciseName(stripped);
    if (!byName.has(strippedKey)) byName.set(strippedKey, row);
  }
  return { byName };
}

/** The model sometimes pluralises/singularises relative to the library (e.g.
 *  "Band pull-aparts" vs the library's "Band Pull-Apart") — try the query both
 *  with and without a trailing "s" before giving up. Lookup-side, so it needs
 *  no re-indexing and can't introduce the collision risk a stored variant
 *  would. */
export function findLibraryExercise(index: ExerciseIndex, name: string): ExerciseLibraryRow | null {
  const key = normalizeExerciseName(name);
  const direct = index.byName.get(key);
  if (direct) return direct;
  if (key.endsWith("s")) {
    const singular = index.byName.get(key.slice(0, -1));
    if (singular) return singular;
  } else {
    const plural = index.byName.get(`${key}s`);
    if (plural) return plural;
  }
  return null;
}

/** Equipment tokens that don't need to appear on the studio list. */
const GENERIC_EQUIPMENT = new Set([
  "", "none", "bodyweight", "body weight", "no equipment", "floor", "wall", "mat", "mats",
  "chair", "towel", "step", "space",
]);

function equipmentMatchesStudio(token: string, studioNames: string[]): boolean {
  const t = token.trim().toLowerCase();
  if (GENERIC_EQUIPMENT.has(t)) return true;
  // Substring match either way: "dumbbells (2kg – 40kg)" covers "dumbbell",
  // "band" covers "resistance bands", etc.
  const singular = t.replace(/s$/, "");
  return studioNames.some((n) => {
    const s = n.toLowerCase();
    return s.includes(singular) || singular.includes(s.replace(/s$/, ""));
  });
}

/** Aliases for studio kit the model may name differently. */
const EQUIPMENT_ALIASES: Record<string, string> = {
  "barbell": "olympic bar",
  "ez bar": "easy bar",
  "ez curl bar": "easy bar",
  "swiss ball": "swiss exercise balls",
  "stability ball": "swiss exercise balls",
  "exercise ball": "swiss exercise balls",
  "physio ball": "swiss exercise balls",
  "medicine ball": "slam balls",
  "med ball": "slam balls",
  "box": "wooden boxes",
  "plyo box": "wooden boxes",
  "bands": "resistance bands",
  "mini band": "booty bands",
  "superband": "resistance bands",
  "suspension trainer": "trx",
  "cable": "cable machine",
  "kettlebell": "kettlebells",
  "dumbbell": "dumbbells",
  "ab wheel": "ab rollout wheel",
  "foam roller": "yoga blocks / foam rollers",
  "yoga block": "yoga blocks / foam rollers",
};

function resolveEquipmentToken(token: string): string {
  const t = token.trim().toLowerCase();
  return EQUIPMENT_ALIASES[t] ?? EQUIPMENT_ALIASES[t.replace(/s$/, "")] ?? t;
}

function collectStudioExercises(session: Session): { section: string; ex: Exercise }[] {
  const studio = session.versions?.studio;
  if (!studio) return [];
  return [
    ...(studio.warm_up ?? []).map((ex) => ({ section: "warm_up", ex })),
    ...(studio.main_block ?? []).map((ex) => ({ section: "main_block", ex })),
    ...(studio.cooldown ?? []).map((ex) => ({ section: "cooldown", ex })),
  ];
}

/** Per-session checks: every studio exercise must exist in the library, and
 *  every equipment token must resolve to the studio list. (The home version is
 *  deliberately not equipment-checked — it substitutes household kit.) */
export function validateSession(
  session: Session,
  index: ExerciseIndex,
  studioEquipmentNames: string[],
): PlanViolation[] {
  const violations: PlanViolation[] = [];

  for (const { ex } of collectStudioExercises(session)) {
    if (!findLibraryExercise(index, ex.exercise_name)) {
      violations.push({
        type: "unknown_exercise",
        detail: `"${ex.exercise_name}" is not in the exercise library — replace it with a library exercise`,
      });
    }
    for (const token of ex.equipment ?? []) {
      const resolved = resolveEquipmentToken(token);
      if (!equipmentMatchesStudio(resolved, studioEquipmentNames)) {
        violations.push({
          type: "unknown_equipment",
          detail: `"${ex.exercise_name}" lists equipment "${token}" which is not on the studio list`,
        });
      }
    }
  }

  return violations;
}

/** Which of the split's muscle groups this session's studio main block covers. */
export function sessionMuscleCoverage(
  session: Session,
  index: ExerciseIndex,
): Map<MuscleGroup, string[]> {
  const coverage = new Map<MuscleGroup, string[]>();
  const main = session.versions?.studio?.main_block ?? [];
  for (const ex of main) {
    const row = findLibraryExercise(index, ex.exercise_name);
    const groups = row
      ? exerciseMuscleGroups(row)
      : exerciseMuscleGroups({ name: ex.exercise_name, movement_type: null, muscle_groups: [] });
    for (const g of groups) {
      if (!coverage.has(g)) coverage.set(g, []);
      coverage.get(g)!.push(ex.exercise_name);
    }
  }
  return coverage;
}

/** The full-body (or split-specific) contract, enforced per session. */
export function validateSessionCoverage(
  session: Session,
  index: ExerciseIndex,
  split: SplitDefinition,
): PlanViolation[] {
  const coverage = sessionMuscleCoverage(session, index);
  const missing = split.groups.filter((g) => !coverage.has(g));
  if (missing.length === 0) return [];
  return [{
    type: "missing_muscle_groups",
    detail: `this session has no exercise covering: ${missing.join(", ")} — add a compound or isolation exercise for each`,
  }];
}

export function validateGeneratedSession(
  session: Session,
  index: ExerciseIndex,
  studioEquipmentNames: string[],
  split: SplitDefinition,
): PlanViolation[] {
  return [
    ...validateSession(session, index, studioEquipmentNames),
    ...validateSessionCoverage(session, index, split),
  ];
}
