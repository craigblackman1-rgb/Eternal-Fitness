import type { SessionStatus } from "@/types";

/**
 * The fields a caller can hand to deriveSessionStatus. Each surface passes the
 * columns it happens to have — the derivation only cares about the precedence,
 * not which of the overlapping sources is present.
 */
export interface SessionStatusSource {
  /** First-class lifecycle state (CR-EF-037 Phase 1) — the source of truth. */
  status?: SessionStatus | string | null;
  cancelled_at?: string | null;
  /** First-class mirror of data.session_log.completed_at (Phase 1). */
  completed_at?: string | null;
  scheduled_at?: string | null;
  /** Legacy performed record held inside the JSON payload. */
  session_log?: { completed_at?: string | null } | null;
}

/**
 * Defensive derivation of a session's lifecycle status. The first-class
 * `status` column is the source of truth, but it can lag the older
 * JSON/columns (the transition API only syncs on complete/cancel, not on
 * schedule). This applies the migration's own backfill precedence —
 * cancelled > completed > in_progress > scheduled > planned — so a
 * freshly-scheduled session never reads as "Planned" and a cancelled
 * session never reads as "Completed".
 */
export function deriveSessionStatus(source: SessionStatusSource): SessionStatus {
  if (source.cancelled_at || source.status === "cancelled") return "cancelled";
  if (source.completed_at || source.session_log?.completed_at || source.status === "completed") {
    return "completed";
  }
  if (source.status === "in_progress") return "in_progress";
  if (source.scheduled_at || source.status === "scheduled") return "scheduled";
  return "planned";
}
