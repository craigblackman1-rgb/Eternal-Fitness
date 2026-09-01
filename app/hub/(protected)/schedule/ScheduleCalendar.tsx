"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HubCard, HubCardHeader, HubAlert, EmptyState, OutlookBookingsBadge } from "@/components/hub";
import { SessionStatusPill, sessionStatusColors } from "@/components/hub/SessionStatusPill";
import type { SessionStatus } from "@/types";
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconTriangleAlert,
  IconX,
  IconExternalLink,
} from "@/components/icons";
import {
  todayLocalISODate,
  isoToLocalDate,
  isoToLocalTime,
  localPartsToISO,
  shiftDay,
  formatDayHeading,
  formatTimeRange,
  findConflictIds,
  londonDayKey,
} from "@/lib/schedule-dates";

export interface ScheduledEntry {
  /** Session id — the PATCH target. */
  id: string;
  clientId: string | null;
  clientName: string;
  /** Used to link to the client detail page (/hub/clients/[client_number]). */
  clientNumber: number | null;
  /** Block id — used to deep-link to the consolidated session screen. */
  blockId: string | null;
  sessionNumber: number;
  archetype: string;
  blockNumber: number | null;
  /** ISO timestamp of the booking. */
  scheduledAt: string;
  durationMinutes: number;
  /** Lifecycle state (CR-EF-037) — the 5-state pill this entry renders. */
  status: SessionStatus;
  /** When the session was actually completed — may differ from scheduledAt. */
  completedAt: string | null;
  /** When the booking was cancelled. NULL = not cancelled. */
  cancelledAt: string | null;
  /** Free-text cancellation reason — shown on the day view when a cancelled
   *  entry is revealed via the "Show cancelled" toggle. */
  cancelReason: string | null;
  /** CR-EF-115 — resolved workout name via sessionWorkoutName(). */
  focusLabel: string;
}

/** Outlook booking that hasn't been triaged into a session yet. */
export interface UnconfirmedBooking {
  id: string;
  subject: string | null;
  parsed_name: string | null;
  start_at: string;
  end_at: string;
  client_id: string | null;
}

