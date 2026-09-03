/**
 * Pure helpers extracted from the BUG-EF-124 session-creation guards.
 * Tested in lib/__tests__/session-slot.test.ts.
 */

export interface SlotRow {
  session_number: number;
  parent_session_id: string | null;
}

/**
 * Compute the next available session number for a new top-level session in a
 * block, given the existing rows. Sub-sessions are excluded — they share their
 * parent's number and do not consume a slot.
 */
export function nextSessionNumber(rows: SlotRow[]): number {
  const slotRows = rows.filter((r) => !r.parent_session_id);
  return slotRows.reduce((max, r) => Math.max(max, r.session_number), 0) + 1;
}

/**
 * Whether the pre-insert duplicate check should run. Sub-sessions
 * (parent_session_id set) legitimately share the parent's number and must not
 * be blocked by the uniqueness guard.
 */
export function shouldCheckDuplicate(parentSessionId: string | null | undefined): boolean {
  return !parentSessionId;
}
