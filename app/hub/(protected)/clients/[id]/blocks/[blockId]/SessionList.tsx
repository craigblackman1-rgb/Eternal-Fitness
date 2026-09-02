"use client";

import { useState } from "react";
import { SessionRow } from "./SessionRow";
import { SubSessionRow } from "./SubSessionRow";
import { AssignWorkoutDialog } from "./AssignWorkoutDialog";
import { deriveSessionStatus } from "@/lib/session-status";
import { isoToLocalTime } from "@/lib/schedule-dates";
import { sessionWorkoutName, sessionHasNoExercises } from "@/lib/session-display";
import type { SessionStatus, DBSession } from "@/types";

interface SessionItem {
  id: string;
  session_number: number;
  archetype: string | null;
  week: number | null;
  phase: string | null;
  data: {
    focus_label?: string;
    session_log?: { completed_at?: string | null } | null;
    versions?: {
      studio?: { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
      home?: { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
    };
  };
  scheduled_at: string | null;
  /** CR-EF-145 — projected date for unbooked sessions (display-only). */
  projected_at?: string | null;
  status: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  cancel_reason: string | null;
  charged_free?: "charged" | "free" | null;
}

interface SessionListProps {
  sessions: SessionItem[];
  totalSessions: number;
  clientId: string;
  blockId: string;
  archetypeTint: Record<string, string>;
  /** Chronological positions keyed by session id — derived from scheduled_at,
   *  NOT from session_number. */
  chronologicalPositions: Map<string, { position: number; total: number }>;
  /** CR-EF-126 — all sessions in the block (including sub-sessions) for nesting */
  allSessions?: DBSession[];
}

function sessionStatus(s: SessionItem): SessionStatus {
  return deriveSessionStatus({
    status: s.status,
    cancelled_at: s.cancelled_at,
    scheduled_at: s.scheduled_at,
    completed_at: s.completed_at,
    session_log: s.data?.session_log,
  });
}

function formatDayLabel(
  session: SessionItem,
  totalSessions: number,
  chronologicalPositions: Map<string, { position: number; total: number }>,
): string {
  if (session.scheduled_at) {
    const d = new Date(session.scheduled_at);
    const date = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    return `${date} · ${isoToLocalTime(session.scheduled_at)}`;
  }
  const pos = chronologicalPositions.get(session.id);
  const posLabel = pos ? `${pos.position} of ${pos.total}` : `${session.session_number} of ${totalSessions}`;
  return `Session ${posLabel} · not yet booked`;
}

export function SessionList({
  sessions,
  totalSessions,
  clientId,
  blockId,
  archetypeTint,
  chronologicalPositions,
  allSessions = [],
}: SessionListProps) {
  const [assignSessionId, setAssignSessionId] = useState<string | null>(null);

  // CR-EF-126 — build map of parent_session_id → sub-sessions for nesting
  const subSessionsByParent = new Map<string, DBSession[]>();
  for (const s of allSessions) {
    if (s.parent_session_id) {
      const existing = subSessionsByParent.get(s.parent_session_id) ?? [];
      existing.push(s);
      subSessionsByParent.set(s.parent_session_id, existing);
    }
  }

  return (
    <>
      {sessions.map((session) => {
        const focusLabel = sessionWorkoutName(session, "—");
        const status = sessionStatus(session);
        const sessionUrl = `/hub/clients/${clientId}/blocks/${blockId}/sessions/${session.session_number}`;
        const dayLabel = formatDayLabel(session, totalSessions, chronologicalPositions);
        const children = subSessionsByParent.get(session.id) ?? [];

        return (
          <div key={session.id}>
            <SessionRow
              sessionId={session.id}
              archetypeLabel={session.archetype || "Session"}
              archetypeTint={session.archetype ? (archetypeTint[session.archetype] || "bg-muted text-muted-foreground") : "bg-muted text-muted-foreground"}
              focusLabel={focusLabel}
              status={status}
              dayLabel={dayLabel}
              chronologicalPosition={chronologicalPositions.get(session.id) ?? null}
              sessionUrl={sessionUrl}
              scheduledAt={session.scheduled_at}
              projectedAt={session.projected_at}
              cancelReason={session.cancel_reason}
              chargedFree={session.charged_free}
              isEmpty={sessionHasNoExercises(session.data)}
              onAssignWorkout={setAssignSessionId}
            />
            {/* CR-EF-126 — sub-sessions nested under parent */}
            {children.map((child) => (
              <SubSessionRow
                key={child.id}
                subSession={child}
                clientId={clientId}
                blockId={blockId}
              />
            ))}
          </div>
        );
      })}

      <AssignWorkoutDialog
        open={assignSessionId !== null}
        onOpenChange={(open) => { if (!open) setAssignSessionId(null); }}
        sessionId={assignSessionId || ""}
        blockId={blockId}
      />
    </>
  );
}
