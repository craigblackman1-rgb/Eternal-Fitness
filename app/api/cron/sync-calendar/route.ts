import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { syncCalendar } from "@/lib/calendar-sync";
import { syncOutlookBookings } from "@/lib/outlook-bookings";
import { GraphReconnectError } from "@/lib/graph-client";

export const dynamic = "force-dynamic";

function secretsMatch(provided: string, secret: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

/**
 * Recurring Outlook calendar sync — run every 15 minutes (Coolify scheduled
 * task hitting this URL with the CRON_SECRET bearer, same pattern as
 * check-updates-due). sync_hash makes an unchanged run a cheap no-op.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  const provided = auth.replace(/^Bearer\s+/i, "") || url.searchParams.get("secret") || "";
  if (!secretsMatch(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncCalendar();

    // CR-EF-050 — read-back for Microsoft Bookings appointments, same 15-min
    // cadence, separate try/catch so a failure here never blocks the (older,
    // higher-stakes) app->Outlook push sync above.
    let outlookBookings: unknown = null;
    try {
      outlookBookings = await syncOutlookBookings();
    } catch (bookingsErr) {
      if (bookingsErr instanceof GraphReconnectError) {
        outlookBookings = { skipped: "reconnect-required", detail: (bookingsErr as Error).message };
      } else {
        console.error("Outlook Bookings sync failed:", bookingsErr);
        outlookBookings = { error: (bookingsErr as Error).message };
      }
    }

    return NextResponse.json({ ...result, outlookBookings });
  } catch (err) {
    if (err instanceof GraphReconnectError) {
      // Not an outage — the connection needs Esther to reconnect. Surface as a
      // distinct state so the cron's own logs make the cause obvious.
      return NextResponse.json({ skipped: "reconnect-required", detail: (err as Error).message });
    }
    console.error("Calendar sync failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
