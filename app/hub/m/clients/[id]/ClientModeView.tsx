"use client";

import { useState, useCallback, useMemo, type ReactNode } from "react";
import Link from "next/link";
import type { SessionStatus } from "@/types";
import type { AggregatedExerciseNote } from "@/lib/exercise-notes";
import type { ClientFlag } from "@/lib/mobile-client-flags";
import { DayAgenda, type AgendaSession } from "@/components/hub/DayAgenda";
import { ClientNotesPane } from "./ClientNotesPane";
import { ClientBookingPanel } from "@/components/hub/ClientBookingPanel";
import { todayLocalISODate, shiftDay } from "@/lib/schedule-dates";

/* ── Exported view types (derived in page.tsx server component) ── */

export interface RecentSessionView {
  id: string;
  day: number | null;
  month: string;
  name: string;
  sub: string;
}

export interface CalendarSessionView {
  id: string;
  day: number;
  month: string;
  time: string;
  scheduledAt: string;
  name: string;
  status: SessionStatus;
}

export interface SessionView {
  id: string;
  name: string;
  position: number | null;
  total: number | null;
  status: SessionStatus;
  scheduledAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  isToday: boolean;
  dayOfWeek: string | null;
  dayOfMonth: number | null;
  monthShort: string | null;
  time: string | null;
  chargedFree: "charged" | "free" | null;
  cancelReason: string | null;
}

export interface PoolWorkoutView {
  id: string;
  letter: string;
  name: string;
  status: "used" | "assigned" | "unused" | "next";
  deliveryDate: string | null;
  assignedDate: string | null;
}

export interface SessionPotView {
  remaining: number;
  used: number;
  purchased: number;
  completed: number;
  chargedCancellations: number;
  freeCancellations: number;
  unreviewedCancellations: number;
  bookedAhead: number;
}

export interface BlockView {
  id: string;
  number: number;
  focus: string | null;
  done: number;
  total: number;
  pct: number;
}

/* ── Icons ── */

const ICO = {
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  med: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 3v18M3 12h18" />
    </svg>
  ),
  warn: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  ok: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  okLg: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  block: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  pin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" />
      <path d="M9 10.8V4h6v6.8l2.4 3.2a1 1 0 0 1-.8 1.6H7.4a1 1 0 0 1-.8-1.6z" />
    </svg>
  ),
  hist: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
  chev: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  ),
  sessions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  pool: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 9v12" />
    </svg>
  ),
  calendarTab: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M3 15h18M12 15v3" />
    </svg>
  ),
  notes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  check: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 13 4 4L19 7" />
    </svg>
  ),
  xCircle: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  ),
  calSm: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  arrowRight: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
};

function flagIcon(tone: ClientFlag["tone"]) {
  if (tone === "ok") return ICO.ok;
  if (tone === "danger") return ICO.med;
  return ICO.warn;
}

/* ── Helper: group sessions into Monday–Sunday weeks ── */

function mondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(date: Date): string {
  const m = mondayOfWeek(date);
  return m.toISOString().slice(0, 10);
}

function weekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `Week of ${fmt(monday)}`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ── Component ── */

type TabKey = "overview" | "sessions" | "pool" | "calendar" | "notes";

interface ClientModeViewProps {
  clientId: string;
  clientNumber: number;
  clientName: string;
  firstName: string;
  flags: ClientFlag[];
  activeFlagCount: number;
  block: BlockView | null;
  recent: RecentSessionView[];
  calendarSessions: CalendarSessionView[];
  sessionsView: SessionView[];
  poolWorkouts: PoolWorkoutView[];
  potView: SessionPotView;
  unusedPoolCount: number;
  trainTargetId: string | null;
  exerciseNotes?: AggregatedExerciseNote[];
}

