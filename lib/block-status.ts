import { deriveSessionStatus, type SessionStatusSource } from "./session-status";
import type { BlockStatus } from "@/types";

/**
 * BUG-EF-109 — derive a block's displayed status from its sessions rather
 * than trusting the stored `blocks.status` column. If every non-sub-session
 * is settled (completed or cancelled), the block is "complete" regardless of
 * what the database says. Otherwise fall back to the stored value.
 *
 * This is the single source of truth for block status across all list views
 * and the block page itself.
 */
export function deriveBlockStatus(
  storedStatus: string,
  sessions: SessionStatusSource[],
): BlockStatus {
  const potSessions = sessions.filter((s) => !(s as any).parent_session_id);
  if (
    potSessions.length > 0 &&
    potSessions.every((s) => {
      const st = deriveSessionStatus(s);
      return st === "completed" || st === "cancelled";
    })
  ) {
    return "complete";
  }
  return storedStatus as BlockStatus;
}
