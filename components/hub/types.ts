export interface TrainerizeBlock {
  id: string;
  trainerize_phase_id: number;
  phase_name: string | null;
  start_date: string | null;
  end_date: string | null;
  plan_type: string;
  instruction: string | null;
  workouts?: TrainerizeWorkout[];
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

// PBs and per-set workout results now live on the unified Progress tab
// (lib/exercise-history.ts + lib/progress.ts, fed by both live set_logs and
// Trainerize's per-set results via lib/trainerize-adapter.ts) — this data
// covers program structure and notes only, not performance data.
export interface TrainerizeHistoryData {
  blocks: TrainerizeBlock[];
  notes: TrainerizeNote[];
}
