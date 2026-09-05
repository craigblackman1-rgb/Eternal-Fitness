/**
 * Program types — CR-EF-154.
 *
 * A PROGRAM is reusable named training content: an ordered queue of workout
 * SLOTS (e.g. Workout A, Workout B) with per-week progression bands.
 *
 * Slot `data` is stored as JSONB. The shape is deliberately compatible in
 * spirit with the existing SessionVersion exercise fields but uses a
 * sections-based layout rather than the flat warm_up/main_block/cooldown
 * split — programs need to express circuits, supersets, and standalone
 * blocks explicitly.
 */

// ─────────────────────────────────────────────────────────────────────
// Program exercise — a single movement inside a slot section
// ─────────────────────────────────────────────────────────────────────

export interface ProgramExercise {
  exercise_name: string;
  per_side?: string;        // 'LEFT arm only', 'RIGHT side only'
  sets?: number;
  reps?: string;            // always string: '8', '10-12', '60 sec'
  weight?: string;          // '16kg', 'bodyweight', 'light band'
  duration?: string;        // '2 min', '30 sec'
  notes?: string;
  /** Per-week progression bands. If present, the band whose from_week <= current_week <= to_week
   *  overrides the base sets/reps/weight. Absent = use base prescription every week. */
  week_bands?: WeekBand[];
}

export interface WeekBand {
  from_week: number;
  to_week: number;
  sets?: number;
  reps?: string;
  weight?: string;
}

// ─────────────────────────────────────────────────────────────────────
// Program section — an ordered group of exercises within a slot
// ─────────────────────────────────────────────────────────────────────

export type SectionKind = 'circuit' | 'superset' | 'straight' | 'warmup' | 'cooldown';

export interface ProgramSection {
  kind: SectionKind;
  label?: string;           // 'Warm-up', 'Superset 1', 'Cool-down'
  rounds?: number;          // circuit / superset rounds
  rest?: string;            // '60-90 sec'
  exercises: ProgramExercise[];
}

// ─────────────────────────────────────────────────────────────────────
// Slot data — the JSONB payload stored in program_slots.data
// ─────────────────────────────────────────────────────────────────────

export interface SlotData {
  sections: ProgramSection[];
}

// ─────────────────────────────────────────────────────────────────────
// DB row types
// ─────────────────────────────────────────────────────────────────────

export interface DBProgram {
  id: string;
  name: string;
  client_id: string | null;
  weeks: number;
  notes: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface DBProgramSlot {
  id: string;
  program_id: string;
  position: number;         // 1-based
  label: string | null;
  data: SlotData;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────
// Queue resolution result
// ─────────────────────────────────────────────────────────────────────

export interface QueueState {
  program: DBProgram;
  slots: DBProgramSlot[];
  totalSlots: number;       // weeks × slot_count (queue length)
  slotCount: number;        // number of distinct slots
  currentWeek: number;      // 1-based
  nextPosition: number;     // 1-based index into rotation
  nextSlot: DBProgramSlot | null;
  exhausted: boolean;       // true when all slots in the queue are assigned
  completedCount: number;   // sessions completed with this program
}

// ─────────────────────────────────────────────────────────────────────
// Parsed program (from paste parser)
// ─────────────────────────────────────────────────────────────────────

export interface ParsedSlot {
  label: string;
  data: SlotData;
}

export interface ParsedProgram {
  name?: string;
  weeks?: number;
  slots: ParsedSlot[];
}
