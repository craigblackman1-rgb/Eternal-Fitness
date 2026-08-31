"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────

interface BookingSettings {
  id: string;
  session_length: number;
  gap_after: number;
  notice_hours: number;
  lead_hours: number;
  horizon_weeks: number;
  max_per_day: number;
  intro_holdback: number;
}

interface PatternRow {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
  note: string | null;
  sort_order: number;
}

interface OverrideRow {
  id: string;
  override_type: "time_off" | "extra_hours";
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  active: boolean;
}

interface OverrideClash {
  sessionId: string;
  sessionNumber: number;
  scheduledAt: string;
  clientName: string;
  blockNumber: number;
}

interface OverrideWithClashes {
  overrideId: string;
  clashes: OverrideClash[];
}

interface AvailabilityScreenProps {
  initialSettings: BookingSettings | null;
  initialPattern: PatternRow[];
  initialOverrides: OverrideRow[];
  overrideClashes: OverrideWithClashes[];
}

// ─── Constants ──────────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Helpers ────────────────────────────────────────────────────────────

function mins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function slotsInRange(start: string, end: string, sessionLen: number, gap: number): number {
  const span = mins(end) - mins(start);
  const step = sessionLen + gap;
  return span < sessionLen ? 0 : Math.floor((span - sessionLen) / step) + 1;
}

function daySlots(pattern: PatternRow[], dow: number, sessionLen: number, gap: number): number {
  return pattern
    .filter((p) => p.day_of_week === dow && p.active)
    .reduce((sum, p) => sum + slotsInRange(p.start_time, p.end_time, sessionLen, gap), 0);
}

function totalSlotsPerWeek(pattern: PatternRow[], sessionLen: number, gap: number): number {
  let total = 0;
  for (let dow = 0; dow <= 6; dow++) {
    total += daySlots(pattern, dow, sessionLen, gap);
  }
  return total;
}

