"use client";

import { useDrawerManager } from "./DrawerManager";

/* ── BlockMap — one cell per session in the active block, laid out week by
   week. States: done (completed), next (the upcoming session), gap (scheduled
   but no workout assigned), undated (no date set). Clicking a cell opens a
   workout drawer (stub for S0b). */

interface SessionCell {
  id: string;
  sessionNumber: number;
  scheduledAt: string | null;
  isCompleted: boolean;
  isNext: boolean;
  focusLabel: string | null;
  /** Whether the session has a workout assigned (focus_label is present) */
  hasWorkout: boolean;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { day: "numeric" });
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return `${day} ${month}`;
}

function dayOfWeek(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short" });
}

function isFriday(iso: string): boolean {
  return new Date(iso).getDay() === 5;
}

export function BlockMap({ sessions }: { sessions: SessionCell[] }) {
  const { openDrawer } = useDrawerManager();

  // Sort by scheduled_at, undated at end
  const sorted = [...sessions].sort((a, b) => {
    if (!a.scheduledAt && !b.scheduledAt) return a.sessionNumber - b.sessionNumber;
    if (!a.scheduledAt) return 1;
    if (!b.scheduledAt) return -1;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });

  const cellState = (s: SessionCell): string => {
    if (s.isCompleted) return "done";
    if (s.isNext) return "next";
    if (!s.scheduledAt) return "undated";
    if (!s.hasWorkout) return "gap";
    return "";
  };

  const cellClasses: Record<string, string> = {
    done: "bg-[var(--status-success-bg)] border-[var(--status-success-border)] [&_b]:text-[var(--status-success-text)] [&_small]:text-[var(--status-success-text)]",
    next: "bg-[var(--status-primary-bg)] border-rose shadow-[inset_0_0_0_1px_var(--color-rose)] [&_b]:text-[var(--status-primary-text)] [&_small]:text-[var(--status-primary-text)]",
    gap: "bg-[var(--status-warning-bg)] border-[var(--status-warning)] border-dashed [&_b]:text-[var(--status-warning-text)] [&_small]:text-[var(--status-warning-text)] [&_b]:text-[11px] [&_b]:font-bold",
    undated: "bg-[var(--hub-hover)] border-dashed cursor-default",
  };

  return (
    <div className="border border-[var(--hub-border)] rounded-[10px] bg-[var(--field-fill)] py-1 px-[11px] pb-2.5">
      <div className="flex flex-wrap gap-[5px] pt-2">
        {sorted.map((s) => {
          const state = cellState(s);
          const isWeekEnd = s.scheduledAt && isFriday(s.scheduledAt);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => openDrawer("dw-workout", null)}
              disabled={state === "undated"}
              className={`w-[60px] h-[42px] shrink-0 border rounded-lg flex flex-col items-center justify-center gap-0.5 font-[inherit] p-0 transition-all duration-100 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(193,131,159,.3)] hover:border-rose hover:shadow-[0_0_0_1px_var(--color-rose)] ${cellClasses[state] || "bg-white border-[var(--hub-border)]"} ${isWeekEnd ? "mr-[13px]" : ""}`}
              aria-label={
                state === "undated"
                  ? `Session ${s.sessionNumber}, no date set`
                  : `${s.scheduledAt ? `${dayOfWeek(s.scheduledAt)} ${fmtDate(s.scheduledAt)}` : `Session ${s.sessionNumber}`}${s.focusLabel ? `, workout ${s.focusLabel}` : ""}${state === "next" ? ", next session" : ""}${state === "gap" ? ", no workout assigned" : ""}`
              }
            >
              {s.scheduledAt ? (
                <small className="text-[10.5px] font-semibold text-[var(--color-body)] tabular-nums leading-tight">
                  {dayOfWeek(s.scheduledAt)} {fmtDate(s.scheduledAt).split(" ")[0]}
                </small>
              ) : (
                <small className="text-[10.5px] font-semibold text-[var(--color-body)] tabular-nums leading-tight">
                  no date
                </small>
              )}
              <b className="text-[13.5px] font-extrabold leading-none text-[var(--color-ink)]">
                {state === "gap" ? "None" : state === "undated" ? String(s.sessionNumber) : (s.focusLabel ?? String(s.sessionNumber))}
              </b>
            </button>
          );
        })}
      </div>

      {/* Map key */}
      <div className="flex gap-3.5 flex-wrap mt-2 pt-2 border-t border-[var(--hub-border)] text-[11.5px] text-[var(--color-body)]">
        <span className="inline-flex items-center gap-1.5">
          <i className="w-[11px] h-[11px] rounded-[3px] border border-[var(--hub-border)] bg-[var(--status-primary-bg)] shrink-0 inline-block" />
          Next up
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-[11px] h-[11px] rounded-[3px] border border-[var(--status-success-border)] bg-[var(--status-success-bg)] shrink-0 inline-block" />
          Done
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-[11px] h-[11px] rounded-[3px] border border-[var(--hub-border)] bg-white shrink-0 inline-block" />
          Scheduled
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-[11px] h-[11px] rounded-[3px] border border-[var(--status-warning)] border-dashed bg-[var(--status-warning-bg)] shrink-0 inline-block" />
          Needs a workout
        </span>
      </div>
    </div>
  );
}
