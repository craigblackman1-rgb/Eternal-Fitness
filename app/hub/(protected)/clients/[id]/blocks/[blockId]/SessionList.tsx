"use client";

import { useState } from "react";
import { SessionRow } from "./SessionRow";
import { AssignWorkoutDialog } from "./AssignWorkoutDialog";
import { deriveSessionStatus } from "@/lib/session-status";
import { isoToLocalTime } from "@/lib/schedule-dates";
import { DEFAULT_ARCHETYPE_FOCUS_LABELS } from "@/lib/planAgentPrompt";
import type { SessionStatus } from "@/types";

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
  status: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  charged_free?: "charged" | "free" | null;
}

interface SessionListProps {
  sessions: SessionItem[];
  totalSessions: number;
  clientId: string;
  blockId: string;
  archetypeTint: Record<string, string>;
  archetypeNameMap?: Record<string, string | undefined>;
  /** Chronological positions keyed by session id — derived from scheduled_at,
   *  NOT from session_number. */
  chronologicalPositions: Map<string, { position: number; total: number }>;
}

function sessionStatus(s: SessionItem): SessionStatus {
  return deriveSessionStatus({
    status: s.status,
    cancelled_at: s.cancelled_at,
    scheduled_at: s.scheduled_at,
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

function isSessionEmpty(session: SessionItem): boolean {
  const v = session.data?.versions;
  const isEmptySection = (arr?: unknown[]) => !arr || arr.length === 0;
  const studioEmpty = isEmptySection(v?.studio?.warm_up) && isEmptySection(v?.studio?.main_block) && isEmptySection(v?.studio?.cooldown);
  const homeEmpty = isEmptySection(v?.home?.warm_up) && isEmptySection(v?.home?.main_block) && isEmptySection(v?.home?.cooldown);
  return studioEmpty && homeEmpty;
}

const OUTLOOK_BOOKING_PREFIX = "Outlook booking — ";

/** Detects an Outlook-auto-created session with no workout assigned.
 *  The structural signature: focus_label starts with "Outlook booking — ",
 *  archetype/week/phase are all null (the auto-create path in
 *  outlook-bookings.ts), and both versions are content-empty.
 *  A trainer's deliberately-named build-from-scratch session (which may also
 *  be content-empty) has a real focus_label and/or non-null archetype/week,
 *  so it is NOT caught here. */
function isOutlookPlaceholder(session: SessionItem): boolean {
  if (!isSessionEmpty(session)) return false;
  if (session.archetype != null || session.week != null || session.phase != null) return false;
  const label = session.data?.focus_label ?? "";
  return label.startsWith(OUTLOOK_BOOKING_PREFIX);
}

export function SessionList({
  sessions,
  totalSessions,
  clientId,
  blockId,
  archetypeTint,
  archetypeNameMap = DEFAULT_ARCHETYPE_FOCUS_LABELS,
  chronologicalPositions,
}: SessionListProps) {
  const [assignSessionId, setAssignSessionId] = useState<string | null>(null);

  return (
    <>
      {sessions.map((session) => {
        const archetypeName = archetypeNameMap[session.archetype];
        const isEmpty = isSessionEmpty(session);
        const isOutlook = isOutlookPlaceholder(session);
        const focusLabel = isOutlook
          ? "No workout assigned yet"
          : (session.data?.focus_label || archetypeName || "—");
        const status = sessionStatus(session);
        const sessionUrl = `/hub/clients/${clientId}/blocks/${blockId}/sessions/${session.session_number}`;
        const dayLabel = formatDayLabel(session, totalSessions, chronologicalPositions);

        return (
          <SessionRow
            key={session.id}
            sessionId={session.id}
            archetypeLabel={session.archetype ? `${session.archetype} · ${archetypeName || "Session"}` : "Session"}
            archetypeTint={session.archetype ? (archetypeTint[session.archetype] || "bg-muted text-muted-foreground") : "bg-muted text-muted-foreground"}
            focusLabel={focusLabel}
            status={status}
            dayLabel={dayLabel}
            chronologicalPosition={chronologicalPositions.get(session.id) ?? null}
            sessionUrl={sessionUrl}
            scheduledAt={session.scheduled_at}
            cancelReason={session.cancel_reason}
            chargedFree={session.charged_free}
            isEmpty={isEmpty}
            onAssignWorkout={setAssignSessionId}
          />
        );
      })}

      <AssignWorkoutDialog
        open={assignSessionId !== null}
        onOpenChange={(open) => { if (!open) setAssignSessionId(null); }}
        sessionId={assignSessionId || ""}
      />
    </>
  );
}
