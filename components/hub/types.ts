export interface TrainerizeBlock {
  id: string;
  trainerize_phase_id: number;
  phase_name: string | null;
  start_date: string | null;
  end_date: string | null;
  plan_type: string;
  instruction: string | null;
  workouts?: TrainerizeWorkout[];
  // Workouts actually performed during this block's date window (see
  // TrainerizePerformedWorkoutSummary) — populated by page.tsx from
  // trainerize_workout_results, not from the prescribed program.
  performedWorkouts?: TrainerizePerformedWorkoutSummary[];
}

export interface TrainerizeWorkout {
  id: string;
  workout_name: string | null;
  workout_index: number;
  duration_seconds: number | null;
  instruction: string | null;
  exercises?: TrainerizeExercise[];
}

export interface TrainerizeExercise {
  id: string;
  exercise_name: string;
  exercise_order: number;
  sets: number;
  target_reps: string | null;
  rest_time_seconds: number | null;
  record_type: string | null;
}

export interface TrainerizeNote {
  id: string;
  source: string;
  content: string;
  source_date: string | null;
  sender_name: string | null;
}

// Compact per-exercise summary for a workout the client actually performed
// (trainerize_workout_results) — enough to show "what was trained, how heavy"
// without shipping every logged set to the client. Full per-set detail
// (reps/weight/RPE per set) is fetched on demand from
// GET /api/clients/[id]/trainerize-workout/[workoutId] when a workout row is
// expanded in the "Before the app" drawer.
export interface TrainerizePerformedExerciseSummary {
  name: string;
  setCount: number;
  topWeightKg: number | null;
  topReps: number | null;
}

// One real logged set, returned by the on-demand detail endpoint only —
// never shipped as part of the initial page payload.
export interface TrainerizePerformedSet {
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  durationSeconds: number | null;
  distance: number | null;
}

export interface TrainerizePerformedExerciseDetail {
  name: string;
  sets: TrainerizePerformedSet[];
}

// A single completed Trainerize workout instance (one calendar day's session),
// reconstructed from trainerize_workout_results — there is no foreign key
// between results and trainerize_workouts, so this is deliberately a separate
// list from TrainerizeBlock.workouts (the prescribed program).
export interface TrainerizePerformedWorkoutSummary {
  id: string; // trainerize_daily_workout_id, as a string
  workoutName: string | null;
  performedDate: string | null;
  setCount: number;
  exercises: TrainerizePerformedExerciseSummary[];
}

// PBs and personal-best trend data live on the unified Progress tab
// (lib/exercise-history.ts + lib/progress.ts, fed by both live set_logs and
// Trainerize's per-set results via lib/trainerize-adapter.ts). This type
// covers program structure, what was actually performed, and notes — the
// substance of a "review this client's Trainerize history" pass.
export interface TrainerizeHistoryData {
  blocks: TrainerizeBlock[];
  notes: TrainerizeNote[];
  // Performed workouts whose date fell before the client's first imported
  // block (or where no block has a usable start date at all) — shown
  // honestly in their own bucket rather than silently dropped.
  unmatchedPerformedWorkouts: TrainerizePerformedWorkoutSummary[];
}
