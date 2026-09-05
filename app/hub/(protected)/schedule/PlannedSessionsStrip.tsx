"use client";

import { useMemo, useState } from "react";

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
 *
 * Collapsed by default (5 Sep 2026). This used to render one chip per planned
 * session unconditionally; on real production data that is 33 chips in a dense
 * block sitting above the calendar — the heaviest thing on the screen, and the
 * first thing you see. Undated sessions are backlog, not today's work, so the
 * strip now states the count and stays shut until asked. Found by driving the
 * live page, not by reading the code.
 */
export function PlannedSessionsStrip({ plannedEntries, onSelectSession, selectedId }: PlannedSessionsStripProps) {
  const [open, setOpen] = useState(false);

  const clientCount = useMemo(
    () => new Set(plannedEntries.map((e) => e.clientName)).size,
    [plannedEntries],
  );

  if (plannedEntries.length === 0) return null;

  const n = plannedEntries.length;

  return (
    <div
      className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)] px-4 py-2.5"
      data-od-id="planned-strip"
    >
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-[.07em] text-muted-foreground">
          Planned · no date yet
        </span>
        <span className="text-[13px] text-[var(--color-ink)]">
          {n} session{n === 1 ? "" : "s"} across {clientCount} client{clientCount === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-control border border-[var(--hub-field-border)] bg-white px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
        >
          {open ? "Hide them" : "Show them"}
        </button>
        <span className="text-[11.5px] text-muted-foreground ml-auto">
          Schedule one to give it a slot — planned sessions are never drawn on a date.
        </span>
      </div>

      {open && (
        <div className="flex items-center gap-2 flex-wrap pt-2.5">
          {plannedEntries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelectSession(e.id)}
              className={
                "inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-xs font-bold cursor-pointer transition-colors " +
                (selectedId === e.id
                  ? "border-rose bg-rose/10 text-foreground"
                  : "border-[rgba(82,90,97,.3)] bg-[#F2F3F5] text-[#464D54] hover:border-rose/40")
              }
              data-od-id={`planned-${e.id}`}
            >
              <span className="text-xs">{e.clientName}</span>
              <span className="text-[11px] text-muted-foreground">{e.focusLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
