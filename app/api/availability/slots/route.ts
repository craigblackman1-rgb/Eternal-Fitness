import { NextResponse } from "next/server";
import { deriveWeekSlots } from "@/lib/availability";

/**
 * GET /api/availability/slots?from=2026-09-01&weeks=8&booked=[]
 *
 * Returns derived available slots grouped into weeks.
 * Uses the new DB-backed availability engine (pattern − overrides + extras).
 *
 * Query params:
 *   from   — "YYYY-MM-DD" start date (defaults to today's Monday)
 *   weeks  — number of weeks to return (default 8)
 *   booked — JSON array of "YYYY-MM-DD HH:MM" strings for already-booked slots
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const fromParam = searchParams.get("from");
  const weeksParam = searchParams.get("weeks");
  const bookedParam = searchParams.get("booked");

  // Default to Monday of this week
  let fromDate: string;
  if (fromParam) {
    fromDate = fromParam;
  } else {
    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    fromDate = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  }

  const weeks = weeksParam ? Math.min(parseInt(weeksParam), 12) : 8;

  let bookedSlots: string[] = [];
  if (bookedParam) {
    try {
      bookedSlots = JSON.parse(bookedParam);
    } catch {
      // Ignore malformed booked param
    }
  }

  try {
    const weekData = await deriveWeekSlots(fromDate, weeks, bookedSlots);
    return NextResponse.json({ weeks: weekData });
  } catch (err) {
    console.error("availability/slots error:", err);
    return NextResponse.json(
      { error: "Failed to derive availability" },
      { status: 500 }
    );
  }
}
