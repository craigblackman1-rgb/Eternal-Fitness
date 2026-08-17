"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HubCard, HubCardHeader, HubAlert, EmptyState } from "@/components/hub";
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
} from "@/lib/schedule-dates";

export interface ScheduledEntry {
  /** Session id — the PATCH target. */
  id: string;
  clientId: string | null;
  clientName: string;
  /** Used to link to the client detail page (/hub/clients/[client_number]). */
  clientNumber: number | null;
  sessionNumber: number;
  archetype: string;
  blockNumber: number | null;
  /** ISO timestamp of the booking. */
  scheduledAt: string;
  durationMinutes: number;
  /** false when the session is booked but has no prescribed exercises yet —
   * a first-class, expected state (see the month view), not an edge case. */
  hasWorkout: boolean;
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
}: {
  entries: ScheduledEntry[];
  /** Lands on a specific date instead of today — used when jumping in from the month view. */
  initialDay?: string;
}) {
  const router = useRouter();
  const [day, setDay] = useState<string>(initialDay ?? todayLocalISODate());

  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("10:00");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const dayEntries = useMemo(
    () =>
      entries
        .filter((e) => isoToLocalDate(e.scheduledAt) === day)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [entries, day],
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
            subtitle="Sorted by start time"
            color="teal"
            noBottomPadding
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
                          {entry.clientNumber != null ? (
                            <Link
                              href={`/hub/log/${entry.id}`}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:text-rose"
                            >
                              {entry.clientName}
                              <IconExternalLink className="h-3 w-3 text-muted-foreground" />
                            </Link>
                          ) : (
                            <span className="text-sm font-semibold text-foreground">{entry.clientName}</span>
                          )}
                          {conflicted && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-warning-text)]">
                              <IconTriangleAlert className="h-3 w-3" />
                              Clash
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-[3px]">
                          {entry.blockNumber != null && `Block ${entry.blockNumber} · `}
                          Session {entry.sessionNumber}
                          {entry.archetype && ` · ${entry.archetype}`} · {entry.durationMinutes} min
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {!isRescheduling && !isCancelling && (
                      <div className="flex items-center gap-2 shrink-0">
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
      </HubCard>
    </div>
  );
}
