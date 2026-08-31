"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { IconCalendar, IconClock, IconX, IconCheckCircle } from "@/components/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DBSession } from "@/types";
import { HubCard, HubCardHeader } from "@/components/hub";
import {
  WEEKDAY_LABELS,
  generatePatternDates,
  type Weekday,
  type RepeatingPattern,
} from "@/lib/scheduling";

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Split a stored ISO timestamp into local "YYYY-MM-DD" and "HH:MM" for inputs. */
function isoToLocalParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${day}`, time: `${h}:${min}` };
}

/** Combine local date + time strings into an ISO (UTC) timestamp for storage. */
function localPartsToISO(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, min, 0, 0).toISOString();
}

function formatScheduled(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function patchSession(id: string, body: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export function BlockScheduler({
  sessions,
  onChanged,
}: {
  sessions: DBSession[];
  onChanged: () => void;
}) {
  // --- Pattern form state ---
  const [weekdays, setWeekdays] = useState<Set<Weekday>>(new Set());
  const [time, setTime] = useState("10:00");
  const [startDate, setStartDate] = useState(todayLocalISODate());
  const [applying, setApplying] = useState(false);

  // --- Per-session inline editing state ---
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("10:00");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const ordered = [...sessions].sort((a, b) => a.session_number - b.session_number);

  const toggleWeekday = (day: Weekday) => {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleApplyPattern = async () => {
    if (weekdays.size === 0) {
      toast.error("Pick at least one day of the week");
      return;
    }
    if (!startDate || !time) {
      toast.error("Set a start date and time");
      return;
    }
    const pattern: RepeatingPattern = {
      weekdays: [...weekdays],
      time,
      startDate,
    };
    const dates = generatePatternDates(pattern, ordered.length);
    if (dates.length < ordered.length) {
      toast.error("Could not generate enough dates for this pattern");
      return;
    }

    setApplying(true);
    try {
      const results = await Promise.all(
        ordered.map((session, i) => patchSession(session.id, { scheduled_at: dates[i].toISOString() })),
      );
      if (results.some((ok) => !ok)) {
        toast.error("Some sessions failed to schedule");
      } else {
        toast.success(`Scheduled ${ordered.length} sessions`);
      }
      onChanged();
    } finally {
      setApplying(false);
    }
  };

  const startReschedule = (session: DBSession) => {
    setCancelId(null);
    setRescheduleId(session.id);
    if (session.scheduled_at) {
      const parts = isoToLocalParts(session.scheduled_at);
      setRescheduleDate(parts.date);
      setRescheduleTime(parts.time);
    } else {
      setRescheduleDate(todayLocalISODate());
      setRescheduleTime("10:00");
    }
  };

  const saveReschedule = async (session: DBSession) => {
    if (!rescheduleDate || !rescheduleTime) {
      toast.error("Set a date and time");
      return;
    }
    setBusyId(session.id);
    const ok = await patchSession(session.id, {
      scheduled_at: localPartsToISO(rescheduleDate, rescheduleTime),
    });
    setBusyId(null);
    if (!ok) {
      toast.error("Failed to reschedule");
      return;
    }
    toast.success("Session rescheduled");
    setRescheduleId(null);
    onChanged();
  };

  const startCancel = (session: DBSession) => {
    setRescheduleId(null);
    setCancelId(session.id);
    setCancelReason(session.cancel_reason ?? "");
  };

  const saveCancel = async (session: DBSession) => {
    setBusyId(session.id);
    const ok = await patchSession(session.id, {
      cancelled_at: new Date().toISOString(),
      cancel_reason: cancelReason.trim() === "" ? null : cancelReason.trim(),
      charged_free: "charged", // CR-EF-099 default to charged; CancelSessionDialog overrides
    });
    setBusyId(null);
    if (!ok) {
      toast.error("Failed to cancel");
      return;
    }
    toast.success("Session cancelled");
    setCancelId(null);
    onChanged();
  };

  const unCancel = async (session: DBSession) => {
    setBusyId(session.id);
    const ok = await patchSession(session.id, { cancelled_at: null, cancel_reason: null, charged_free: null });
    setBusyId(null);
    if (!ok) {
      toast.error("Failed to un-cancel");
      return;
    }
    toast.success("Session restored");
    onChanged();
  };

  return (
    <div className="space-y-6">
      {/* Apply a repeating pattern */}
      <HubCard>
        <HubCardHeader title="Apply a repeating pattern" subtitle="Schedule every session in this block at once. Adjust individual sessions below afterwards." />
        <div className="space-y-4 pb-5">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Days of the week</p>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS.map((wd) => {
                const active = weekdays.has(wd.value);
                return (
                  <button
                    key={wd.value}
                    type="button"
                    onClick={() => toggleWeekday(wd.value)}
                    className={cn(
                      "rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                      active
                        ? "border-rose bg-rose text-white"
                        : "border-[var(--hub-field-border)] bg-white text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground",
                    )}
                  >
                    {wd.short}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Time of day</p>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-36 rounded-lg" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Start date</p>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-44 rounded-lg" />
            </div>
            <Button
              onClick={handleApplyPattern}
              disabled={applying}
              className="gap-2 rounded-lg bg-rose text-white hover:bg-rose/90"
            >
              <IconCalendar className="h-4 w-4" />
              {applying ? "Applying..." : `Apply to ${ordered.length} sessions`}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Sessions are scheduled in order, cycling through the chosen days from the start date. Re-applying overwrites every session&rsquo;s date.
          </p>
        </div>
      </HubCard>

      {/* Per-session schedule with reschedule / cancel */}
      <HubCard>
        <HubCardHeader title="Session schedule" />
        <div className="pb-5">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--hub-border)] hover:bg-transparent">
                <TableHead className="w-12 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-[var(--hub-hover)] h-10">#</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-[var(--hub-hover)] h-10">Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-[var(--hub-hover)] h-10">Scheduled for</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-[var(--hub-hover)] h-10">Status</TableHead>
                <TableHead className="w-[280px] text-right text-xs uppercase tracking-wider text-muted-foreground font-medium bg-[var(--hub-hover)] h-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordered.map((session) => {
                const isCancelled = !!session.cancelled_at;
                const isRescheduling = rescheduleId === session.id;
                const isCancelling = cancelId === session.id;
                const busy = busyId === session.id;
                return (
                  <TableRow key={session.id} className="border-[var(--hub-border)] hover:bg-[var(--hub-hover)] align-top">
                    <TableCell className="font-medium text-sm py-2.5">{session.session_number}</TableCell>
                    <TableCell className="text-sm py-2.5">
                      <Badge
                        variant={session.archetype === "A" ? "secondary" : session.archetype === "B" ? "default" : "outline"}
                        className="rounded-full"
                      >
                        {session.archetype}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm py-2.5">
                      {session.scheduled_at ? (
                        <span className={cn("flex items-center gap-1.5 font-semibold text-foreground", isCancelled && "line-through opacity-60")}>
                          <IconClock className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatScheduled(session.scheduled_at)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not scheduled</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm py-2.5">
                      {isCancelled ? (
                        <div className="space-y-0.5">
                          <Badge variant="destructive" className="rounded-full">Cancelled</Badge>
                          {session.cancel_reason && (
                            <p className="text-xs text-muted-foreground">{session.cancel_reason}</p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="rounded-full text-muted-foreground">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm py-2.5">
                      {isRescheduling ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Input
                            type="date"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            className="w-36 rounded-lg"
                          />
                          <Input
                            type="time"
                            value={rescheduleTime}
                            onChange={(e) => setRescheduleTime(e.target.value)}
                            className="w-28 rounded-lg"
                          />
                          <Button size="sm" disabled={busy} onClick={() => saveReschedule(session)} className="rounded-lg bg-rose text-white hover:bg-rose/90">
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRescheduleId(null)} className="rounded-lg">
                            Cancel
                          </Button>
                        </div>
                      ) : isCancelling ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Input
                            type="text"
                            placeholder="Reason (optional)"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-48 rounded-lg"
                          />
                          <Button size="sm" disabled={busy} onClick={() => saveCancel(session)} className="rounded-lg bg-destructive text-white hover:bg-destructive/90">
                            Confirm
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setCancelId(null)} className="rounded-lg">
                            Back
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => startReschedule(session)} className="gap-1.5 rounded-lg">
                            <IconCalendar className="h-3.5 w-3.5" />
                            {session.scheduled_at ? "Reschedule" : "Schedule"}
                          </Button>
                          {isCancelled ? (
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => unCancel(session)} className="gap-1.5 rounded-lg">
                              <IconCheckCircle className="h-3.5 w-3.5" />
                              Un-cancel
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => startCancel(session)} className="gap-1.5 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive">
                              <IconX className="h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </HubCard>
    </div>
  );
}
