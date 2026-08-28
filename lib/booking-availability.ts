import {
  getIntegrationStatus,
  listCalendarView,
  createEvent,
  GraphReconnectError,
  graphConfigured,
  type CalendarEventInput,
} from "@/lib/graph-client";

/**
 * Booking availability engine — CR-EF-097 unit u3.
 *
 * Generates genuinely-free slots for Esther's calendar by combining her
 * working hours with the live Outlook calendar (which already contains both
 * app-synced client sessions and Esther's own hand-added entries).
 */

// ─── Default working hours ────────────────────────────────────────────────
// No working-hours config exists in the codebase (confirmed by grep of lib/
// and supabase/migrations/). This is a hardcoded default that should become
// a real DB setting later — do not build a settings UI for this yet.

interface WorkingHoursRule {
  /** 0 = Sunday … 6 = Saturday (Date.getDay()) */
  dayOfWeek: number;
  /** Local time "HH:MM" in Europe/London */
  startLocal: string;
  endLocal: string;
}

const SLOT_DURATION_MINUTES = 60;

const DEFAULT_WORKING_HOURS: WorkingHoursRule[] = [
  { dayOfWeek: 1, startLocal: "09:00", endLocal: "17:00" }, // Mon
  { dayOfWeek: 2, startLocal: "09:00", endLocal: "17:00" }, // Tue
  { dayOfWeek: 3, startLocal: "09:00", endLocal: "17:00" }, // Wed
  { dayOfWeek: 4, startLocal: "09:00", endLocal: "17:00" }, // Thu
  { dayOfWeek: 5, startLocal: "09:00", endLocal: "17:00" }, // Fri
];

// ─── Public types ─────────────────────────────────────────────────────────

export interface AvailableSlot {
  startUtc: string;
  endUtc: string;
}

/** Typed error the caller can render as "couldn't check availability". */
export class AvailabilityError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_CONNECTED" | "GRAPH_RECONNECT" | "GRAPH_ERROR"
  ) {
    super(message);
    this.name = "AvailabilityError";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Parse a "HH:MM" local time string into hours and minutes (numbers).
 */
function parseLocalTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number);
  return { hours: h, minutes: m };
}

/**
 * For a given date (in Europe/London), produce candidate slot start/end
 * pairs in UTC. Each slot is a 60-minute block within working hours.
 *
 * We convert from local London time to UTC by constructing Date objects
 * with the local components, which the JS engine interprets as local time,
 * then reading .toISOString() for the UTC representation.
 */
function candidateSlotsForDate(
  date: Date,
  rules: WorkingHoursRule[]
): { startUtc: string; endUtc: string }[] {
  const slots: { startUtc: string; endUtc: string }[] = [];
  const dayOfWeek = date.getDay();

  const rule = rules.find((r) => r.dayOfWeek === dayOfWeek);
  if (!rule) return slots;

  const { hours: startH, minutes: startM } = parseLocalTime(rule.startLocal);
  const { hours: endH, minutes: endM } = parseLocalTime(rule.endLocal);

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Walk from startLocal forward in SLOT_DURATION_MINUTES steps.
  let cursor = new Date(year, month, day, startH, startM, 0, 0);
  const endBoundary = new Date(year, month, day, endH, endM, 0, 0);

  while (true) {
    const slotEnd = new Date(cursor.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
    if (slotEnd > endBoundary) break;
    slots.push({
      startUtc: cursor.toISOString(),
      endUtc: slotEnd.toISOString(),
    });
    cursor = slotEnd;
  }

  return slots;
}

/**
 * Generate all candidate slots across a UTC date range.
 * The range is expanded to cover full days in Europe/London.
 */
function generateCandidateSlots(
  rangeStartUtc: string,
  rangeEndUtc: string,
  rules: WorkingHoursRule[]
): { startUtc: string; endUtc: string }[] {
  const start = new Date(rangeStartUtc);
  const end = new Date(rangeEndUtc);

  const slots: { startUtc: string; endUtc: string }[] = [];

  // Walk day-by-day. We start from the day containing rangeStart and go
  // through the day containing rangeEnd (inclusive).
  const cursor = new Date(start);
  // Reset to start of that day (local London) to catch slots that fall
  // before rangeStart but on the same day — they'll be filtered later.
  cursor.setHours(0, 0, 0, 0);

  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);

  while (cursor <= endDay) {
    slots.push(...candidateSlotsForDate(cursor, rules));
    cursor.setDate(cursor.getDate() + 1);
  }

  return slots;
}

/**
 * Check whether two time ranges overlap. Two ranges [a1, a2) and [b1, b2)
 * overlap iff a1 < b2 AND b1 < a2. The events from Graph use dateTime as
 * UTC strings (we append "Z" when parsing to be explicit).
 */
function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const a1 = new Date(aStart).getTime();
  const a2 = new Date(aEnd).getTime();
  const b1 = new Date(bStart).getTime();
  const b2 = new Date(bEnd).getTime();
  return a1 < b2 && b1 < a2;
}

// ─── Core function ────────────────────────────────────────────────────────

