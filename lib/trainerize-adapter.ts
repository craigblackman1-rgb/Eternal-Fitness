/**
 * Adapts trainerize_workout_results rows into the SetLog shape so historical
 * Trainerize performance data can flow through the same buildExerciseTrends/
 * buildExerciseHistory pure functions as live-app set_logs -- one continuous
 * per-exercise timeline and one PB computation, not two disconnected ones.
 */
import type { SetLog } from "@/types";

export interface TrainerizeWorkoutResultRow {
  id: string;
  trainerize_daily_workout_id: number;
  exercise_name: string | null;
  set_number: number | null;
  reps: number | null;
  weight: number | null;
  duration_seconds: number | null;
  performed_date: string | null;
}

export function trainerizeResultsToSetLogs(rows: TrainerizeWorkoutResultRow[]): SetLog[] {
  return rows
    .filter((r) => r.exercise_name && r.performed_date)
    .map((r) => ({
      id: `tz-${r.id}`,
      session_id: `tz-session-${r.trainerize_daily_workout_id}`,
      // parseExerciseName() takes everything after the 3rd colon, so a fixed
      // 3-segment prefix here reproduces the real exercise name exactly.
      exercise_ref: `trainerize:import:0:${r.exercise_name}`,
      set_number: r.set_number ?? 1,
      reps: r.reps,
      weight_kg: r.weight,
      duration_seconds: r.duration_seconds,
      completed: true,
      logged_by: "trainer" as const,
      logged_at: r.performed_date as string,
      notes: null,
      created_at: r.performed_date as string,
    }));
}
