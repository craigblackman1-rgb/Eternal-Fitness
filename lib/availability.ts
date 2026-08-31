/**
 * CR-EF-097 — Availability engine.
 *
 * Derives bookable slot start times from:
 *   availability_pattern (weekly hours) − availability_overrides (time off) + extras
 *   filtered by booking_settings (session_length, gap_after, lead_hours, horizon_weeks)
 *
 * Slot start times are NEVER stored. They are computed on every read.
 */

import { supabase } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────────

export interface BookingSettings {
  id: string;
  session_length: number; // minutes
  gap_after: number; // minutes
  notice_hours: number;
  lead_hours: number;
  horizon_weeks: number;
  max_per_day: number;
  intro_holdback: number;
}

export interface AvailabilityPatternRow {
  id: string;
  day_of_week: number; // 0=Sun … 6=Sat
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  active: boolean;
  note: string | null;
  sort_order: number;
}

export interface AvailabilityOverride {
  id: string;
  override_type: "time_off" | "extra_hours";
  start_date: string; // "YYYY-MM-DD"
  end_date: string; // "YYYY-MM-DD" inclusive
  start_time: string | null; // null = whole day
  end_time: string | null; // null = whole day
  reason: string | null;
  active: boolean;
}

export interface DerivedSlot {
  startLocal: string; // "HH:MM" in Europe/London
  endLocal: string; // "HH:MM" in Europe/London
  startUtc: string; // ISO string
  endUtc: string; // ISO string
  date: string; // "YYYY-MM-DD"
  dayOfWeek: number;
}

