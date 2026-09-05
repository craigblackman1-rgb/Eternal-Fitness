import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";
import type { TrainerizePerformedExerciseDetail } from "@/components/hub";

// On-demand detail for one Trainerize-imported workout instance, used by the
// "Before the app" drawer (ClientDrawers.tsx PreAppDrawer) when a workout row
// is expanded. The initial client-detail page load only sends a compact
// per-exercise summary (see page.tsx's summarisePerformedWorkouts) — one
// client can have 3,000+ logged sets, and sending every rep/weight/RPE value
// up front for every workout was the exact problem this feature fixes.
// Read-only: this route never writes to trainerize_workout_results.
export async function GET(
  _request: Request,
  { params }: { params: { id: string; workoutId: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const numericId = parseInt(params.id);
  const dailyWorkoutId = params.workoutId;
  if (!Number.isFinite(numericId) || !/^\d+$/.test(dailyWorkoutId)) {
    return NextResponse.json({ error: "Invalid client or workout id" }, { status: 400 });
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("client_number", numericId)
    .single();
  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT workout_name, performed_date, exercise_name, trainerize_daily_exercise_id,
            set_number, reps, weight, rpe, duration_seconds, distance
       FROM trainerize_workout_results
      WHERE client_id = $1 AND trainerize_daily_workout_id = $2
      ORDER BY trainerize_daily_exercise_id, set_number`,
    [client.id, dailyWorkoutId],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "No logged sets found for this workout" }, { status: 404 });
  }

  const exercisesByName = new Map<string, TrainerizePerformedExerciseDetail>();
  for (const r of rows) {
    const name = r.exercise_name ?? "Unnamed exercise";
    let ex = exercisesByName.get(name);
    if (!ex) {
      ex = { name, sets: [] };
      exercisesByName.set(name, ex);
    }
    ex.sets.push({
      setNumber: r.set_number,
      reps: r.reps != null ? Number(r.reps) : null,
      weightKg: r.weight != null ? Number(r.weight) : null,
      rpe: r.rpe != null ? Number(r.rpe) : null,
      durationSeconds: r.duration_seconds != null ? Number(r.duration_seconds) : null,
      distance: r.distance != null ? Number(r.distance) : null,
    });
  }

  return NextResponse.json({
    workoutName: rows[0].workout_name ?? null,
    performedDate: rows[0].performed_date ?? null,
    exercises: Array.from(exercisesByName.values()),
  });
}
