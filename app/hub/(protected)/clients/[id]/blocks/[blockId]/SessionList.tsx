"use client";

import { useState } from "react";
import { SessionRow } from "./SessionRow";
import { AssignWorkoutDialog } from "./AssignWorkoutDialog";
import type { SessionStatus } from "@/types";

interface SessionItem {
  id: string;
  session_number: number;
  archetype: string | null;
  week: number;
  data: {
    focus_label?: string;
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
  sessionStatus: (s: SessionItem) => SessionStatus;
  formatDayLabel: (s: SessionItem) => string;
  archetypeNameMap: Record<string, string | undefined>;
}

function isSessionEmpty(session: SessionItem): boolean {
  const v = session.data?.versions;
  const isEmptySection = (arr?: unknown[]) => !arr || arr.length === 0;
  const studioEmpty = isEmptySection(v?.studio?.warm_up) && isEmptySection(v?.studio?.main_block) && isEmptySection(v?.studio?.cooldown);
  const homeEmpty = isEmptySection(v?.home?.warm_up) && isEmptySection(v?.home?.main_block) && isEmptySection(v?.home?.cooldown);
  return studioEmpty && homeEmpty;
}

export function SessionList({
  sessions,
  totalSessions,
  clientId,
  blockId,
  archetypeTint,
  sessionStatus,
  formatDayLabel,
  archetypeNameMap,
}: SessionListProps) {
  const [assignSessionId, setAssignSessionId] = useState<string | null>(null);

  return (
    <>
      {sessions.map((session) => {
        const archetypeName = archetypeNameMap[session.archetype];
        const focusLabel = session.data?.focus_label || archetypeName || "—";
        const status = sessionStatus(session);
        const sessionUrl = `/hub/clients/${clientId}/blocks/${blockId}/sessions/${session.session_number}`;
        const dayLabel = formatDayLabel(session);
        const isEmpty = isSessionEmpty(session);

        return (
          <SessionRow
            key={session.id}
            sessionId={session.id}
            archetypeLabel={session.archetype ? `${session.archetype} · ${archetypeName || "Session"}` : "Session"}
            archetypeTint={session.archetype ? (archetypeTint[session.archetype] || "bg-muted text-muted-foreground") : "bg-muted text-muted-foreground"}
            focusLabel={focusLabel}
            status={status}
            dayLabel={dayLabel}
            sessionNumber={session.session_number}
            totalSessions={totalSessions}
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
