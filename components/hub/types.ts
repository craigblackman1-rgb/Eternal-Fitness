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

export interface TrainerizePersonalRecord {
  id: string;
  exercise: string;
  metric: "weight" | "duration";
  value: number | null;
  rep_count: number | null;
  achieved_at: string | null;
  source: "live_log" | "trainerize_import";
}

export interface TrainerizeNote {
  id: string;
  source: string;
  content: string;
  source_date: string | null;
  sender_name: string | null;
}

export interface TrainerizeRecentSession {
  dailyWorkoutId: number;
  workoutName: string | null;
  performedDate: string | null;
  rpe: number | null;
  setCount: number;
}

export interface TrainerizeWorkoutResultsSummary {
  totalSets: number;
  totalSessions: number;
  recentSessions: TrainerizeRecentSession[];
}

export interface TrainerizeHistoryData {
  blocks: TrainerizeBlock[];
  personalRecords: TrainerizePersonalRecord[];
  notes: TrainerizeNote[];
  workoutResultsSummary?: TrainerizeWorkoutResultsSummary;
}
