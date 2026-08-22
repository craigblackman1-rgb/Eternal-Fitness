"use client";

import type { ReactNode, MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startOfWeek } from "date-fns";
import type { SessionStatus } from "@/types";
import { SessionStatusPill } from "@/components/hub/SessionStatusPill";
import {
  todayLocalISODate,
  toLocalISODate,
  isoToLocalDate,
  isoToLocalTime,
  shiftDay,
} from "@/lib/schedule-dates";

const ICO = {
  calendar: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  calendarDot: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <circle cx="12" cy="15" r="2.5"/>
    </svg>
  ),
  check: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
};

export interface AgendaSession {
  id: string;
  scheduledAt: string;
  name: string;
  status: SessionStatus;
  clientName?: string;
  blockNumber?: number;
}

interface DayAgendaProps {
  sessions: AgendaSession[];
  today?: string;
  windowStart: string;
  windowEnd: string;
  scope: "trainer" | "client";
  /** Required when scope is "client" — included in the booking link so it lands on the right client. */
  clientNumber?: number;
}

function fmtDayShort(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}

function weekRangeOf(mondayIso: string): string {
  const [y, mo, d] = mondayIso.split("-").map(Number);
  const monday = new Date(y, mo - 1, d);
  const end = new Date(y, mo - 1, d + 6);
  const fmt = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(end)}`;
}

function mondayKey(iso: string): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  const mon = startOfWeek(date, { weekStartsOn: 1 });
  return toLocalISODate(mon);
}

export function DayAgenda({
  sessions,
  today = todayLocalISODate(),
  windowStart,
  windowEnd,
  scope,
  clientNumber,
}: DayAgendaProps) {
  const router = useRouter();
  const bookHrefForDay = (day: string) =>
    scope === "client" && clientNumber != null
      ? `/hub/m/book?scope=client&client=${clientNumber}&day=${day}`
      : `/hub/m/book?scope=${scope}&day=${day}`;
  const byDay = new Map<string, AgendaSession[]>();
  for (const s of sessions) {
    const day = isoToLocalDate(s.scheduledAt);
    const arr = byDay.get(day) ?? [];
    arr.push(s);
    byDay.set(day, arr);
  }
  for (const arr of byDay.values()) {
    arr.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  const rows: ReactNode[] = [];
  let cur = windowStart;
  let lastMonday = "";

  while (cur <= windowEnd) {
    const m = mondayKey(cur);
    if (m !== lastMonday) {
      lastMonday = m;
      rows.push(
        <div className="week-band" key={`w-${m}`}>
          <span className="week-band-ic">{ICO.calendarDot}</span>
          <span className="week-band-t">Week of {weekRangeOf(m)}</span>
        </div>,
      );
    }

    const [y, mo, dNum] = cur.split("-").map(Number);
    const d = new Date(y, mo - 1, dNum);
    const isToday = cur === today;
    const list = byDay.get(cur) ?? [];
    const allDone = list.length > 0 && list.every((s) => s.status === "completed");

    if (list.length === 0) {
      rows.push(
        <Link
          key={`day-${cur}`}
          href={bookHrefForDay(cur)}
          className="dmuted-card"
          data-od-id={`day-${cur}`}
        >
          <div className="ddate">
            <b>{d.getDate()}</b>
            <span>{fmtDayShort(d)}</span>
            {isToday && <span className="ddate-flag today-f">Today</span>}
          </div>
          <div className="dempty">
            <div className="dempty-ic">{ICO.calendar}</div>
            <div>
              <div className="dempty-t">Nothing booked</div>
              <div className="dempty-s">Tap to add to this day</div>
            </div>
            <span className="dplus">{ICO.plus}</span>
          </div>
        </Link>,
      );
    } else {
      const dayHref = bookHrefForDay(cur);
      rows.push(
        <div
          key={`day-${cur}`}
          className={`drow tap${isToday ? " today" : ""}${allDone ? " done" : ""}`}
          data-od-id={`day-${cur}`}
          onClick={() => router.push(dayHref)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(dayHref); }}
        >
          <div className="ddate">
            <b>{d.getDate()}</b>
            <span>{fmtDayShort(d)}</span>
            {isToday ? (
              <span className="ddate-flag today-f">Today</span>
            ) : allDone ? (
              <span className="ddate-flag done-f">Done</span>
            ) : null}
          </div>
          <div className="dbody">
            <div className="dbody-t">
              {list.length} {list.length === 1 ? "session" : "sessions"}
            </div>
            {list.map((s) => (
              <div key={s.id} className="dsess">
                <span className="dsess-time">{isoToLocalTime(s.scheduledAt)}</span>
                <Link
                  className="dsess-main"
                  href={`/hub/m/train/${s.id}`}
                  onClick={(e: MouseEvent) => e.stopPropagation()}
                >
                  <span className="dsess-name">{s.name}</span>
                  {scope === "trainer" && (
                    <span className="dsess-client">
                      {s.clientName}
                      {s.blockNumber != null && ` · Block ${s.blockNumber}`}
                    </span>
                  )}
                </Link>
                <span className="dsess-pill">
                  <SessionStatusPill status={s.status} />
                </span>
              </div>
            ))}
          </div>
        </div>,
      );
    }

    cur = shiftDay(cur, 1);
  }

  return (
    <div className="agenda" data-od-id="agenda-days">
      {rows.length === 0 ? (
        <div className="note">
          <span className="note-b">i</span>
          <div>No days in the current window.</div>
        </div>
      ) : (
        rows
      )}
    </div>
  );
}