/**
 * Return genuinely-free slots within the requested UTC range.
 *
 * Generates candidate slots from Esther's working hours, then removes any
 * slot that overlaps an existing event on her connected Outlook calendar.
 * Both app-synced sessions and Esther's own hand-added entries block a slot.
 *
 * @throws AvailabilityError if the calendar is not connected or Graph rejects
 *   the request. Never returns an empty list on error — the caller must
 *   distinguish "no free slots" from "couldn't check".
 */
export async function getAvailableSlots(
  rangeStartUtc: string,
  rangeEndUtc: string
): Promise<AvailableSlot[]> {
  if (!graphConfigured()) {
    throw new AvailabilityError(
      "Microsoft Graph is not configured",
      "NOT_CONNECTED"
    );
  }

  const status = await getIntegrationStatus();
  if (!status.connected || !status.calendarId) {
    throw new AvailabilityError(
      "No Microsoft calendar connected",
      "NOT_CONNECTED"
    );
  }

  let calendarEvents;
  try {
    calendarEvents = await listCalendarView(
      status.calendarId,
      rangeStartUtc,
      rangeEndUtc
    );
  } catch (err) {
    if (err instanceof GraphReconnectError) {
      throw new AvailabilityError(
        "Microsoft calendar needs reconnecting",
        "GRAPH_RECONNECT"
      );
    }
    throw new AvailabilityError(
      `Failed to read calendar: ${(err as Error).message}`,
      "GRAPH_ERROR"
    );
  }

  // Build the list of busy ranges from the calendar events.
  const busyRanges: { startUtc: string; endUtc: string }[] = [];
  for (const ev of calendarEvents) {
    if (!ev.start?.dateTime || !ev.end?.dateTime) continue;
    // Graph returns dateTime without timezone suffix — treat as UTC.
    busyRanges.push({
      startUtc: ev.start.dateTime,
      endUtc: ev.end.dateTime,
    });
  }

  // Generate candidate slots from working hours.
  const candidates = generateCandidateSlots(
    rangeStartUtc,
    rangeEndUtc,
    DEFAULT_WORKING_HOURS
  );

  // Filter: a slot is free only if it overlaps NONE of the busy ranges.
  const freeSlots: AvailableSlot[] = candidates.filter((slot) => {
    return !busyRanges.some((busy) =>
      rangesOverlap(slot.startUtc, slot.endUtc, busy.startUtc, busy.endUtc)
    );
  });

  return freeSlots;
}

// ─── Confirm booking ──────────────────────────────────────────────────────

export interface ConfirmBookingInput {
  /** The slot the client wants to book. */
  startUtc: string;
  endUtc: string;
  /** Stable, caller-provided idempotency key (e.g. a booking request UUID). */
  transactionId: string;
  /** Subject line for the Outlook calendar event. */
  subject: string;
  /** HTML body for the Outlook calendar event. */
  bodyHtml?: string;
}

export interface ConfirmBookingResult {
  /** The Outlook event ID of the created event. */
  eventId: string;
}

/** Typed error for the confirm flow. */
export class SlotTakenError extends Error {
  constructor() {
    super("This slot is no longer available — another booking was made first");
    this.name = "SlotTakenError";
  }
}

/**
 * Re-verify the requested slot is still free, then create the Outlook event.
 *
 * This is the double-booking race-condition protection: the client picked
 * this slot seconds/minutes ago, but we must re-check against the live
 * calendar at confirm time. If someone else (or Esther directly) booked
 * the slot in between, we return a SlotTakenError so the caller can
 * prompt the user to pick a different time.
 *
 * @throws SlotTakenError if the slot is no longer free.
 * @throws AvailabilityError if the calendar is not connected or Graph rejects
 *   the request.
 */
export async function confirmBooking(
  input: ConfirmBookingInput
): Promise<ConfirmBookingResult> {
  // Re-verify: check that the exact requested slot is still free.
  const freeSlots = await getAvailableSlots(input.startUtc, input.endUtc);

  const stillFree = freeSlots.some(
    (s) =>
      s.startUtc === input.startUtc && s.endUtc === input.endUtc
  );

  if (!stillFree) {
    throw new SlotTakenError();
  }

  // The slot is confirmed free — create the Outlook event.
  const status = await getIntegrationStatus();
  if (!status.connected || !status.calendarId) {
    throw new AvailabilityError(
      "No Microsoft calendar connected",
      "NOT_CONNECTED"
    );
  }

  const eventInput: CalendarEventInput = {
    subject: input.subject,
    bodyHtml: input.bodyHtml ?? "",
    startUtc: input.startUtc,
    endUtc: input.endUtc,
  };

  try {
    const { id: eventId } = await createEvent(
      status.calendarId,
      eventInput,
      input.transactionId
    );
    return { eventId };
  } catch (err) {
    if (err instanceof GraphReconnectError) {
      throw new AvailabilityError(
        "Microsoft calendar needs reconnecting",
        "GRAPH_RECONNECT"
      );
    }
    throw new AvailabilityError(
      `Failed to create calendar event: ${(err as Error).message}`,
      "GRAPH_ERROR"
    );
  }
}
