import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { ensureUids } from "@/lib/exercise-ref";
import { applyCopiedWorkoutIdentity, isPlaceholderLabel } from "@/lib/session-naming";
import { syncSessionCalendarEvent } from "@/lib/calendar-sync";
import { deleteEvent } from "@/lib/graph-client";
import { getSessionStatus } from "@/lib/session-transitions";
import { londonDayKey } from "@/lib/schedule-dates";

// Fields a staff PATCH is allowed to update on a session. `data` carries the
// prescription + session_log (existing behaviour, from an earlier lane). The
// three scheduling fields are Lane D1 additions. Anything else in the body is
// ignored so this route can't be used to touch columns it shouldn't.
const ALLOWED_FIELDS = ["data", "scheduled_at", "cancelled_at", "cancel_reason", "charged_free", "lapse_flagged_at", "parent_session_id"] as const;

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
  //
  // CR-EF-123 exception: correcting the session_log timestamp (completed_at) on a
  // completed session does NOT risk orphaning logged sets or overwriting RPE/notes —
  // it only changes when the session was logged, not what was logged. We allow
  // session_log-only diffs through by comparing the incoming data against the
  // existing row; any change to versions (prescription/exercise content) is still
  // blocked.
  if (Object.prototype.hasOwnProperty.call(update, "data")) {
    const status = await getSessionStatus(params.id);
    if (status === "completed") {
      const { data: currentRow } = await supabase
        .from("sessions")
        .select("data")
        .eq("id", params.id)
        .maybeSingle();
      const currentData = (currentRow?.data ?? {}) as Record<string, unknown>;
      const incomingData = update.data as Record<string, unknown>;
      const prescriptionChanged = Object.keys(incomingData).some(
        (key) => key !== "session_log" && JSON.stringify(incomingData[key]) !== JSON.stringify(currentData[key]),
      );
      if (prescriptionChanged) {
        return NextResponse.json(
          { error: "This session is completed and read-only. Reopen it before editing the prescription." },
          { status: 403 },
        );
      }
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

  // CR-EF-037 off-day modes:
  //   off_day_mode = "today" → move scheduled_at to today, complete now (nothing flagged)
  //   off_day_mode = "booked" → keep scheduled_at, back-date completed_at (off-day flag)
  // Future bookings MUST NOT accept "booked" mode — that is the exact path
  // that produced 'Completed on a date it was never delivered'.
  const offDayMode = body.off_day_mode as "today" | "booked" | undefined;

  if (cancellingNow) {
    update.status = "cancelled";
  } else if (completingNow) {
    // Fetch current session state for the guard
    const { data: sessionRow } = await supabase
      .from("sessions")
      .select("scheduled_at, status")
      .eq("id", params.id)
      .maybeSingle();
    const scheduledDate = sessionRow?.scheduled_at as string | null;
    const completedDate = incomingData!.session_log!.completed_at!;
    const todayKey = londonDayKey(new Date().toISOString());
    const scheduledDayKey = scheduledDate ? londonDayKey(scheduledDate) : null;
    const completedDayKey = londonDayKey(completedDate);

    if (!body.confirm_off_day && scheduledDayKey && scheduledDayKey !== completedDayKey) {
      // Off-day detected without confirmation — block the write
      return NextResponse.json(
        {
          error: `This session is booked for ${new Date(scheduledDate!).toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" })}, not today.`,
          code: "off_day_completion",
          scheduledAt: scheduledDate,
        },
        { status: 409 },
      );
    }

    if (body.confirm_off_day && offDayMode) {
      if (offDayMode === "today") {
        // Move the booking to today — keep the time, change the day
        const scheduledTime = scheduledDate ? new Date(scheduledDate) : new Date();
        const now = new Date();
        const movedScheduled = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          scheduledTime.getHours(),
          scheduledTime.getMinutes(),
        ).toISOString();
        update.scheduled_at = movedScheduled;
      }
      // offDayMode = "booked": keep scheduled_at as-is, just back-date completed_at
      // Server-side guard: reject "booked" for future bookings
      if (offDayMode === "booked" && scheduledDayKey && scheduledDayKey > todayKey) {
        return NextResponse.json(
          {
            error: `Cannot back-date completion — ${new Date(scheduledDate!).toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" })} is in the future. A session cannot be completed against a date it has not reached.`,
            code: "future_backdate_rejected",
          },
          { status: 409 },
        );
      }
    }

    update.completed_at = completedDate;
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

    // BUG-EF-114 — when exercise content (versions) is written into an
    // Outlook-placeholder session, replace its placeholder name and archetype
    // with the source workout's identity. The client sends source_focus_label
    // and source_archetype alongside the versions payload; the archetype is
    // written as a top-level column on the sessions row.
    if (data.versions) {
      const { data: currentSession } = await supabase
        .from("sessions")
        .select("data")
        .eq("id", params.id)
        .maybeSingle();
      const currentData = (currentSession?.data ?? {}) as Record<string, unknown>;
      const wasPlaceholder = isPlaceholderLabel(currentData.focus_label as string | null | undefined);
      const archetype = applyCopiedWorkoutIdentity(currentData, {
        focus_label: (body.source_focus_label ?? body.data?.focus_label) as string | null | undefined,
        archetype: (body.source_archetype ?? body.archetype ?? body.data?.archetype) as string | null | undefined,
      });
      if (wasPlaceholder) {
        update.data = { ...(update.data as Record<string, unknown>), focus_label: currentData.focus_label };
      }
      if (archetype !== null) {
        update.archetype = archetype;
      }
    }
  }

  // CR-EF-101 — slot inheritance: sub-sessions follow their parent's scheduled_at.
  // If someone tries to independently reschedule a sub-session, override with
  // the parent's scheduled_at instead (or null if the parent has no slot).
  // The guard triggers on ANY scheduled_at change (including null) so a
  // sub-session can never escape its parent's slot.
  if ("scheduled_at" in update && !cancellingNow) {
    const { data: sessionCheck } = await supabase
      .from("sessions")
      .select("parent_session_id")
      .eq("id", params.id)
      .single();

    if (sessionCheck?.parent_session_id) {
      const { data: parentRow } = await supabase
        .from("sessions")
        .select("scheduled_at")
        .eq("id", sessionCheck.parent_session_id)
        .single();

      update.scheduled_at = parentRow?.scheduled_at ?? null;
    }
  }

  const { data, error } = await supabase.from("sessions").update(update).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // CR-EF-101 — cascade cancellation to sub-sessions
  if (cancellingNow) {
    const cascadeUpdate: Record<string, unknown> = {
      cancelled_at: update.cancelled_at,
      cancel_reason: update.cancel_reason,
      status: "cancelled",
    };
    if ("charged_free" in update) {
      cascadeUpdate.charged_free = update.charged_free;
    }
    await supabase
      .from("sessions")
      .update(cascadeUpdate)
      .eq("parent_session_id", params.id);
  }

  // CR-EF-101 — cascade reschedule to sub-sessions (children follow parent)
  if ("scheduled_at" in update && update.scheduled_at && !cancellingNow) {
    // Only cascade if this is a parent (not a sub-session itself)
    const { data: checkSession } = await supabase
      .from("sessions")
      .select("parent_session_id")
      .eq("id", params.id)
      .single();

    if (!checkSession?.parent_session_id) {
      await supabase
        .from("sessions")
        .update({ scheduled_at: update.scheduled_at })
        .eq("parent_session_id", params.id);
    }
  }

  // CR-EF-144 — push-along: when a session is cancelled or moved, shift every
  // later planned session in the block forward by one session duration so the
  // cancelled/moved slot is effectively closed. Only shifts non-settled sessions
  // (completed and cancelled sessions stay put). Sub-sessions follow their parent.
  const pushAlong = body.push_along === true;
  if (pushAlong && (cancellingNow || "scheduled_at" in update)) {
    try {
      // The reference time is the slot being vacated: old scheduled_at for
      // cancellations, new scheduled_at for moves.
      const refTime = cancellingNow
        ? (data.scheduled_at as string | null)
        : (update.scheduled_at as string | null);

      if (refTime && data.block_id) {
        // Fetch client session duration (default 60 min)
        const { data: sessRow } = await supabase
          .from("sessions")
          .select("client_id")
          .eq("id", params.id)
          .maybeSingle();
        const { data: client } = sessRow
          ? await supabase.from("clients").select("session_duration").eq("id", sessRow.client_id).maybeSingle()
          : { data: null };
        const durationMs = ((client?.session_duration as number) ?? 60) * 60 * 1000;
        const refMs = new Date(refTime).getTime();

        // Fetch all sessions in the same block
        const { data: blockSessions } = await supabase
          .from("sessions")
          .select("id, scheduled_at, status, cancelled_at, completed_at, parent_session_id")
          .eq("block_id", data.block_id);

        if (blockSessions && blockSessions.length > 0) {
          // Identify later planned sessions (not sub-sessions — they follow parent)
          const laterSessions = blockSessions.filter((s) => {
            if (s.id === params.id) return false;
            if (s.parent_session_id) return false; // sub-sessions follow parent
            if (!s.scheduled_at) return false;
            const sMs = new Date(s.scheduled_at).getTime();
            if (sMs <= refMs) return false;
            // Use deriveSessionStatus-style precedence inline
            const isSettled =
              s.status === "completed" ||
              s.status === "cancelled" ||
              !!s.completed_at ||
              !!s.cancelled_at;
            return !isSettled;
          });

          // Shift each later session forward by durationMs
          for (const s of laterSessions) {
            const newTime = new Date(new Date(s.scheduled_at!).getTime() + durationMs).toISOString();
            await supabase
              .from("sessions")
              .update({ scheduled_at: newTime })
              .eq("id", s.id);
            // Cascade to sub-sessions
            await supabase
              .from("sessions")
              .update({ scheduled_at: newTime })
              .eq("parent_session_id", s.id);
          }
        }
      }
    } catch (err) {
      console.error("Push-along failed (sessions may be inconsistently spaced):", err);
      // Non-fatal: the main update already succeeded
    }
  }

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
