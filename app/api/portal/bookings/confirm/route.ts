import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import { getPool } from "@/lib/pg-client";
import {
  confirmBooking,
  AvailabilityError,
  SlotTakenError,
} from "@/lib/booking-availability";
import { sessionDurationMinutes } from "@/lib/scheduling";
import type { TimeTier } from "@/types";

/**
 * POST /api/portal/bookings/confirm
 *
 * Portal-scoped booking confirmation. The logged-in client books or reschedules
 * one of their own sessions. Ownership is verified server-side: a client can
 * never touch another client's session by guessing an id.
 *
 * Request body (JSON):
 *   {
 *     sessionId: string,    // UUID of the client's session
 *     startUtc: string,     // ISO 8601 UTC — the slot start
 *     endUtc: string,       // ISO 8601 UTC — the slot end
 *   }
 *
 * Response 200:
 *   { session: { id, scheduled_at, status } }
 *
 * Response 400:  { error: string } — missing or malformed body.
 * Response 404:  { error: string } — session not found or not yours.
 * Response 409:  { error: string, code: "SLOT_TAKEN" } — slot was taken.
 * Response 503:  { error: string, code: string } — calendar error.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const portalSession = await getPortalSessionFromCookies();
  if (!portalSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { sessionId?: string; startUtc?: string; endUtc?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sessionId, startUtc, endUtc } = body;
  if (!sessionId || !startUtc || !endUtc) {
    return NextResponse.json(
      { error: "Missing required fields: sessionId, startUtc, endUtc" },
      { status: 400 },
    );
  }
  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const startDate = new Date(startUtc);
  const endDate = new Date(endUtc);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format — use ISO 8601 UTC timestamps" },
      { status: 400 },
    );
  }
  if (startDate >= endDate) {
    return NextResponse.json(
      { error: "startUtc must be before endUtc" },
      { status: 400 },
    );
  }

  // Ownership check — the session must belong to this client.
  const pool = getPool();
  const sessionRes = await pool.query(
    `SELECT s.id, s.session_number, s.data, s.block_id, s.scheduled_at
       FROM sessions s
       JOIN blocks b ON b.id = s.block_id
      WHERE s.id = $1 AND b.client_id = $2
      LIMIT 1`,
    [sessionId, portalSession.clientId],
  );
  if (sessionRes.rows.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const sessionRow = sessionRes.rows[0];
  const sessionData = sessionRow.data as { focus_label?: string; time_tier?: TimeTier } | null;

  // Resolve client name for the Outlook event subject.
  const data = createPortalDataClient(portalSession.clientId);
  const client = await data.getClient();
  const clientName = client?.name ?? "Client";
  const subject = `Personal Training — ${clientName}`;

  const transactionId = `portal-${sessionId}-${Date.now()}`;

  try {
    const result = await confirmBooking({
      startUtc,
      endUtc,
      transactionId,
      subject,
    });

    // Update the session row with the booked time.
    const minutes = sessionDurationMinutes(
      (sessionData?.time_tier ?? null) as TimeTier | null,
    );
    await pool.query(
      `UPDATE sessions
          SET scheduled_at = $1, status = 'scheduled'
        WHERE id = $2`,
      [startUtc, sessionId],
    );

    // Upsert the calendar event mapping.
    const syncHash = createHash("sha256")
      .update([subject, startUtc, endUtc].join("|"))
      .digest("hex");
    await pool.query(
      `INSERT INTO session_calendar_events
         (session_id, event_id, calendar_id, sync_hash, synced_at)
       VALUES ($1, $2, 'portal', $3, NOW())
       ON CONFLICT (session_id) DO UPDATE
         SET event_id = $2, calendar_id = 'portal',
             sync_hash = $3, synced_at = NOW()`,
      [sessionId, result.eventId, syncHash],
    );

    return NextResponse.json({
      session: {
        id: sessionId,
        scheduled_at: startUtc,
        status: "scheduled",
      },
    });
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return NextResponse.json(
        { error: err.message, code: "SLOT_TAKEN" },
        { status: 409 },
      );
    }
    if (err instanceof AvailabilityError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 503 },
      );
    }
    console.error("portal/bookings/confirm POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
