"use client";

import { useState } from "react";
import type { DBProgramSlot, SlotData } from "@/lib/programs/types";

/* ── SessionChooser — the guided three-way choice from program-chooser.html.
   When assigning a workout to a session, offers:
   1. Program queue (default, pre-selected next slot)
   2. Workout template (pick from library)
   3. One-off build (freeform, for today only)
   Each option states what it does to the queue and paid pot. */

interface SessionChooserProps {
  /** Next slot from the program queue, if available */
  nextSlot: DBProgramSlot | null;
  /** Current week in the program */
  currentWeek: number;
  /** Total weeks in the program */
  programWeeks: number;
  /** Slot position in the queue (e.g. "slot 2 of 18") */
  slotPosition: number;
  /** Total slots in the queue */
  totalSlots: number;
  /** Remaining paid sessions */
  sessionsRemaining: number;
  /** Program name */
  programName: string;
  /** Callback when choice is confirmed */
  onConfirm: (choice: "program" | "template" | "oneoff", slotId?: string) => void;
  /** Cancel callback */
  onCancel: () => void;
}

function slotLetter(slot: DBProgramSlot): string {
  const label = slot.label?.trim();
  if (label) {
    const match = label.match(/^([A-Za-z0-9]+)/);
    return match ? match[1] : label.slice(0, 3);
  }
  return String.fromCharCode(64 + slot.position);
}

