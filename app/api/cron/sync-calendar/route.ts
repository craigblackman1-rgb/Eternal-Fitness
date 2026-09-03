import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { syncCalendar } from "@/lib/calendar-sync";
import { syncOutlookBookings } from "@/lib/outlook-bookings";
import { GraphReconnectError } from "@/lib/graph-client";
import { getPool } from "@/lib/pg-client";

export const dynamic = "force-dynamic";

function secretsMatch(provided: string, secret: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

/**
 * Auto-lapse passed bookings — sessions with status='scheduled' that are
 * more than 1 day past their scheduled_at, have no completed_at, and no
 * set_logs. Instead of cancelling outright (Craig decision 2026-08-31),
 * flag them for Esther's review. The flag is idempotent: already-flagged
 * sessions are skipped.
 */
async function autoLapsePassedBookings(): Promise<{ flagged: number }> {
  const pool = getPool();

  const { rows: stale } = await pool.query(
    `SELECT s.id
     FROM sessions s
     WHERE s.status = 'scheduled'
       AND s.scheduled_at < now() - interval '1 day'
       AND s.completed_at IS NULL
       AND s.lapse_flagged_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM set_logs sl
         WHERE sl.session_id = s.id
       )`,
  );

  if (stale.length === 0) return { flagged: 0 };

  const ids = stale.map((r: { id: string }) => r.id);
  const now = new Date().toISOString();

  await pool.query(
    `UPDATE sessions
     SET lapse_flagged_at = $1
     WHERE id = ANY($2)`,
    [now, ids],
  );

  return { flagged: stale.length };
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
    const outboundEnabled = process.env.CALENDAR_OUTBOUND_SYNC === "enabled";

    let result: Record<string, unknown> | Awaited<ReturnType<typeof syncCalendar>>;
    if (outboundEnabled) {
      result = await syncCalendar();
    } else {
      console.log(
        "[sync-calendar] Outbound sync disabled (CALENDAR_OUTBOUND_SYNC is not \"enabled\"). Skipping app→Outlook push.",
      );
      result = { outboundSync: "skipped" };
    }

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

    // Auto-lapse stale bookings — sessions that are past their slot with no
    // logged session. Flags for human review instead of cancelling outright
    // (Craig decision 2026-08-31). Runs after both syncs so it never races
    // with ingest.
    let autoLapse: { flagged: number } = { flagged: 0 };
    try {
      autoLapse = await autoLapsePassedBookings();
    } catch (lapseErr) {
      console.error("Auto-lapse passed bookings failed:", lapseErr);
    }

    return NextResponse.json({ ...result, outlookBookings, autoLapse });
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
