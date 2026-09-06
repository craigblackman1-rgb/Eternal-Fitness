"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CancelSessionDialog } from "@/components/hub/CancelSessionDialog";
import { SessionRow } from "./SessionRow";
import { SubSessionRow } from "./SubSessionRow";
import { SessionChooser } from "../../SessionChooser";
import { deriveSessionStatus } from "@/lib/session-status";
import { isoToLocalTime } from "@/lib/schedule-dates";
import { sessionWorkoutName, sessionHasNoExercises } from "@/lib/session-display";
import { ensureUids } from "@/lib/exercise-ref";
import type { SessionStatus, DBSession, SessionVersion } from "@/types";
import type { QueueState } from "@/lib/programs/types";

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
  /** CR-EF-154 — program state for the guided SessionChooser. */
  programState?: QueueState | null;
  clientNumber?: number;
  sessionsRemaining?: number | null;
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
  programState = null,
  clientNumber = 0,
  sessionsRemaining = null,
}: SessionListProps) {
  const router = useRouter();
  const [chooserSessionId, setChooserSessionId] = useState<string | null>(null);
  const [chooserBusy, setChooserBusy] = useState(false);
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

  // CR-EF-154 — SessionChooser reassign handlers (mirrors TrainingSection)
  async function handleChooserProgram(sessionId: string, slotId: string) {
    setChooserBusy(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: programState?.program.id ?? null,
          program_slot_id: slotId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign");
      }
      toast.success("Session assigned to program slot");
      setChooserSessionId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setChooserBusy(false);
    }
  }

  async function handleChooserTemplate(sessionId: string, templateId: string, templateName: string) {
    setChooserBusy(true);
    try {
      const tplRes = await fetch("/api/workout-templates");
      if (!tplRes.ok) throw new Error("Could not load template data");
      const tplList: { id: string; name: string; data: SessionVersion }[] = await tplRes.json();
      const tpl = tplList.find((t) => t.id === templateId);
      if (!tpl) throw new Error("Template not found");

      const versions: Record<string, SessionVersion> = {};
      const buildVersion = (src: SessionVersion): SessionVersion => ({
        warm_up: ensureUids(src.warm_up ?? []),
        main_block: ensureUids(src.main_block ?? []),
        cooldown: ensureUids(src.cooldown ?? []),
      });
      versions.studio = buildVersion(tpl.data);
      versions.home = buildVersion(tpl.data);

      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: { versions, focus_label: tpl.name },
          source_focus_label: tpl.name,
          source_archetype: null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign template");
      }
      fetch(`/api/workout-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment_usage: true }),
      }).catch(() => {});

      toast.success(`Assigned "${tpl.name}" to session`);
      setChooserSessionId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign template");
    } finally {
      setChooserBusy(false);
    }
  }

  function handleChooserOneOff(sessionId: string) {
    setChooserSessionId(null);
    router.push(`/hub/clients/${clientNumber}/add-workout?view=chooser`);
  }

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
              onAssignWorkout={setChooserSessionId}
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

      {/* CR-EF-154 — SessionChooser replaces AssignWorkoutDialog */}
      {chooserSessionId && programState && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[var(--color-ink)]/40 backdrop-blur-sm"
            onClick={() => !chooserBusy && setChooserSessionId(null)}
          />
          <div className="relative w-full max-w-[680px] mx-4 bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_20px_60px_rgba(16,24,40,.18)] max-h-[85vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[var(--hub-border)]">
              <h3 className="m-0 text-[15.5px] font-bold text-[var(--color-ink)] tracking-tight">
                Assign this session
              </h3>
            </div>
            <div className="px-5 py-4">
              <SessionChooser
                nextSlot={programState.nextSlot}
                currentWeek={programState.currentWeek ?? 1}
                programWeeks={programState.program?.weeks ?? 1}
                slotPosition={programState.nextPosition ?? 1}
                totalSlots={programState.totalSlots ?? 0}
                sessionsRemaining={sessionsRemaining ?? 0}
                programName={programState.program?.name ?? ""}
                clientNumber={clientNumber}
                onConfirmProgram={(slotId) => handleChooserProgram(chooserSessionId, slotId)}
                onConfirmTemplate={(templateId, templateName) => handleChooserTemplate(chooserSessionId, templateId, templateName)}
                onConfirmOneOff={() => handleChooserOneOff(chooserSessionId)}
                onCancel={() => !chooserBusy && setChooserSessionId(null)}
              />
            </div>
            {chooserBusy && (
              <div className="absolute inset-0 bg-white/60 rounded-surface flex items-center justify-center pointer-events-none">
                <span className="text-[13px] font-semibold text-[var(--color-muted)]">Saving…</span>
              </div>
            )}
          </div>
        </div>
      )}

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
