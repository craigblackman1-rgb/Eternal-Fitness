"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconClock, IconExternalLink } from "@/components/icons";
import { isoToLocalDate, isoToLocalTime } from "@/lib/schedule-dates";

export interface TriageBooking {
  id: string;
  clientName: string;
  sessionNumber: number;
  blockNumber: number | null;
  focus: string;
  scheduledAt: string;
  durationMinutes: number;
  /** Where the booking came from: "Hub", "Outlook", "Client portal". */
  source: string;
  /** When the booking was requested — for wait-time calculation. */
  requestedAt?: string | null;
  /** Optional note (e.g. "No client match on the invite"). */
  note?: string | null;
  /** Session URL for the "Open" action. */
  sessionUrl?: string | null;
  clientId?: string | null;
  blockId?: string | null;
}

interface TriageQueueProps {
  bookings: TriageBooking[];
  onConfirm: (id: string) => Promise<void>;
  onDecline: (id: string) => Promise<void>;
  now: Date;
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round(Math.abs(a.getTime() - b.getTime()) / 86_400_000));
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function formatHhmm(iso: string): string {
  return isoToLocalTime(iso);
}

/**
 * CR-EF-037 — Triage queue in the right rail. Shows unconfirmed inbound
 * bookings that need Esther's decision: Confirm, Open (view session), or
 * Decline.
 */
export function TriageQueue({ bookings, onConfirm, onDecline, now }: TriageQueueProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleConfirm = async (id: string) => {
    setBusyId(id);
    try {
      await onConfirm(id);
      toast.success("Booking confirmed");
    } catch {
      toast.error("Failed to confirm booking");
    }
    setBusyId(null);
  };

  const handleDecline = async (id: string) => {
    setBusyId(id);
    try {
      await onDecline(id);
      toast.success("Booking declined");
    } catch {
      toast.error("Failed to decline booking");
    }
    setBusyId(null);
  };

  return (
    <div className="hub-card" data-od-id="triage-queue">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-2.5">
        <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0" style={{ background: "rgba(176,138,62,.10)", color: "#8A6A2E" }}>
          <IconClock className="h-[15px] w-[15px]" />
        </span>
        <span className="text-[13px] font-bold text-foreground">Awaiting your decision</span>
        <span
          className="ml-auto min-w-[21px] h-[21px] px-1.5 rounded-full text-[11px] font-extrabold leading-[21px] text-center tabular-nums"
          style={{ background: "#8A6A2E", color: "#fff" }}
        >
          {bookings.length}
        </span>
      </div>
      <p className="px-4 pb-1.5 text-[12.5px] text-muted-foreground leading-relaxed">
        Bookings that arrived from Outlook or the client portal and have never been confirmed. They hold a slot on the spine, drawn dashed, until you decide.
      </p>

      {/* List */}
      {bookings.length === 0 ? (
        <div className="px-4 py-4 text-center text-[12.5px] text-muted-foreground border-t border-[var(--hub-border)]">
          Nothing waiting. Every booking on the spine has been confirmed or declined.
        </div>
      ) : (
        <ul className="list-none m-0 p-0">
          {bookings.map((b) => {
            const waited = daysBetween(now, new Date(b.requestedAt ?? b.scheduledAt));
            const busy = busyId === b.id;
            return (
              <li key={b.id} className="px-4 py-3 border-t border-[var(--hub-border)]">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[13px] font-bold text-foreground">{b.clientName}</span>
                  <span className="ml-auto text-[12px] text-body tabular-nums">
                    {formatShortDate(b.scheduledAt)} · {formatHhmm(b.scheduledAt)}
                  </span>
                </div>
                <p className="text-[11.5px] text-muted-foreground mt-0.5 m-0">
                  {b.focus} · S{b.sessionNumber} · via {b.source} · waiting {waited} {waited === 1 ? "day" : "days"}
                </p>
                {b.note && (
                  <p className="text-[11.5px] mt-1 m-0" style={{ color: "#8A6A2E" }}>
                    {b.note}
                  </p>
                )}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => handleConfirm(b.id)}
                    className="rounded-lg bg-rose text-white hover:bg-rose/90 h-7 px-3 text-xs font-semibold"
                  >
                    Confirm
                  </Button>
                  {b.sessionUrl ? (
                    <Link
                      href={b.sessionUrl}
                      className="inline-flex items-center rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 h-7 text-xs font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
                    >
                      Open
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => toast.info("Navigate to the session to view details")}
                      className="rounded-lg h-7 px-3 text-xs font-semibold"
                    >
                      Open
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => handleDecline(b.id)}
                    className="rounded-lg h-7 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Decline
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
