import { deriveSessionStatus } from "./session-status";

/**
 * CR-EF-144 — workout assignment rolling helpers.
 *
 * When a session is cancelled or moved out, the workout CONTENT rolls forward:
 * the vacated session's workout moves onto the next planned session, that
 * session's workout onto the one after, etc. Booked dates/times do not change.
 */

interface RollSession {
  id: string;
  session_number: number;
  data: Record<string, unknown> | null;
  archetype: string | null;
  status?: string | null;
  cancelled_at?: string | null;
  completed_at?: string | null;
  scheduled_at?: string | null;
  parent_session_id?: string | null;
}

export interface RollPair {
  sourceId: string;
  targetId: string;
  sourceData: Record<string, unknown> | null;
  sourceArchetype: string | null;
}

/**
 * Compute the ordered data-swap pairs for workout roll-forward.
 *
 * Returns pairs in execution order: first pair moves vacated session's data
 * to the next available session, second pair moves that session's data to the
 * one after, etc.
 *
 * Never touches completed or settled sessions. Only rolls across
 * genuinely planned/scheduled-not-delivered sessions in session_number order.
 * Sub-sessions (parent_session_id set) are excluded.
 */
export function computeRollForwardPlan(
  sessions: RollSession[],
  vacatedSessionNumber: number,
): RollPair[] {
  const plan: RollPair[] = [];

  const laterSessions = sessions
    .filter((s) => {
      if (s.session_number <= vacatedSessionNumber) return false;
      if (s.parent_session_id) return false;
      const st = deriveSessionStatus({
        status: s.status,
        cancelled_at: s.cancelled_at,
        completed_at: s.completed_at,
        scheduled_at: s.scheduled_at,
      });
      return st !== "completed" && st !== "cancelled";
    })
    .sort((a, b) => a.session_number - b.session_number);

  for (let i = 0; i < laterSessions.length; i++) {
    const target = laterSessions[i];
    // Source is the session before in the chain: vacated session for i=0,
    // the previous later session for i>0
    const source = i === 0
      ? sessions.find((s) => s.session_number === vacatedSessionNumber)
      : laterSessions[i - 1];

    if (source) {
      plan.push({
        sourceId: source.id,
        targetId: target.id,
        sourceData: source.data,
        sourceArchetype: source.archetype,
      });
    }
  }

  return plan;
}

/**
 * Resolve the max week from a list of sessions, defaulting to 1.
 * Used by adjust-sessions and carry-over routes when adding new sessions.
 */
export function resolveMaxWeek(
  sessions: { week?: number | null; parent_session_id?: string | null }[],
): number {
  const potSessions = sessions.filter((s) => !s.parent_session_id);
  const maxWeek = potSessions.reduce(
    (max, s) => (s.week != null && s.week > max ? s.week : max),
    0,
  );
  return maxWeek > 0 ? maxWeek : 1;
}
