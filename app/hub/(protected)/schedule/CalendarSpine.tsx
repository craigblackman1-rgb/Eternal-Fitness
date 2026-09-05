"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { sessionStatusColors } from "@/components/hub/SessionStatusPill";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { weekDates, toLocalISODate, isoToLocalDate, isoToLocalTime, londonDayKey } from "@/lib/schedule-dates";
import type { ScheduledEntry } from "./ScheduleCalendar";
import type { SessionStatus } from "@/types";

const HOUR_START = 8;
const HOUR_END = 18;
const PX_HOUR = 60;
const GRID_H = (HOUR_END - HOUR_START) * PX_HOUR;

/** Derived flags for a completed session. */
function isOffDay(s: ScheduledEntry): boolean {
  if (s.status !== "completed" || !s.completedAt) return false;
  return londonDayKey(s.completedAt) !== londonDayKey(s.scheduledAt);
}

function isUnconfirmed(s: ScheduledEntry): boolean {
  return s.status === "scheduled" && !("confirmedAt" in s) && !isConfirmed(s);
}

function isConfirmed(s: ScheduledEntry): boolean {
  return "confirmedAt" in s && (s as ScheduledEntry & { confirmedAt?: string | null }).confirmedAt != null;
}

/** Lane-packing for overlapping sessions within a day column. */
function packLanes(entries: ScheduledEntry[]): Array<{ entry: ScheduledEntry; lane: number; startMs: number; endMs: number }> {
  const placed: Array<{ entry: ScheduledEntry; lane: number; startMs: number; endMs: number }> = [];
  for (const e of entries) {
    const startMs = new Date(e.scheduledAt).getTime();
    const endMs = startMs + e.durationMinutes * 60_000;
    let lane = 0;
    let ok = false;
    while (!ok) {
      ok = true;
      for (const p of placed) {
        if (p.lane === lane && startMs < p.endMs && p.startMs < endMs) {
          ok = false;
          lane++;
          break;
        }
      }
    }
    placed.push({ entry: e, lane, startMs, endMs });
  }
  return placed;
}

