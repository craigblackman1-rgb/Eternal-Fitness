import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { Exercise } from "@/types";

interface ExercisesRow {
  name: string;
  archetypes: string[];
  movement_type: string | null;
  muscle_groups: string[];
  equipment: string[];
  difficulty: number | null;
}

/** Collects all exercises from a SessionVersion across all three sections. */
function collectExercises(data: { warm_up?: Exercise[]; main_block?: Exercise[]; cooldown?: Exercise[] }): Exercise[] {
  return [...(data.warm_up ?? []), ...(data.main_block ?? []), ...(data.cooldown ?? [])];
}

/** Derives facet tags by joining the template's exercise names against the exercises table. */
function deriveFacets(allEx: Exercise[], exerciseRows: ExercisesRow[]) {
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

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, data, condition_tags, source_client_id, source_session_id } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Template name is required" }, { status: 400 });
  }
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Template data is required" }, { status: 400 });
  }

  const exercises = collectExercises(data);
  const exerciseNames = [...new Set(exercises.map((e) => e.exercise_name).filter(Boolean))];

  let facets = {
    archetypes: [] as string[],
    movement_type: [] as string[],
    muscle_groups: [] as string[],
    equipment: [] as string[],
    difficulty: null as number | null,
  };

  if (exerciseNames.length > 0) {
    const { data: rows } = await supabase
      .from("exercises")
      .select("name, archetypes, movement_type, muscle_groups, equipment, difficulty")
      .eq("active", true)
      .in("name", exerciseNames);
    facets = deriveFacets(exercises, (rows ?? []) as ExercisesRow[]);
  }

  const insert = {
    name: name.trim(),
    data,
    archetypes: facets.archetypes,
    movement_type: facets.movement_type,
    muscle_groups: facets.muscle_groups,
    equipment: facets.equipment,
    difficulty: facets.difficulty,
    condition_tags: condition_tags ?? [],
    source_client_id: source_client_id ?? null,
    source_session_id: source_session_id ?? null,
  };

  const { data: created, error } = await supabase
    .from("workout_templates")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(created);
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("workout_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  return NextResponse.json(data ?? []);
}