function daysOpenCount(pattern: PatternRow[]): number {
  return new Set(pattern.filter((p) => p.active).map((p) => p.day_of_week)).size;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function todayLocalISODate(): string {
  return fmtDate(new Date());
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return fmtDate(dt);
}

function fmtDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ─── Component ──────────────────────────────────────────────────────────

export function AvailabilityScreen({
  initialSettings,
  initialPattern,
  initialOverrides,
  overrideClashes,
}: AvailabilityScreenProps) {
  const router = useRouter();
  const [pattern] = useState<PatternRow[]>(initialPattern);
  const [overrides] = useState<OverrideRow[]>(initialOverrides);
  const [settings] = useState<BookingSettings>(
    initialSettings ?? {
      id: "",
      session_length: 60,
      gap_after: 15,
      notice_hours: 24,
      lead_hours: 12,
      horizon_weeks: 8,
      max_per_day: 5,
      intro_holdback: 2,
    }
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);
  const [movedSessionIds, setMovedSessionIds] = useState<Set<string>>(new Set());
  const [showResolveClashes, setShowResolveClashes] = useState<string | null>(null);

  const sessionLen = settings.session_length;
  const gap = settings.gap_after;
  const slotsWeek = totalSlotsPerWeek(pattern, sessionLen, gap);
  const daysOpen = daysOpenCount(pattern);

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const moveSession = useCallback(
    async (sessionId: string, currentScheduledAt: string) => {
      setMovingSessionId(sessionId);
      try {
        const current = new Date(currentScheduledAt);
        const next = new Date(current);
        next.setDate(next.getDate() + 7);
        const yyyy = next.getFullYear();
        const mm = String(next.getMonth() + 1).padStart(2, "0");
        const dd = String(next.getDate()).padStart(2, "0");
        const hh = String(current.getHours()).padStart(2, "0");
        const mi = String(current.getMinutes()).padStart(2, "0");
        const newScheduledAt = `${yyyy}-${mm}-${dd}T${hh}:${mi}:00Z`;

        const res = await fetch("/api/hub/availability/move-clashing-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, newScheduledAt }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          toast.error(err?.error ?? "Failed to move session");
          return;
        }

        toast.success("Session moved");
        setMovedSessionIds((prev) => new Set(prev).add(sessionId));
        router.refresh();
      } finally {
        setMovingSessionId(null);
      }
    },
    [router]
  );

  const today = todayLocalISODate();
  const timeOffOverrides = overrides.filter(
    (o) => o.active && o.override_type === "time_off"
  );
  const extraOverrides = overrides.filter(
    (o) => o.active && o.override_type === "extra_hours"
  );

  return (
    <>
      {/* ── Top bar ── */}
      <header className="mtop">
        <div className="mtop-row">
          <Link href="/hub/m/calendar" className="mtop-back" aria-label="Back to calendar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="mtop-id">
            <div className="mtop-t">Availability</div>
            <div className="mtop-s">What clients can book · saved as you change it</div>
          </div>
          <a href="/book" target="_blank" rel="noopener" className="mtop-view">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
            </svg>
            View
          </a>
        </div>
      </header>

      <main className="mcontent">
        {/* ── Block time off — the phone-first primary action ── */}
        <section className="m-section">
          <div className="m-section-h">
            <div className="sec-h-t ic-amber">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <div>
              <div className="sec-h-t">Block time off</div>
              <div className="sec-h-s">Closes the time to new bookings straight away. Sessions already in the diary are never cancelled behind your back — any clash is listed before you save.</div>
            </div>
          </div>
          <div className="m-section-b">
            <div className="avail-presets">
              <button
                type="button"
                className="preset-btn"
                onClick={() => toast.info("Block rest of today — coming soon")}
              >
                <span className="preset-t">Rest of today</span>
                <span className="preset-s">From now until close</span>
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => toast.info("Block tomorrow — coming soon")}
              >
                <span className="preset-t">Tomorrow</span>
                <span className="preset-s">{fmtDayLabel(addDays(today, 1))}</span>
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => toast.info("Block rest of this week — coming soon")}
              >
                <span className="preset-t">Rest of this week</span>
                <span className="preset-s">To end of week</span>
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => toast.info("Block next week — coming soon")}
              >
                <span className="preset-t">Next week</span>
                <span className="preset-s">{fmtDayLabel(addDays(today, 7))} – {fmtDayLabel(addDays(today, 13))}</span>
              </button>
              <button
                type="button"
                className="preset-btn preset-wide"
                onClick={() => toast.info("Pick dates — coming soon")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <span className="preset-t">Pick dates and times</span>
                <span className="preset-s">A holiday, an appointment, or part of one day</span>
                <svg className="preset-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* ── Coming up: existing time off + extras ── */}
        <section className="m-section">
          <div className="m-section-h">
            <div className="sec-h-t ic-navy">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div className="sec-h-t">Coming up</div>
              <div className="sec-h-s">Time already blocked, and hours opened outside the normal week.</div>
            </div>
          </div>
          <div className="m-section-b">
            {timeOffOverrides.length === 0 && extraOverrides.length === 0 ? (
              <div className="empty" style={{ padding: "20px 14px" }}>
                <div className="empty-ic">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <p className="empty-t">Nothing scheduled</p>
                <p className="empty-d">Time off and extra hours you add will appear here.</p>
              </div>
            ) : (
              <>
                {timeOffOverrides.map((o) => {
                  const clashData = overrideClashes.find((c) => c.overrideId === o.id);
                  const clashes = clashData?.clashes ?? [];
                  const isResolving = showResolveClashes === o.id;
                  const dateLabel =
                    o.start_date === o.end_date
                      ? fmtDayLabel(o.start_date)
                      : `${fmtDayLabel(o.start_date)} – ${fmtDayLabel(o.end_date)}`;
                  const timeLabel =
                    o.start_time && o.end_time
                      ? `, ${o.start_time} – ${o.end_time}`
                      : " · whole day";

                  return (
                    <div key={o.id} className="override-row">
                      <div className="override-head">
                        <div className="override-ic ic-amber">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                          </svg>
                        </div>
                        <div className="override-info">
                          <div className="override-when">{dateLabel}{timeLabel}</div>
                          {o.reason && <div className="override-why">{o.reason}</div>}
                        </div>
                      </div>
                      <div className="override-badges">
                        {clashes.length > 0 ? (
                          <span className="pill clash-pill">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4M12 17h.01" />
                            </svg>
                            {clashes.length} clash{clashes.length !== 1 ? "es" : ""}
                          </span>
                        ) : (
                          <span className="pill" style={{ background: "var(--s-success-bg)", border: "1px solid var(--s-success-bd)", color: "var(--teal)" }}>
                            No sessions affected
                          </span>
                        )}
                        <span className="pill" style={{ background: "var(--s-neutral-bg)", border: "1px solid var(--s-neutral-bd)", color: "var(--s-neutral)" }}>
                          Hidden from booking
                        </span>
                      </div>
                      {clashes.length > 0 && (
                        <div className="override-actions">
                          <button
                            type="button"
                            className="tool-btn"
                            onClick={() => setShowResolveClashes(isResolving ? null : o.id)}
                          >
                            {isResolving ? "Hide clashes" : "Resolve clashes"}
                          </button>
                          <button type="button" className="tool-btn">
                            Edit
                          </button>
                        </div>
                      )}
                      {clashes.length === 0 && (
                        <div className="override-actions">
                          <button type="button" className="tool-btn">
                            Edit
                          </button>
                        </div>
                      )}

                      {/* ── Clash panel ── */}
                      {isResolving && clashes.length > 0 && (
                        <div className="clash-panel">
                          <p className="clash-panel-note">
                            {clashes.length} client{clashes.length !== 1 ? "s are" : " is"} booked in this period.
                            Blocking these hours does not cancel their sessions.
                            None of these will use a session — a cancellation you make never counts against a client&apos;s block.
                          </p>
                          <div className="clash-list">
                            {clashes.map((clash) => {
                              const isMoved = movedSessionIds.has(clash.sessionId);
                              const isMoving = movingSessionId === clash.sessionId;
                              const scheduled = new Date(clash.scheduledAt);
                              const dateStr = scheduled.toLocaleDateString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                timeZone: "Europe/London",
                              });
                              const timeStr = scheduled.toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Europe/London",
                              });

                              return (
                                <div
                                  key={clash.sessionId}
                                  className={`clash-row ${isMoved ? "moved" : ""}`}
                                >
                                  <div className="clash-avatar">
                                    {clash.clientName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                  <div className="clash-info">
                                    <div className="clash-name">{clash.clientName}</div>
                                    <div className="clash-detail">
                                      {dateStr}, {timeStr} · session {clash.sessionNumber}
                                    </div>
                                  </div>
                                  {isMoved ? (
                                    <span className="clash-moved-badge">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 6 9 17l-5-5" />
                                      </svg>
                                      Moved
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="clash-move-btn"
                                      onClick={() => moveSession(clash.sessionId, clash.scheduledAt)}
                                      disabled={isMoving}
                                    >
                                      {isMoving ? "…" : "Move"}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {extraOverrides.map((o) => {
                  const dateLabel =
                    o.start_date === o.end_date
                      ? fmtDayLabel(o.start_date)
                      : `${fmtDayLabel(o.start_date)} – ${fmtDayLabel(o.end_date)}`;
                  const timeLabel =
                    o.start_time && o.end_time
                      ? `, ${o.start_time} – ${o.end_time}`
                      : "";

                  return (
                    <div key={o.id} className="override-row">
                      <div className="override-head">
                        <div className="override-ic" style={{ background: "var(--s-success-bg)", color: "var(--teal)" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </div>
                        <div className="override-info">
                          <div className="override-when">{dateLabel}{timeLabel}</div>
                          {o.reason && <div className="override-why">{o.reason}</div>}
                        </div>
                      </div>
                      <div className="override-badges">
                        <span className="pill" style={{ background: "var(--s-primary-bg)", border: "1px solid var(--s-primary-bd)", color: "var(--rose)" }}>
                          Extra availability
                        </span>
                      </div>
                      <div className="override-actions">
                        <button type="button" className="tool-btn">
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </section>

        {/* ── Weekly pattern — collapsed by default ── */}
        <section className={`m-section ${openSections["pattern"] ? "" : "collapsed"}`}>
          <button
            type="button"
            className="m-section-h"
            onClick={() => toggleSection("pattern")}
            aria-expanded={openSections["pattern"] ?? false}
          >
            <div className="sec-h-t ic-rose">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <div>
              <div className="sec-h-t">Your normal week</div>
              <div className="sec-h-s">{daysOpen} days open · {slotsWeek} slots a week</div>
            </div>
            <svg className="m-section-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <div className="m-section-b">
            {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
              const dayRanges = pattern.filter((p) => p.day_of_week === dow);
              const isOn = dayRanges.some((p) => p.active);
              const slots = daySlots(pattern, dow, sessionLen, gap);

              return (
                <div key={dow} className={`dayrow ${isOn ? "" : "off"}`}>
                  <div className="dayrow-top">
                    <span className="dayrow-name">{DAY_NAMES_SHORT[dow]}</span>
                    <span className="dayrow-slots">
                      {isOn ? `${slots} slots` : "—"}
                    </span>
                  </div>
                  {isOn && dayRanges.length > 0 && (
                    <div className="dayrow-ranges">
                      {dayRanges.map((r) => (
                        <span key={r.id} className="dayrow-range">
                          {r.start_time} – {r.end_time}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Booking rules — collapsed by default ── */}
        <section className={`m-section ${openSections["rules"] ? "" : "collapsed"}`}>
          <button
            type="button"
            className="m-section-h"
            onClick={() => toggleSection("rules")}
            aria-expanded={openSections["rules"] ?? false}
          >
            <div className="sec-h-t ic-teal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div>
              <div className="sec-h-t">Booking rules</div>
              <div className="sec-h-s">{settings.session_length}-minute sessions · {settings.notice_hours} hours&apos; cancellation notice</div>
            </div>
            <svg className="m-section-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <div className="m-section-b">
            <div className="rules-grid">
              <div className="rule-row">
                <span className="rule-label">Session length</span>
                <span className="rule-value">{settings.session_length} minutes</span>
              </div>
              <div className="rule-row">
                <span className="rule-label">Gap after each session</span>
                <span className="rule-value">{settings.gap_after === 0 ? "None" : `${settings.gap_after} minutes`}</span>
              </div>
              <div className="rule-row">
                <span className="rule-label">Earliest a client can book</span>
                <span className="rule-value">{settings.lead_hours} hours ahead</span>
              </div>
              <div className="rule-row">
                <span className="rule-label">How far ahead they can book</span>
                <span className="rule-value">{settings.horizon_weeks === 0 ? "No limit" : `${settings.horizon_weeks} weeks`}</span>
              </div>
            </div>

            {/* Cancellation notice — special treatment */}
            <div className="notice-box">
              <div className="notice-fld-label">Cancellation notice</div>
              <p className="notice-fld-help">
                The one setting a client reads word for word. Cancel outside this window and the
                session goes back into their block; inside it, the session is used.
              </p>
              <div className="notice-fld-preview">
                <span className="notice-fld-preview-label">What the client sees</span>
                Free to cancel up to <b>{settings.notice_hours} hours</b> before a session. Cancel
                inside those {settings.notice_hours} hours and the session still comes out of your block.
              </div>
            </div>
          </div>
        </section>

        {/* ── Client preview ── */}
        <section className="m-section">
          <div className="m-section-h">
            <div className="sec-h-t ic-teal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <div className="sec-h-t">What clients can see</div>
              <div className="sec-h-s">The next two weeks, exactly as the public page and portal resolve it now.</div>
            </div>
          </div>
          <div className="m-section-b">
            <PreviewGrid pattern={pattern} sessionLen={sessionLen} gap={gap} />
          </div>
        </section>
      </main>
    </>
  );
}

// ─── Preview grid ───────────────────────────────────────────────────────

function PreviewGrid({
  pattern,
  sessionLen,
  gap,
}: {
  pattern: PatternRow[];
  sessionLen: number;
  gap: number;
}) {
  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const days: { num: number; state: string; count: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    const dayPatterns = pattern.filter((p) => p.day_of_week === dow && p.active);
    const slots = dayPatterns.reduce(
      (sum, p) => sum + slotsInRange(p.start_time, p.end_time, sessionLen, gap),
      0
    );
    const isPast =
      d < new Date(today.getFullYear(), today.getMonth(), today.getDate());

    let state = "open";
    let count = String(slots);
    if (isPast) {
      state = "closed";
      count = "Gone";
    } else if (dayPatterns.length === 0) {
      state = "closed";
      count = "—";
    } else if (slots === 0) {
      state = "full";
      count = "Full";
    }

    days.push({ num: d.getDate(), state, count });
  }

  return (
    <>
      <div className="preview-grid">
        <div className="preview-headers">
          {["M", "T", "W", "T", "F", "S", "S"].map((h, i) => (
            <div key={i} className="preview-h">{h}</div>
          ))}
        </div>
        <div className="preview-cells">
          {days.map((d, i) => (
            <div
              key={i}
              className={`preview-cell ${d.state}`}
            >
              <div className="preview-num">{d.num}</div>
              <div className="preview-count">{d.count}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="preview-legend">
        <span className="preview-legend-item">
          <i className="preview-swatch open" /> Free slots
        </span>
        <span className="preview-legend-item">
          <i className="preview-swatch full" /> Fully booked
        </span>
        <span className="preview-legend-item">
          <i className="preview-swatch closed" /> Closed
        </span>
      </div>
    </>
  );
}
