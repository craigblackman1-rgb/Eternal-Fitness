import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import { syncSessionCalendarEvent } from "@/lib/calendar-sync";

/**
 * POST /api/clients/[id]/shift-schedule
 *
 * Bulk-push a client's future non-cancelled sessions forward.
 *
 * Body:
 *   from_date  — "YYYY-MM-DD": sessions on or after this date are affected
 *   mode       — "next_slot" | "shift_n"
 *   n          — number of pattern slots to shift (shift_n mode only, default 2)
 *   preview    — true = return before→after pairs without applying; false = apply
 *   session_ids — optional subset of session IDs to include (otherwise all eligible)
 *
 * Auth: hub session required (same pattern as invoices route).
 *
 * Calendar sync: each moved session goes through syncSessionCalendarEvent()
 * which queues pending actions when confirm_before_sync is enabled, or pushes
 * directly otherwise. The 15-minute cron catches anything the on-demand call misses.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authClient = createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = params.id;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fromDate = body.from_date as string;
  const mode = body.mode as "next_slot" | "shift_n";
  const n = (body.n as number) || 2;
  const isPreview = body.preview === true;
  const sessionFilter = Array.isArray(body.session_ids)
    ? (body.session_ids as string[])
    : null;

  if (!fromDate || !mode) {
    return NextResponse.json(
      { error: "from_date and mode are required" },
      { status: 400 }
    );
  }
  if (mode !== "next_slot" && mode !== "shift_n") {
    return NextResponse.json(
      { error: "mode must be 'next_slot' or 'shift_n'" },
      { status: 400 }
    );
  }

  // ── 1. Fetch client's future non-cancelled sessions from from_date ──
  let query = supabase
    .from("sessions")
    .select("id, scheduled_at, cancelled_at, completed_at, program_id, program_slot_id, parent_session_id, block_id, data")
    .eq("client_id", clientId)
    .is("cancelled_at", null)
    .is("completed_at", null)
    .gte("scheduled_at", fromDate)
    .order("scheduled_at", { ascending: true });

  if (sessionFilter) {
    query = query.in("id", sessionFilter);
  }

  const { data: sessions, error: fetchErr } = await query;
  if (fetchErr) {
    console.error("shift-schedule fetch error:", fetchErr);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ preview: [] });
  }

  // ── 2. Derive the weekly pattern from all client sessions ──
  //    We need the full set of scheduled sessions (including past) to detect the pattern.
  const { data: allClientSessions } = await supabase
    .from("sessions")
    .select("id, scheduled_at, cancelled_at, completed_at, parent_session_id")
    .eq("client_id", clientId)
    .not("scheduled_at", "is", null)
    .order("scheduled_at", { ascending: true });

  // Build weekday+time pattern from settled sessions
  const weekdayTimeCounts = new Map<string, number>();
  const settleSessions = (allClientSessions ?? []).filter(
    (s) => !s.parent_session_id && s.scheduled_at
  );
  for (const s of settleSessions) {
    const d = new Date(s.scheduled_at!);
    const key = `${d.getDay()}-${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    weekdayTimeCounts.set(key, (weekdayTimeCounts.get(key) ?? 0) + 1);
  }

  // Sort by frequency, take the top slots
  const pattern = Array.from(weekdayTimeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7) // at most one per day of week
    .map((entry) => {
      const [dayStr, timeStr] = entry[0].split("-");
      return { dayOfWeek: parseInt(dayStr), time: timeStr };
    })
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  if (pattern.length === 0) {
    return NextResponse.json(
      { error: "Could not detect a weekly pattern from this client's sessions" },
      { status: 400 }
    );
  }

  // ── 3. Compute new dates for each session ──
  function nextOccurrence(from: Date, dayOfWeek: number, time: string): Date {
    const [h, m] = time.split(":").map(Number);
    const result = new Date(from);
    // Find the next occurrence of this weekday
    let daysAhead = (dayOfWeek - result.getDay() + 7) % 7;
    if (daysAhead === 0) {
      // Same day — check if the time is still ahead
      if (result.getHours() > h || (result.getHours() === h && result.getMinutes() >= m)) {
        daysAhead = 7;
      }
    }
    result.setDate(result.getDate() + daysAhead);
    result.setHours(h, m, 0, 0);
    return result;
  }

  function shiftByNOccurrences(
    fromDate: Date,
    dayOfWeek: number,
    time: string,
    shiftN: number
  ): Date {
    const [h, m] = time.split(":").map(Number);
    const result = new Date(fromDate);
    // Find the first occurrence after fromDate
    let daysAhead = (dayOfWeek - result.getDay() + 7) % 7;
    if (daysAhead === 0 && (result.getHours() > h || (result.getHours() === h && result.getMinutes() >= m))) {
      daysAhead = 7;
    }
    result.setDate(result.getDate() + daysAhead + (shiftN - 1) * 7);
    result.setHours(h, m, 0, 0);
    return result;
  }

  function findPatternSlotForDate(targetDate: Date): { dayOfWeek: number; time: string } | null {
    const targetDay = targetDate.getDay();
    const targetTime = `${String(targetDate.getHours()).padStart(2, "0")}:${String(targetDate.getMinutes()).padStart(2, "0")}`;
    // Find the closest matching pattern slot
    for (const p of pattern) {
      if (p.dayOfWeek === targetDay) return p;
    }
    // If no exact day match, find the next slot after this day
    for (const p of pattern) {
      if (p.dayOfWeek > targetDay) return p;
    }
    // Wrap to start of week
    return pattern[0] ?? null;
  }

  const preview: Array<{
    session_id: string;
    was: string;
    now: string;
    workoutName: string;
    missed: boolean;
    cancel_reason: string | null;
  }> = [];

  for (const session of sessions) {
    const wasDate = new Date(session.scheduled_at!);
    let newDate: Date;

    if (mode === "next_slot") {
      // Walk forward to the next regular slot after the session's current position
      const slot = findPatternSlotForDate(wasDate);
      if (slot) {
        // Find the next occurrence of this pattern slot that's after all kept sessions
        const lastKeptDate = preview.length > 0
          ? new Date(preview[preview.length - 1].now)
          : new Date(fromDate);
        newDate = nextOccurrence(
          new Date(Math.max(lastKeptDate.getTime(), wasDate.getTime())),
          slot.dayOfWeek,
          slot.time
        );
      } else {
        // Fallback: push forward by one week
        newDate = new Date(wasDate);
        newDate.setDate(newDate.getDate() + 7);
      }
    } else {
      // shift_n: push forward by N occurrences of the pattern
      const slot = findPatternSlotForDate(wasDate);
      if (slot) {
        newDate = shiftByNOccurrences(wasDate, slot.dayOfWeek, slot.time, n);
      } else {
        newDate = new Date(wasDate);
        newDate.setDate(newDate.getDate() + n * 7);
      }
    }

    // Get workout name from data
    const data = session.data as Record<string, unknown> | null;
    const versions = data?.versions as Record<string, { focus_label?: string }> | undefined;
    const version = versions?.studio ?? versions?.home;
    const workoutName = (version?.focus_label as string) ?? (data as any)?.focus_label ?? "Workout";

    preview.push({
      session_id: session.id,
      was: session.scheduled_at!,
      now: newDate.toISOString(),
      workoutName,
      missed: false,
      cancel_reason: null,
    });
  }

  if (isPreview) {
    return NextResponse.json({ preview });
  }

  // ── 4. Apply changes ──
  const patchResults: Array<{ id: string; error?: string }> = [];

  for (const row of preview) {
    const { error: patchErr } = await supabase
      .from("sessions")
      .update({ scheduled_at: row.now })
      .eq("id", row.session_id);

    if (patchErr) {
      patchResults.push({ id: row.session_id, error: patchErr.message });
      continue;
    }

    // Trigger calendar sync for each moved session (same as sessions PATCH route).
    // Queues pending actions when confirm_before_sync is enabled; the 15-minute
    // cron catches anything the on-demand call misses.
    try {
      await syncSessionCalendarEvent(row.session_id);
    } catch (err) {
      console.error(`Calendar sync failed for session ${row.session_id}:`, err);
      // Non-fatal: cron will retry
    }
  }

  if (patchResults.length > 0) {
    console.error("shift-schedule partial failures:", patchResults);
    return NextResponse.json(
      {
        error: `${patchResults.length} of ${preview.length} sessions failed to update`,
        failures: patchResults,
      },
      { status: 207 }
    );
  }

  return NextResponse.json({ preview, applied: true });
}
