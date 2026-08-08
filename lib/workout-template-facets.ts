import type { Exercise } from "@/types";

export interface ExercisesRow {
  name: string;
  archetypes: string[];
  movement_type: string | null;
  muscle_groups: string[];
  equipment: string[];
  difficulty: number | null;
}

export function collectExercises(data: { warm_up?: Exercise[]; main_block?: Exercise[]; cooldown?: Exercise[] }): Exercise[] {
  return [...(data.warm_up ?? []), ...(data.main_block ?? []), ...(data.cooldown ?? [])];
}

export function deriveFacets(allEx: Exercise[], exerciseRows: ExercisesRow[]) {
  const nameLookup = new Map<string, ExercisesRow>();
  for (const row of exerciseRows) nameLookup.set(row.name.toLowerCase(), row);

  const archetypes = new Set<string>();
  const movementType = new Set<string>();
  const muscleGroups = new Set<string>();
  const equipment = new Set<string>();
  let maxDifficulty: number | null = null;

  for (const ex of allEx) {
    const matched = nameLookup.get(ex.exercise_name.toLowerCase());
    if (!matched) continue;
    for (const a of matched.archetypes) archetypes.add(a);
    if (matched.movement_type) movementType.add(matched.movement_type);
    for (const m of matched.muscle_groups) muscleGroups.add(m);
    for (const e of matched.equipment) equipment.add(e);
    if (matched.difficulty != null) {
      if (maxDifficulty === null || matched.difficulty > maxDifficulty) maxDifficulty = matched.difficulty;
    }
  }

  return {
    archetypes: [...archetypes].sort(),
    movement_type: [...movementType].sort(),
    muscle_groups: [...muscleGroups].sort(),
    equipment: [...equipment].sort(),
    difficulty: maxDifficulty,
  };
}
