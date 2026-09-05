"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ScheduledEntry } from "./ScheduleCalendar";

function formatStamp(iso: string | null): string {
  if (!iso) return "not set";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function formatHhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface SessionDrawerProps {
  entry: ScheduledEntry | null;
  onClose: () => void;
  onComplete?: (entry: ScheduledEntry) => void;
}

/**
 * CR-EF-037 — Right-edge drawer for session detail. Shows stored state,
 * timestamps, and available actions. Matches the mockup's drawer standard:
 * 420px width, Esc/scrim/X dismiss, focus to heading.
 */
export function SessionDrawer({ entry, onClose, onComplete }: SessionDrawerProps) {
  if (!entry) return null;

  const sessionUrl =
    entry.clientNumber != null && entry.blockId != null
      ? `/hub/clients/${entry.clientNumber}/blocks/${entry.blockId}/sessions/${entry.sessionNumber}`
      : null;

  const offDay =
    entry.status === "completed" &&
    entry.completedAt &&
    new Date(entry.completedAt).toDateString() !== new Date(entry.scheduledAt).toDateString();

  const statusLabel: Record<string, string> = {
    planned: "Planned",
    scheduled: "Booked",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const statusColor: Record<string, string> = {
    planned: "#464D54",
    scheduled: "#8A5570",
    in_progress: "#8A6A2E",
    completed: "#066A75",
    cancelled: "#7A4257",
  };

  const statusBg: Record<string, string> = {
    planned: "#F2F3F5",
    scheduled: "#FBF3F7",
    in_progress: "#F7EFDD",
    completed: "#E9F4F5",
    cancelled: "#FBF4F6",
  };

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-[40]"
        style={{ background: "rgba(19,19,19,.40)", opacity: 1, transition: "opacity .22s ease" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-screen z-[50] flex flex-col"
        style={{
          width: "420px",
          maxWidth: "96vw",
          background: "var(--hub-card)",
          boxShadow: "-8px 0 32px rgba(16,24,40,.10), -2px 0 8px rgba(16,24,40,.06)",
          transform: "translateX(0)",
          transition: "transform .26s cubic-bezier(.32,.72,0,1)",
        }}
        role="dialog"
        aria-labelledby="session-drawer-h"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-[18px] py-4 border-b border-[var(--hub-border)] shrink-0">
          <div className="min-w-0 flex-1">
            <h3 id="session-drawer-h" className="m-0 text-[15.5px] font-bold text-foreground" tabIndex={-1}>
              {entry.clientName}
            </h3>
            <span className="block text-[12.5px] font-medium text-muted-foreground mt-0.5">
              {formatShortDate(entry.scheduledAt)}, {formatHhmm(entry.scheduledAt)} · {entry.durationMinutes} min · Block {entry.blockNumber ?? "?"}, session {entry.sessionNumber}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[var(--r-control)] border-0 bg-transparent text-muted-foreground cursor-pointer grid place-items-center text-lg leading-none shrink-0 hover:bg-[var(--hub-hover)] hover:text-foreground"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[18px] pt-4 pb-7">
          {/* Status */}
          <p className="m-0 mb-3 text-[10.5px] font-bold uppercase tracking-[.08em] text-muted-foreground">Status</p>
          <span
            className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-semibold border"
            style={{
              color: statusColor[entry.status] ?? "#525A61",
              backgroundColor: statusBg[entry.status] ?? "#F2F3F5",
              borderColor: "transparent",
            }}
          >
            {offDay && entry.status === "completed" ? (
              <>Completed {entry.completedAt ? formatShortDate(entry.completedAt) : ""}</>
            ) : (
              statusLabel[entry.status] ?? entry.status
            )}
          </span>

          {/* Off-day warning */}
          {offDay && entry.completedAt && (
            <div
              className="flex gap-2 p-2.5 text-[12px] leading-relaxed mt-3"
              style={{ borderRadius: "var(--r-nested)", background: "rgba(138,78,99,.10)", border: "1px solid rgba(138,78,99,.28)", color: "#6B3A4B" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={14} height={14} className="shrink-0 mt-0.5" style={{ color: "#8A4E63" }}>
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
              <span>
                <strong className="text-foreground">Completed on a different day from its booking.</strong>{" "}
                Booked {formatShortDate(entry.scheduledAt)} at {formatHhmm(entry.scheduledAt)}, completed {formatStamp(entry.completedAt)}. Move the booking to the delivery date, or keep both and accept the flag.
              </span>
            </div>
          )}

          {/* Cancel reason */}
          {entry.status === "cancelled" && entry.cancelReason && (
            <p className="text-[12.5px] text-muted-foreground mt-2 mb-0">Reason: {entry.cancelReason}</p>
          )}

          {/* Stored state */}
          <p className="m-0 mt-5 mb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-muted-foreground">Stored state</p>
          <div className="border border-[var(--hub-border)] overflow-hidden" style={{ borderRadius: "var(--r-nested)" }}>
            <StampRow label="Booked for" value={formatStamp(entry.scheduledAt)} set />
            <StampRow label="Confirmed" value={null} set={false} />
            <StampRow label="Started" value={null} set={false} />
            <StampRow label="Completed" value={entry.completedAt ? formatStamp(entry.completedAt) : null} set={!!entry.completedAt} />
            <StampRow label="Cancelled" value={entry.cancelledAt ? formatStamp(entry.cancelledAt) : null} set={!!entry.cancelledAt} />
          </div>

          {/* Workout */}
          <p className="m-0 mt-5 mb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-muted-foreground">Workout</p>
          <div className="border border-[var(--hub-border)] overflow-hidden" style={{ borderRadius: "var(--r-nested)" }}>
            <div className="flex items-baseline gap-3.5 px-2.5 py-2 text-[13px]">
              <span className="flex-shrink-0 w-[100px] text-muted-foreground text-[12.5px]">Focus</span>
              <span className="flex-1 min-w-0 text-foreground font-medium">{entry.focusLabel}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-[18px] py-3 border-t border-[var(--hub-border)] flex gap-2 shrink-0" style={{ background: "#FDFDFE" }}>
          {entry.status === "scheduled" && (
            <>
              <button
                type="button"
                disabled
                title="Not available yet — use the Calendar view for now"
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--r-control)] px-3.5 py-1.5 min-h-[30px] font-[inherit] text-[12.5px] font-semibold cursor-not-allowed border border-[var(--muted)] bg-[var(--hub-card)] text-muted-foreground opacity-50"
              >
                Reschedule
              </button>
              <button
                type="button"
                onClick={() => onComplete?.(entry)}
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--r-control)] px-3.5 py-1.5 min-h-[30px] font-[inherit] text-[12.5px] font-semibold cursor-pointer border border-[var(--muted)] bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)] hover:border-foreground transition-colors"
              >
                Mark completed
              </button>
              <button
                type="button"
                disabled
                title="Not available yet — use the Calendar view for now"
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--r-control)] px-3.5 py-1.5 min-h-[30px] font-[inherit] text-[12.5px] font-semibold cursor-not-allowed border border-transparent bg-transparent text-muted-foreground opacity-50"
              >
                Cancel
              </button>
            </>
          )}
          {entry.status === "completed" && sessionUrl && (
            <Link
              href={sessionUrl}
              className="inline-flex items-center justify-center gap-1.5 rounded-[var(--r-control)] px-3.5 py-1.5 min-h-[30px] font-[inherit] text-[12.5px] font-semibold cursor-pointer border border-[var(--muted)] bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)] hover:border-foreground transition-colors"
            >
              Open session
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

function StampRow({ label, value, set }: { label: string; value: string | null; set: boolean }) {
  return (
    <div className={cn("flex items-baseline gap-2.5 px-2.5 py-[7px] text-xs border-t border-[var(--hub-border)] first:border-t-0", !set && "text-[#9AA0A8]")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-[ui-monospace] text-[11px] text-muted-foreground">&mdash;</span>
      <span className={cn("ml-auto tabular-nums font-semibold", set ? "text-foreground" : "text-[#9AA0A8] font-normal")}>
        {value ?? "not set"}
      </span>
    </div>
  );
}
