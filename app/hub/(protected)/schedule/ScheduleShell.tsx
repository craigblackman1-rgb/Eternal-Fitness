"use client";

import { useState } from "react";
import { ScheduleCalendar, type ScheduledEntry, type UnconfirmedBooking } from "./ScheduleCalendar";
import { MonthCalendar } from "./MonthCalendar";

type View = "month" | "day";

export function ScheduleShell({
  entries,
  unconfirmedBookings,
}: {
  entries: ScheduledEntry[];
  unconfirmedBookings?: UnconfirmedBooking[];
}) {
  const [view, setView] = useState<View>("month");
  const [jumpDay, setJumpDay] = useState<string | undefined>(undefined);

  const jumpToDay = (isoDate: string) => {
    setJumpDay(isoDate);
    setView("day");
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-[var(--hub-border)] bg-[var(--hub-canvas)] p-0.5">
        {(["month", "day"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={
              "rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-colors " +
              (view === v ? "bg-[var(--hub-card)] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
            }
          >
            {v}
          </button>
        ))}
      </div>

      {view === "month" ? (
        <MonthCalendar entries={entries} onJumpToDay={jumpToDay} />
      ) : (
        <ScheduleCalendar key={jumpDay ?? "today"} entries={entries} initialDay={jumpDay} unconfirmedBookings={unconfirmedBookings} />
      )}
    </div>
  );
}
