"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconCalendar } from "@/components/icons";
import { WEEKDAY_LABELS, type Weekday } from "@/lib/scheduling";
import { isoToLocalDate, todayLocalISODate } from "@/lib/schedule-dates";

interface BlockSchedulePanelProps {
  blockId: string;
  sessionCount: number;
  scheduledStartIso: string | null;
  weekdays: Weekday[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function fmtScheduledStart(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * CR-EF-037 Phase 3 — the block-page scheduling surface ("Schedule this block"
 * panel in hub-block-module.html). Front and centre on the block overview: an
 * unscheduled block shows a nudge into scheduling; a scheduled block shows a
 * summary with an "Edit schedule" toggle. Applying the pattern posts to
 * POST /api/blocks/[id]/schedule, which dates every planned session in plan
 * order and stamps `blocks.scheduled_start`. Weeks re-group automatically
 * because they're derived from dates, not the stored `week` ordinal.
 */
export function BlockSchedulePanel({
  blockId,
  sessionCount,
  scheduledStartIso,
  weekdays,
  open,
  onOpenChange,
}: BlockSchedulePanelProps) {
  const router = useRouter();
  const isScheduled = weekdays.length > 0;

  const [startDate, setStartDate] = useState(
    scheduledStartIso ? isoToLocalDate(scheduledStartIso) : todayLocalISODate(),
  );
  const [days, setDays] = useState<Set<Weekday>>(new Set(weekdays.length ? weekdays : [1, 4]));
  const [applying, setApplying] = useState(false);

  // Re-seed the form from the latest server props whenever it opens, so a
  // completed apply (router.refresh()) is reflected on the next open rather
  // than showing the pre-apply defaults.
  useEffect(() => {
    if (open) {
      setStartDate(scheduledStartIso ? isoToLocalDate(scheduledStartIso) : todayLocalISODate());
      setDays(new Set(weekdays.length ? weekdays : [1, 4]));
    }
  }, [open, scheduledStartIso, weekdays]);

  const toggleDay = (d: Weekday) => {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const apply = async () => {
    const list = [...days];
    if (list.length === 0) {
      toast.error("Pick at least one day of the week");
      return;
    }
    if (!startDate) {
      toast.error("Set a start date");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch(`/api/blocks/${blockId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, weekdays: list }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to schedule");
      }
      toast.success(`Scheduled ${sessionCount} sessions`);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setApplying(false);
    }
  };

  const currentDays = [...WEEKDAY_LABELS]
    .filter((w) => weekdays.includes(w.value))
    .map((w) => w.short)
    .join(", ");

  return (
    <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden">
      {isScheduled ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="w-8 h-8 rounded-lg bg-[var(--status-primary-bg)] text-rose flex items-center justify-center shrink-0">
            <IconCalendar className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              Scheduled from {scheduledStartIso ? fmtScheduledStart(scheduledStartIso) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentDays} · {sessionCount} sessions. Move one and its week follows.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(!open)} className="rounded-lg">
            {open ? "Close" : "Edit schedule"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="w-8 h-8 rounded-lg bg-[var(--status-primary-bg)] text-rose flex items-center justify-center shrink-0">
            <IconCalendar className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">This block has no dates yet</p>
            <p className="text-xs text-muted-foreground">
              Pick a start date and a weekly pattern to schedule all {sessionCount} sessions — &ldquo;Plan week&rdquo; grouping becomes real calendar weeks.
            </p>
          </div>
          <Button size="sm" onClick={() => onOpenChange(true)} className="rounded-lg bg-rose text-white hover:bg-rose/90">
            Schedule block
          </Button>
        </div>
      )}

      {open && (
        <div className="border-t border-[var(--hub-border)] px-4 py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="bsp-start" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Start date
              </label>
              <input
                id="bsp-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2.5 text-sm text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Weekly pattern</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map((w) => {
                  const active = days.has(w.value);
                  return (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => toggleDay(w.value)}
                      aria-pressed={active}
                      className={cn(
                        "h-8 px-3 rounded-lg border text-xs font-semibold transition-colors",
                        active
                          ? "border-rose bg-rose text-white"
                          : "border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:border-[var(--hub-field-border-hover)] hover:text-foreground",
                      )}
                    >
                      {w.short}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">&nbsp;</span>
              <Button onClick={apply} disabled={applying} className="h-9 rounded-lg bg-rose text-white hover:bg-rose/90">
                {applying ? "Scheduling..." : "Apply schedule"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
