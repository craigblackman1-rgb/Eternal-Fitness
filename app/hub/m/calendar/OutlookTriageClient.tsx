"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DayAgenda, type AgendaSession } from "@/components/hub/DayAgenda";
import { SessionStatusPill } from "@/components/hub/SessionStatusPill";
import type { OutlookBookingRow } from "./page";

const ICO = {
  warn: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>
      <path d="M12 9v4M12 17h.01"/>
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  calendarDot: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <circle cx="12" cy="15" r="2.5"/>
    </svg>
  ),
  chev: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
};

interface OutlookTriageClientProps {
  agendaSessions: AgendaSession[];
  today: string;
  windowStart: string;
  windowEnd: string;
  openBookings: OutlookBookingRow[];
  openBookingCount: number;
  showPast: boolean;
}

function formatBookingWhen(startAt: string): string {
  const d = new Date(startAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDay = new Date(d);
  startDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startDay.getTime() - today.getTime()) / 86_400_000);

  let dayLabel: string;
  if (diffDays === 0) dayLabel = "Today";
  else if (diffDays === 1) dayLabel = "Tomorrow";
  else if (diffDays === -1) dayLabel = "Yesterday";
  else {
    dayLabel = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }

  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${dayLabel} ${time}`;
}

export function OutlookTriageClient({
  agendaSessions,
  today,
  windowStart,
  windowEnd,
  openBookings,
  openBookingCount,
  showPast,
}: OutlookTriageClientProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bookings, setBookings] = useState<OutlookBookingRow[]>(openBookings);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  const count = bookings.length;

  async function dismissBooking(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (dismissingIds.has(id)) return;

    setDismissingIds((prev) => new Set(prev).add(id));
    const previous = bookings;
    setBookings((prev) => prev.filter((b) => b.id !== id));

    try {
      const res = await fetch(`/api/outlook-bookings/${id}/dismiss`, { method: "POST" });
      if (!res.ok) {
        setBookings(previous);
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to dismiss booking");
      } else {
        toast.success("Booking dismissed");
      }
    } catch {
      setBookings(previous);
      toast.error("Failed to dismiss booking");
    } finally {
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <>
      <header className="mtop">
        <div className="mtop-row">
          <div className="mbrand">
            <img src="/images/ef-heart-logo.svg" alt="Eternal Fitness" />
            <span className="mbrand-sub">Trainer Hub</span>
          </div>
          <Link className="desktop-link" href="/hub/schedule">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
            Desktop
          </Link>
        </div>
      </header>

      <main className="mcontent has-fab">
        <div className="note">
          <span className="note-b">i</span>
          <div>
            <b>Day-agenda calendar.</b> One row per day, forward and back from today. Empty days still
            render — tap one to book a session. Weeks are Monday–Sunday.
          </div>
        </div>

        <Link
          className="past-toggle"
          href={showPast ? "/hub/m/calendar" : "/hub/m/calendar?past=7"}
        >
          {showPast ? "Hide past days" : "Show past 7 days"}
        </Link>

        {count > 0 && (
          <div className="alert a-warning" data-od-id="bookings-card">
            <span className="alert-ic">{ICO.warn}</span>
            <div>
              <b>{count} booking{count !== 1 ? "s" : ""} waiting to be matched</b>
              Booked through Microsoft Bookings and not yet linked to a client or program — confirm or dismiss them.
            </div>
            <button className="alert-cta" onClick={() => setSheetOpen(true)}>
              Review
            </button>
          </div>
        )}

        <DayAgenda
          sessions={agendaSessions}
          today={today}
          windowStart={windowStart}
          windowEnd={windowEnd}
          scope="trainer"
        />
      </main>

      <Link className="fab" href={`/hub/m/book?scope=trainer&day=${today}`} data-od-id="agenda-add">
        {ICO.plus}
        Book session
      </Link>

      {sheetOpen && (
        <>
          <div className="scrim" onClick={() => setSheetOpen(false)} />
          <div className="sheet open" data-od-id="triage-sheet">
            <div className="sh-grab" />
            <div className="sh-h">
              <span className="sh-t">Unmatched bookings</span>
              <button className="sh-close" onClick={() => setSheetOpen(false)} aria-label="Close">
                {ICO.close}
              </button>
            </div>
            <div className="sh-s">
              Booked through Microsoft Bookings — tap one to confirm it against a client and program.
            </div>
            <div className="sh-b">
              {count === 0 ? (
                <div className="t-empty">No bookings waiting — you&apos;re all caught up.</div>
              ) : (
                <>
                  {bookings.map((b) => {
                    const matched = b.client_id && b.clients;
                    return (
                      <div
                        key={b.id}
                        className="sh-opt"
                        style={{ flexDirection: "column", alignItems: "stretch", gap: "2px" }}
                        onClick={() => router.push(`/hub/m/book?scope=trainer&booking=${b.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/hub/m/book?scope=trainer&booking=${b.id}`); }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span className="sh-opt-ic">{ICO.calendarDot}</span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span className="sh-opt-t" style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {b.subject}
                            </span>
                            <span className="sh-opt-d">{formatBookingWhen(b.start_at)}</span>
                          </span>
                          <button
                            className="mini danger"
                            onClick={(e) => dismissBooking(b.id, e)}
                            disabled={dismissingIds.has(b.id)}
                            aria-label="Dismiss booking"
                            title="Dismiss"
                          >
                            {ICO.trash}
                          </button>
                          {ICO.chev}
                        </div>
                        {matched ? (
                          <span className="s-pill scheduled" style={{ margin: "4px 0 0" }}>
                            Matched to {b.clients?.name}
                          </span>
                        ) : (
                          <span className="s-pill planned" style={{ margin: "4px 0 0" }}>
                            No client matched
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <button
                    className="sh-opt"
                    style={{ borderStyle: "dashed", justifyContent: "center", color: "var(--muted)" }}
                    onClick={() => setSheetOpen(false)}
                  >
                    Done for now
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
