import type { ScheduledEntry } from "@/app/hub/(protected)/schedule/ScheduleCalendar";

// --- date/time helpers shared by the day and month schedule views ---

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

export type CalendarWeekKind = "scheduled" | "plan";

export interface CalendarWeekGroup<T> {
  /** Stable, sortable identity. Scheduled weeks key by their Monday
   *  ("YYYY-MM-DD"); plan weeks key by the stored ordinal ("p1", "p2", …). */
  key: string;
  /** "scheduled" → a real Mon–Sun week derived from `scheduled_at`; "plan" →
   *  the stored `week` ordinal, used only for sessions with no `scheduled_at`. */
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
export function groupSessionsByWeek<T extends { scheduled_at: string | null; week: number }>(
  sessions: T[],
): CalendarWeekGroup<T>[] {
  const scheduledWeeks = new Map<string, { planWeek: number; sessions: T[] }>();
  const planWeeks = new Map<number, T[]>();

  for (const s of sessions) {
    if (s.scheduled_at) {
      const monday = isoToMonday(s.scheduled_at);
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
      const ordered = [...g.sessions].sort(
        (a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime(),
      );
      groups.push({ key: monday, kind: "scheduled", planWeek: g.planWeek, monday, sessions: ordered });
    });

  [...planWeeks.entries()]
    .sort(([a], [b]) => a - b)
    .forEach(([week, items]) => {
      groups.push({ key: `p${week}`, kind: "plan", planWeek: week, monday: null, sessions: items });
    });

  return groups;
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
