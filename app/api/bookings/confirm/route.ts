import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  confirmBooking,
  AvailabilityError,
  SlotTakenError,
} from "@/lib/booking-availability";

/**
 * POST /api/bookings/confirm
 *
 * Re-verifies a requested slot against the live Outlook calendar, then
 * creates the calendar event if the slot is still free. This is the
 * double-booking race-condition protection: the client picked this slot
 * seconds/minutes ago via GET /api/booking-availability, but we must
 * re-check at confirm time.
 *
 * Request body (JSON):
 *   {
 *     startUtc: string,       // ISO 8601 UTC — the slot start
 *     endUtc: string,         // ISO 8601 UTC — the slot end
 *     transactionId: string,  // Stable idempotency key (e.g. a booking request UUID)
 *     subject: string,        // Calendar event subject (e.g. "Personal Training — Jane Doe")
 *     bodyHtml?: string       // Optional HTML body for the event
 *   }
 *
 * Response 200:
 *   { eventId: string } — the Outlook event ID of the created calendar event.
 *
 * Response 400:
 *   { error: string } — missing or malformed request body.
 *
 * Response 409:
 *   { error: string, code: "SLOT_TAKEN" } — the slot is no longer free.
 *   The caller should prompt the user to pick a different time.
 *
 * Response 503:
 *   { error: string, code: string } — calendar not connected or Graph error.
 *   The `code` field is one of "NOT_CONNECTED", "GRAPH_RECONNECT", "GRAPH_ERROR".
 */
export async function POST(request: Request) {
  // Auth check — hub staff only.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    startUtc?: string;
    endUtc?: string;
    transactionId?: string;
    subject?: string;
    bodyHtml?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { startUtc, endUtc, transactionId, subject, bodyHtml } = body;

  if (!startUtc || !endUtc || !transactionId || !subject) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: startUtc, endUtc, transactionId, subject",
      },
      { status: 400 }
    );
  }

  // Basic ISO format validation.
  const startDate = new Date(startUtc);
  const endDate = new Date(endUtc);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format — use ISO 8601 UTC timestamps" },
      { status: 400 }
    );
  }
  if (startDate >= endDate) {
    return NextResponse.json(
      { error: "startUtc must be before endUtc" },
      { status: 400 }
    );
  }

  try {
    const result = await confirmBooking({
      startUtc,
      endUtc,
      transactionId,
      subject,
      bodyHtml,
    });
    return NextResponse.json({ eventId: result.eventId });
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return NextResponse.json(
        { error: err.message, code: "SLOT_TAKEN" },
        { status: 409 }
      );
    }
    if (err instanceof AvailabilityError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 503 }
      );
    }
    console.error("bookings/confirm POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
