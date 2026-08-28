import { NextResponse } from "next/server";
import { getAvailableSlots, AvailabilityError } from "@/lib/booking-availability";

/**
 * GET /api/booking-availability?start=2026-09-01T09:00:00Z&end=2026-09-05T17:00:00Z
 *
 * Returns genuinely-free booking slots within the requested UTC date range.
 * Slots are derived from Esther's working hours, minus any existing events
 * on her connected Outlook calendar (both app-synced sessions and her own
 * hand-added entries block slots equally).
 *
 * Query params:
 *   start — ISO 8601 UTC timestamp (required). The beginning of the range.
 *   end   — ISO 8601 UTC timestamp (required). The end of the range.
 *
 * Response 200:
 *   { slots: Array<{ startUtc: string; endUtc: string }> }
 *
 * Response 400:
 *   { error: string } — missing or malformed params.
 *
 * Response 503:
 *   { error: string, code: string } — calendar not connected or Graph error.
 *   The `code` field is one of "NOT_CONNECTED", "GRAPH_RECONNECT", "GRAPH_ERROR".
 *   Callers should render this as "couldn't check availability", NOT as "no
 *   free slots".
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "Missing required query params: start, end" },
      { status: 400 }
    );
  }

  // Basic ISO format validation.
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format — use ISO 8601 UTC timestamps" },
      { status: 400 }
    );
  }
  if (startDate >= endDate) {
    return NextResponse.json(
      { error: "start must be before end" },
      { status: 400 }
    );
  }

  try {
    const slots = await getAvailableSlots(start, end);
    return NextResponse.json({ slots });
  } catch (err) {
    if (err instanceof AvailabilityError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 503 }
      );
    }
    console.error("booking-availability GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
