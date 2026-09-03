import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { collectExercises, deriveFacets, type ExercisesRow } from "@/lib/workout-template-facets";

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

  try {
    const exercises = collectExercises(data);
    const exerciseNames = [...new Set(exercises.map((e) => e.exercise_name).filter(Boolean))];

    let facets = {
      archetypes: [] as string[],
      movement_type: [] as string[],
      muscle_groups: [] as string[],
      equipment: [] as string[],
      position: [] as string[],
      difficulty: null as number | null,
    };

    if (exerciseNames.length > 0) {
      const { data: rows } = await supabase
        .from("exercises")
        .select("name, archetypes, movement_type, muscle_groups, equipment, difficulty, position")
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
      position: facets.position,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("workout_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  // Normalise Postgres TIMESTAMPTZ to strict ISO-8601 so WebKit (iOS Safari)
  // doesn't render "Invalid Date". Node/V8 parses the raw format correctly;
  // the client then only ever receives a string every engine agrees on.
  for (const row of data ?? []) {
    if (row.created_at) row.created_at = new Date(row.created_at).toISOString();
    if (row.updated_at) row.updated_at = new Date(row.updated_at).toISOString();
  }

  return NextResponse.json(data ?? []);
}
