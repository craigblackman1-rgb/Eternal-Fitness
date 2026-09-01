"use client";

import type { ScheduledEntry } from "./ScheduleCalendar";

interface PlannedSessionsStripProps {
  /** Sessions with status "planned" and no scheduled_at — never on the grid. */
  plannedEntries: Array<{
    id: string;
    clientName: string;
    blockNumber: number | null;
    sessionNumber: number;
    archetype: string;
    durationMinutes: number;
    focusLabel: string;
  }>;
  onSelectSession: (id: string) => void;
  selectedId: string | null;
}

/**
 * CR-EF-037 — Planned sessions sit in a strip ABOVE the time grid. They have
 * no date and therefore no time slot. Putting an undated session onto a date is
 * exactly how the original inference bug started — never place a planned session
 * in the grid.
 */
export function PlannedSessionsStrip({ plannedEntries, onSelectSession, selectedId }: PlannedSessionsStripProps) {
  if (plannedEntries.length === 0) return null;

  return (
    <div
      className="flex items-center gap-2 flex-wrap border-b border-[var(--hub-border)] bg-[var(--hub-hover)] px-4 py-2.5"
      data-od-id="planned-strip"
    >
      <span className="text-[10px] font-bold uppercase tracking-[.07em] text-muted-foreground">
        Planned · no date yet
      </span>
      {plannedEntries.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onSelectSession(e.id)}
          className={
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold cursor-pointer transition-colors " +
            (selectedId === e.id
              ? "border-rose bg-rose/10 text-foreground"
              : "border-[rgba(82,90,97,.3)] bg-[#F2F3F5] text-[#464D54] hover:border-rose/40")
          }
          data-od-id={`planned-${e.id}`}
        >
          <span className="text-xs">{e.clientName}</span>
          <span className="text-[11px] text-muted-foreground">
            {e.focusLabel || (e.archetype ? `${e.archetype} session` : `S${e.sessionNumber}`)}
          </span>
        </button>
      ))}
      <span className="text-[11.5px] text-muted-foreground ml-auto">
        Schedule one to give it a slot — planned sessions are never drawn on a date.
      </span>
    </div>
  );
}
