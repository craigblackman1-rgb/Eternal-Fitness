"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SessionStatusPill } from "@/components/hub/SessionStatusPill";
import { CancelSessionDialog } from "@/components/hub/CancelSessionDialog";
import { SessionPotCounter } from "@/components/hub/SessionPotCounter";
import { deriveSessionPot } from "@/lib/session-pot";
import { isoToLocalDate, isoToLocalTime, localPartsToISO, todayLocalISODate } from "@/lib/schedule-dates";
import { deriveSessionStatus } from "@/lib/session-status";
import type { DBSession, SessionStatus, ChargedFree } from "@/types";

interface BlockPoolViewProps {
  sessions: DBSession[];
  clientId: string;
  blockId: string;
  clientName: string;
  sessionsPurchased: number | null;
  blockExpiryDate: string | null;
  blockExpiryExtensions?: { from: string; to: string; at: string; reason?: string }[];
}

interface SlotData {
  session: DBSession;
  status: SessionStatus;
  hasWorkout: boolean;
  focusLabel: string;
  dayLabel: string;
  dayTime: string;
}

/**
 * CR-EF-099 — Booked slots vs workout pool with strict rotation.
 *
 * Two separate models on one screen:
 *   - Booked slots = calendar reality (Outlook owns the dates)
 *   - Workout pool = planned work available to assign
 *
 * Strict rotation (Craig, 31 Aug 2026): the suggestion is always the earliest
 * pool workout not yet delivered in the current cycle. Skipping one leaves it
 * next in line rather than losing it. A charged cancellation costs a session
 * but does not advance the rotation.
 */
