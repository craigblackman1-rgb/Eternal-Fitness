import type { DBSession, ChargedFree } from "@/types";

/**
 * CR-EF-099 — Session pot counter logic.
 *
 * A session "consumes" a slot from the client's pot when:
 *   - It is completed (status = 'completed'), OR
 *   - It is cancelled with charged_free = 'charged'
 *
 * A cancellation with charged_free = 'free' does NOT consume a slot.
 * A reschedule (cancelled + rebooked) does NOT consume a slot.
 *
 * Legacy cancelled sessions (charged_free IS NULL) are treated as consuming
 * a slot for safety — better to under-count remaining than over-count.
 */

export interface SessionPotBreakdown {
  /** Sessions that have been completed. */
  completed: number;
  /** Cancelled sessions explicitly marked as charged. */
  chargedCancellations: number;
  /** Cancelled sessions explicitly marked as free. */
  freeCancellations: number;
  /** Cancelled sessions without a charged_free flag (legacy). */
  legacyCancellations: number;
  /** Total sessions that consumed a slot: completed + charged + legacy. */
  used: number;
  /** Total purchased (from the client record). */
  purchased: number;
  /** Remaining = purchased - used. */
  remaining: number;
  /** Total sessions in the block (session rows). */
  totalInBlock: number;
}

/**
 * Derive the session pot breakdown from a list of sessions in a block.
 * `sessionsPurchased` comes from the client record (not derived from session rows).
 */
export function deriveSessionPot(
  sessions: Pick<DBSession, "status" | "charged_free" | "cancelled_at">[],
  sessionsPurchased: number | null,
): SessionPotBreakdown {
  let completed = 0;
  let chargedCancellations = 0;
  let freeCancellations = 0;
  let legacyCancellations = 0;

  for (const s of sessions) {
    const status = s.status ?? deriveStatusFromColumns(s);
    if (status === "completed") {
      completed++;
    } else if (status === "cancelled") {
      if (s.charged_free === "charged") {
        chargedCancellations++;
      } else if (s.charged_free === "free") {
        freeCancellations++;
      } else {
        // Legacy: no charged_free flag. Treat as charged for safety.
        legacyCancellations++;
      }
    }
  }

  const used = completed + chargedCancellations + legacyCancellations;
  const purchased = sessionsPurchased ?? sessions.length;
  const remaining = Math.max(purchased - used, 0);

  return {
    completed,
    chargedCancellations,
    freeCancellations,
    legacyCancellations,
    used,
    purchased,
    remaining,
    totalInBlock: sessions.length,
  };
}

/** Fallback status derivation for sessions without a first-class status column. */
function deriveStatusFromColumns(
  s: Pick<DBSession, "status" | "charged_free" | "cancelled_at">,
): string {
  if (s.cancelled_at) return "cancelled";
  return s.status ?? "planned";
}

/**
 * Whether a given cancellation action would consume a session.
 * Used by the cancellation dialog to show the consequence before confirming.
 */
export function wouldConsumeSession(chargedFree: ChargedFree | null): boolean {
  return chargedFree === "charged" || chargedFree === null;
}