async function patchSession(id: string, body: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export function ScheduleCalendar({
  entries,
  initialDay,
  unconfirmedBookings,
}: {
  entries: ScheduledEntry[];
  /** Lands on a specific date instead of today — used when jumping in from the month view. */
  initialDay?: string;
  /** Outlook bookings not yet triaged into sessions. */
  unconfirmedBookings?: UnconfirmedBooking[];
}) {
  const router = useRouter();
  const [day, setDay] = useState<string>(initialDay ?? todayLocalISODate());

  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("10:00");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  const dayEntries = useMemo(
    () =>
      entries
        .filter((e) => isoToLocalDate(e.scheduledAt) === day)
        .filter((e) => showCancelled || e.status !== "cancelled")
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [entries, day, showCancelled],
  );

  const conflictIds = useMemo(() => findConflictIds(dayEntries), [dayEntries]);
  const conflictCount = conflictIds.size;

  const startReschedule = (entry: ScheduledEntry) => {
    setCancelId(null);
    setRescheduleId(entry.id);
    setRescheduleDate(isoToLocalDate(entry.scheduledAt));
    setRescheduleTime(isoToLocalTime(entry.scheduledAt));
  };

  const saveReschedule = async (entry: ScheduledEntry) => {
    if (!rescheduleDate || !rescheduleTime) {
      toast.error("Set a date and time");
      return;
    }
    setBusyId(entry.id);
    const ok = await patchSession(entry.id, {
      scheduled_at: localPartsToISO(rescheduleDate, rescheduleTime),
    });
    setBusyId(null);
    if (!ok) {
      toast.error("Failed to reschedule");
      return;
    }
    toast.success("Session rescheduled");
    setRescheduleId(null);
    router.refresh();
  };

  const startCancel = (entry: ScheduledEntry) => {
    setRescheduleId(null);
    setCancelId(entry.id);
    setCancelReason("");
  };

  const saveCancel = async (entry: ScheduledEntry) => {
    setBusyId(entry.id);
    const ok = await patchSession(entry.id, {
      cancelled_at: new Date().toISOString(),
      cancel_reason: cancelReason.trim() === "" ? null : cancelReason.trim(),
    });
    setBusyId(null);
    if (!ok) {
      toast.error("Failed to cancel");
      return;
    }
    toast.success("Session cancelled");
    setCancelId(null);
    router.refresh();
  };

  const isToday = day === todayLocalISODate();

  return (
    <div className="space-y-4">
      {/* Day navigation */}
      <HubCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDay(shiftDay(day, -1))}
              aria-label="Previous day"
              className="rounded-lg"
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDay(shiftDay(day, 1))}
              aria-label="Next day"
              className="rounded-lg"
            >
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-1">
              <p className="text-sm font-semibold text-foreground">{formatDayHeading(day)}</p>
              <p className="text-xs text-muted-foreground">
                {dayEntries.length} {dayEntries.length === 1 ? "session" : "sessions"}
                {conflictCount > 0 && ` · ${conflictCount} in a clash`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={day}
              onChange={(e) => e.target.value && setDay(e.target.value)}
              className="w-44 rounded-lg"
            />
            <Button
              variant={isToday ? "secondary" : "outline"}
              onClick={() => setDay(todayLocalISODate())}
              disabled={isToday}
              className="rounded-lg"
            >
              Today
            </Button>
            <OutlookBookingsBadge />
          </div>
        </div>
      </HubCard>

      {conflictCount > 0 && (
        <HubAlert severity="warning" title="Overlapping bookings on this day">
          {conflictCount} {conflictCount === 1 ? "session" : "sessions"} overlap with another
          client&rsquo;s session. Bookings are never blocked — adjust a time below if this is a real
          clash.
        </HubAlert>
      )}

      {/* Day list */}
      <HubCard padded={false}>
        <div className="px-5 pt-4 pb-3">
          <HubCardHeader
            icon={<IconCalendar className="h-4 w-4" />}
            title="Sessions"
            subtitle="Sorted by start time · cancelled hidden by default"
            color="teal"
            noBottomPadding
            action={
              <label className="inline-flex cursor-pointer select-none items-center gap-2 text-xs font-semibold text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showCancelled}
                  onChange={(e) => setShowCancelled(e.target.checked)}
                  className="h-3.5 w-3.5 accent-teal"
                />
                Show cancelled
              </label>
            }
          />
        </div>
        {dayEntries.length === 0 ? (
          <EmptyState
            icon={<IconCalendar className="h-9 w-9" />}
            title="Nothing booked this day"
            description="Use the block review page to apply a schedule pattern, or jump to another day."
          />
        ) : (
          <ul className="divide-y divide-[var(--hub-border)]">
            {dayEntries.map((entry) => {
              const { start, end } = formatTimeRange(entry.scheduledAt, entry.durationMinutes);
              const conflicted = conflictIds.has(entry.id);
              const isRescheduling = rescheduleId === entry.id;
              const isCancelling = cancelId === entry.id;
              const busy = busyId === entry.id;
              const cancelled = entry.status === "cancelled";
              const settled = entry.status === "completed" || cancelled;
              const sessionUrl =
                entry.clientNumber != null && entry.blockId != null
                  ? `/hub/clients/${entry.clientNumber}/blocks/${entry.blockId}/sessions/${entry.sessionNumber}`
                  : null;
              return (
                <li
                  key={entry.id}
                  style={conflicted ? { backgroundColor: "rgba(247, 239, 221, 0.5)" } : undefined}
                  className={cn(
                    "px-5 py-4",
                    conflicted && "border-l-4 border-l-[var(--status-warning-border)]",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Time + client */}
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                        <IconClock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">{start}</span>
                        <span className="text-xs text-muted-foreground">– {end}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {sessionUrl ? (
                            <Link
                              href={sessionUrl}
                              className={cn(
                                "inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:text-rose",
                                cancelled && "text-muted-foreground line-through",
                              )}
                            >
                              {entry.clientName}
                              <IconExternalLink className="h-3 w-3 text-muted-foreground" />
                            </Link>
                          ) : (
                            <span className={cn("text-sm font-semibold text-foreground", cancelled && "text-muted-foreground line-through")}>
                              {entry.clientName}
                            </span>
                          )}
                          {entry.status === "completed" &&
                          entry.completedAt &&
                          londonDayKey(entry.completedAt) !== londonDayKey(entry.scheduledAt) ? (
                            <span
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                              style={{
                                color: sessionStatusColors("completed").color,
                                backgroundColor: sessionStatusColors("completed").background,
                                borderColor: sessionStatusColors("completed").border,
                              }}
                              title="Completed on a different day than booked"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" width={11} height={11} className="shrink-0" aria-hidden="true">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                              Completed {new Date(entry.completedAt).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" })}
                            </span>
                          ) : (
                            <SessionStatusPill status={entry.status} />
                          )}
                          {conflicted && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-warning-text)]">
                              <IconTriangleAlert className="h-3 w-3" />
                              Clash
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-[3px]">
                          {entry.focusLabel}
                          {` · ${entry.durationMinutes} min`}
                          {cancelled && entry.cancelReason && ` · ${entry.cancelReason}`}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {!isRescheduling && !isCancelling && (
                      <div className="flex items-center gap-2 shrink-0">
                        {settled ? (
                          sessionUrl ? (
                            <Link
                              href={sessionUrl}
                              className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-[var(--hub-hover)] transition-colors"
                            >
                              View
                            </Link>
                          ) : null
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startReschedule(entry)}
                              className="gap-1.5 rounded-lg"
                            >
                              <IconCalendar className="h-3.5 w-3.5" />
                              Reschedule
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startCancel(entry)}
                              className="gap-1.5 rounded-lg text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)] hover:text-[var(--status-danger)]"
                            >
                              <IconX className="h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inline reschedule */}
                  {isRescheduling && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="w-40 rounded-lg"
                      />
                      <Input
                        type="time"
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="w-28 rounded-lg"
                      />
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => saveReschedule(entry)}
                        className="rounded-lg bg-rose text-white hover:bg-rose/90"
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRescheduleId(null)} className="rounded-lg">
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Inline cancel */}
                  {isCancelling && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Reason (optional)"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-56 rounded-lg"
                      />
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => saveCancel(entry)}
                        className="rounded-lg bg-[var(--status-danger)] text-white hover:opacity-90"
                      >
                        Confirm cancel
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setCancelId(null)} className="rounded-lg">
                        Back
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {/* EF-101 — unconfirmed Outlook bookings for this day */}
        {unconfirmedBookings && (() => {
          const dayBookings = unconfirmedBookings
            .filter((b) => isoToLocalDate(b.start_at) === day)
            .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
          if (dayBookings.length === 0) return null;
          return (
            <ul className="divide-y divide-[var(--hub-border)] border-t border-dashed border-[var(--hub-border)]">
              {dayBookings.map((booking) => {
                const startFmt = new Date(booking.start_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                const endFmt = new Date(booking.end_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                const label = booking.parsed_name ?? booking.subject ?? "Unknown";
                return (
                  <li key={booking.id} className="px-5 py-3">
                    <Link
                      href="/hub/schedule/outlook"
                      className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-[var(--hub-field-border)] bg-[var(--hub-hover)] px-4 py-3 transition-colors hover:border-rose/40"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                          <IconClock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-semibold text-foreground">{startFmt}</span>
                          <span className="text-xs text-muted-foreground">– {endFmt}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{label}</p>
                          <p className="text-xs text-muted-foreground">Unconfirmed booking</p>
                        </div>
                      </div>
                      <IconExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          );
        })()}
      </HubCard>
    </div>
  );
}
