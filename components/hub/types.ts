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
  id: number;
  name: string | null;
  duration: number;
  instruction: string | null;
  exercises?: TrainerizeExercise[];
}

export interface TrainerizeExercise {
  id: number;
  name: string;
  sets: number;
  target: string;
  targetDetail: { type: number; text: string } | null;
  restTime: number;
  recordType: string;
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

export interface TrainerizeHistoryData {
  blocks: TrainerizeBlock[];
  personalRecords: TrainerizePersonalRecord[];
  notes: TrainerizeNote[];
}
