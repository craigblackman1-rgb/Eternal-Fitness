/**
 * Queue resolution — CR-EF-154 P3.
 *
 * Pure functions + one DB-backed helper for the program queue.
 *
 * Queue rules:
 *  - Slots rotate positionally A → B → A → B.
 *  - The pointer advances ONLY when a session is COMPLETED (never by calendar).
 *  - Week = floor(completed_program_sessions / slot_count) + 1, capped at program.weeks.
 *  - Total queue length = weeks × slot_count.
 *  - Sessions beyond the queue stay unassigned.
 *  - Supplementary sessions (parent_session_id) NEVER consume a slot.
 */

import { supabase } from '@/lib/supabase';
import type {
  DBProgram,
  DBProgramSlot,
  QueueState,
  SlotData,
  ProgramSection,
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

  // Pointer is 1-based position in the rotation, derived from completed count.
  // completedCount = 0 → nextPosition = 1 (first slot)
  // completedCount = 1 → nextPosition = 2
  // completedCount = slotCount → nextPosition = 1 (wrapped)
  const nextPosition = (completedCount % slotCount) + 1;

  // Week = floor(completedCount / slotCount) + 1, capped at program.weeks
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
    sets: band.sets ?? exercise.sets,
    reps: band.reps ?? exercise.reps,
    weight: band.weight ?? exercise.weight,
  };
}

// ─────────────────────────────────────────────────────────────────────
// DB-backed: getClientProgramState
// ─────────────────────────────────────────────────────────────────────

/**
 * Load the client's active program, its slots, count completed sessions,
 * and return the resolved queue state.
 *
 * Returns null if the client has no active program.
 */
export async function getClientProgramState(
  clientId: string,
): Promise<QueueState | null> {
  // 1. Load client to get active_program_id
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('active_program_id')
    .eq('id', clientId)
    .single();

  if (clientErr || !client?.active_program_id) return null;

  const programId = client.active_program_id;

  // 2. Load program
  const { data: program, error: progErr } = await supabase
    .from('programs')
    .select('*')
    .eq('id', programId)
    .single();

  if (progErr || !program) return null;

  // 3. Load slots ordered by position
  const { data: slots, error: slotsErr } = await supabase
    .from('program_slots')
    .select('*')
    .eq('program_id', programId)
    .order('position', { ascending: true });

  if (slotsErr || !slots) return null;

  // 4. Count completed sessions with this program (exclude sub-sessions)
  const { count, error: countErr } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('program_id', programId)
    .eq('status', 'completed')
    .is('parent_session_id', null);

  if (countErr) return null;

  const completedCount = count ?? 0;
  const slotCount = slots.length;
  const queue = resolveQueue(program as DBProgram, slots as DBProgramSlot[], completedCount);

  // 5. Resolve the next slot from the rotation
  const nextSlot = slotCount > 0
    ? (slots as DBProgramSlot[]).find((s) => s.position === queue.nextPosition) ?? null
    : null;

  return {
    program: program as DBProgram,
    slots: slots as DBProgramSlot[],
    totalSlots: queue.totalSlots,
    slotCount,
    currentWeek: queue.currentWeek,
    nextPosition: queue.nextPosition,
    nextSlot,
    exhausted: queue.exhausted,
    completedCount,
  };
}
