"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconTriangleAlert } from "@/components/icons";

interface OffDayGuardDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: "today" | "booked") => Promise<void>;
  session: {
    id: string;
    clientName: string;
    focus: string;
    scheduledAt: string;
    durationMinutes: number;
  };
  now: Date;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function formatHhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatStamp(dt: Date): string {
  return `${dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${formatHhmm(dt.toISOString())}`;
}

/**
 * CR-EF-037 — Off-day completion guard. When completing a session on a
 * different calendar day than it was booked, Esther must choose:
 *   (a) "It happened today" → moves the booking to today, nothing flagged.
 *   (b) "Logging it late" → back-dates completed_at, carries an Off-day flag.
 *
 * When the booking is in the FUTURE, option (b) MUST be disabled with the
 * reason shown — that is precisely the path that produced 'Completed on a
 * date it was never delivered'.
 */
export function OffDayGuardDialog({ open, onClose, onConfirm, session, now }: OffDayGuardDialogProps) {
  const [choice, setChoice] = useState<"today" | "booked">("today");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const scheduledDate = new Date(session.scheduledAt);
  const todayKey = formatShortDate(now.toISOString());
  const bookedKey = formatShortDate(session.scheduledAt);
  const isFuture = formatShortDate(session.scheduledAt) > formatShortDate(now.toISOString());

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm(choice);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-5"
      style={{ background: "rgba(19,19,19,.42)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guardTitle"
    >
      <div className="bg-[var(--hub-card)] rounded-2xl w-full max-w-[560px] shadow-[0_24px_64px_rgba(16,24,40,.28)] overflow-hidden">
        {/* Header */}
        <div className="flex gap-2.5 px-5 pt-5 pb-3">
          <span
            className="w-[34px] h-[34px] rounded-[9px] shrink-0 grid place-items-center"
            style={{ background: "rgba(138,78,99,.10)", color: "#8A4E63" }}
          >
            <IconTriangleAlert className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p id="guardTitle" className="text-[15.5px] font-bold text-foreground m-0">
              This session is not booked for today
            </p>
            <p className="text-[13px] text-muted-foreground mt-0.5 m-0">
              {session.clientName} · {session.focus} is booked for {bookedKey} at {formatHhmm(session.scheduledAt)}. Today is {todayKey}. Which date did this session actually happen on?
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="px-5">
          {/* Option A: It happened today */}
          <button
            type="button"
            onClick={() => setChoice("today")}
            className={cn(
              "flex gap-2.5 w-full text-left border bg-[var(--hub-card)] rounded-[11px] p-3 cursor-pointer font-[inherit] mb-2 transition-colors",
              choice === "today"
                ? "border-rose bg-rose/5"
                : "border-[var(--hub-border)] hover:border-rose hover:bg-rose/5",
            )}
          >
            <span
              className={cn(
                "w-[17px] h-[17px] rounded-full border-2 shrink-0 mt-0.5 relative",
                choice === "today" ? "border-rose" : "border-[var(--hub-field-border)]",
              )}
            >
              {choice === "today" && <span className="absolute inset-[3px] rounded-full bg-rose" />}
            </span>
            <span>
              <span className="text-[13px] font-bold text-foreground block">It happened today, {todayKey}</span>
              <span className="text-[12.5px] text-muted-foreground block mt-0.5 leading-relaxed">
                Moves <code className="font-[ui-monospace] text-[11px] bg-[var(--hub-hover)] border border-[var(--hub-border)] rounded px-1 text-foreground">scheduled_for</code> to today and writes <code className="font-[ui-monospace] text-[11px] bg-[var(--hub-hover)] border border-[var(--hub-border)] rounded px-1 text-foreground">completed_at</code> now. The booking and the delivery agree, so nothing is flagged.
              </span>
            </span>
          </button>

          {/* Option B: Logging it late (disabled if future) */}
          <button
            type="button"
            onClick={() => !isFuture && setChoice("booked")}
            disabled={isFuture}
            className={cn(
              "flex gap-2.5 w-full text-left border bg-[var(--hub-card)] rounded-[11px] p-3 cursor-pointer font-[inherit] transition-colors",
              isFuture && "opacity-50 cursor-not-allowed",
              choice === "booked"
                ? "border-rose bg-rose/5"
                : "border-[var(--hub-border)] hover:border-rose hover:bg-rose/5",
            )}
            aria-disabled={isFuture}
          >
            <span
              className={cn(
                "w-[17px] h-[17px] rounded-full border-2 shrink-0 mt-0.5 relative",
                choice === "booked" ? "border-rose" : "border-[var(--hub-field-border)]",
              )}
            >
              {choice === "booked" && !isFuture && <span className="absolute inset-[3px] rounded-full bg-rose" />}
            </span>
            <span>
              <span className="text-[13px] font-bold text-foreground block">
                It happened on {bookedKey}, I am logging it late
              </span>
              <span className="text-[12.5px] text-muted-foreground block mt-0.5 leading-relaxed">
                {isFuture ? (
                  <>
                    Unavailable — <strong className="text-foreground">{bookedKey} is in the future.</strong> A session cannot be completed against a date it has not reached. This is the case that used to slip through and show Completed on an undelivered booking.
                  </>
                ) : (
                  <>
                    Keeps <code className="font-[ui-monospace] text-[11px] bg-[var(--hub-hover)] border border-[var(--hub-border)] rounded px-1 text-foreground">scheduled_for</code> and back-dates <code className="font-[ui-monospace] text-[11px] bg-[var(--hub-hover)] border border-[var(--hub-border)] rounded px-1 text-foreground">completed_at</code> to the booked slot. The session carries an <strong className="text-foreground">Off-day</strong> flag until reconciled.
                  </>
                )}
              </span>
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 py-4 mt-2.5 border-t border-[var(--hub-border)]">
          <Button variant="ghost" onClick={onClose} className="rounded-lg">
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={handleConfirm}
            className="rounded-lg bg-rose text-white hover:bg-rose/90"
          >
            Mark completed
          </Button>
        </div>
      </div>
    </div>
  );
}
