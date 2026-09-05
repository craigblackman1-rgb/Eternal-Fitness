"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CancelSessionDialog } from "@/components/hub/CancelSessionDialog";
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
  /** Needed by the cancel dialog to re-derive the session pot. */
  clientName?: string;
  sessionsPurchased?: number | null;
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
  // BUG-EF-115 — a completed session with no booked date is not "not yet
  // booked"; it was performed without an Outlook-imported slot. Show the
  // truth of the data, never fabricate a date.
  const status = deriveSessionStatus({
    status: session.status,
    cancelled_at: session.cancelled_at,
    scheduled_at: session.scheduled_at,
    completed_at: session.completed_at,
    session_log: session.data?.session_log,
  });
  if (status === "completed") {
    return session.completed_at
      ? `Completed ${new Date(session.completed_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`
      : "Completed — date unknown";
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
  clientName = "",
  sessionsPurchased = null,
}: SessionListProps) {
  const router = useRouter();
  const [assignSessionId, setAssignSessionId] = useState<string | null>(null);
  const [cancelSession, setCancelSession] = useState<DBSession | null>(null);
  const [suppParentId, setSuppParentId] = useState<string | null>(null);
  const [suppName, setSuppName] = useState("");
  const [savingSupp, setSavingSupp] = useState(false);

  const byId = new Map(allSessions.map((s) => [s.id, s]));

  // Same endpoint and shape BlockPoolView used -- supplementary work attaches
  // to a parent slot and deliberately does not consume a session from the pot.
  const createSupplementary = async (parentId: string) => {
    const parent = byId.get(parentId);
    if (!parent) return;
    if (!suppName.trim()) { toast.error("Name the supplementary work"); return; }
    setSavingSupp(true);
    try {
      const res = await fetch(`/api/blocks/${blockId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focus_label: suppName.trim(),
          scheduled_at: parent.scheduled_at,
          parent_session_id: parent.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to create" }));
        toast.error(err.error || "Failed to create supplementary session");
        return;
      }
      toast.success("Supplementary work added");
      setSuppParentId(null);
      setSuppName("");
      router.refresh();
    } finally {
      setSavingSupp(false);
    }
  };

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
              onCancel={(id) => { const full = byId.get(id); if (full) setCancelSession(full); }}
              onAddSupplementary={(id) => { setSuppParentId(id); setSuppName(""); }}
              canCancel={status !== "completed" && status !== "cancelled"}
            />
            {suppParentId === session.id && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--hub-hover)] border-t border-[var(--hub-border)]">
                <input
                  autoFocus
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createSupplementary(session.id); if (e.key === "Escape") setSuppParentId(null); }}
                  placeholder="What runs alongside this session?"
                  className="flex-1 h-8 rounded-nested border border-[var(--hub-field-border)] px-2 text-[13px]"
                />
                <button type="button" disabled={savingSupp} onClick={() => createSupplementary(session.id)}
                  className="h-8 px-2.5 rounded-nested bg-rose text-white text-xs font-semibold disabled:opacity-50">
                  {savingSupp ? "Adding…" : "Add"}
                </button>
                <button type="button" onClick={() => setSuppParentId(null)}
                  className="h-8 px-2.5 rounded-nested border border-[var(--hub-border)] bg-white text-xs font-semibold">
                  Cancel
                </button>
              </div>
            )}
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

      {cancelSession && (
        <CancelSessionDialog
          open={!!cancelSession}
          onOpenChange={(open) => { if (!open) setCancelSession(null); }}
          session={cancelSession}
          clientName={clientName}
          sessionsPurchased={sessionsPurchased}
          allSessions={allSessions}
          childCount={allSessions.filter((s) => s.parent_session_id === cancelSession.id).length}
        />
      )}
    </>
  );
}