export interface DerivedDay {
  date: string; // "YYYY-MM-DD"
  dayOfWeek: number; // 0=Sun
  dayName: string; // "Monday"
  dayShort: string; // "Mon"
  dayNum: number; // 31
  monthShort: string; // "Aug"
  slots: DerivedSlot[];
  state: "open" | "past" | "full" | "off" | "closed";
  reason?: string; // why it's off/closed
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function mins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function padMins(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Parse a "YYYY-MM-DD" string as a local Date (no timezone shift). */
function parseDateLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Date as "YYYY-MM-DD". */
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Get the Monday of the ISO week containing `d`. */
function mondayOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday-based
  const mon = new Date(d);
  mon.setDate(mon.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

// ─── Data access ─────────────────────────────────────────────────────────

export async function getBookingSettings(): Promise<BookingSettings> {
  const { data, error } = await supabase
    .from("booking_settings")
    .select("*")
    .limit(1)
    .single();

  if (error) throw new Error(`Failed to load booking settings: ${error.message}`);
  return data as BookingSettings;
}

export async function updateBookingSettings(
  updates: Partial<Omit<BookingSettings, "id" | "created_at" | "updated_at">>
): Promise<void> {
  const { data: existing } = await supabase
    .from("booking_settings")
    .select("id")
    .limit(1)
    .single();

  if (!existing) throw new Error("No booking_settings row found");

  const { error } = await supabase
    .from("booking_settings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (error) throw new Error(`Failed to update booking settings: ${error.message}`);
}

export async function getAvailabilityPattern(): Promise<AvailabilityPatternRow[]> {
  const { data, error } = await supabase
    .from("availability_pattern")
    .select("*")
    .order("day_of_week")
    .order("sort_order");

  if (error) throw new Error(`Failed to load availability pattern: ${error.message}`);
  return (data ?? []) as AvailabilityPatternRow[];
}

export async function upsertAvailabilityPattern(
  rows: Omit<AvailabilityPatternRow, "id" | "created_at" | "updated_at">[]
): Promise<void> {
  // Delete all existing, then insert new — simpler than diffing.
  const { error: delErr } = await supabase
    .from("availability_pattern")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all

  if (delErr) throw new Error(`Failed to clear pattern: ${delErr.message}`);

  const { error: insErr } = await supabase
    .from("availability_pattern")
    .insert(rows.map((r, i) => ({ ...r, sort_order: i })));

  if (insErr) throw new Error(`Failed to insert pattern: ${insErr.message}`);
}

export async function getAvailabilityOverrides(): Promise<AvailabilityOverride[]> {
  const { data, error } = await supabase
    .from("availability_overrides")
    .select("*")
    .eq("active", true)
    .order("start_date");

  if (error) throw new Error(`Failed to load overrides: ${error.message}`);
  return (data ?? []) as AvailabilityOverride[];
}

// ─── Slot derivation ────────────────────────────────────────────────────

/**
 * Given a time range in a day, compute slot start times.
 * Each slot starts at `start` and repeats every (session_length + gap_after) minutes.
 */
function slotsInRange(
  rangeStart: string,
  rangeEnd: string,
  sessionLength: number,
  gap: number
): string[] {
  const startMins = mins(rangeStart);
  const endMins = mins(rangeEnd);
  const step = sessionLength + gap;
  const slots: string[] = [];

  for (let t = startMins; t + sessionLength <= endMins; t += step) {
    slots.push(padMins(t));
  }

  return slots;
}

/**
 * Check whether a given date/time falls within any time_off override.
 */
function isTimeOff(
  date: string,
  time: string | null, // null = whole day check
  overrides: AvailabilityOverride[]
): { off: boolean; reason?: string } {
  for (const o of overrides) {
    if (o.override_type !== "time_off") continue;
    if (date < o.start_date || date > o.end_date) continue;

    // Whole-day time off
    if (!o.start_time && !o.end_time) {
      return { off: true, reason: o.reason ?? "Time off" };
    }

    // Partial-day time off — check if the time falls within the range
    if (time && o.start_time && o.end_time) {
      if (time >= o.start_time && time < o.end_time) {
        return { off: true, reason: o.reason ?? "Time off" };
      }
    }
  }
  return { off: false };
}

/**
 * Get extra hours for a specific date from overrides.
 */
function getExtraHours(
  date: string,
  overrides: AvailabilityOverride[]
): { start: string; end: string }[] {
  const extras: { start: string; end: string }[] = [];
  for (const o of overrides) {
    if (o.override_type !== "extra_hours") continue;
    if (date < o.start_date || date > o.end_date) continue;
    if (o.start_time && o.end_time) {
      extras.push({ start: o.start_time, end: o.end_time });
    }
  }
  return extras;
}

/**
 * Derive available slots for a date range.
 *
 * @param rangeStart Start date ("YYYY-MM-DD")
 * @param rangeEnd   End date ("YYYY-MM-DD") inclusive
 * @param bookedSlots Existing booked slots to exclude (array of "YYYY-MM-DD HH:MM" strings)
 */
export async function deriveAvailableSlots(
  rangeStart: string,
  rangeEnd: string,
  bookedSlots: string[] = []
): Promise<DerivedDay[]> {
  const [settings, pattern, overrides] = await Promise.all([
    getBookingSettings(),
    getAvailabilityPattern(),
    getAvailabilityOverrides(),
  ]);

  const bookedSet = new Set(bookedSlots);
  const now = new Date();
  const days: DerivedDay[] = [];

  const startDate = parseDateLocal(rangeStart);
  const endDate = parseDateLocal(rangeEnd);

  for (
    let d = new Date(startDate);
    d <= endDate;
    d.setDate(d.getDate() + 1)
  ) {
    const dateStr = fmtDate(d);
    const dow = d.getDay();

    // Check if in the past
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const isPast = dayStart < new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get pattern ranges for this day
    const dayRanges = pattern.filter((p) => p.day_of_week === dow && p.active);

    // Get extra hours for this day
    const extraRanges = getExtraHours(dateStr, overrides);

    // Combine pattern + extras
    const allRanges = [
      ...dayRanges.map((r) => ({ start: r.start_time, end: r.end_time })),
      ...extraRanges,
    ];

    // Derive slot start times from all ranges
    const slotStarts: string[] = [];
    for (const range of allRanges) {
      // Check if this range is fully covered by time off
      const timeOffCheck = isTimeOff(dateStr, null, overrides);
      if (timeOffCheck.off) continue; // whole-day time off

      // Check each potential slot start against partial time off
      const starts = slotsInRange(
        range.start,
        range.end,
        settings.session_length,
        settings.gap_after
      );
      for (const s of starts) {
        const toe = isTimeOff(dateStr, s, overrides);
        if (!toe.off) {
          slotStarts.push(s);
        }
      }
    }

    // Remove booked slots
    const freeStarts = slotStarts.filter(
      (s) => !bookedSet.has(`${dateStr} ${s}`)
    );

    // Determine day state
    let state: DerivedDay["state"];
    let reason: string | undefined;

    if (isPast) {
      state = "past";
    } else if (allRanges.length === 0 || freeStarts.length === 0) {
      const timeOff = isTimeOff(dateStr, null, overrides);
      if (timeOff.off) {
        state = "off";
        reason = timeOff.reason;
      } else if (dayRanges.length === 0 && extraRanges.length === 0) {
        state = "closed";
        reason = "The studio is closed on this day.";
      } else {
        state = "full";
      }
    } else {
      state = "open";
    }

    // Build slot objects
    const slots: DerivedSlot[] = freeStarts.map((startTime) => {
      const endMins = mins(startTime) + settings.session_length;
      const endTime = padMins(endMins);

      // Build UTC times (Europe/London)
      const [y, m, dd] = dateStr.split("-").map(Number);
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);

      const startLocal = new Date(y, m - 1, dd, sh, sm, 0, 0);
      const endLocal = new Date(y, m - 1, dd, eh, em, 0, 0);

      return {
        startLocal: startTime,
        endLocal: endTime,
        startUtc: startLocal.toISOString(),
        endUtc: endLocal.toISOString(),
        date: dateStr,
        dayOfWeek: dow,
      };
    });

    days.push({
      date: dateStr,
      dayOfWeek: dow,
      dayName: DAY_NAMES[dow],
      dayShort: DAY_SHORT[dow],
      dayNum: d.getDate(),
      monthShort: MONTH_SHORT[d.getMonth()],
      slots,
      state,
      reason,
    });
  }

  return days;
}

export interface WeekSlots {
  label: string;
  range: string;
  days: DerivedDay[];
}

/**
 * Get available slots grouped into weeks for the picker UI.
 * Returns up to `weeks` weeks starting from the Monday of `fromDate`.
 */
export async function deriveWeekSlots(
  fromDate: string,
  weeks: number,
  bookedSlots: string[] = []
): Promise<WeekSlots[]> {
  const start = mondayOfWeek(parseDateLocal(fromDate));
  const results: WeekSlots[] = [];

  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const days = await deriveAvailableSlots(
      fmtDate(weekStart),
      fmtDate(weekEnd),
      bookedSlots
    );

    const totalSlots = days.reduce((sum, d) => sum + d.slots.length, 0);

    results.push({
      label: w === 0 ? "This week" : w === 1 ? "Next week" : `Week of ${days[0]?.dayNum ?? "?"} ${days[0]?.monthShort ?? ""}`,
      range: `${days[0]?.dayShort} ${days[0]?.dayNum} – ${days[6]?.dayShort} ${days[6]?.dayNum} ${days[6]?.monthShort ?? ""}`,
      days,
    });
  }

  return results;
}
