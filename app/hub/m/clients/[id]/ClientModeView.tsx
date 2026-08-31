"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { SessionStatus } from "@/types";
import type { AggregatedExerciseNote } from "@/lib/exercise-notes";
import type { ClientFlag } from "@/lib/mobile-client-flags";
import { DayAgenda, type AgendaSession } from "@/components/hub/DayAgenda";
import { ClientNotesPane } from "./ClientNotesPane";
import { ClientBookingPanel } from "@/components/hub/ClientBookingPanel";
import { todayLocalISODate, shiftDay } from "@/lib/schedule-dates";

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

export interface WorkoutView {
  id: string;
  key: string;
  letter: string;
  name: string;
  emphasis: string;
  done: number;
  total: number;
}

export interface BlockView {
  id: string;
  number: number;
  focus: string | null;
  done: number;
  total: number;
  pct: number;
}

type TabKey = "overview" | "calendar" | "workouts" | "notes";

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
  cal: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  chev: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M3 15h18M12 15v3" />
    </svg>
  ),
  workouts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5v11M17.5 6.5v11M3 10h1.5M3 14h1.5M19.5 10H21M19.5 14H21M9 10h6v4H9z" />
    </svg>
  ),
  notes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

function flagIcon(tone: ClientFlag["tone"]) {
  if (tone === "ok") return ICO.ok;
  if (tone === "danger") return ICO.med;
  return ICO.warn;
}

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
  workouts: WorkoutView[];
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
  workouts,
  trainTargetId,
  exerciseNotes = [],
}: ClientModeViewProps) {
  const [tab, setTab] = useState<TabKey>("overview");

  const tabs: { key: TabKey; label: string; icon: ReactNode }[] = [
    { key: "overview", label: "Overview", icon: ICO.overview },
    { key: "calendar", label: "Calendar", icon: ICO.calendar },
    { key: "workouts", label: "Workouts", icon: ICO.workouts },
    { key: "notes", label: "Notes", icon: ICO.notes },
  ];

  return (
    <>
      <main className="mcontent">
        {/* ── OVERVIEW ── */}
        <section className={`pane${tab === "overview" ? " on" : ""}`}>
          <ClientBookingPanel clientId={clientId} clientName={clientName} mobile />
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
              {trainTargetId && (
                <div className="actbar">
                  <Link className="btn btn-primary" href={`/hub/m/train/${trainTargetId}`}>
                    Train {firstName}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {block && (
            <div className="panel">
              <div className="panel-h">
                <span className="panel-h-ic navy">{ICO.block}</span>
                <span>
                  <span className="panel-h-t">Block {block.number}</span>
                  <span className="panel-h-s">
                    {block.done} of {block.total} sessions delivered
                  </span>
                </span>
              </div>
              <div className="panel-b">
                {block.focus && (
                  <div className="kv" style={{ paddingTop: 0 }}>
                    <span className="kv-k">Focus</span>
                    <span className="kv-v">{block.focus}</span>
                  </div>
                )}
                <div className="blockbar">
                  <i style={{ width: `${block.pct}%` }} />
                </div>
                <div className="blockmeta">
                  <span>{block.pct}% through</span>
                  <span>{Math.max(0, block.total - block.done)} remaining</span>
                </div>
              </div>
            </div>
          )}

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

        {/* ── CALENDAR (client scope — shared DayAgenda) ── */}
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
            windowStart={shiftDay(todayLocalISODate(), -2)}
            windowEnd={shiftDay(todayLocalISODate(), 4)}
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

        {/* ── WORKOUTS ── */}
        <section className={`pane${tab === "workouts" ? " on" : ""}`}>
          <div className="note">
            <span className="note-b">i</span>
            <div>
              <b>Workouts live at block level.</b>
              Adding a workout from the template library, this client&apos;s block, or scratch lands with
              the add flow. No phase concept — Esther works at the workout level.
            </div>
          </div>
          <div className="actbar" style={{ marginBottom: 12 }}>
            <Link className="btn btn-primary" href={`/hub/m/clients/${clientNumber}/add-workout`}>
              {ICO.plus}
              Add workout
            </Link>
          </div>
          {workouts.length === 0 ? (
            <div className="empty">
              <div className="empty-ic">{ICO.workouts}</div>
              <p className="empty-t">No workouts</p>
              <p className="empty-d">
                {block
                  ? `Block ${block.number} has no sessions yet.`
                  : "This client has no current block yet."}
              </p>
            </div>
          ) : (
            workouts.map((w) => (
              <div key={w.key} className="wcard">
                <span className="wav">{w.letter}</span>
                <span className="wbody">
                  <span className="wtitle">{w.name}</span>
                  <span className="wmeta">
                    {w.emphasis} · {w.done} of {w.total} delivered
                  </span>
                </span>
                <span className="wchev">{ICO.chev}</span>
              </div>
            ))
          )}
        </section>

        {/* ── NOTES ── */}
        <section className={`pane${tab === "notes" ? " on" : ""}`}>
          <ClientNotesPane clientId={clientId} exerciseNotes={exerciseNotes} />
        </section>
      </main>

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
          </button>
        ))}
      </nav>
    </>
  );
}
