import type { TimeTier } from "@/types";

/**
 * Estimated session duration in minutes, derived from the client's `time_tier`.
 *
 * Matches the convention already used across the UI (clients/new, clients/[id]/edit,
 * exercise-browser): compact ≈ 45 min, standard ≈ 60 min, extended ≈ 75 min. This is
 * the single shared source for that mapping — reused by Lane D1's scheduling UI and by
 * Lane D2's studio-wide calendar conflict detection (a session occupies
 * `[scheduled_at, scheduled_at + TIME_TIER_MINUTES[tier])`).
 */
export const TIME_TIER_MINUTES: Record<TimeTier, number> = {
  compact: 45,
  standard: 60,
  extended: 75,
};

/** Fallback used when a client's time_tier is missing/unknown. */
export const DEFAULT_SESSION_MINUTES = TIME_TIER_MINUTES.standard;

export function sessionDurationMinutes(tier: TimeTier | null | undefined): number {
  if (tier && tier in TIME_TIER_MINUTES) return TIME_TIER_MINUTES[tier];
  return DEFAULT_SESSION_MINUTES;
}

/** Day-of-week index, 0 = Sunday … 6 = Saturday (matches Date.getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_LABELS: { value: Weekday; short: string; long: string }[] = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
];

export interface RepeatingPattern {
  /** Chosen days of week (e.g. [2, 4] for Tue/Thu). Order is irrelevant. */
  weekdays: Weekday[];
  /** Local time of day, 24h "HH:MM" (e.g. "10:00"). */
  time: string;
  /** Start date, local "YYYY-MM-DD". The first slot is the first chosen weekday
   *  at or after this date (the start date itself counts if it matches). */
  startDate: string;
}

/**
 * Produce `count` scheduled Date objects by cycling through the pattern's chosen
 * weekdays from `startDate` forward, one per session in `session_number` order.
 *
 * Example: count 12, weekdays [Tue, Thu], time 10:00, start Mon 28 Jul →
 *   Tue 29 Jul, Thu 31 Jul, Tue 5 Aug, Thu 7 Aug, … (12 dates).
 *
 * The start date is skipped if it isn't a chosen weekday — the first slot is the
 * first matching day at or on the start date.
 *
 * Edge cases:
 *  - 0 chosen weekdays → returns [] (caller must reject before applying; there is
 *    no meaningful schedule without at least one day).
 *  - count 0 → returns [].
 *  - more sessions than the pattern "covers" in a short span is a non-issue: the
 *    cycle repeats indefinitely week after week, so any count is always satisfied.
 *  - a guard cap (52 weeks per session) prevents an infinite loop if given
 *    impossible input; in practice it is never reached.
 */
export function generatePatternDates(pattern: RepeatingPattern, count: number): Date[] {
  const { weekdays, time, startDate } = pattern;
  if (count <= 0 || weekdays.length === 0) return [];

  const [hStr, mStr] = time.split(":");
  const hours = Number(hStr);
  const minutes = Number(mStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return [];

  const uniqueDays = new Set<number>(weekdays);

  // Parse "YYYY-MM-DD" as a local date to avoid UTC off-by-one.
  const [y, mo, d] = startDate.split("-").map(Number);
  const cursor = new Date(y, mo - 1, d, hours, minutes, 0, 0);

  const results: Date[] = [];
  // Cap: at most `count` weeks of scanning plus slack, so a valid pattern always
  // completes and a degenerate one still terminates.
  const maxDaysToScan = (count + 1) * 7 + 7;
  let scanned = 0;

  while (results.length < count && scanned <= maxDaysToScan) {
    if (uniqueDays.has(cursor.getDay())) {
      results.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
    scanned++;
  }

  return results;
}
