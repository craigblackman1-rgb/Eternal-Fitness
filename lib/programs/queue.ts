/**
 * Queue resolution — CR-EF-154 P3.
 *
 * DB-backed helper for the program queue.
 * Pure functions (resolveQueue, resolveSlotForWeek) live in ./resolve.ts
 * so they can be safely imported by client components without pulling in pg.
 */

export { resolveQueue, resolveSlotForWeek } from './resolve';
export type { QueueResult } from './resolve';

import { supabase } from '@/lib/supabase';
import type {
  DBProgram,
  DBProgramSlot,
  QueueState,
} from './types';
import { resolveQueue } from './resolve';

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