export function BlockPoolView({
  sessions,
  clientId,
  blockId,
  clientName,
  sessionsPurchased,
  blockExpiryDate,
  blockExpiryExtensions = [],
}: BlockPoolViewProps) {
  const router = useRouter();
  const [cancelSession, setCancelSession] = useState<DBSession | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("10:00");
  const [saving, setSaving] = useState(false);

  const pot = deriveSessionPot(sessions, sessionsPurchased);
  const extended = blockExpiryExtensions.length > 0;
  const originalExpiry = extended ? blockExpiryExtensions[0]?.from : null;

  // Build slot data from sessions, sorted by session_number
  const ordered = [...sessions].sort((a, b) => a.session_number - b.session_number);

  const slotData: SlotData[] = ordered.map((s) => {
    const status = deriveSessionStatus({
      status: s.status,
      cancelled_at: s.cancelled_at,
      scheduled_at: s.scheduled_at,
      completed_at: s.completed_at,
      session_log: s.data?.session_log,
    });
    const hasWorkout = hasWorkoutContent(s);
    const focusLabel = s.data?.focus_label ?? `Session ${s.session_number}`;
    const dayLabel = s.scheduled_at
      ? new Date(s.scheduled_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
      : `Session ${s.session_number}`;
    const dayTime = s.scheduled_at ? isoToLocalTime(s.scheduled_at) : "";
    return { session: s, status, hasWorkout, focusLabel, dayLabel, dayTime };
  });

  // Booked slots = sessions with scheduled_at
  const bookedSlots = slotData.filter((s) => s.session.scheduled_at);
  // Unbooked = sessions without scheduled_at
  const unbookedSessions = slotData.filter((s) => !s.session.scheduled_at);

  // Rotation: all non-cancelled, non-completed sessions in order
  const rotationPool = slotData.filter(
    (s) => s.status !== "completed" && s.status !== "cancelled",
  );

  // Strict rotation: the earliest undelivered workout
  const spokenWorkouts = new Set(
    bookedSlots.filter((s) => s.hasWorkout).map((s) => s.session.id),
  );
  const nextInRotation = rotationPool.find((s) => !spokenWorkouts.has(s.session.id));

  const startReschedule = (session: DBSession) => {
    if (session.scheduled_at) {
      setReschedDate(isoToLocalDate(session.scheduled_at));
      setReschedTime(isoToLocalTime(session.scheduled_at));
    } else {
      setReschedDate(todayLocalISODate());
      setReschedTime("10:00");
    }
    setRescheduleId(session.id);
  };

  const saveReschedule = async (session: DBSession) => {
    if (!reschedDate || !reschedTime) {
      toast.error("Set a date and time");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: localPartsToISO(reschedDate, reschedTime) }),
      });
      if (!res.ok) {
        toast.error("Failed to reschedule");
        return;
      }
      toast.success("Session rescheduled");
      setRescheduleId(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const suggestForSlot = (slotIndex: number): SlotData | null => {
    // Find workouts not yet spoken for (not assigned to any earlier slot)
    const earlierSpoken = new Set<string>();
    for (let i = 0; i < slotIndex; i++) {
      if (bookedSlots[i]?.hasWorkout) {
        earlierSpoken.add(bookedSlots[i].session.id);
      }
    }
    return rotationPool.find((s) => !earlierSpoken.has(s.session.id)) ?? null;
  };

  return (
    <div className="space-y-4">
      {/* Session Pot Counter */}
      <SessionPotCounter
        pot={pot}
        blockExpiryDate={blockExpiryDate}
        extended={extended}
        originalExpiry={originalExpiry}
      />

      {/* Rotation Ribbon */}
      {rotationPool.length > 0 && (
        <div className="bg-[var(--hub-card)] rounded-[16px] border border-[var(--hub-border)] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--hub-border)]">
            <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center bg-rose/10 text-rose shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={16} height={16}>
                <path d="M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2" />
                <path d="M18 3v4h-4M6 21v-4h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground leading-tight">Rotation order</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Fixed sequence — workouts cycle in order, then restart</p>
            </div>
          </div>
          <div className="flex items-center gap-0 px-4 py-4 overflow-x-auto">
            {rotationPool.map((s, i) => {
              const isDone = s.status === "completed";
              const isNext = nextInRotation?.session.id === s.session.id;
              const isAssigned = spokenWorkouts.has(s.session.id);
              const letter = String.fromCharCode(65 + i); // A, B, C, ...

              let dotClass = "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground";
              let capLabel = "Queued";
              if (isDone) {
                dotClass = "bg-[var(--s-success-bg)] border-[var(--s-success-bd)] text-[var(--teal)]";
                capLabel = "Delivered";
              } else if (isAssigned) {
                dotClass = "bg-rose/10 border-rose/20 text-rose";
                capLabel = "Assigned";
              } else if (isNext) {
                dotClass = "bg-rose border-rose text-white shadow-[0_0_0_4px_rgba(193,131,159,.14)]";
                capLabel = "Next up";
              }

              return (
                <span key={s.session.id} className="contents">
                  {i > 0 && <span className="flex-1 min-w-3.5 h-[1.5px] bg-[var(--hub-border)] mt-[-20px]" />}
                  <div className="flex flex-col items-center gap-1.5 shrink-0 w-[62px]">
                    <span className={`w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] font-extrabold border-[1.5px] ${dotClass}`}>
                      {letter}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider text-center leading-tight ${isNext ? "text-rose" : "text-muted-foreground"}`}>
                      {capLabel}
                    </span>
                  </div>
                </span>
              );
            })}
          </div>
          <div className="flex items-start gap-2.5 px-4 py-3 border-t border-dashed border-[var(--hub-field-border)] bg-[var(--hub-hover)] text-xs text-muted-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={14} height={14} className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span>
              <b className="text-body">Next up is derived, not stored.</b> If Esther overrides a suggestion, the skipped workout stays at the front of the queue.
            </span>
          </div>
        </div>
      )}

      {/* Two-panel split: Booked Slots | Workout Pool */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-4 items-start">
        {/* Booked Slots */}
        <div className="bg-[var(--hub-card)] rounded-[16px] border border-[var(--hub-border)] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--hub-border)]">
            <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center bg-[var(--s-success-bg)] text-[var(--teal)] shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={16} height={16}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground leading-tight">Booked slots</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bookedSlots.filter((s) => s.status === "scheduled" || s.status === "in_progress").length} upcoming · Outlook owns the dates
              </p>
            </div>
          </div>

          <div>
            {bookedSlots.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No sessions booked yet. Schedule sessions from the Block Scheduler.
              </div>
            ) : (
              bookedSlots.map((slot) => {
                const isSettled = slot.status === "completed" || slot.status === "cancelled";
                const isToday = slot.session.scheduled_at && isTodayCheck(slot.session.scheduled_at);

                return (
                  <div
                    key={slot.session.id}
                    className={`flex items-center gap-3.5 px-4 py-3 border-b border-[var(--hub-border)] last:border-b-0 hover:bg-[var(--hub-hover)] transition-colors ${isToday ? "bg-rose/5" : ""}`}
                  >
                    {/* When */}
                    <div className="min-w-[104px] shrink-0">
                      <div className={`text-[13px] font-bold ${isSettled ? "text-muted-foreground" : "text-foreground"}`}>
                        {slot.dayLabel}
                      </div>
                      <div className="text-[11.5px] text-muted-foreground">{slot.dayTime}</div>
                    </div>

                    {/* Main */}
                    <div className="flex-1 min-w-0">
                      {slot.hasWorkout ? (
                        <div className={`text-[13.5px] font-semibold ${isSettled ? "text-muted-foreground" : "text-foreground"} truncate`}>
                          {slot.focusLabel}
                        </div>
                      ) : (
                        <div className="text-[13px] text-muted-foreground italic">No workout attached</div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <SessionStatusPill status={slot.status} />
                        {slot.status === "completed" && (
                          <span className="text-[11px] font-bold text-[var(--status-danger)]">&minus;1 session</span>
                        )}
                        {slot.status === "cancelled" && (
                          <span className={`text-[11px] font-bold ${
                            slot.session.charged_free === "free" ? "text-muted-foreground" : "text-[var(--status-danger)]"
                          }`}>
                            {slot.session.charged_free === "free" ? "no session used" : slot.session.charged_free === "charged" ? "&minus;1 session" : "charged"}
                          </span>
                        )}
                        {slot.status !== "completed" && slot.status !== "cancelled" && (
                          <span className="text-[11px] font-bold text-muted-foreground">no session used</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {(slot.status === "scheduled" || slot.status === "in_progress") && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCancelSession(slot.session)}
                            className="h-7 rounded-lg text-xs gap-1 text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)]"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startReschedule(slot.session)}
                            className="h-7 rounded-lg text-xs gap-1"
                          >
                            Move
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Unbooked sessions */}
            {unbookedSessions.length > 0 && (
              <div className="border-t border-[var(--hub-border)] bg-[repeating-linear-gradient(135deg,#FBFCFD_0_6px,#F6F7F9_6px_12px)]">
                {unbookedSessions.map((slot) => (
                  <div
                    key={slot.session.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[var(--hub-border)] last:border-b-0"
                  >
                    <div className="w-7 h-7 rounded-lg border border-dashed border-[var(--hub-field-border)] flex items-center justify-center text-muted-foreground shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={14} height={14}>
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-body">{slot.focusLabel}</div>
                      <div className="text-[11.5px] text-muted-foreground">Not yet booked</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startReschedule(slot.session)}
                      className="h-7 rounded-lg text-xs gap-1"
                    >
                      Book
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Workout Pool */}
        <div className="bg-[var(--hub-card)] rounded-[16px] border border-[var(--hub-border)] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--hub-border)]">
            <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center bg-slate/10 text-slate shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={16} height={16}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 9v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground leading-tight">Workout pool</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rotationPool.length} planned · {rotationPool.filter((s) => s.status === "completed").length} delivered
              </p>
            </div>
          </div>

          <div>
            {rotationPool.map((slot, i) => {
              const isDone = slot.status === "completed";
              const isAssigned = spokenWorkouts.has(slot.session.id);
              const isNext = nextInRotation?.session.id === slot.session.id;
              const letter = String.fromCharCode(65 + i);

              let rowClass = "";
              let tagClass = "";
              let tagLabel = "";
              if (isDone) {
                rowClass = "";
                tagClass = "bg-[var(--s-success-bg)] text-[var(--teal)] border border-[var(--s-success-bd)]";
                tagLabel = "Used";
              } else if (isAssigned) {
                rowClass = "";
                tagClass = "bg-rose/10 text-rose border border-rose/20";
                tagLabel = "Assigned";
              } else if (isNext) {
                rowClass = "bg-rose/5";
                tagClass = "bg-rose text-white border border-rose";
                tagLabel = "Next up";
              } else {
                rowClass = "bg-[repeating-linear-gradient(135deg,#FBFCFD_0_6px,#F6F7F9_6px_12px)]";
                tagClass = "bg-[var(--hub-hover)] text-slate border border-[var(--hub-border)]";
                tagLabel = "Unused";
              }

              let letterClass = "bg-[var(--hub-hover)] border-[var(--hub-border)] text-muted-foreground";
              if (isDone) letterClass = "bg-[var(--s-success-bg)] border-[var(--s-success-bd)] text-[var(--teal)]";
              else if (isAssigned) letterClass = "bg-rose/10 border-rose/20 text-rose";
              else if (isNext) letterClass = "bg-rose border-rose text-white";

              return (
                <div
                  key={slot.session.id}
                  className={`flex items-center gap-2.5 px-4 py-3 border-b border-[var(--hub-border)] last:border-b-0 hover:bg-[var(--hub-hover)] transition-colors ${rowClass}`}
                >
                  <span className={`w-8 h-8 rounded-[9px] flex items-center justify-center text-[13px] font-extrabold shrink-0 border ${letterClass}`}>
                    {letter}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[13px] font-bold ${isDone ? "text-foreground" : isAssigned ? "text-foreground" : "text-body"}`}>
                      {slot.focusLabel}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">
                      {isDone ? "Delivered" : isAssigned ? "Attached to a slot" : "Not used yet"}
                    </div>
                  </div>
                  <span className={`shrink-0 text-[10px] font-extrabold uppercase tracking-wider rounded-full px-2 py-0.5 whitespace-nowrap ${tagClass}`}>
                    {tagLabel}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 px-4 py-3 border-t border-[var(--hub-border)] bg-[var(--hub-hover)] text-xs text-muted-foreground flex-wrap">
            <span>
              Pool size is independent of block size — <b className="text-body">{rotationPool.length} workouts</b> across a <b className="text-body">{sessions.length}-session block</b>.
            </span>
          </div>
        </div>
      </div>

      {/* Reschedule inline */}
      {rescheduleId && (
        <div className="fixed bottom-4 right-4 z-[600] bg-[var(--ink)] text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
          <span>Move to</span>
          <input
            type="date"
            value={reschedDate}
            onChange={(e) => setReschedDate(e.target.value)}
            className="h-7 rounded-lg border border-white/20 bg-white/10 px-2 text-xs text-white focus:outline-none focus:border-rose"
          />
          <input
            type="time"
            value={reschedTime}
            onChange={(e) => setReschedTime(e.target.value)}
            className="h-7 rounded-lg border border-white/20 bg-white/10 px-2 text-xs text-white focus:outline-none focus:border-rose"
          />
          <button
            onClick={() => {
              const session = sessions.find((s) => s.id === rescheduleId);
              if (session) saveReschedule(session);
            }}
            disabled={saving}
            className="h-7 rounded-lg bg-rose px-3 text-xs font-semibold text-white hover:bg-rose/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setRescheduleId(null)}
            className="h-7 rounded-lg px-2.5 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Cancel Dialog */}
      {cancelSession && (
        <CancelSessionDialog
          open={!!cancelSession}
          onOpenChange={(open) => { if (!open) setCancelSession(null); }}
          session={cancelSession}
          clientName={clientName}
          sessionsPurchased={sessionsPurchased}
          allSessions={sessions}
        />
      )}
    </div>
  );
}

/** Check whether a scheduled_at timestamp is today (London time). */
function isTodayCheck(iso: string): boolean {
  const now = new Date();
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Whether a session has workout content (prescription). */
function hasWorkoutContent(session: DBSession): boolean {
  const v = session.data?.versions;
  if (!v) return false;
  const isEmpty = (arr?: unknown[]) => !arr || arr.length === 0;
  const studioEmpty = isEmpty(v.studio?.warm_up) && isEmpty(v.studio?.main_block) && isEmpty(v.studio?.cooldown);
  const homeEmpty = isEmpty(v.home?.warm_up) && isEmpty(v.home?.main_block) && isEmpty(v.home?.cooldown);
  return !studioEmpty || !homeEmpty;
}