export function ClientModeView({
  clientId,
  clientNumber,
  clientName,
  firstName,
  flags,
  activeFlagCount,
  block,
  recent,
  calendarSessions,
  sessionsView,
  poolWorkouts,
  potView,
  unusedPoolCount,
  trainTargetId,
  exerciseNotes = [],
}: ClientModeViewProps) {
  const [tab, setTab] = useState<TabKey>("overview");

  const switchToSessions = useCallback(() => setTab("sessions"), []);

  /* ── Sessions view: group by week ── */
  const { upcomingSessions, unscheduledSessions, pastSessions, upcomingCount, pastCount } = useMemo(() => {
    const now = new Date();
    const upcoming: SessionView[] = [];
    const unscheduled: SessionView[] = [];
    const past: SessionView[] = [];

    for (const s of sessionsView) {
      if (s.status === "cancelled") continue;
      if (!s.scheduledAt) {
        unscheduled.push(s);
      } else if (new Date(s.scheduledAt).getTime() >= now.getTime() || s.isToday) {
        upcoming.push(s);
      } else {
        past.push(s);
      }
    }

    return {
      upcomingSessions: upcoming,
      unscheduledSessions: unscheduled,
      pastSessions: past,
      upcomingCount: upcoming.length,
      pastCount: past.length,
    };
  }, [sessionsView]);

  /* ── Sessions view: group by week ── */
  const upcomingWeeks = useMemo(() => {
    const map = new Map<string, { monday: Date; sessions: SessionView[] }>();
    for (const s of upcomingSessions) {
      if (!s.scheduledAt) continue;
      const d = new Date(s.scheduledAt);
      const key = weekKey(d);
      if (!map.has(key)) {
        map.set(key, { monday: mondayOfWeek(d), sessions: [] });
      }
      map.get(key)!.sessions.push(s);
    }
    return Array.from(map.values()).sort((a, b) => a.monday.getTime() - b.monday.getTime());
  }, [upcomingSessions]);

  const pastWeeks = useMemo(() => {
    const map = new Map<string, { monday: Date; sessions: SessionView[] }>();
    for (const s of pastSessions) {
      if (!s.scheduledAt) continue;
      const d = new Date(s.scheduledAt);
      const key = weekKey(d);
      if (!map.has(key)) {
        map.set(key, { monday: mondayOfWeek(d), sessions: [] });
      }
      map.get(key)!.sessions.push(s);
    }
    return Array.from(map.values()).sort((a, b) => b.monday.getTime() - a.monday.getTime());
  }, [pastSessions]);

  /* ── Pool view ── */
  const nextPool = poolWorkouts.find((w) => w.status === "next");
  const poolUsed = poolWorkouts.filter((w) => w.status === "used").length;
  const poolAssigned = poolWorkouts.filter((w) => w.status === "assigned").length;

  const tabs: { key: TabKey; label: string; icon: ReactNode; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: ICO.overview },
    { key: "sessions", label: "Sessions", icon: ICO.sessions },
    { key: "pool", label: "Pool", icon: ICO.pool, badge: unusedPoolCount },
    { key: "calendar", label: "Calendar", icon: ICO.calendarTab },
    { key: "notes", label: "Notes", icon: ICO.notes },
  ];

  return (
    <>
      <main className="mcontent">
        {/* ══════════════ OVERVIEW ══════════════ */}
        <section className={`pane${tab === "overview" ? " on" : ""}`}>
          <div className="panel">
            <div className="panel-h">
              <span className={`panel-h-ic ${activeFlagCount > 0 ? "danger" : "teal"}`}>
                {activeFlagCount > 0 ? ICO.med : ICO.okLg}
              </span>
              <span>
                <span className="panel-h-t">Medical &amp; compliance</span>
                <span className="panel-h-s">
                  {activeFlagCount > 0
                    ? `${activeFlagCount} active flag${activeFlagCount !== 1 ? "s" : ""}`
                    : "Nothing outstanding"}
                </span>
              </span>
            </div>
            <div className="panel-b">
              {flags.map((f, i) => (
                <div key={i} className={`flagcard ${f.tone}`}>
                  <span className="flag-ic">{flagIcon(f.tone)}</span>
                  <div>
                    <b>{f.title}</b>
                    {f.detail}
                  </div>
                </div>
              ))}
              {/* CR-EF-113: dual action — Train primary, Session record one tap away */}
              {trainTargetId && (
                <div className="actbar">
                  <Link className="btn btn-primary" href={`/hub/m/train/${trainTargetId}`}>
                    Train {firstName}
                  </Link>
                  <button className="btn btn-outline" onClick={switchToSessions}>
                    Session record
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CR-EF-113: openable sessions summary — the specific complaint fix */}
          <button className="panel panel-tap" onClick={switchToSessions} aria-label="Open Sessions">
            <div className="panel-h">
              <span className="panel-h-ic navy">{ICO.calendar}</span>
              <span>
                <span className="panel-h-t">Sessions</span>
                <span className="panel-h-s">
                  {block
                    ? `${potView.used} of ${potView.purchased} used · ${potView.remaining} remaining`
                    : "No active programme"}
                </span>
              </span>
              <span className="panel-chev">{ICO.chev}</span>
            </div>
            <div className="panel-b">
              {block?.focus && (
                <div className="kv" style={{ paddingTop: 0 }}>
                  <span className="kv-k">Focus</span>
                  <span className="kv-v">{block.focus}</span>
                </div>
              )}
              {block && (
                <>
                  <div className="blockbar">
                    <i style={{ width: `${block.pct}%` }} />
                  </div>
                  <div className="blockmeta">
                    <span>Tap to see which sessions, and what&apos;s attached</span>
                    <span>{potView.remaining} left</span>
                  </div>
                </>
              )}
              {!block && (
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  Nothing has been planned for {firstName} yet — this isn&apos;t the same as being up to date.
                </div>
              )}
            </div>
          </button>

          <div className="panel">
            <div className="panel-h">
              <span className="panel-h-ic">{ICO.pin}</span>
              <span>
                <span className="panel-h-t">Pinned note</span>
                <span className="panel-h-s">The note surfaced here</span>
              </span>
            </div>
            <div className="panel-b">
              <div className="pin-empty">
                No pinned note yet — pinning notes lands with the notes upgrade.
              </div>
            </div>
          </div>

          {recent.length > 0 && (
            <div className="panel">
              <div className="panel-h">
                <span className="panel-h-ic teal">{ICO.hist}</span>
                <span>
                  <span className="panel-h-t">Recent sessions</span>
                  <span className="panel-h-s">Tap to read a past log — read-only</span>
                </span>
              </div>
              <div className="panel-b" style={{ paddingTop: 2, paddingBottom: 4 }}>
                {recent.map((h) => (
                  <Link key={h.id} className="hrow" href={`/hub/m/train/${h.id}`}>
                    <span className="hdate">
                      <b>{h.day ?? "—"}</b>
                      <span>{h.month}</span>
                    </span>
                    <span className="hbody">
                      <span className="hname">{h.name}</span>
                      <span className="hmeta">{h.sub}</span>
                    </span>
                    <span className="cchev">{ICO.chev}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="absent">
            <b>True admin stays on desktop</b>
            Documents, PAR-Q editing, cashflow, email updates and invoicing still live on the desktop
            hub. Client mode is for session-shaped work — training, booking, notes and review.{" "}
            <Link href={`/hub/clients/${clientNumber}`}>Open the full record on desktop</Link>.
          </div>
        </section>

        {/* ══════════════ SESSIONS ══════════════ */}
        <section className={`pane${tab === "sessions" ? " on" : ""}`}>
          {/* Pot strip */}
          <div className="mpot">
            <div className="mpot-row">
              <span className="mpot-n">{potView.remaining}</span>
              <span className="mpot-l">left</span>
              <span className="mpot-side">
                <b>{potView.used}</b> used of <b>{potView.purchased}</b>
                <br />
                {potView.bookedAhead} booked ahead
              </span>
            </div>
            <div className="mbar">
              {potView.completed > 0 && (
                <span className="mseg done" style={{ width: `${(potView.completed / potView.purchased) * 100}%` }} />
              )}
              {potView.chargedCancellations > 0 && (
                <span className="mseg charged" style={{ width: `${(potView.chargedCancellations / potView.purchased) * 100}%` }} />
              )}
              {potView.bookedAhead > 0 && (
                <span className="mseg booked" style={{ width: `${(potView.bookedAhead / potView.purchased) * 100}%` }} />
              )}
              {potView.freeCancellations + potView.unreviewedCancellations > 0 && (
                <span
                  className="mseg free"
                  style={{
                    width: `${((potView.freeCancellations + potView.unreviewedCancellations) / potView.purchased) * 100}%`,
                  }}
                />
              )}
            </div>
            <div className="mpot-legend">
              <span className="mleg">
                <i style={{ background: "var(--teal)" }} />Completed <b>{potView.completed}</b>
              </span>
              {potView.chargedCancellations > 0 && (
                <span className="mleg">
                  <i style={{ background: "var(--s-danger)" }} />Charged <b>{potView.chargedCancellations}</b>
                </span>
              )}
              <span className="mleg">
                <i style={{ background: "var(--rose)" }} />Booked <b>{potView.bookedAhead}</b>
              </span>
              <span className="mleg">
                <i style={{ background: "var(--hover)" }} />Not booked <b>{potView.remaining - potView.bookedAhead}</b>
              </span>
            </div>
          </div>

          {/* Upcoming */}
          {upcomingSessions.length > 0 && (
            <>
              <div className="sec-lbl">
                <h2>Upcoming</h2>
                <span className="cnt">{upcomingCount} session{upcomingCount !== 1 ? "s" : ""}</span>
              </div>
              {upcomingWeeks.map((wk) => (
                <div key={weekKey(wk.monday)}>
                  <div className="week-band">
                    <span className="week-band-t">{weekLabel(wk.monday)}</span>
                  </div>
                  <div className="blist">
                    {wk.sessions.map((s) => (
                      <SessionRow key={s.id} session={s} firstName={firstName} />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Not yet booked */}
          {unscheduledSessions.length > 0 && (
            <>
              <div className="sec-lbl plan">
                <h2>Not yet booked</h2>
                <span className="cnt">{unscheduledSessions.length} session{unscheduledSessions.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="blist">
                <div className="srow plan">
                  <div className="srow-date" style={{ borderRight: 0 }}>
                    <div className="srow-d" style={{ color: "var(--muted)" }}>—</div>
                  </div>
                  <div className="srow-body">
                    <div className="srow-empty">
                      Sessions {unscheduledSessions[0]?.position ?? "?"}–{unscheduledSessions[unscheduledSessions.length - 1]?.position ?? "?"} of {unscheduledSessions[0]?.total ?? "?"}
                    </div>
                    <div className="srow-sub">
                      Nothing booked into Outlook yet — will appear here with real dates once they are.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Already happened */}
          {pastSessions.length > 0 && (
            <>
              <div className="sec-lbl">
                <h2>Already happened</h2>
                <span className="cnt">{pastCount} session{pastCount !== 1 ? "s" : ""}</span>
              </div>
              {pastWeeks.map((wk) => (
                <div key={weekKey(wk.monday)}>
                  <div className="week-band">
                    <span className="week-band-t">{weekLabel(wk.monday)}</span>
                  </div>
                  <div className="blist">
                    {wk.sessions.map((s) => (
                      <SessionRow key={s.id} session={s} firstName={firstName} />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {sessionsView.length === 0 && (
            <div className="empty">
              <div className="empty-ic">{ICO.sessions}</div>
              <p className="empty-t">No sessions yet</p>
              <p className="empty-d">
                Nothing has been planned for {firstName} yet — this isn&apos;t the same as being up to date.
              </p>
            </div>
          )}
        </section>

        {/* ══════════════ POOL ══════════════ */}
        <section className={`pane${tab === "pool" ? " on" : ""}`}>
          {/* Next-up card */}
          {nextPool && (
            <div className="nextcard">
              <div className="nextcard-top">
                <span className="nextcard-let">{nextPool.letter}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="nextcard-lbl">Up next</div>
                  <div className="nextcard-n">{nextPool.name}</div>
                  <div className="nextcard-s">
                    {nextPool.assignedDate
                      ? `Assigned to ${formatShortDate(nextPool.assignedDate)}`
                      : "Not delivered yet"}
                  </div>
                </div>
              </div>
              <div className="nextcard-b">
                {nextPool.assignedDate && (
                  <div className="nextcard-target">
                    {ICO.calSm}
                    <span>
                      Earliest session without a workout is <b>{formatShortDate(nextPool.assignedDate)}</b>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Workout sequence */}
          <div className="sec-lbl">
            <h2>Workout sequence</h2>
            <span className="cnt">
              {poolUsed} used · {poolAssigned} assigned · {unusedPoolCount} unused
            </span>
          </div>
          <div className="pool-list">
            {poolWorkouts.map((w) => (
              <div
                key={w.id}
                className={`pool-item${w.status === "used" ? " done" : ""}${w.status === "assigned" ? " assigned" : ""}${w.status === "next" ? " next" : ""}`}
              >
                <span className="pool-let">{w.letter}</span>
                <div className="pool-body">
                  <div className="pool-n">{w.name}</div>
                  <div className="pool-s">
                    {w.status === "used" && w.deliveryDate && `Delivered ${formatShortDate(w.deliveryDate)}`}
                    {w.status === "assigned" && w.assignedDate && `Attached to ${formatShortDate(w.assignedDate)}`}
                    {w.status === "next" && "Not used yet"}
                    {w.status === "unused" && "Not used yet"}
                  </div>
                </div>
                <span className={`pool-tag ${w.status === "used" ? "used" : w.status === "assigned" ? "assig" : w.status === "next" ? "nextup" : "unused"}`}>
                  {w.status === "used" && "Used"}
                  {w.status === "assigned" && "Assigned"}
                  {w.status === "next" && "Next up"}
                  {w.status === "unused" && "Unused"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════ CALENDAR ══════════════ */}
        <section className={`pane${tab === "calendar" ? " on" : ""}`}>
          <DayAgenda
            sessions={calendarSessions.map(
              (s): AgendaSession => ({
                id: s.id,
                scheduledAt: s.scheduledAt,
                name: s.name,
                status: s.status,
              })
            )}
            today={todayLocalISODate()}
            windowStart={todayLocalISODate()}
            windowEnd={shiftDay(todayLocalISODate(), 7)}
            scope="client"
            clientNumber={clientNumber}
          />
          <Link
            className="btn btn-outline agenda-add"
            href={`/hub/m/book?scope=client&client=${clientNumber}&day=${todayLocalISODate()}`}
            style={{ width: "100%" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Book for {firstName}
          </Link>
        </section>

        {/* ══════════════ NOTES ══════════════ */}
        <section className={`pane${tab === "notes" ? " on" : ""}`}>
          <ClientNotesPane clientId={clientId} exerciseNotes={exerciseNotes} />
        </section>
      </main>

      {/* CR-EF-113: 5-tab bottom bar — Overview · Sessions · Pool · Calendar · Notes */}
      <nav className="tabbar" aria-label="Client">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab${tab === t.key ? " on" : ""}`}
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "true" : undefined}
          >
            {t.icon}
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="tab-badge">{t.badge}</span>
            )}
          </button>
        ))}
      </nav>
    </>
  );
}

/* ── Session row sub-component ── */

function SessionRow({ session: s, firstName }: { session: SessionView; firstName: string }) {
  const positionLabel = s.position != null && s.total != null ? `Session ${s.position} of ${s.total}` : null;
  const isCompleted = s.status === "completed";
  const isCancelled = s.status === "cancelled";
  const isCharged = s.chargedFree === "charged";
  const isFree = s.chargedFree === "free";

  let statusPillClass = "";
  let statusPillLabel = "";
  let statusPillIcon: ReactNode = null;

  if (isCompleted) {
    statusPillClass = "completed";
    statusPillLabel = "Completed";
    statusPillIcon = ICO.check;
  } else if (isCancelled && isCharged) {
    statusPillClass = "charged";
    statusPillLabel = "Charged";
    statusPillIcon = ICO.xCircle;
  } else if (isCancelled && isFree) {
    statusPillClass = "freecx";
    statusPillLabel = "Cancelled — free";
    statusPillIcon = ICO.xCircle;
  } else if (s.scheduledAt && !isCancelled) {
    statusPillClass = "booked";
    statusPillLabel = "Booked";
    statusPillIcon = ICO.calSm;
  }

  const subParts: string[] = [];
  if (positionLabel) subParts.push(positionLabel);
  if (s.isToday) subParts.push("today");
  if (s.scheduledAt && !isCancelled && !isCompleted) {
    subParts.push("booked via Outlook");
  }

  return (
    <div className={`srow${s.isToday ? " today" : ""}${isCancelled ? " cx" : ""}`}>
      <div className="srow-date">
        <div className="srow-d">{s.dayOfMonth ?? "—"}</div>
        {s.dayOfWeek && <div className="srow-dow">{s.dayOfWeek}</div>}
        {s.time && <div className="srow-time">{s.time}</div>}
      </div>
      <div className="srow-body">
        {s.name === "No workout assigned yet" ? (
          <div className="srow-empty">{s.name}</div>
        ) : (
          <div className="srow-name">{s.name}</div>
        )}
        <div className="srow-sub">{subParts.join(" · ")}</div>
        <div className="srow-flags">
          {statusPillLabel && (
            <span className={`s-pill ${statusPillClass}`}>
              {statusPillIcon}
              {statusPillLabel}
            </span>
          )}
          {isCompleted && <span className="cost-flag minus">−1</span>}
          {isCharged && <span className="cost-flag minus">−1</span>}
          {isFree && <span className="cost-flag zero">no session used</span>}
        </div>
      </div>
    </div>
  );
}
