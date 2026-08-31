"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HubCard, OutlookBookingsBadge } from "@/components/hub";
import { sessionStatusColors } from "@/components/hub/SessionStatusPill";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { toLocalISODate, findConflictIds } from "@/lib/schedule-dates";
import type { ScheduledEntry } from "./ScheduleCalendar";

const WEEKDAY_HEAD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/** Monday-start 6-week (42-cell) grid starting on/before the 1st of the month. */
function buildGridDates(viewDate: Date): Date[] {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startDay = (first.getDay() + 6) % 7; // 0 = Monday
  const gridStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - startDay);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export function MonthCalendar({
  entries,
  onJumpToDay,
}: {
  entries: ScheduledEntry[];
  /** Jumps to the day view for a given "YYYY-MM-DD" — the month grid stays
   * read-only itself (per the Open Design brief); this is just navigation. */
  onJumpToDay: (isoDate: string) => void;
}) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [showCancelled, setShowCancelled] = useState(false);

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduledEntry[]>();
    for (const e of entries) {
      const key = toLocalISODate(new Date(e.scheduledAt));
      const bucket = map.get(key);
      if (bucket) bucket.push(e);
      else map.set(key, [e]);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    }
    return map;
  }, [entries]);

  const clashDates = useMemo(() => {
    const dates = new Set<string>();
    for (const [date, dayEntries] of byDate) {
      if (findConflictIds(dayEntries.filter((e) => e.status !== "cancelled")).size > 0) dates.add(date);
    }
    return dates;
  }, [byDate]);

  const gridDates = useMemo(() => buildGridDates(viewDate), [viewDate]);

  const monthCount = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const start = toLocalISODate(new Date(y, m, 1));
    const end = toLocalISODate(new Date(y, m + 1, 0));
    let count = 0;
    for (const [date, dayEntries] of byDate) {
      if (date >= start && date <= end) count += dayEntries.length;
    }
    return count;
  }, [byDate, viewDate]);

  const today = toLocalISODate(new Date());
  const isCurrentMonth =
    viewDate.getFullYear() === new Date().getFullYear() && viewDate.getMonth() === new Date().getMonth();

  const shiftMonth = (delta: number) => {
    setViewDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  };

  const goToday = () => {
    const d = new Date();
    d.setDate(1);
    setViewDate(d);
  };

  return (
    <div className="space-y-4">
      <HubCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="rounded-lg"
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="rounded-lg"
            >
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-1">
              <p className="text-sm font-semibold text-foreground">{monthLabel(viewDate)}</p>
              <p className="text-xs text-muted-foreground">
                {monthCount} {monthCount === 1 ? "session" : "sessions"} booked this month
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isCurrentMonth ? "secondary" : "outline"}
              onClick={goToday}
              disabled={isCurrentMonth}
              className="rounded-lg"
            >
              Today
            </Button>
            <OutlookBookingsBadge />
          </div>
        </div>
      </HubCard>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: sessionStatusColors("planned").color }} />
          Planned
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: sessionStatusColors("scheduled").color }} />
          Scheduled
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: sessionStatusColors("in_progress").color }} />
          In progress
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: sessionStatusColors("completed").color }} />
          Completed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: sessionStatusColors("cancelled").color }} />
          Cancelled
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--status-warning)]" />
          Clash between clients
        </span>
        <label className="ml-auto inline-flex cursor-pointer select-none items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
            className="h-3.5 w-3.5 accent-teal"
          />
          Show cancelled
        </label>
      </div>

      <HubCard>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {WEEKDAY_HEAD.map((w) => (
            <div key={w} className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {gridDates.map((d) => {
            const iso = toLocalISODate(d);
            const inMonth = d.getMonth() === viewDate.getMonth();
            const isToday = iso === today;
            const allEntries = byDate.get(iso) ?? [];
            const dayEntries = showCancelled ? allEntries : allEntries.filter((e) => e.status !== "cancelled");
            const hasClash = clashDates.has(iso);
            const shown = dayEntries.slice(0, MAX_CHIPS);
            const overflow = dayEntries.length - shown.length;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => onJumpToDay(iso)}
                style={{ borderRadius: "var(--r-nested)" }}
                className={cn(
                  "flex min-h-[112px] flex-col border border-[var(--hub-border)] bg-[var(--hub-card)] p-2 text-left shadow-sm transition-colors hover:border-rose/40",
                  !inMonth && "bg-[var(--hub-hover)]",
                )}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  {isToday ? (
                    <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-rose text-[11px] font-semibold text-white">
                      {d.getDate()}
                    </span>
                  ) : (
                    <span className={cn("text-xs font-semibold", inMonth ? "text-muted-foreground" : "text-[var(--hub-field-border)]")}>
                      {d.getDate()}
                    </span>
                  )}
                  {hasClash && (
                    <span
                      className="h-2 w-2 rounded-full bg-[var(--status-warning)]"
                      title="Clash between clients"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  {shown.map((e) => {
                    const sc = sessionStatusColors(e.status);
                    const cancelled = e.status === "cancelled";
                    return (
                      <div
                        key={e.id}
                        className={cn(
                          "flex items-baseline gap-1.5 overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-tight",
                          cancelled && "line-through",
                        )}
                        style={{
                          backgroundColor: sc.background,
                          boxShadow: `inset 3px 0 0 ${sc.color}`,
                        }}
                      >
                        <span
                          className={cn(
                            "shrink-0 font-bold tabular-nums",
                            cancelled ? "text-muted-foreground" : "text-foreground",
                          )}
                        >
                          {isoToTime(e.scheduledAt)}
                        </span>
                        <span className={cn("truncate", cancelled ? "text-muted-foreground" : "text-[var(--color-body)]")}>
                          {e.clientName}
                        </span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <span className="px-0.5 text-[11px] font-semibold text-muted-foreground">+{overflow} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </HubCard>
    </div>
  );
}

function isoToTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