export function SessionChooser({
  nextSlot,
  currentWeek,
  programWeeks,
  slotPosition,
  totalSlots,
  sessionsRemaining,
  programName,
  onConfirm,
  onCancel,
}: SessionChooserProps) {
  const [choice, setChoice] = useState<"program" | "template" | "oneoff">("program");

  const nextSlotLabel = nextSlot ? slotLetter(nextSlot) : null;
  const remaining = Math.max(0, sessionsRemaining - 1); // minus the one this session will consume

  return (
    <div>
      {/* ── Choice cards ── */}
      <div className="grid grid-cols-3 gap-3 max-[1080px]:grid-cols-1">
        {/* Program queue */}
        <button
          type="button"
          onClick={() => setChoice("program")}
          aria-pressed={choice === "program"}
          className={`
            text-left border rounded-nested bg-white p-3.5 cursor-pointer font-[inherit]
            transition-[border-color,box-shadow] duration-[120ms]
            ${choice === "program"
              ? "border-rose shadow-[inset_0_0_0_1px_var(--rose)] bg-[var(--status-primary-bg)]"
              : "border-[var(--hub-border)] hover:border-rose"
            }
          `}
        >
          <span className={`text-[10.5px] font-extrabold uppercase tracking-[.08em] ${choice === "program" ? "text-rose-text" : "text-[var(--color-muted)]"}`}>
            From her program
          </span>
          <p className="mt-1.5 mb-0.5 text-sm font-bold text-[var(--color-ink)]">
            {nextSlotLabel ? `Next up: Workout ${nextSlotLabel}` : "No next slot"}
          </p>
          <p className="m-0 text-[12.5px] text-[var(--color-body)]">
            Slot {slotPosition} of {totalSlots} in {programName}.
          </p>
          <p className="mt-2.5 pt-2.5 border-t border-[var(--hub-border)] text-xs text-[var(--color-body)]">
            Uses <b className="text-[var(--color-ink)]">1 of {remaining}</b> remaining paid sessions · advances the queue to <b className="text-[var(--color-ink)]">slot {slotPosition + 1}</b>
          </p>
        </button>

        {/* Template */}
        <button
          type="button"
          onClick={() => setChoice("template")}
          aria-pressed={choice === "template"}
          className={`
            text-left border rounded-nested bg-white p-3.5 cursor-pointer font-[inherit]
            transition-[border-color,box-shadow] duration-[120ms]
            ${choice === "template"
              ? "border-rose shadow-[inset_0_0_0_1px_var(--rose)] bg-[var(--status-primary-bg)]"
              : "border-[var(--hub-border)] hover:border-rose"
            }
          `}
        >
          <span className={`text-[10.5px] font-extrabold uppercase tracking-[.08em] ${choice === "template" ? "text-rose-text" : "text-[var(--color-muted)]"}`}>
            A workout template
          </span>
          <p className="mt-1.5 mb-0.5 text-sm font-bold text-[var(--color-ink)]">
            Pick from the library
          </p>
          <p className="m-0 text-[12.5px] text-[var(--color-body)]">
            A one-off from the shared exercise library, outside this program.
          </p>
          <p className="mt-2.5 pt-2.5 border-t border-[var(--hub-border)] text-xs text-[var(--color-body)]">
            Uses <b className="text-[var(--color-ink)]">1 of {remaining}</b> remaining paid sessions · <b className="text-[var(--color-ink)]">does not</b> move the queue
          </p>
        </button>

        {/* One-off build */}
        <button
          type="button"
          onClick={() => setChoice("oneoff")}
          aria-pressed={choice === "oneoff"}
          className={`
            text-left border rounded-nested bg-white p-3.5 cursor-pointer font-[inherit]
            transition-[border-color,box-shadow] duration-[120ms]
            ${choice === "oneoff"
              ? "border-rose shadow-[inset_0_0_0_1px_var(--rose)] bg-[var(--status-primary-bg)]"
              : "border-[var(--hub-border)] hover:border-rose"
            }
          `}
        >
          <span className={`text-[10.5px] font-extrabold uppercase tracking-[.08em] ${choice === "oneoff" ? "text-rose-text" : "text-[var(--color-muted)]"}`}>
            Build one-off
          </span>
          <p className="mt-1.5 mb-0.5 text-sm font-bold text-[var(--color-ink)]">
            Freeform, for today only
          </p>
          <p className="m-0 text-[12.5px] text-[var(--color-body)]">
            Not saved as reusable content — build it from scratch for this session.
          </p>
          <p className="mt-2.5 pt-2.5 border-t border-[var(--hub-border)] text-xs text-[var(--color-body)]">
            Uses <b className="text-[var(--color-ink)]">1 of {remaining}</b> remaining paid sessions · <b className="text-[var(--color-ink)]">does not</b> move the queue
          </p>
        </button>
      </div>

      {/* ── Detail panel (switches per selection) ── */}
      {choice === "program" && nextSlot && (
        <div className="mt-3.5 border border-[var(--hub-border)] rounded-nested bg-[var(--field-fill)] p-3.5">
          <p className="text-[13.5px] font-bold text-[var(--color-ink)] m-0 mb-2">
            Workout {slotLetter(nextSlot)} — slot {slotPosition} of {totalSlots}
          </p>
          <p className="text-[13px] text-[var(--color-muted)] m-0">
            {nextSlot.data?.sections?.length ?? 0} section{((nextSlot.data?.sections?.length ?? 0) === 1) ? "" : "s"} · Week {currentWeek} of {programWeeks}
          </p>
        </div>
      )}
      {choice === "template" && (
        <div className="mt-3.5 border border-[var(--hub-border)] rounded-nested bg-[var(--field-fill)] p-3.5">
          <p className="text-[13.5px] font-bold text-[var(--color-ink)] m-0 mb-2">
            Choose a template
          </p>
          <p className="text-[13px] text-[var(--color-muted)] m-0">
            Search the shared workout library. Nothing is pre-selected — this route exists for a session that shouldn&apos;t follow her program today (illness, a one-off focus area, cover from another trainer).
          </p>
        </div>
      )}
      {choice === "oneoff" && (
        <div className="mt-3.5 border border-[var(--hub-border)] rounded-nested bg-[var(--field-fill)] p-3.5">
          <p className="text-[13.5px] font-bold text-[var(--color-ink)] m-0 mb-2">
            Build for today
          </p>
          <p className="text-[13px] text-[var(--color-muted)] m-0">
            Opens the same section editor as the program builder — warm-up, supersets, standalone, cool-down — but nothing here is saved back to a reusable program.
          </p>
        </div>
      )}

      {/* ── Footer actions ── */}
      <div className="flex justify-end gap-2 mt-3.5 pt-3.5 border-t border-[var(--hub-border)]">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-1.5 rounded-control border border-transparent bg-transparent text-[var(--color-muted)] font-[inherit] text-xs font-semibold cursor-pointer px-3.5 py-1.5 hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(choice, choice === "program" ? nextSlot?.id : undefined)}
          className="inline-flex items-center justify-center gap-1.5 rounded-control bg-rose text-white font-[inherit] text-xs font-semibold cursor-pointer px-3.5 py-1.5 hover:bg-[color-mix(in_oklab,var(--rose)_88%,var(--ink))] transition-colors"
        >
          {choice === "program" && nextSlotLabel
            ? `Assign Workout ${nextSlotLabel} to this session`
            : choice === "template"
              ? "Choose a template to assign"
              : "Save and assign this session"}
        </button>
      </div>
    </div>
  );
}
