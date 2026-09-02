import {
  getIntegrationStatus,
  listCalendarView,
  createEvent,
  GraphReconnectError,
  graphConfigured,
  type CalendarEventInput,
} from "@/lib/graph-client";
import { deriveAvailableSlots } from "@/lib/availability";

/**
 * Booking availability engine — CR-EF-097 unit u3.
 *
 * Generates genuinely-free slots for Esther's calendar by combining her
 * working hours with the live Outlook calendar (which already contains both
 * app-synced client sessions and Esther's own hand-added entries).
 */

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
 * Convert a UTC ISO string to a "YYYY-MM-DD" date string.
 * Using toLocaleDateString with en-CA guarantees the ISO format.
 */
function utcToDateString(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA");
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
 * Derives candidate slots from Esther's confirmed availability pattern
 * (availability_pattern + availability_overrides + booking_settings),
 * then removes any slot that overlaps an existing event on her connected
 * Outlook calendar. Both app-synced sessions and Esther's own hand-added
 * entries block a slot.
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

  // Derive candidate slots from the confirmed availability pattern
  // (availability_pattern + availability_overrides + booking_settings).
  const rangeStartDate = utcToDateString(rangeStartUtc);
  const rangeEndDate = utcToDateString(rangeEndUtc);
  const derivedDays = await deriveAvailableSlots(rangeStartDate, rangeEndDate);

  // Flatten DerivedDay[] → AvailableSlot[], keeping only slots that
  // were not filtered out by the availability engine (past, full, off).
  const candidates: AvailableSlot[] = derivedDays.flatMap((day) =>
    day.slots.map((s) => ({ startUtc: s.startUtc, endUtc: s.endUtc }))
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
