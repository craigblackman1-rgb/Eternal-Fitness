import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { generatePatternDates, type Weekday } from "@/lib/scheduling";

const VALID_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

/**
 * CR-EF-037 Phase 3 — schedule a whole block from a start date + weekday
 * pattern, in `session_number` (plan) order. This is the block-page scheduling
 * surface (`hub-block-module.html`'s "Schedule this block" panel); the same
 * pattern logic also drives the review page's BlockScheduler, but that path
 * never set `blocks.scheduled_start` — this one does, so the block finally has
 * a date anchor (assessment §1.2 flagged it NULL on all 18 blocks).
 *
 * Sessions whose status is already settled (`completed`, `cancelled`,
 * `in_progress`) are left untouched; only `planned`/`scheduled` sessions move,
 * and each is flipped to `scheduled` so the status column stops lagging the
 * date (the PATCH /api/sessions/[id] route only syncs status on complete/cancel,
 * not on schedule — this closes that gap for the bulk-schedule path).
 *
 * Calendar sync is left to the 15-minute cron (same contract as the session
 * PATCH route's on-demand sync — a missed graph call repairs itself).
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { startDate, weekdays, time } = body as {
    startDate?: string;
    weekdays?: Weekday[];
    time?: string;
  };

  if (!startDate || typeof startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return NextResponse.json({ error: "startDate (YYYY-MM-DD) is required" }, { status: 400 });
  }
  if (!Array.isArray(weekdays) || weekdays.length === 0 || weekdays.some((d) => !VALID_WEEKDAYS.includes(d))) {
    return NextResponse.json({ error: "weekdays must be a non-empty array of day indices 0-6" }, { status: 400 });
  }
  const resolvedTime = typeof time === "string" && /^\d{2}:\d{2}$/.test(time) ? time : "10:00";

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("block_id", params.id)
    .order("session_number", { ascending: true });
  if (sessionsError || !sessions || sessions.length === 0) {
    return NextResponse.json({ error: "Block not found or has no sessions" }, { status: 404 });
  }

  const movers = (sessions as { id: string; status: string }[]).filter(
    (s) => s.status === "planned" || s.status === "scheduled",
  );
  const dates = generatePatternDates({ weekdays, time: resolvedTime, startDate }, movers.length);
  if (dates.length < movers.length) {
    return NextResponse.json({ error: "Could not generate enough dates for this pattern" }, { status: 400 });
  }

  if (movers.length > 0) {
    const { error: blockError } = await supabase
      .from("blocks")
      .update({ scheduled_start: dates[0].toISOString() })
      .eq("id", params.id);
    if (blockError) return NextResponse.json({ error: blockError.message }, { status: 500 });

    for (let i = 0; i < movers.length; i++) {
      const { error } = await supabase
        .from("sessions")
        .update({ scheduled_at: dates[i].toISOString(), status: "scheduled" })
        .eq("id", movers[i].id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    scheduled_start: movers.length > 0 ? dates[0].toISOString() : null,
    scheduled: movers.length,
  });
}
