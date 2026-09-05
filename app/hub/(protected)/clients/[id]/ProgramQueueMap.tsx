"use client";

import type { DBProgramSlot, SlotData } from "@/lib/programs/types";

/* ── ProgramQueueMap — renders the program queue as a cell grid.
   Each cell represents one slot-position in the queue, colour-coded:
   - done: completed session
   - next: the upcoming slot (rose background)
   - flag: completed but no sets logged
   - plain: scheduled, not yet due
   - unassigned: beyond queue length (paid sessions with no slot) */

interface QueueCell {
  position: number;       // 1-based slot position in the queue
  slotLabel: string;      // "A", "B", etc.
  dayLabel: string;       // "Wed 2", "Fri 4", etc.
  state: "done" | "next" | "flag" | "plain" | "unassigned";
  ariaLabel: string;
}

interface ProgramQueueMapProps {
  slots: DBProgramSlot[];
  totalSlots: number;      // weeks × slot_count
  completedCount: number;  // sessions completed so far
  nextPosition: number;    // 1-based position of next slot
  /** Set of positions (1-based) that have sessions completed but with zero set_logs */
  flaggedPositions?: Set<number>;
  /** Scheduled sessions keyed by queue position for day labels */
  scheduledByPosition?: Record<number, { scheduledAt: string | null }>;
  onCellClick?: (position: number) => void;
}

function slotLetter(slot: DBProgramSlot): string {
  const label = slot.label?.trim();
  if (label) {
    // Extract leading letter/number — "Workout A" → "A", "B1" → "B"
    const match = label.match(/^([A-Za-z0-9]+)/);
    return match ? match[1] : label.slice(0, 3);
  }
  // Fallback to position letter
  return String.fromCharCode(64 + slot.position); // 1→A, 2→B, etc.
}

function fmtDayShort(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
}

export function ProgramQueueMap({
  slots,
  totalSlots,
  completedCount,
  nextPosition,
  flaggedPositions = new Set(),
  scheduledByPosition = {},
  onCellClick,
}: ProgramQueueMapProps) {
  const slotCount = slots.length;
  if (slotCount === 0 || totalSlots === 0) return null;

  const cells: QueueCell[] = [];
  for (let i = 0; i < totalSlots; i++) {
    const position = (i % slotCount) + 1; // 1-based slot position in the rotation
    const slot = slots.find((s) => s.position === position);
    const slotLabel = slot ? slotLetter(slot) : String(position);
    const queueIndex = i + 1; // 1-based position in the full queue

    let state: QueueCell["state"];
    if (i < completedCount) {
      state = flaggedPositions.has(queueIndex) ? "flag" : "done";
    } else if (queueIndex === completedCount + 1) {
      state = "next";
    } else {
      state = "plain";
    }

    const scheduled = scheduledByPosition[queueIndex];
    const dayLabel = scheduled ? fmtDayShort(scheduled.scheduledAt) : "";

    cells.push({
      position: queueIndex,
      slotLabel,
      dayLabel,
      state,
      ariaLabel: `${dayLabel ? `${dayLabel}, ` : ""}workout ${slotLabel}${state === "next" ? ", next session" : ""}${state === "flag" ? ", completed with no sets logged" : ""}`,
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-[5px] pt-2 px-[11px] pb-2.5 bg-[var(--field-fill)] border border-[var(--hub-border)] rounded-nested">
        {cells.map((cell) => {
          const isNext = cell.state === "next";
          const isFlag = cell.state === "flag";
          return (
            <button
              key={cell.position}
              type="button"
              aria-label={cell.ariaLabel}
              onClick={() => onCellClick?.(cell.position)}
              className={`
                w-[60px] h-[42px] shrink-0 border rounded-control bg-white
                flex flex-col items-center justify-center gap-0.5
                cursor-pointer font-[inherit] p-0
                transition-[border-color,box-shadow] duration-[120ms]
                ${isNext
                  ? "bg-[var(--status-primary-bg)] border-rose shadow-[inset_0_0_0_1px_var(--rose)]"
                  : "border-[var(--hub-border)] hover:border-rose hover:shadow-[0_0_0_1px_var(--rose)]"
                }
              `}
            >
              {cell.dayLabel && (
                <small className={`text-[10.5px] font-semibold tabular-nums ${isNext ? "text-rose-text" : "text-[var(--color-body)]"}`}>
                  {cell.dayLabel}
                </small>
              )}
              <b className={`text-[13.5px] font-extrabold leading-none ${isNext ? "text-rose-text" : "text-[var(--color-ink)]"}`}>
                {cell.slotLabel}
              </b>
            </button>
          );
        })}
      </div>
      {/* Key */}
      <div className="flex gap-3.5 flex-wrap mt-2 pt-2 border-t border-[var(--hub-border)] text-[11.5px] text-[var(--color-body)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-[11px] h-[11px] rounded-[3px] border border-rose bg-[var(--status-primary-bg)] shrink-0" />
          Next up
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-[11px] h-[11px] rounded-[3px] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] shrink-0" />
          Completed, no sets logged
        </span>
        <span>Plain cells are scheduled, not yet due</span>
      </div>
    </div>
  );
}
