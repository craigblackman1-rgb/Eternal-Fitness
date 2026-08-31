"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { SessionStatusPill } from "@/components/hub/SessionStatusPill";
import { IconCalendar } from "@/components/icons";
import type { ScheduledEntry } from "./ScheduleCalendar";
import { londonDayKey, isoToLocalDate, isoToLocalTime } from "@/lib/schedule-dates";

function isOffDay(s: ScheduledEntry): boolean {
  if (s.status !== "completed" || !s.completedAt) return false;
  return londonDayKey(s.completedAt) !== londonDayKey(s.scheduledAt);
}

function isUnconfirmed(s: ScheduledEntry): boolean {
  return s.status === "scheduled" && !("confirmedAt" in s && (s as ScheduledEntry & { confirmedAt?: string | null }).confirmedAt != null);
}

function formatStamp(iso: string | null): string {
  if (!iso) return "not set";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function formatHhmm(iso: string): string {
  return isoToLocalTime(iso);
}

interface SessionDetailProps {
  entry: ScheduledEntry | null;
  now: Date;
  onComplete: (entry: ScheduledEntry) => void;
}

/**
 * CR-EF-037 — Right-rail session detail panel. Shows stored state, timestamps,
 * derived flags, and available actions for the selected session.
 */
export function SessionDetail({ entry, now, onComplete }: SessionDetailProps) {
  if (!entry) {
    return (
      <div className="hub-card" data-od-id="session-detail">
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-2.5">
          <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: "rgba(193,131,159,.10)", color: "#C1839F" }}>
            <IconCalendar className="h-[15px] w-[15px]" />
          </span>
          <span className="text-[13px] font-bold text-foreground">Session detail</span>
        </div>
        <p className="px-4 pb-4 text-center text-[12.5px] text-muted-foreground leading-relaxed">
          Pick a session on the spine to see its stored state, its timestamps and what it can do next.
        </p>
      </div>
    );
  }

  const offDay = isOffDay(entry);
  const unconf = isUnconfirmed(entry);
  const cancelled = entry.status === "cancelled";
  const sessionUrl =
    entry.clientNumber != null && entry.blockId != null
      ? `/hub/clients/${entry.clientNumber}/blocks/${entry.blockId}/sessions/${entry.sessionNumber}`
      : null;

  // Determine available actions based on state
  const actions: Array<{ key: string; label: string; variant: string; href?: string }> = [];
  if (entry.status === "planned") {
    actions.push({ key: "schedule", label: "Schedule…", variant: "primary" });
    actions.push({ key: "cancel", label: "Cancel", variant: "ghost" });
  } else if (entry.status === "scheduled" && unconf) {
    actions.push({ key: "confirm", label: "Confirm booking", variant: "primary" });
    actions.push({ key: "reschedule", label: "Reschedule", variant: "outline" });
    actions.push({ key: "decline", label: "Decline", variant: "ghost" });
  } else if (entry.status === "scheduled") {
    actions.push({ key: "start", label: "Start session", variant: "primary" });
    actions.push({ key: "complete", label: "Mark completed", variant: "outline" });
    actions.push({ key: "reschedule", label: "Reschedule", variant: "outline" });
    actions.push({ key: "cancel", label: "Cancel", variant: "ghost" });
  } else if (entry.status === "in_progress") {
    actions.push({ key: "complete", label: "Complete session", variant: "primary" });
    actions.push({ key: "cancel", label: "Cancel", variant: "ghost" });
  } else if (entry.status === "completed") {
    if (sessionUrl) actions.push({ key: "open", label: "Open session", variant: "primary", href: sessionUrl });
    actions.push({ key: "reopen", label: "Reopen", variant: "outline" });
    if (offDay) {
      const completedDate = entry.completedAt ? formatShortDate(entry.completedAt) : "delivery date";
      actions.push({ key: "movebooking", label: `Move booking to ${completedDate}`, variant: "outline" });
    }
  } else if (entry.status === "cancelled") {
    actions.push({ key: "restore", label: "Restore to scheduled", variant: "outline" });
  }

  return (
    <div className="hub-card" data-od-id="session-detail">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-2.5">
        <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: "rgba(193,131,159,.10)", color: "#C1839F" }}>
          <IconCalendar className="h-[15px] w-[15px]" />
        </span>
        <span className="text-[13px] font-bold text-foreground">Session detail</span>
      </div>

      <div className="px-4 pb-3.5">
        {/* Client name */}
        <p className="text-[15px] font-bold text-foreground m-0">{entry.clientName}</p>
        <p className="text-[12.5px] text-muted-foreground mt-0.5 mb-2.5">
          {entry.archetype ? `${entry.archetype} · ` : ""}Session {entry.sessionNumber} · {entry.durationMinutes} min
        </p>

        {/* Status pill + flags */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <SessionStatusPill status={entry.status} unconfirmed={unconf} offDay={offDay} />
        </div>

        {/* Off-day warning */}
        {offDay && entry.completedAt && (
          <div
            className="flex gap-2 rounded-[9px] p-2.5 text-[12px] leading-relaxed mb-3"
            style={{ background: "rgba(138,78,99,.10)", border: "1px solid rgba(138,78,99,.28)", color: "#6B3A4B" }}
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
        {cancelled && entry.cancelReason && (
          <p className="text-[12.5px] text-muted-foreground mt-[-4px] mb-2">
            Reason: {entry.cancelReason}
          </p>
        )}

        {/* Timestamps */}
        <ul className="list-none m-0 p-0 border border-[var(--hub-border)] rounded-[9px] overflow-hidden mb-3">
          <StampRow label="Booked for" value={formatStamp(entry.scheduledAt)} set={true} />
          <StampRow label="Confirmed" value={null} set={false} />
          <StampRow label="Started" value={null} set={false} />
          <StampRow label="Completed" value={entry.completedAt ? formatStamp(entry.completedAt) : null} set={!!entry.completedAt} />
          <StampRow label="Cancelled" value={entry.cancelledAt ? formatStamp(entry.cancelledAt) : null} set={!!entry.cancelledAt} />
        </ul>

        {/* Actions */}
        <div className="flex gap-1.5 flex-wrap">
          {actions.map((a) => {
            const cls =
              a.variant === "primary"
                ? "rounded-lg bg-rose text-white hover:bg-rose/90 px-3 py-1.5 text-xs font-semibold"
                : a.variant === "outline"
                  ? "rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
                  : "rounded-lg bg-transparent border-transparent px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground transition-colors";
            if (a.href) {
              return (
                <Link key={a.key} href={a.href} className={cls}>
                  {a.label}
                </Link>
              );
            }
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => {
                  if (a.key === "complete") onComplete(entry);
                  else if (a.key === "open" && sessionUrl) window.location.href = sessionUrl;
                  else if (a.key === "movebooking") {
                    // Move booking to completed_at day
                    const completedDate = entry.completedAt ? isoToLocalDate(entry.completedAt) : null;
                    if (completedDate) {
                      const time = isoToLocalTime(entry.scheduledAt);
                      const [y, m, d] = completedDate.split("-").map(Number);
                      const [h, min] = time.split(":").map(Number);
                      const newScheduled = new Date(y, m - 1, d, h, min).toISOString();
                      fetch(`/api/sessions/${entry.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ scheduled_at: newScheduled }),
                      }).then((r) => {
                        if (r.ok) window.location.reload();
                      });
                    }
                  }
                  // Other actions: stub for now
                }}
                className={cls}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StampRow({ label, value, set }: { label: string; value: string | null; set: boolean }) {
  return (
    <li className={cn("flex items-baseline gap-2.5 px-2.5 py-[7px] text-xs border-t border-[var(--hub-border)] first:border-t-0", !set && "text-[#9AA0A8]")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-[ui-monospace] text-[11px] text-muted-foreground">—</span>
      <span className={cn("ml-auto tabular-nums font-semibold", set ? "text-foreground" : "text-[#9AA0A8] font-normal")}>
        {value ?? "not set"}
      </span>
    </li>
  );
}
