"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ScheduleCalendar, type ScheduledEntry, type UnconfirmedBooking } from "./ScheduleCalendar";
import { MonthCalendar } from "./MonthCalendar";
import { CalendarSpine, type SpineView } from "./CalendarSpine";
import { PlannedSessionsStrip } from "./PlannedSessionsStrip";
import { TriageQueue, type TriageBooking } from "./TriageQueue";
import { SessionDetail } from "./SessionDetail";
import { OffDayGuardDialog } from "./OffDayGuardDialog";
import { toLocalISODate, londonDayKey } from "@/lib/schedule-dates";
import type { SessionStatus } from "@/types";

type ViewMode = "month" | "spine";

/** Planned entry stripped to what the PlannedSessionsStrip needs. */
interface PlannedEntry {
  id: string;
  clientName: string;
  blockNumber: number | null;
  sessionNumber: number;
  archetype: string;
  durationMinutes: number;
}

async function patchSession(id: string, body: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export function ScheduleShell({
  entries,
  unconfirmedBookings,
  plannedEntries,
}: {
  entries: ScheduledEntry[];
  unconfirmedBookings?: UnconfirmedBooking[];
  plannedEntries?: PlannedEntry[];
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("spine");
  const [jumpDay, setJumpDay] = useState<string | undefined>(undefined);
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guardSession, setGuardSession] = useState<{
    id: string;
    clientName: string;
    focus: string;
    scheduledAt: string;
    durationMinutes: number;
  } | null>(null);

  const jumpToDay = (isoDate: string) => {
    setJumpDay(isoDate);
    setViewMode("spine");
  };

  const handleSelectSession = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  // Convert unconfirmed bookings to triage format
  const triageBookings: TriageBooking[] = (unconfirmedBookings ?? []).map((b) => ({
    id: b.id,
    clientName: b.parsed_name ?? b.subject ?? "Unknown",
    sessionNumber: 0,
    blockNumber: null,
    focus: b.subject ?? "",
    scheduledAt: b.start_at,
    durationMinutes: Math.round((new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 60_000),
    source: "Outlook",
    requestedAt: null,
    note: null,
    sessionUrl: "/hub/schedule/outlook",
    clientId: b.client_id,
  }));

  const handleConfirmTriage = async (id: string) => {
    const res = await fetch(`/api/outlook-bookings/${id}/confirm`, { method: "POST" });
    if (!res.ok) throw new Error("Confirm failed");
    router.refresh();
  };

  const handleDeclineTriage = async (id: string) => {
    const res = await fetch(`/api/outlook-bookings/${id}/dismiss`, { method: "POST" });
    if (!res.ok) throw new Error("Decline failed");
    router.refresh();
  };

  const handleOffDayConfirm = async (mode: "today" | "booked") => {
    if (!guardSession) return;
    const entry = entries.find((e) => e.id === guardSession.id);
    if (!entry) return;

    if (mode === "today") {
      // Move booking to today + complete now
      const now = new Date();
      const todayISO = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        new Date(entry.scheduledAt).getHours(),
        new Date(entry.scheduledAt).getMinutes(),
      ).toISOString();
      const ok = await patchSession(entry.id, {
        scheduled_at: todayISO,
        data: {
          ...((entry as unknown as { data?: Record<string, unknown> }).data ?? {}),
          session_log: {
            ...((entry as unknown as { data?: { session_log?: Record<string, unknown> } }).data?.session_log ?? {}),
            completed_at: now.toISOString(),
          },
        },
        confirm_off_day: true,
      });
      if (ok) {
        toast.success("Completed against today. The booking moved, so booking and delivery agree.");
        setGuardSession(null);
        router.refresh();
      } else {
        toast.error("Failed to complete session");
      }
    } else {
      // Keep booking, back-date completed_at (off-day flag)
      const endMs = new Date(entry.scheduledAt).getTime() + entry.durationMinutes * 60_000;
      const ok = await patchSession(entry.id, {
        data: {
          ...((entry as unknown as { data?: Record<string, unknown> }).data ?? {}),
          session_log: {
            ...((entry as unknown as { data?: { session_log?: Record<string, unknown> } }).data?.session_log ?? {}),
            completed_at: new Date(endMs).toISOString(),
          },
        },
        confirm_off_day: true,
      });
      if (ok) {
        toast.success("Completed against the booked date, and flagged Off-day until you reconcile it.");
        setGuardSession(null);
        router.refresh();
      } else {
        toast.error("Failed to complete session");
      }
    }
  };

  const selectedEntry = selectedId ? entries.find((e) => e.id === selectedId) ?? null : null;

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-[var(--hub-border)] bg-[var(--hub-canvas)] p-0.5">
          {(["spine", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewMode(v)}
              className={
                "rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-colors " +
                (viewMode === v ? "bg-[var(--hub-card)] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
              }
            >
              {v === "spine" ? "Calendar" : "Month"}
            </button>
          ))}
        </div>
        {viewMode === "spine" && (
          <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs font-semibold text-muted-foreground ml-auto">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="h-3.5 w-3.5 accent-teal"
            />
            Show cancelled
          </label>
        )}
      </div>

      {viewMode === "month" ? (
        <MonthCalendar entries={entries} onJumpToDay={jumpToDay} />
      ) : (
        <div className="grid gap-5 max-[1180px]:grid-cols-1 grid-cols-[minmax(0,1fr)_330px]">
          {/* Calendar spine */}
          <div className="min-w-0 space-y-0 hub-card overflow-hidden" data-od-id="calendar-spine">
            <PlannedSessionsStrip
              plannedEntries={plannedEntries ?? []}
              onSelectSession={handleSelectSession}
              selectedId={selectedId}
            />
            <CalendarSpine
              entries={entries}
              showCancelled={showCancelled}
              onSelectSession={handleSelectSession}
              selectedId={selectedId}
              initialDate={jumpDay}
            />
          </div>

          {/* Right rail */}
          <aside className="space-y-4 max-[1180px]:static max-[1180px]:order-first" data-od-id="schedule-rail" style={{ position: "sticky", top: 78 }}>
            <TriageQueue
              bookings={triageBookings}
              onConfirm={handleConfirmTriage}
              onDecline={handleDeclineTriage}
              now={new Date()}
            />
            <SessionDetail
              entry={selectedEntry}
              now={new Date()}
              onComplete={(entry) => {
                // Check if this is an off-day completion
                const now = new Date();
                const scheduledDay = londonDayKey(entry.scheduledAt);
                const todayDay = toLocalISODate(now);
                if (scheduledDay !== todayDay) {
                  // Open the guard dialog
                  setGuardSession({
                    id: entry.id,
                    clientName: entry.clientName,
                    focus: entry.archetype ? `${entry.archetype} session` : `Session ${entry.sessionNumber}`,
                    scheduledAt: entry.scheduledAt,
                    durationMinutes: entry.durationMinutes,
                  });
                } else {
                  // Complete directly
                  patchSession(entry.id, {
                    data: {
                      session_log: { completed_at: now.toISOString() },
                    },
                    confirm_off_day: true,
                  }).then((ok) => {
                    if (ok) {
                      toast.success("Completed.");
                      router.refresh();
                    } else {
                      toast.error("Failed to complete");
                    }
                  });
                }
              }}
            />
          </aside>
        </div>
      )}

      {/* Off-day guard dialog */}
      <OffDayGuardDialog
        open={guardSession !== null}
        onClose={() => setGuardSession(null)}
        onConfirm={handleOffDayConfirm}
        session={guardSession ?? { id: "", clientName: "", focus: "", scheduledAt: "", durationMinutes: 60 }}
        now={new Date()}
      />
    </div>
  );
}
