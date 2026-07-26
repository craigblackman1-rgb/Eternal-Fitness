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
}

// --- date/time helpers (mirrors BlockScheduler's local<->ISO handling) ---

function todayLocalISODate(): string {
  return toLocalISODate(new Date());
}

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local "YYYY-MM-DD" for a stored ISO timestamp — used to bucket by day. */
function isoToLocalDate(iso: string): string {
  return toLocalISODate(new Date(iso));
}

function isoToLocalTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function localPartsToISO(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, min, 0, 0).toISOString();
}

function shiftDay(isoDate: string, delta: number): string {
  const [y, mo, d] = isoDate.split("-").map(Number);
  const next = new Date(y, mo - 1, d);
  next.setDate(next.getDate() + delta);
  return toLocalISODate(next);
}

function formatDayHeading(isoDate: string): string {
  const [y, mo, d] = isoDate.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimeRange(iso: string, durationMinutes: number): { start: string; end: string } {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return { start: fmt(start), end: fmt(end) };
}

async function patchSession(id: string, body: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

/**
 * Pairwise overlap detection across DIFFERENT clients for one day's entries.
 * A session occupies `[scheduled_at, scheduled_at + duration)`. Two entries
 * conflict when their intervals overlap and they belong to different clients
 * (a client can't conflict with themselves — back-to-back own sessions are
 * fine). Returns the set of entry ids that are in at least one conflict.
 * Warn only — nothing is blocked (Work Order, Lane D).
 */
function findConflictIds(entries: ScheduledEntry[]): Set<string> {
  const conflicts = new Set<string>();
  const ranges = entries.map((e) => {
    const start = new Date(e.scheduledAt).getTime();
    return { e, start, end: start + e.durationMinutes * 60_000 };
  });
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const a = ranges[i];
      const b = ranges[j];
      if (a.e.clientId && b.e.clientId && a.e.clientId === b.e.clientId) continue;
      if (a.start < b.end && b.start < a.end) {
        conflicts.add(a.e.id);
        conflicts.add(b.e.id);
      }
    }
  }
  return conflicts;
}

export function ScheduleCalendar({ entries }: { entries: ScheduledEntry[] }) {
  const router = useRouter();
  const [day, setDay] = useState<string>(todayLocalISODate());

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
        <div className="p-5">
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
                  className={cn(
                    "px-5 py-4",
                    conflicted && "border-l-4 border-l-[var(--status-warning-border)] bg-[var(--status-warning-bg)]/40",
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
                              href={`/hub/clients/${entry.clientNumber}`}
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
                        <p className="text-xs text-muted-foreground">
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
                          className="gap-1.5 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
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
                        className="rounded-lg bg-destructive text-white hover:bg-destructive/90"
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
