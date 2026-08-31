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
 * Cancelled sessions with charged_free IS NULL are neither consumed nor free —
 * they are unreviewed and surfaced for human decision. Guessing charged takes
 * money from clients; guessing free gives away Esther revenue. Neither is
 * guessed.
 */

export interface SessionPotBreakdown {
  /** Sessions that have been completed. */
  completed: number;
  /** Cancelled sessions explicitly marked as charged. */
  chargedCancellations: number;
  /** Cancelled sessions explicitly marked as free. */
  freeCancellations: number;
  /** Cancelled sessions without a charged_free flag — awaiting review. */
  unreviewedCancellations: number;
  /** Total sessions that consumed a slot: completed + charged. */
  used: number;
  /** Total purchased (from the client record). */
  purchased: number;
  /** Remaining = purchased - used. */
  remaining: number;
  /** Total sessions in the block (session rows). */
  totalInBlock: number;
  /** Unreviewed cancellations that may affect the count — surfaced for human decision. */
  unreviewed: number;
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
  let unreviewedCancellations = 0;

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
        // No charged_free flag — not yet decided. Do not guess.
        unreviewedCancellations++;
      }
    }
  }

  const used = completed + chargedCancellations;
  const purchased = sessionsPurchased ?? sessions.length;
  const remaining = Math.max(purchased - used, 0);

  return {
    completed,
    chargedCancellations,
    freeCancellations,
    unreviewedCancellations,
    used,
    purchased,
    remaining,
    totalInBlock: sessions.length,
    unreviewed: unreviewedCancellations,
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
 * NULL is never consumed here — it is surfaced for human decision instead.
 */
export function wouldConsumeSession(chargedFree: ChargedFree | null): boolean {
  return chargedFree === "charged";
}
