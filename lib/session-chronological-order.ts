/**
 * Derives the chronological "Session N of M" position for every session in a
 * block. Sessions are ordered by `scheduled_at` (NULLs last), so undated
 * sessions always sink to the end and never claim an early ordinal.
 *
 * This does NOT touch `session_number` — that column drives the A-B-C workout
 * rotation and must stay as-is. Only the human-facing label changes.
 */

interface ChronologicalPosition {
  position: number;
  total: number;
}

/**
 * Build a Map<sessionId, { position, total }> from an array of sessions.
 * Accepts any object with `id` and `scheduled_at` — works with DBSession,
 * SessionRow, or the portal's lightweight shape.
 */
export function deriveChronologicalPositions(
  sessions: { id: string; scheduled_at: string | null }[],
): Map<string, ChronologicalPosition> {
  const sorted = [...sessions].sort((a, b) => {
    if (!a.scheduled_at && !b.scheduled_at) return 0;
    if (!a.scheduled_at) return 1;
    if (!b.scheduled_at) return -1;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });

  const total = sorted.length;
  const map = new Map<string, ChronologicalPosition>();

  sorted.forEach((s, i) => {
    map.set(s.id, { position: i + 1, total });
  });

  return map;
}

/** Format a "Session N of M" label from a chronological position. */
export function sessionChronologicalLabel(
  position: number,
  total: number,
): string {
  return `Session ${position} of ${total}`;
}
