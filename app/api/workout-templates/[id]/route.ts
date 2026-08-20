import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { collectExercises, deriveFacets, type ExercisesRow } from "@/lib/workout-template-facets";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === "increment_usage") {
    const { data: row } = await supabase
      .from("workout_templates")
      .select("usage_count")
      .eq("id", params.id)
      .single();

    const current = (row as { usage_count: number } | null)?.usage_count ?? 0;

    const { data: updated, error } = await supabase
      .from("workout_templates")
      .update({ usage_count: current + 1, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(updated);
  }

  const { name, data, condition_tags } = body as {
    name?: string;
    data?: { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
    condition_tags?: string[];
  };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Template name must be a non-empty string" }, { status: 400 });
    }
    update.name = name.trim();
  }

  if (data !== undefined) {
    if (typeof data !== "object" || !data) {
      return NextResponse.json({ error: "Template data must be an object" }, { status: 400 });
    }
    update.data = data;

    const exercises = collectExercises(data as Parameters<typeof collectExercises>[0]);
    const exerciseNames = [...new Set(exercises.map((e) => e.exercise_name).filter(Boolean))];

    if (exerciseNames.length > 0) {
      const { data: rows } = await supabase
        .from("exercises")
        .select("name, archetypes, movement_type, muscle_groups, equipment, difficulty, position")
        .eq("active", true)
        .in("name", exerciseNames);
      const facets = deriveFacets(exercises, (rows ?? []) as ExercisesRow[]);
      update.archetypes = facets.archetypes;
      update.movement_type = facets.movement_type;
      update.muscle_groups = facets.muscle_groups;
      update.equipment = facets.equipment;
      update.difficulty = facets.difficulty;
      update.position = facets.position;
    } else {
      update.archetypes = [];
      update.movement_type = [];
      update.muscle_groups = [];
      update.equipment = [];
      update.difficulty = null;
      update.position = [];
    }
  }

  if (condition_tags !== undefined) {
    update.condition_tags = condition_tags;
  }

  const { data: updated, error } = await supabase
    .from("workout_templates")
    .update(update)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("workout_templates")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
