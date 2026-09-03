"use client";

import Link from "next/link";
import { deriveSessionStatus } from "@/lib/session-status";
import type { DBSession } from "@/types";

interface SubSessionRowProps {
  subSession: DBSession;
  clientId: string;
  blockId: string;
}

/**
 * CR-EF-126 — sub-session row nested under its parent in the block session list.
 * Indented with a rose left-border spine. Never numbered; nesting replaces identity.
 * States: not logged yet / partially logged / logged / never logged.
 */
export function SubSessionRow({ subSession, clientId, blockId }: SubSessionRowProps) {
  const status = deriveSessionStatus({
    status: subSession.status,
    cancelled_at: subSession.cancelled_at,
    scheduled_at: subSession.scheduled_at,
    completed_at: subSession.completed_at,
    session_log: subSession.data?.session_log,
  });
  const isSettled = status === "completed" || status === "cancelled";

  // CR-EF-125 — derive tag from supplementary_source_id.
  const isSupplementary = !!subSession.supplementary_source_id;

  // Derive logged state from session-level signals (set_logs not available here).
  const hasSessionLog = !!subSession.data?.session_log?.completed_at;
  const hasStarted = !!subSession.data?.session_log?.started_at;

  let stateLabel: string;
  let stateClass: string;
  if (hasSessionLog) {
    stateLabel = "Logged";
    stateClass = "text-[var(--teal)] bg-[var(--status-success-bg)] border-[var(--status-success-border)]";
  } else if (isSettled && !hasStarted) {
    stateLabel = "Never logged";
    stateClass = "text-[var(--status-danger)] bg-[var(--status-danger-bg)] border-[var(--status-danger-border)]";
  } else if (hasStarted) {
    stateLabel = "In progress";
    stateClass = "text-[var(--status-warning-text)] bg-[var(--status-warning-bg)] border-[var(--status-warning-border)]";
  } else {
    stateLabel = "Not logged yet";
    stateClass = "text-muted-foreground bg-[var(--hub-hover)] border-[var(--hub-border)]";
  }

  const sessionUrl = `/hub/clients/${clientId}/blocks/${blockId}/sessions/${subSession.session_number}?session=${subSession.id}`;
  const name = subSession.data?.focus_label || "Supplementary work";

  return (
    <div className="border-t border-[var(--hub-border)]">
      {/* 117px indent = date column (104px) + gap (13px), so nested work aligns
          with the parent's workout name, not under its date. */}
      <div className="flex items-center gap-2.5 ml-[117px] pr-4 py-2.5 hover:bg-[var(--hub-hover)] transition-colors">
        {/* Rose spine — "hangs off the session above" cue */}
        <div className="w-[3px] self-stretch -ml-2.5 rounded-l-[10px] bg-rose shrink-0" />

        {/* Icon */}
        <div className="w-[26px] h-[26px] rounded-lg flex items-center justify-center bg-rose/10 text-rose shrink-0">
          <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={13} height={13}>
            <path d="M16 6v20M6 16h20" />
          </svg>
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-bold text-foreground flex items-center gap-2 flex-wrap">
            {name}
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider rounded-full px-1.5 py-0.5 bg-rose/10 text-rose border border-rose/20">
              {isSupplementary ? "Every session" : "This session only"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0 text-[11px] font-semibold ${stateClass}`}>
              {stateLabel}
            </span>
            <span className="text-[var(--hub-field-border)]">·</span>
            <span>Supplementary work</span>
            <span className="text-[var(--hub-field-border)]">·</span>
            <span className="font-bold text-body">no session used</span>
          </div>
        </div>

        {/* Action */}
        <Link
          href={sessionUrl}
          className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-xs font-medium text-foreground hover:bg-[var(--hub-hover)] transition-colors shrink-0"
        >
          Open
        </Link>
      </div>
    </div>
  );
}
