import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { syncSessionCalendarEvent } from "@/lib/calendar-sync";

/**
 * CR-EF-097 — POST /api/hub/availability/move-clashing-session
 *
 * Reschedules a session that clashes with a time-off override.
 * Does NOT set charged_free — moving is not cancelling. The session stays
 * live so it already carries no revenue penalty (the never-costs-the-client
 * guarantee holds because no cancellation occurred). Writing charged_free
 * here would poison a future cancellation review: deriveSessionPot only
 * reads that flag when status='cancelled', but it persists, so a moved
 * session later cancelled at short notice would silently appear free and
 * never hit the unreviewed list.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, newScheduledAt } = (await request.json()) as {
    sessionId: string;
    newScheduledAt: string;
  };

  if (!sessionId || !newScheduledAt) {
    return NextResponse.json(
      { error: "sessionId and newScheduledAt are required" },
      { status: 400 },
    );
  }

  // Fetch the session — only reschedulable sessions with a current booking
  const { data: session, error: fetchErr } = await supabase
    .from("sessions")
    .select("id, scheduled_at, status, cancelled_at")
    .eq("id", sessionId)
    .single();

  if (fetchErr || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!session.scheduled_at) {
    return NextResponse.json(
      { error: "This session has no booking to move" },
      { status: 400 },
    );
  }

  if (session.status === "completed") {
    return NextResponse.json(
      { error: "Cannot move a completed session" },
      { status: 400 },
    );
  }

  // Move the session only. Keep status as-is if already scheduled;
  // set to scheduled if currently planned.
  const { data, error } = await supabase
    .from("sessions")
    .update({
      scheduled_at: newScheduledAt,
      status: session.status === "planned" ? "scheduled" : session.status,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Failed to reschedule: ${error.message}` },
      { status: 500 },
    );
  }

  // Sync to Outlook calendar (best-effort, same pattern as PATCH /api/sessions/[id])
  try {
    await syncSessionCalendarEvent(sessionId);
  } catch (err) {
    console.error("Calendar sync failed after move (cron will retry):", err);
  }

  return NextResponse.json({ ok: true, session: data });
}
