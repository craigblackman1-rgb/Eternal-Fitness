"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toLocalISODate, isoToLocalDate, isoToLocalTime, weekDates, londonDayKey } from "@/lib/schedule-dates";
import type { ScheduledEntry } from "./ScheduleCalendar";
import { PlannedSessionsStrip } from "./PlannedSessionsStrip";
import { SessionDrawer } from "./SessionDrawer";

/** Planned entry stripped to what the PlannedSessionsStrip needs. */
interface PlannedEntry {
  id: string;
  clientName: string;
  blockNumber: number | null;
  sessionNumber: number;
  archetype: string;
  durationMinutes: number;
  focusLabel: string;
}

interface WeekViewProps {
  entries: ScheduledEntry[];
  plannedEntries: PlannedEntry[];
  unconfirmedCount: number;
  onSelectSession: (id: string) => void;
  onComplete?: (entry: ScheduledEntry) => void;
}

/**
 * CR-EF-037 — Week-as-day-lists view. Seven short lists, one per day,
 * answering "where do I stand" without asking Esther to hold two axes
 * in her head. Default view per the 12-schedule.html mockup.
 *
 * This view NEVER duplicates triage — the triage pointer links to
 * /hub/schedule/triage for exception queues.
 */
export function WeekView({ entries, plannedEntries, unconfirmedCount, onSelectSession, onComplete }: WeekViewProps) {
  const [cursorDate, setCursorDate] = useState(() => toLocalISODate(new Date()));
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plannedSchedulingId, setPlannedSchedulingId] = useState<string | null>(null);

  const days = useMemo(() => {
    if (viewMode === "day") {
      const [y, m, d] = cursorDate.split("-").map(Number);
      return [new Date(y, m - 1, d)];
    }
    return weekDates(cursorDate);
  }, [viewMode, cursorDate]);

  const navigate = useCallback(
    (delta: number) => {
      setCursorDate((prev) => {
        const [y, m, d] = prev.split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        dt.setDate(dt.getDate() + (viewMode === "day" ? delta : delta * 7));
        return toLocalISODate(dt);
      });
    },
    [viewMode],
  );

  const goToday = useCallback(() => setCursorDate(toLocalISODate(new Date())), []);

  const todayKey = toLocalISODate(new Date());

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduledEntry[]>();
    for (const e of entries) {
      if (!e.scheduledAt) continue;
      const key = isoToLocalDate(e.scheduledAt);
      if (!showCancelled && e.status === "cancelled") continue;
      const bucket = map.get(key);
      if (bucket) bucket.push(e);
      else map.set(key, [e]);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    }
    return map;
  }, [entries, showCancelled]);

  const title = viewMode === "day"
    ? days[0].toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : (() => {
        const first = days[0];
        const last = days[6];
        return `${first.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} – ${last.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`;
      })();

  const selectedEntry = selectedId ? entries.find((e) => e.id === selectedId) ?? null : null;

  return (
    <>
      {/* Triage pointer */}
      {unconfirmedCount > 0 && (
        <div className="border border-[var(--hub-border)] rounded-[var(--r-nested)] overflow-hidden mb-[var(--d-section-gap)]" style={{ background: "var(--hub-card)" }}>
          <div className="px-4 py-2">
            <div className="flex items-center gap-3 py-[var(--d-row-y)]">
              <span className="w-[7px] h-[7px] rounded-pill shrink-0" style={{ background: "var(--s-warning)" }} />
              <span className="min-w-0 flex-1 text-[13.5px] text-foreground">
                <b className="font-semibold">{unconfirmedCount} decisions</b> are waiting in triage before this calendar is complete
                <span className="block text-[12.5px] text-muted-foreground mt-px">
                  {unconfirmedCount} Outlook bookings. Nothing shows here until confirmed.
                </span>
              </span>
              <span className="shrink-0">
                <Link
                  href="/hub/schedule/triage"
                  className="inline-flex items-center justify-center gap-1.5 rounded-[var(--r-control)] px-3.5 py-1.5 min-h-[30px] font-[inherit] text-[12.5px] font-semibold cursor-pointer border border-[var(--muted)] bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)] hover:border-foreground transition-colors"
                >
                  Open triage
                </Link>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Planned strip */}
      {plannedEntries.length > 0 && (
        <PlannedSessionsStrip
          plannedEntries={plannedEntries}
          onSelectSession={(id) => {
            setSelectedId(id);
            setPlannedSchedulingId(id);
          }}
          selectedId={selectedId}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="inline-flex border border-[var(--hub-border)] rounded-[var(--r-control)] overflow-hidden" style={{ background: "var(--hub-card)" }} role="tablist" aria-label="Calendar view">
          {(["week", "day"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={viewMode === v}
              type="button"
              onClick={() => setViewMode(v)}
              className={cn(
                "border-0 font-[inherit] text-[12.5px] font-semibold cursor-pointer px-3.5 py-[7px] capitalize transition-colors",
                viewMode === v ? "text-foreground" : "bg-transparent text-body hover:text-foreground",
              )}
              style={viewMode === v ? { background: "var(--s-primary-bg)", color: "var(--rose-text)" } : undefined}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-[30px] h-[30px] rounded-[var(--r-control-sm)] border border-[var(--hub-border)] bg-[var(--hub-card)] text-body cursor-pointer grid place-items-center text-sm hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors"
            aria-label="Previous"
          >
            ‹
          </button>
          <span className="min-w-[168px] text-center text-[13px] font-bold text-foreground">{title}</span>
          <button
            type="button"
            onClick={goToday}
            className="inline-flex items-center justify-center gap-1.5 rounded-[var(--r-control)] px-2.5 py-1 min-h-[30px] font-[inherit] text-[12.5px] font-semibold cursor-pointer border border-transparent bg-transparent text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="w-[30px] h-[30px] rounded-[var(--r-control-sm)] border border-[var(--hub-border)] bg-[var(--hub-card)] text-body cursor-pointer grid place-items-center text-sm hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors"
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </div>

      {/* Key */}
      <div className="border border-[var(--hub-border)] rounded-[var(--r-nested)] overflow-hidden mb-[var(--d-section-gap)]" style={{ background: "var(--hub-card)" }}>
        <div className="px-4 py-2.5">
          <div className="flex gap-3.5 flex-wrap text-[11.5px] text-body">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-[11px] h-[11px] rounded-[3px] border border-[var(--hub-border)] shrink-0" style={{ background: "var(--hub-card)" }} /> Booked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-[11px] h-[11px] rounded-[3px] shrink-0" style={{ background: "var(--hub-card)", border: "1px dashed var(--body)" }} /> Needs logging
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-[11px] h-[11px] rounded-[3px] shrink-0" style={{ background: "var(--s-success-bg)", border: "1px solid var(--s-success-bd)" }} /> Completed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-[11px] h-[11px] rounded-[3px] shrink-0" style={{ background: "var(--s-warning-bg)", border: "1px dashed var(--s-warning)" }} /> Off-day
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-[11px] h-[11px] rounded-[3px] shrink-0" style={{ background: "var(--s-neutral-bg)", border: "1px solid var(--s-neutral-bd)" }} /> Cancelled
            </span>
          </div>
        </div>
      </div>

      {/* Day cards */}
      <section>
        {days.map((dt, i) => {
          const key = toLocalISODate(dt);
          const isToday = key === todayKey;
          const dayEntries = byDate.get(key) ?? [];
          const isLast = i === days.length - 1;

          return (
            <div key={key}>
              {/* Week divider */}
              {viewMode === "week" && i === 7 && (
                <div className="flex items-center gap-2.5 my-4 mb-2.5">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">Next week</span>
                  <hr className="flex-1 border-0 border-t border-[var(--hub-border)]" />
                </div>
              )}

              {/* Day card */}
              <div
                className={cn(
                  "border rounded-[var(--r-nested)] overflow-hidden mb-2.5",
                  isToday ? "border-l-4" : "border-l-4",
                )}
                style={{
                  borderColor: isToday ? undefined : "var(--hub-border)",
                  borderLeftColor: isToday ? "var(--rose)" : "var(--muted)",
                  background: "var(--hub-card)",
                }}
              >
                {/* Day header */}
                <div
                  className="flex items-center gap-2.5 flex-wrap px-3 py-2"
                  style={isToday ? { background: "var(--s-primary-bg)" } : { background: "var(--hub-hover)" }}
                >
                  <span
                    className="text-[11.5px] font-extrabold uppercase tracking-[.06em]"
                    style={{ color: isToday ? "var(--rose-text)" : "var(--ink)" }}
                  >
                    {dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  {isToday && <span className="text-[12.5px] font-medium text-body">Today</span>}
                  {dayEntries.length > 0 && (
                    <span className="text-[12.5px] font-medium text-body">
                      {dayEntries.length} {dayEntries.length === 1 ? "session" : "sessions"}
                    </span>
                  )}
                </div>

                {/* Sessions */}
                <div className="px-3">
                  {dayEntries.length === 0 ? (
                    <p className="py-2 text-[13px] text-muted-foreground m-0">No sessions booked.</p>
                  ) : (
                    dayEntries.map((entry) => {
                      const hhmm = isoToLocalTime(entry.scheduledAt);
                      const needsLogging =
                        (entry.status === "scheduled" || entry.status === "in_progress") &&
                        new Date(entry.scheduledAt) < new Date() &&
                        !entry.completedAt;
                      const isCompleted = entry.status === "completed";
                      const isOffDay =
                        isCompleted &&
                        entry.completedAt &&
                        londonDayKey(entry.completedAt) !== londonDayKey(entry.scheduledAt);

                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(entry.id);
                            onSelectSession(entry.id);
                          }}
                          className="flex items-center gap-3 py-[var(--d-row-y)] w-full text-left font-[inherit] bg-transparent border-0 cursor-pointer rounded-[var(--r-control-sm)] transition-colors hover:bg-[var(--hub-hover)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(193,131,159,.3)]"
                          style={{ borderBottom: "1px solid var(--hub-border)" }}
                          data-od-id={`session-${entry.id}`}
                        >
                          {/* Time */}
                          <span className="w-[58px] shrink-0 text-[13px] font-bold text-foreground tabular-nums pl-1">
                            {hhmm}
                            <small className="block text-[10.5px] font-medium text-muted-foreground">
                              {entry.durationMinutes} min
                            </small>
                          </span>

                          {/* Client + workout */}
                          <span className="flex-1 min-w-0">
                            <b className="text-[13.5px] font-semibold text-foreground">{entry.clientName}</b>
                            <span
                              className={cn(
                                "block text-[12.5px] mt-px",
                                entry.focusLabel ? "text-body" : "text-muted-foreground italic",
                              )}
                            >
                              {entry.focusLabel || "No workout assigned yet"}
                              {entry.blockNumber != null && ` · Block ${entry.blockNumber}`}
                            </span>
                          </span>

                          {/* Status dot */}
                          <span className="shrink-0">
                            {isOffDay ? (
                              <span className="w-[7px] h-[7px] rounded-pill inline-block" style={{ background: "var(--s-warning)" }} />
                            ) : isCompleted ? (
                              <span className="w-[7px] h-[7px] rounded-pill inline-block" style={{ background: "var(--s-success)" }} />
                            ) : needsLogging ? (
                              <span className="w-[7px] h-[7px] rounded-pill inline-block border border-dashed" style={{ borderColor: "var(--body)" }} />
                            ) : null}
                          </span>

                          {/* Action */}
                          <span className="shrink-0 pr-1">
                            <span className="inline-flex items-center justify-center gap-1.5 rounded-[var(--r-control)] px-2.5 py-1 min-h-[30px] font-[inherit] text-[12.5px] font-semibold cursor-pointer border border-transparent bg-transparent text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors">
                              {entry.status === "completed" && sessionUrl(entry) ? "Open" : "Move"}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Session drawer */}
      <SessionDrawer
        entry={selectedEntry}
        onClose={() => {
          setSelectedId(null);
          setPlannedSchedulingId(null);
        }}
        onComplete={onComplete}
      />
    </>
  );
}

function sessionUrl(entry: ScheduledEntry): string | null {
  if (entry.clientNumber != null && entry.blockId != null) {
    return `/hub/clients/${entry.clientNumber}/blocks/${entry.blockId}/sessions/${entry.sessionNumber}`;
  }
  return null;
}
