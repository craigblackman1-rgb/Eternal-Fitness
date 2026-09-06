import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/* ── GET /api/clients/[id]/pot-ledger ──────────────────────────────────
 * Derives the full pot ledger from sessions rows + block_expiry_extensions.
 * No new tables — everything is computed from existing data.
 *
 * Returns:
 *   consumption: { completed, cancelled_free, cancelled_charged, rescheduled, no_show, remaining, purchased }
 *   ledger: [{ date, event, delta, remaining, tags }]
 */

interface LedgerEntry {
  date: string;
  event: string;
  delta: number | null;
  remaining: number;
  tags: string[];
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch client
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, sessions_purchased, sessions_remaining, block_expiry_date, block_expiry_extensions")
    .eq("client_number", parseInt(params.id))
    .single();
  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Fetch all sessions for this client — sessions link via blocks, not client_id
  const { data: blocks, error: blocksError } = await supabase
    .from("blocks")
    .select("id")
    .eq("client_id", client.id);
  if (blocksError) {
    return NextResponse.json({ error: blocksError.message }, { status: 500 });
  }
  const blockIds = (blocks ?? []).map((b: { id: string }) => b.id);

  let sessions: {
    id: string;
    status: string | null;
    cancelled_at: string | null;
    charged_free: string | null;
    scheduled_at: string | null;
    completed_at: string | null;
    block_id: string;
    session_number: number | null;
  }[] = [];
  if (blockIds.length > 0) {
    const { data: sessionRows, error: sessionsError } = await supabase
      .from("sessions")
      .select("id, status, cancelled_at, charged_free, scheduled_at, completed_at, block_id, session_number")
      .in("block_id", blockIds)
      .order("scheduled_at", { ascending: true });
    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }
    sessions = (sessionRows ?? []) as typeof sessions;
  }

  const purchased = client.sessions_purchased ?? 0;
  const remaining = client.sessions_remaining ?? 0;
  const extensions = (client.block_expiry_extensions ?? []) as { from: string; to: string; at: string; reason?: string }[];

  // Count session categories
  let completed = 0;
  let cancelledFree = 0;
  let cancelledCharged = 0;
  let rescheduled = 0;
  let noShow = 0;

  for (const s of sessions ?? []) {
    if (s.status === "completed") {
      completed++;
    } else if (s.status === "cancelled") {
      if (s.charged_free === "free") {
        cancelledFree++;
      } else {
        cancelledCharged++;
      }
      // Check if it was rescheduled (has a parent or was moved)
      if (s.scheduled_at && s.cancelled_at && new Date(s.scheduled_at) > new Date(s.cancelled_at)) {
        rescheduled++;
      }
    } else if (s.status === "scheduled" && s.scheduled_at) {
      // Check for no-show: scheduled, past, not completed, not cancelled
      const scheduledDate = new Date(s.scheduled_at);
      if (scheduledDate < new Date() && !s.completed_at) {
        noShow++;
      }
    }
  }

  // Build chronological ledger
  const ledger: LedgerEntry[] = [];
  let runningRemaining = purchased;

  // Package start event (earliest session)
  const firstSession = (sessions ?? [])[0];
  if (firstSession?.scheduled_at) {
    ledger.push({
      date: firstSession.scheduled_at,
      event: `Package started — ${purchased} sessions`,
      delta: purchased,
      remaining: purchased,
      tags: [],
    });
    runningRemaining = purchased;
  }

  // Extension events
  for (const ext of extensions) {
    const daysDiff = Math.round((new Date(ext.to).getTime() - new Date(ext.from).getTime()) / 86_400_000);
    ledger.push({
      date: ext.at,
      event: `Expiry extended ${ext.from} → ${ext.to}${ext.reason ? ` (${ext.reason})` : ""}`,
      delta: null,
      remaining: runningRemaining,
      tags: [],
    });
  }

  // Session events (completed, cancelled, no-show)
  for (const s of sessions ?? []) {
    if (s.status === "completed" && s.completed_at) {
      runningRemaining = Math.max(0, runningRemaining - 1);
      ledger.push({
        date: s.completed_at,
        event: "Session completed",
        delta: -1,
        remaining: runningRemaining,
        tags: [],
      });
    } else if (s.status === "cancelled" && s.cancelled_at) {
      const isFree = s.charged_free === "free";
      const label = isFree ? "Free cancellation" : "Cancelled (charged)";
      const tags = isFree ? ["Free"] : [];
      if (isFree) {
        // Free cancellation — doesn't touch the pot
        ledger.push({
          date: s.cancelled_at,
          event: `Session cancelled${s.cancelled_at ? "" : ""}`,
          delta: null,
          remaining: runningRemaining,
          tags,
        });
      } else {
        // Charged cancellation — touches the pot
        runningRemaining = Math.max(0, runningRemaining - 1);
        ledger.push({
          date: s.cancelled_at,
          event: "Session cancelled (charged)",
          delta: -1,
          remaining: runningRemaining,
          tags: [],
        });
      }
    }
  }

  // Package expiry event
  if (client.block_expiry_date) {
    ledger.push({
      date: client.block_expiry_date,
      event: "Package expired",
      delta: null,
      remaining: runningRemaining,
      tags: [],
    });
  }

  // Sort ledger by date descending (newest first)
  ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const consumption = {
    completed,
    cancelled_free: cancelledFree,
    cancelled_charged: cancelledCharged,
    rescheduled,
    no_show: noShow,
    remaining,
    purchased,
  };

  return NextResponse.json({ consumption, ledger });
}