function shortName(name: string): string {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.` : name;
}

function formatHhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

interface CalendarSpineProps {
  entries: ScheduledEntry[];
  showCancelled: boolean;
  onSelectSession: (id: string) => void;
  selectedId: string | null;
  /** Initial ISO date to show (week containing this date). */
  initialDate?: string;
}

export type SpineView = "day" | "week";

export function CalendarSpine({ entries, showCancelled, onSelectSession, selectedId, initialDate }: CalendarSpineProps) {
  const [view, setView] = useState<SpineView>("week");
  const [cursorDate, setCursorDate] = useState<string>(initialDate ?? toLocalISODate(new Date()));
  const [, setTick] = useState(0);

  // Tick every minute to keep now-line current
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const days = useMemo(() => {
    if (view === "day") {
      const [y, m, d] = cursorDate.split("-").map(Number);
      return [new Date(y, m - 1, d)];
    }
    return weekDates(cursorDate);
  }, [view, cursorDate]);

  const navigate = useCallback(
    (delta: number) => {
      setCursorDate((prev) => {
        const [y, m, d] = prev.split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        dt.setDate(dt.getDate() + (view === "day" ? delta : delta * 7));
        return toLocalISODate(dt);
      });
    },
    [view],
  );

  const goToday = useCallback(() => setCursorDate(toLocalISODate(new Date())), []);

  const visibleEntries = useMemo(() => {
    return entries.filter((e) => {
      if (!e.scheduledAt) return false;
      if (e.status === "cancelled" && !showCancelled) return false;
      return true;
    });
  }, [entries, showCancelled]);

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduledEntry[]>();
    for (const e of visibleEntries) {
      const key = isoToLocalDate(e.scheduledAt);
      const bucket = map.get(key);
      if (bucket) bucket.push(e);
      else map.set(key, [e]);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    }
    return map;
  }, [visibleEntries]);

  const now = new Date();
  const todayKey = toLocalISODate(now);

  const scopeEntries = useMemo(() => {
    const result: ScheduledEntry[] = [];
    for (const dt of days) {
      const key = toLocalISODate(dt);
      const dayEntries = byDate.get(key);
      if (dayEntries) result.push(...dayEntries);
    }
    return result;
  }, [days, byDate]);

  const unconfirmedCount = scopeEntries.filter((e) => e.status === "scheduled" && !isConfirmed(e)).length;
  const flaggedCount = scopeEntries.filter((e) => isOffDay(e)).length;

  // Title
  const title = view === "day"
    ? days[0].toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : (() => {
        const first = days[0];
        const last = days[6];
        return `${first.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} – ${last.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`;
      })();

  const subtitle = `${scopeEntries.length} ${scopeEntries.length === 1 ? "session" : "sessions"} · ${unconfirmedCount} awaiting triage · ${flaggedCount} flagged${showCancelled ? "" : " · cancelled hidden"}`;

  // Grid columns: 56px gutter + N day columns
  const cols = `56px repeat(${days.length}, minmax(0,1fr))`;

  return (
    <div className="space-y-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-[var(--hub-border)] px-4 py-3">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Previous" className="h-8 w-8 rounded-lg">
          <IconChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => navigate(1)} aria-label="Next" className="h-8 w-8 rounded-lg">
          <IconChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={goToday} className="rounded-lg">
          Today
        </Button>
        <div className="ml-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-[var(--hub-border)] bg-[var(--hub-canvas)] p-0.5" role="tablist" aria-label="Calendar view">
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-nested px-4 py-1.5 text-sm font-semibold capitalize transition-colors",
                  view === v ? "bg-[var(--hub-card)] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid header */}
      <div className="grid border-b border-[var(--hub-border)] bg-[var(--hub-hover)]" style={{ gridTemplateColumns: cols }}>
        <div className="border-r border-[var(--hub-border)]" />
        {days.map((dt) => {
          const key = toLocalISODate(dt);
          const isToday = key === todayKey;
          const dayEntries = byDate.get(key) ?? [];
          const count = dayEntries.length;
          return (
            <div key={key} className={cn("px-2.5 py-2 text-center border-r border-[var(--hub-border)] last:border-r-0", isToday && "bg-rose/5")}>
              <div className={cn("text-[10.5px] font-bold uppercase tracking-wide", isToday ? "text-rose" : "text-muted-foreground")}>
                {dt.toLocaleDateString("en-GB", { weekday: "short" })}{isToday ? " · today" : ""}
              </div>
              <div className={cn("text-[15px] font-bold tabular-nums", isToday ? "text-rose" : "text-foreground")}>
                {dt.getDate()}
              </div>
              <div className="text-[10.5px] text-muted-foreground tabular-nums">
                {count ? `${count} ${count === 1 ? "session" : "sessions"}` : "clear"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid body */}
      <div className="grid relative" style={{ gridTemplateColumns: cols, height: GRID_H }}>
        {/* Gutter */}
        <div className="border-r border-[var(--hub-border)] bg-[var(--hub-card)] relative">
          {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => {
            const hr = HOUR_START + i;
            return (
              <span
                key={hr}
                className="absolute right-2 text-[10.5px] font-semibold text-muted-foreground tabular-nums"
                style={{
                  top: i * PX_HOUR,
                  transform: i === 0 ? "none" : "translateY(-50%)",
                }}
              >
                {String(hr).padStart(2, "0")}:00
              </span>
            );
          })}
        </div>

        {/* Day columns */}
        {days.map((dt) => {
          const key = toLocalISODate(dt);
          const isToday = key === todayKey;
          const dayEntries = byDate.get(key) ?? [];
          const packed = packLanes(dayEntries);
          const laneCount = packed.reduce((m, p) => Math.max(m, p.lane + 1), 1) || 1;
          const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;

          // Now-line position
          let nowLinePx: number | null = null;
          if (isToday) {
            const minsFromStart = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
            if (minsFromStart >= 0 && minsFromStart <= (HOUR_END - HOUR_START) * 60) {
              nowLinePx = (minsFromStart / 60) * PX_HOUR;
            }
          }

          return (
            <div
              key={key}
              className={cn("relative border-r border-[var(--hub-border)] last:border-r-0", isWeekend && "bg-[#FAFAFB]")}
              style={{ height: GRID_H }}
            >
              {/* Hour lines */}
              {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
                <div
                  key={`h${i}`}
                  className="absolute left-0 right-0 border-t border-[var(--hub-border)] pointer-events-none"
                  style={{ top: i * PX_HOUR }}
                />
              ))}
              {/* Half-hour lines */}
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                <div
                  key={`hh${i}`}
                  className="absolute left-0 right-0 border-t border-dotted border-[#EFF1F4] pointer-events-none"
                  style={{ top: i * PX_HOUR + PX_HOUR / 2 }}
                />
              ))}

              {/* Now line */}
              {nowLinePx !== null && (
                <div
                  className="absolute left-0 right-0 h-0 border-t-2 border-rose z-[4] pointer-events-none"
                  style={{ top: nowLinePx }}
                  title={`Now — ${formatHhmm(now)}`}
                >
                  <span className="absolute -left-1 -top-[5px] w-2 h-2 rounded-pill bg-rose" />
                </div>
              )}

              {/* Session blocks */}
              {packed.map(({ entry, lane, startMs, endMs }) => {
                const startDt = new Date(startMs);
                const endDt = new Date(endMs);
                const startMin = (startDt.getHours() - HOUR_START) * 60 + startDt.getMinutes();
                const topPx = Math.max(0, (startMin / 60) * PX_HOUR);
                const heightPx = Math.max(30, (entry.durationMinutes / 60) * PX_HOUR - 3);
                const w = 100 / laneCount;
                const left = lane * w;
                const sc = sessionStatusColors(entry.status);
                const unconf = entry.status === "scheduled" && !isConfirmed(entry);
                const flagged = isOffDay(entry);
                const cancelled = entry.status === "completed" && entry.completedAt && londonDayKey(entry.completedAt) !== londonDayKey(entry.scheduledAt);
                const compact = view === "week";
                const sessionUrl =
                  entry.clientNumber != null && entry.blockId != null
                    ? `/hub/clients/${entry.clientNumber}/blocks/${entry.blockId}/sessions/${entry.sessionNumber}`
                    : null;

                // Block background colour by state
                const bgMap: Record<SessionStatus, string> = {
                  planned: "#F2F3F5",
                  scheduled: "#FBF3F7",
                  in_progress: "#F7EFDD",
                  completed: "#E9F4F5",
                  cancelled: "repeating-linear-gradient(135deg, #FBF4F6 0 6px, #F5EBEF 6px 12px)",
                };
                const borderMap: Record<SessionStatus, string> = {
                  planned: "rgba(82,90,97,.3)",
                  scheduled: "rgba(193,131,159,.45)",
                  in_progress: "rgba(176,138,62,.5)",
                  completed: "rgba(8,126,139,.4)",
                  cancelled: "rgba(138,78,99,.35)",
                };
                const textMap: Record<SessionStatus, string> = {
                  planned: "#464D54",
                  scheduled: "#8A5570",
                  in_progress: "#8A6A2E",
                  completed: "#066A75",
                  cancelled: "#7A4257",
                };

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onSelectSession(entry.id)}
                    className={cn(
                      "absolute rounded-lg border border-l-4 p-1 overflow-hidden cursor-pointer text-left font-[var(--font-body)] z-[2] transition-shadow transition-transform",
                      "hover:shadow-[0_4px_12px_rgba(16,24,40,.13)] hover:z-[5]",
                      "focus-visible:outline-2 focus-visible:outline-rose focus-visible:outline-offset-1 focus-visible:z-[6]",
                      selectedId === entry.id && "shadow-[0_0_0_2px_var(--color-rose),0_4px_12px_rgba(16,24,40,.13)] z-[6]",
                      unconf && "border-dashed",
                    )}
                    style={{
                      top: topPx,
                      height: heightPx,
                      left: `calc(${left}% + 4px)`,
                      width: `calc(${w}% - 8px)`,
                      background: unconf ? "#FFFDF7" : bgMap[entry.status],
                      borderColor: unconf ? "rgba(176,138,62,.6)" : borderMap[entry.status],
                      borderLeftStyle: unconf ? "solid" : undefined,
                      color: unconf ? "#8A6A2E" : textMap[entry.status],
                      boxShadow: flagged ? "inset 0 0 0 1px rgba(138,78,99,.45)" : undefined,
                    }}
                    aria-label={`${entry.clientName}, session ${entry.sessionNumber}, ${formatHhmm(startDt)}–${formatHhmm(endDt)}, ${unconf ? "unconfirmed booking" : entry.status}`}
                  >
                    {/* Time */}
                    <span className="block text-[10.5px] font-bold tabular-nums opacity-85 whitespace-nowrap overflow-hidden leading-tight">
                      {formatHhmm(startDt)}{compact ? "" : `–${formatHhmm(endDt)}`}
                    </span>
                    {/* Client name */}
                    <span className="block text-xs font-bold text-foreground whitespace-nowrap overflow-hidden text-ellipsis leading-tight" style={{ color: textMap[entry.status] }}>
                      {compact ? shortName(entry.clientName) : entry.clientName}
                    </span>
                    {/* Focus + session info */}
                    {heightPx > 52 && (
                      <span className="block text-[11px] whitespace-nowrap overflow-hidden text-ellipsis opacity-90 leading-tight">
                        {entry.archetype ? `${entry.archetype} · ` : ""}S{entry.sessionNumber}{compact ? "" : ` · ${entry.durationMinutes} min`}
                      </span>
                    )}
                    {/* Unconfirmed + flag badges */}
                    {!compact && heightPx > 74 && (unconf || flagged) && (
                      <span className="flex gap-[3px] mt-[3px] flex-wrap">
                        {unconf && (
                          <span className="inline-flex items-center gap-[3px] text-[9.5px] font-extrabold uppercase tracking-[.05em] rounded px-1 bg-white/75 border border-current">
                            Unconfirmed
                          </span>
                        )}
                        {flagged && (
                          <span className="inline-flex items-center gap-[3px] text-[9.5px] font-extrabold uppercase tracking-[.05em] rounded px-1 bg-white/75 border border-current">
                            Off-day
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 border-t border-[var(--hub-border)] text-xs text-muted-foreground">
        <LegendSwatch background="#F2F3F5" borderColor="rgba(82,90,97,.3)" label="Planned" />
        <LegendSwatch background="#FBF3F7" borderColor="rgba(193,131,159,.45)" label="Scheduled" />
        <LegendSwatch background="#FFFDF7" borderColor="rgba(176,138,62,.6)" borderStyle="dashed" borderLeftStyle="solid" label="Unconfirmed" />
        <LegendSwatch background="#F7EFDD" borderColor="rgba(176,138,62,.5)" label="In progress" />
        <LegendSwatch background="#E9F4F5" borderColor="rgba(8,126,139,.4)" label="Completed" />
        <LegendSwatch background="repeating-linear-gradient(135deg,#FBF4F6 0 4px,#F5EBEF 4px 8px)" borderColor="rgba(138,78,99,.35)" label="Cancelled" />
      </div>
    </div>
  );
}

function LegendSwatch({
  background,
  borderColor,
  borderStyle,
  borderLeftStyle,
  label,
}: {
  background: string;
  borderColor: string;
  borderStyle?: string;
  borderLeftStyle?: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-[22px] h-[12px] rounded-[3px] border shrink-0"
        style={{
          background,
          borderColor,
          borderWidth: "1px",
          borderLeftWidth: borderLeftStyle ? "3px" : "1px",
          borderStyle: borderStyle ?? "solid",
        }}
      />
      {label}
    </span>
  );
}
