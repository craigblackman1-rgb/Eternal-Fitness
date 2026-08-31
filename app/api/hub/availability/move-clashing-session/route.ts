import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { syncSessionCalendarEvent } from "@/lib/calendar-sync";

/**
 * CR-EF-097 — POST /api/hub/availability/move-clashing-session
 *
 * Reschedules a session that clashes with a time-off override.
 * Sets charged_free = 'free' so the move never costs the client a session
 * from their block (governing rule: a cancellation Esther makes must never
 * strand a booking or penalise the client).
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

  // Move the session + flag as free (Esther-initiated reschedule, never penalises client)
  const { data, error } = await supabase
    .from("sessions")
    .update({
      scheduled_at: newScheduledAt,
      charged_free: "free",
      // Keep status as-is if already scheduled; set to scheduled if currently planned
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
