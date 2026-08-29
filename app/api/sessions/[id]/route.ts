import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { ensureUids } from "@/lib/exercise-ref";
import { syncSessionCalendarEvent } from "@/lib/calendar-sync";
import { deleteEvent } from "@/lib/graph-client";
import { getSessionStatus } from "@/lib/session-transitions";
import { londonDayKey } from "@/lib/schedule-dates";

// Fields a staff PATCH is allowed to update on a session. `data` carries the
// prescription + session_log (existing behaviour, from an earlier lane). The
// three scheduling fields are Lane D1 additions. Anything else in the body is
// ignored so this route can't be used to touch columns it shouldn't.
const ALLOWED_FIELDS = ["data", "scheduled_at", "cancelled_at", "cancel_reason"] as const;

// Single-session read (CR-EF-079 L5 — the mobile "add workout from this
// client's block" preview needs one session's full data by id; nothing else
// in the codebase exposed this by UUID before).
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("sessions").select("*").eq("id", params.id).single();
  if (error || !data) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const update: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      update[field] = body[field];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  // CR-EF-031 — a completed session's prescription (`data`) is locked. Editing it
  // silently orphans the logged sets (assessment §1.5) and re-pressing Complete
  // overwrites the recorded RPE/fatigue/notes. The only escape hatch is the
  // dedicated reopen endpoint (POST /api/sessions/[id]/reopen), so no `data` PATCH
  // against a completed session is ever the reopen transition. Scheduling fields
  // (scheduled_at/cancelled_at/cancel_reason) stay allowed — cancelling a completed
  // booking still takes precedence, matching the migration's backfill rule.
  if (Object.prototype.hasOwnProperty.call(update, "data")) {
    const status = await getSessionStatus(params.id);
    if (status === "completed") {
      return NextResponse.json(
        { error: "This session is completed and read-only. Reopen it before editing the prescription or session log." },
        { status: 403 },
      );
    }
  }

  // CR-EF-037 Phase 2 — keep the first-class status/completed_at columns
  // (added by 20260818_session_status_model.sql) in sync with whatever this
  // PATCH is doing, since the migration shipped without the "transition API"
  // its own comments call for: nothing has written these columns since, so
  // every session completed after 2026-08-18 was silently drifting back into
  // the exact four-surfaces-disagree bug CR-EF-037 exists to kill. This is
  // the single place both TrainScreen.tsx and SessionWorkoutLog.tsx's
  // handleComplete already PATCH through — no frontend change needed.
  // Precedence matches the migration's backfill: cancelled beats completed.
  const incomingData = update.data as { session_log?: { completed_at?: string | null } } | undefined;
  const completingNow = typeof incomingData?.session_log?.completed_at === "string";
  const cancellingNow = "cancelled_at" in update && update.cancelled_at != null;
  if (cancellingNow) {
    update.status = "cancelled";
  } else if (completingNow) {
    // EF-100 — off-day completion guard. If the trainer completes a session
    // whose booked date is a different day than the incoming completed_at,
    // block the write unless the client explicitly confirmed the off-day
    // completion (confirm_off_day: true). This prevents the bug where
    // completing a session "sticks" to next week's session row because the
    // trainer was looking at the wrong day.
    if (!body.confirm_off_day) {
      const { data: sessionRow } = await supabase
        .from("sessions")
        .select("scheduled_at")
        .eq("id", params.id)
        .maybeSingle();
      const scheduledDate = sessionRow?.scheduled_at as string | null;
      const completedDate = incomingData!.session_log!.completed_at!;
      if (scheduledDate && londonDayKey(scheduledDate) !== londonDayKey(completedDate)) {
        return NextResponse.json(
          {
            error: `This session is booked for ${new Date(scheduledDate).toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" })}, not today.`,
            code: "off_day_completion",
            scheduledAt: scheduledDate,
          },
          { status: 409 },
        );
      }
    }
    update.completed_at = incomingData!.session_log!.completed_at;
    update.status = "completed";
  }

  const sectionKeys = ["warm_up", "main_block", "cooldown"] as const;

  if (update.data && typeof update.data === "object" && !Array.isArray(update.data)) {
    const data = update.data as Record<string, unknown>;
    if (data.versions && typeof data.versions === "object" && !Array.isArray(data.versions)) {
      const versions = data.versions as Record<string, unknown>;
      for (const v of Object.keys(versions)) {
        const version = versions[v];
        if (version && typeof version === "object" && !Array.isArray(version)) {
          const ver = version as Record<string, unknown>;
          for (const sk of sectionKeys) {
            if (Array.isArray(ver[sk])) {
              ver[sk] = ensureUids(ver[sk] as { uid?: string }[]);
            }
          }
        }
      }
    }
  }

  const { data, error } = await supabase.from("sessions").update(update).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Push the change to the Outlook calendar immediately; the 15-minute cron
  // repairs any miss, so a sync failure must never fail the PATCH itself.
  if ("scheduled_at" in update || "cancelled_at" in update) {
    try {
      await syncSessionCalendarEvent(params.id);
    } catch (err) {
      console.error("On-demand calendar sync failed (cron will retry):", err);
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Clean up any Outlook event before dropping the mapping row (cascades on
  // session delete) so a cancelled session doesn't leave an orphaned event.
  const { data: mapRow } = await supabase
    .from("session_calendar_events")
    .select("event_id")
    .eq("session_id", params.id)
    .maybeSingle();

  if (mapRow?.event_id) {
    try {
      await deleteEvent(mapRow.event_id as string);
    } catch (err) {
      console.error("Calendar event delete failed (session will still be removed):", err);
    }
  }

  const { error } = await supabase.from("sessions").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
