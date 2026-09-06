/**
 * Pure queue resolution — client-safe functions split from queue.ts (CR-EF-154 P11).
 *
 * Queue rules:
 *  - Slots rotate positionally A → B → A → B.
 *  - The pointer advances ONLY when a session is COMPLETED (never by calendar).
 *  - Week = floor(completed_program_sessions / slot_count) + 1, capped at program.weeks.
 *  - Total queue length = weeks × slot_count.
 *  - Sessions beyond the queue stay unassigned.
 *  - Supplementary sessions (parent_session_id) NEVER consume a slot.
 */

import type {
  DBProgram,
  DBProgramSlot,
  SlotData,
  ProgramExercise,
} from './types';

// ─────────────────────────────────────────────────────────────────────
// Pure: resolveQueue
// ─────────────────────────────────────────────────────────────────────

export interface QueueResult {
  totalSlots: number;
  nextPosition: number;   // 1-based index into the slot rotation
  currentWeek: number;    // 1-based
  exhausted: boolean;
}

/**
 * Given a program, its slots, and the count of completed sessions, resolve
 * the queue position.
 *
 * @param program   - the program row
 * @param slots     - program's slots, ordered by position
 * @param completedCount - sessions completed with this program (excludes sub-sessions)
 */
export function resolveQueue(
  program: DBProgram,
  slots: DBProgramSlot[],
  completedCount: number,
): QueueResult {
  const slotCount = slots.length;
  if (slotCount === 0) {
    return { totalSlots: 0, nextPosition: 1, currentWeek: 1, exhausted: true };
  }

  const totalSlots = program.weeks * slotCount;

  const nextPosition = (completedCount % slotCount) + 1;

  const currentWeek = Math.min(
    Math.floor(completedCount / slotCount) + 1,
    program.weeks,
  );

  const exhausted = completedCount >= totalSlots;

  return { totalSlots, nextPosition, currentWeek, exhausted };
}

// ─────────────────────────────────────────────────────────────────────
// Pure: resolveSlotForWeek — apply week_bands to slot data
// ─────────────────────────────────────────────────────────────────────

/**
 * Given slot data and a current week, return a new SlotData with week_bands
 * applied. For each exercise that has week_bands, if a band covers the current
 * week, its values override the base sets/reps/weight.
 */
export function resolveSlotForWeek(slotData: SlotData, week: number): SlotData {
  return {
    sections: slotData.sections.map((section) => ({
      ...section,
      exercises: section.exercises.map((ex) => applyWeekBands(ex, week)),
    })),
  };
}

function applyWeekBands(exercise: ProgramExercise, week: number): ProgramExercise {
  if (!exercise.week_bands || exercise.week_bands.length === 0) {
    return exercise;
  }

  const band = exercise.week_bands.find(
    (b) => week >= b.from_week && week <= b.to_week,
  );

  if (!band) return exercise;

  return {
    ...exercise,
    exercise_name: band.exercise_name ?? exercise.exercise_name,
    sets: band.sets ?? exercise.sets,
    reps: band.reps ?? exercise.reps,
    weight: band.weight ?? exercise.weight,
    notes: band.notes ?? exercise.notes,
  };
}
