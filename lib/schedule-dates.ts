import type { Weekday } from "@/lib/scheduling";
import type { ScheduledEntry } from "@/app/hub/(protected)/schedule/ScheduleCalendar";

// --- date/time helpers shared by the day and month schedule views ---

const londonDayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Europe/London calendar day key "YYYY-MM-DD" for any ISO timestamp. */
export function londonDayKey(iso: string): string {
  return londonDayFmt.format(new Date(iso));
}

export function todayLocalISODate(): string {
  return toLocalISODate(new Date());
}

export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local "YYYY-MM-DD" for a stored ISO timestamp — used to bucket by day. */
export function isoToLocalDate(iso: string): string {
  return toLocalISODate(new Date(iso));
}

export function isoToLocalTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function localPartsToISO(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, min, 0, 0).toISOString();
}

export function shiftDay(isoDate: string, delta: number): string {
  const [y, mo, d] = isoDate.split("-").map(Number);
  const next = new Date(y, mo - 1, d);
  next.setDate(next.getDate() + delta);
  return toLocalISODate(next);
}

export function formatDayHeading(isoDate: string): string {
  const [y, mo, d] = isoDate.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTimeRange(iso: string, durationMinutes: number): { start: string; end: string } {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const fmt = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return { start: fmt(start), end: fmt(end) };
}

/**
 * Local "YYYY-MM-DD" of the Monday opening the Monday–Sunday calendar week that
 * contains the given stored ISO timestamp. Boundary: a Sunday session belongs to
 * the week starting the *previous* Monday; a Monday session belongs to the week
 * starting that same day. Follows this file's local-time convention — `new
 * Date(iso)` parses in the machine's local timezone, so the week boundary is
 * derived from the same local clock every other helper here uses (see
 * isoToLocalDate). The week is never read from a stored ordinal: `sessions.week`
 * is a generation-time counter nobody maintains for hand-built blocks
 * (CR-EF-032), so the date is the only trustworthy source.
 */
export function isoToMonday(iso: string): string {
  const d = new Date(iso);
  const offset = (d.getDay() + 6) % 7; // Mon → 0 … Sun → 6
  d.setDate(d.getDate() - offset);
  return toLocalISODate(d);
}

export type CalendarWeekKind = "scheduled" | "projected" | "plan";

export interface CalendarWeekGroup<T> {
  /** Stable, sortable identity. Scheduled weeks key by their Monday
   *  ("YYYY-MM-DD"); plan weeks key by the stored ordinal ("p1", "p2", …). */
  key: string;
  /** "scheduled" → a real Mon–Sun week derived from `scheduled_at`; "projected"
   *  → a Mon–Sun week derived from projected_at; "plan" → the stored `week`
   *  ordinal, used only for sessions with no scheduled or projected date. */
  kind: CalendarWeekKind;
  /** The stored `week` ordinal — the source of truth for "Plan week N" headers
   *  and the fallback grouping key for unscheduled sessions. */
  planWeek: number;
  /** Local "YYYY-MM-DD" of the Monday opening this week; null for plan weeks. */
  monday: string | null;
  sessions: T[];
}

/**
 * CR-EF-037 Phase 3 — group sessions into Monday–Sunday calendar weeks.
 *
 * The block model's stored `week` integer is a generation-time ordinal nobody
 * maintains for hand-built blocks (CR-EF-032: 66/92 production sessions sit in
 * "week 1"), so it can't describe when a session actually happens. Weeks are
 * derived from `scheduled_at` instead: each scheduled session lands in the
 * Monday–Sunday week containing its date. The stored `week` survives only as a
 * "Plan week" fallback for sessions with no `scheduled_at` yet.
 *
 * Output ordering: scheduled weeks first (chronological by Monday), then plan
 * weeks (ordinal ascending) — unscheduled sessions read as "still to be dated"
 * and sit at the bottom. Within a scheduled week, sessions are ordered by
 * `scheduled_at` (then stable by original order); within a plan week they keep
 * the input order (the caller passes them in `session_number` order).
 */
export function groupSessionsByWeek<T extends { scheduled_at: string | null; projected_at?: string | null; week: number; completed_at?: string | null }>(
  sessions: T[],
): CalendarWeekGroup<T>[] {
  const scheduledWeeks = new Map<string, { planWeek: number; sessions: T[] }>();
  const planWeeks = new Map<number, T[]>();

  for (const s of sessions) {
    // Use scheduled_at first; fall back to projected_at for unbooked sessions
    // with projected dates; then completed_at for sessions performed without
    // a booking; finally the plan-week fallback.
    const weekDate = s.scheduled_at ?? s.projected_at ?? s.completed_at;
    if (weekDate) {
      const monday = isoToMonday(weekDate);
      const g = scheduledWeeks.get(monday) ?? { planWeek: s.week, sessions: [] as T[] };
      g.sessions.push(s);
      scheduledWeeks.set(monday, g);
    } else {
      const arr = planWeeks.get(s.week) ?? [];
      arr.push(s);
      planWeeks.set(s.week, arr);
    }
  }

  const groups: CalendarWeekGroup<T>[] = [];

  [...scheduledWeeks.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .forEach(([monday, g]) => {
      const ordered = [...g.sessions].sort((a, b) => {
        const aDate = a.scheduled_at ?? a.projected_at ?? a.completed_at!;
        const bDate = b.scheduled_at ?? b.projected_at ?? b.completed_at!;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });
      // Determine kind: "scheduled" if any session has a real scheduled_at
      // date in this week, "projected" if all dates are projected.
      const hasScheduled = ordered.some((s) => s.scheduled_at);
      groups.push({ key: monday, kind: hasScheduled ? "scheduled" : "projected", planWeek: g.planWeek, monday, sessions: ordered });
    });

  [...planWeeks.entries()]
    .sort(([a], [b]) => a - b)
    .forEach(([week, items]) => {
      groups.push({ key: `p${week}`, kind: "plan", planWeek: week, monday: null, sessions: items });
    });

  return groups;
}

/**
 * Derived week label: "Week of 25 Aug" for scheduled sessions,
 * "Plan week N" for unscheduled ones (CR-EF-032).
 */
export function derivedWeekLabel(scheduled_at: string | null, week: number): string {
  if (!scheduled_at) return `Plan week ${week}`;
  const monday = isoToMonday(scheduled_at);
  const d = new Date(monday);
  return `Week of ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

/** Return the Monday–Sunday (7-day) array of Date objects for the week containing
 *  the given ISO date string. Used by the calendar spine's week view. */
export function weekDates(isoDate: string): Date[] {
  const monday = isoToMonday(isoDate);
  const [y, m, d] = monday.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    return dt;
  });
}

/**
 * CR-EF-145 — find the most common gap in days between consecutive scheduled
 * sessions. Used as a fallback weekday pattern when the explicit `weekdays`
 * parameter is empty.
 */
function getCommonWeekdayGap(scheduledDates: string[]): Weekday | null {
  if (scheduledDates.length < 2) return null;
  const sorted = [...scheduledDates].sort();
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    gaps.push(Math.round((curr.getTime() - prev.getTime()) / 86400000));
  }
  // Find the most common gap size
  const counts = new Map<number, number>();
  for (const g of gaps) counts.set(g, (counts.get(g) ?? 0) + 1);
  let bestGap = 0;
  let bestCount = 0;
  for (const [gap, count] of counts) {
    if (count > bestCount || (count === bestCount && gap < bestGap)) {
      bestGap = gap;
      bestCount = count;
    }
  }
  if (bestGap <= 0 || bestGap > 6) return null;
  // The day that is bestGap days after the first scheduled day
  const first = new Date(sorted[0]);
  const fallbackDay = (first.getDay() + bestGap) % 7;
  return fallbackDay as Weekday;
}

/**
 * CR-EF-145 — assign projected_at dates to unbooked sessions by walking
 * forward through the block's weekday pattern after the last booked session.
 *
 * Display-only: projected_at is never written to the database.
 *
 * @param sessions - all sessions in the block (pot sessions, not sub-sessions)
 * @param weekdays - the block's weekday pattern (e.g. [1, 3, 5] for Mon/Wed/Fri)
 * @param lastBookedIso - ISO date of the last booked session (null if none booked)
 * @param scheduledStartIso - block's scheduled start date (fallback when no sessions are booked)
 */
export function projectUnbookedDates<
  T extends { id: string; scheduled_at: string | null; completed_at?: string | null; cancelled_at?: string | null; parent_session_id?: string | null },
>(
  sessions: T[],
  weekdays: Weekday[],
  lastBookedIso: string | null,
  scheduledStartIso: string | null,
): (T & { projected_at: string })[] {
  // Separate booked from unbooked (pot sessions only)
  const booked = sessions.filter(
    (s) => !s.parent_session_id && (s.scheduled_at || s.completed_at) && !s.cancelled_at,
  );
  const unbooked = sessions.filter(
    (s) => !s.parent_session_id && !s.scheduled_at && !s.completed_at && !s.cancelled_at,
  );

  // Build a map of session id → projected_at for unbooked sessions
  const projectedDates = new Map<string, string>();

  if (unbooked.length > 0) {
    // Determine the weekday pattern: use explicit weekdays, or fall back to the
    // most common gap between consecutive booked sessions.
    let pattern: Weekday[];
    if (weekdays.length > 0) {
      pattern = [...weekdays].sort((a, b) => a - b);
    } else {
      const bookedDates = booked
        .filter((s) => s.scheduled_at)
        .map((s) => s.scheduled_at as string)
        .sort();
      const fallbackDay = getCommonWeekdayGap(bookedDates);
      pattern = fallbackDay !== null ? [fallbackDay] : [1]; // ultimate fallback: Monday
    }

    // Start date: day after the last booked session, or block start, or today
    let cursorDate: string;
    if (lastBookedIso) {
      cursorDate = shiftDay(lastBookedIso, 1);
    } else if (scheduledStartIso) {
      cursorDate = scheduledStartIso;
    } else {
      cursorDate = todayLocalISODate();
    }

    // Assign projected dates in chronological order
    const patternSet = new Set<number>(pattern);
    const maxDays = unbooked.length * 7 + 14; // safety cap
    let daysScanned = 0;

    for (const s of unbooked) {
      // Find the next matching weekday from cursorDate
      while (daysScanned < maxDays) {
        const d = new Date(cursorDate);
        if (patternSet.has(d.getDay())) {
          projectedDates.set(s.id, cursorDate);
          cursorDate = shiftDay(cursorDate, 1);
          daysScanned++;
          break;
        }
        cursorDate = shiftDay(cursorDate, 1);
        daysScanned++;
      }
      // If we exhausted the pattern (shouldn't happen in practice), leave
      // unmapped — the session will show as "not yet booked" without
      // a date, which is honest.
    }
  }

  // Map ALL sessions, preserving sub-sessions and already-booked ones
  return sessions.map((s) => ({
    ...s,
    projected_at: projectedDates.get(s.id) ?? "",
  } as T & { projected_at: string }));
}

/**
 * Pairwise overlap detection across DIFFERENT clients within one day's entries.
 * A session occupies `[scheduled_at, scheduled_at + duration)`. Two entries
 * conflict when their intervals overlap and they belong to different clients
 * (a client can't conflict with themselves — back-to-back own sessions are
 * fine). Returns the set of entry ids that are in at least one conflict.
 * Warn only — nothing is blocked (Work Order, Lane D).
 */
export function findConflictIds(entries: ScheduledEntry[]): Set<string> {
  const conflicts = new Set<string>();
  const ranges = entries.map((e) => {
    const start = new Date(e.scheduledAt).getTime();
    return { e, start, end: start + e.durationMinutes * 60_000 };
  });
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const a = ranges[i];
      const b = ranges[j];
      if (a.e.clientId && b.e.clientId && a.e.clientId === b.e.clientId) continue;
      if (a.start < b.end && b.start < a.end) {
        conflicts.add(a.e.id);
        conflicts.add(b.e.id);
      }
    }
  }
  return conflicts;
}
