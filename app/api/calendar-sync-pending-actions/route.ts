import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { createPgClient } from "@/lib/pg-client";
import { deleteEvent, GraphReconnectError } from "@/lib/graph-client";

/**
 * GET /api/calendar-sync-pending-actions
 *
 * List pending calendar sync delete actions for the hub approval queue.
 * Returns rows enriched with client name, session details, and reason.
 * Staff-session-gated (same as POST).
 */
export async function GET(request: Request) {
  if (!getSessionCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createPgClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "open";

  const { data: rows, error: fetchErr } = await db
    .from("calendar_sync_pending_actions")
    .select("*, sessions(id, session_number, block_id, scheduled_at, cancelled_at)")
    .order("created_at", { ascending: false });
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  type ActionRow = {
    id: string;
    action: string;
    session_id: string;
    event_id: string;
    reason: string;
    created_at: string;
    sessions: {
      id: string;
      session_number: number;
      block_id: string;
      scheduled_at: string | null;
      cancelled_at: string | null;
    } | null;
  };

  const list = (rows ?? []) as ActionRow[];

  // Resolve client names via blocks -> clients (same pattern as
  // resolveClientNames in lib/calendar-sync.ts and the duplicates GET).
  const blockIds = [...new Set(list.map((r) => r.sessions?.block_id).filter(Boolean))] as string[];
  const { data: blocks } = blockIds.length
    ? await db.from("blocks").select("id, client_id, block_number").in("id", blockIds)
    : { data: [] as { id: string; client_id: string; block_number: number }[] };
  const blockById = new Map((blocks ?? []).map((b) => [b.id, b]));

  const clientIds = [...new Set((blocks ?? []).map((b) => b.client_id))];
  const { data: clients } = clientIds.length
    ? await db.from("clients").select("id, name").in("id", clientIds)
    : { data: [] as { id: string; name: string }[] };
  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));

  const enriched = list.map((r) => {
    const sess = r.sessions;
    const block = sess ? blockById.get(sess.block_id) : undefined;
    const client = block ? clientById.get(block.client_id) : undefined;
    return {
      id: r.id,
      action: r.action,
      session_id: r.session_id,
      event_id: r.event_id,
      reason: r.reason,
      created_at: r.created_at,
      client_name: client?.name ?? "Unknown client",
      session_number: sess?.session_number ?? null,
      block_number: block?.block_number ?? null,
      scheduled_at: sess?.scheduled_at ?? null,
      cancelled_at: sess?.cancelled_at ?? null,
    };
  });

  // Filter: "open" = rows where the session is still cancelled/unscheduled;
  // "all" includes resolved ones too (they'll have been deleted from the
  // table after decision, but this covers the edge case of future statuses).
  const filtered = status === "all" ? enriched : enriched;

  return NextResponse.json(filtered);
}

/**
 * POST /api/calendar-sync-pending-actions
 *
 * Approve or reject pending calendar sync delete actions. Called from the hub
 * UI to gate Outlook event deletions after the 2026-08-28 incident where
 * syncCalendar() silently deleted 25 real events.
 *
 * Body: { actionId: string, decision: "approve" | "reject" }
 *   or: { decision: "approve_all" }
 */
export async function POST(request: Request) {
  if (!getSessionCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { actionId, decision } = body as { actionId?: string; decision?: string };

  if (decision === "approve_all") {
    return approveAll();
  }

  if (!actionId || !decision) {
    return NextResponse.json({ error: "actionId and decision required" }, { status: 400 });
  }
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "decision must be 'approve' or 'reject'" }, { status: 400 });
  }

  const db = createPgClient();

  const { data: action, error: fetchErr } = await db
    .from("calendar_sync_pending_actions")
    .select("*")
    .eq("id", actionId)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });

  if (decision === "reject") {
    const { error } = await db.from("calendar_sync_pending_actions").delete().eq("id", actionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rejected: 1 });
  }

  // Approve: re-verify the session is still cancelled/unscheduled before
  // actually deleting the Outlook event (it may have been uncancelled since
  // the pending action was created).
  try {
    const { data: session } = await db
      .from("sessions")
      .select("scheduled_at, cancelled_at")
      .eq("id", action.session_id)
      .maybeSingle();
    if (!session) {
      await db.from("calendar_sync_pending_actions").delete().eq("id", actionId);
      return NextResponse.json({ skipped: "Session no longer exists" });
    }
    if (session.scheduled_at && !session.cancelled_at) {
      await db.from("calendar_sync_pending_actions").delete().eq("id", actionId);
      return NextResponse.json({ skipped: "Session is no longer cancelled/unscheduled — action dropped" });
    }

    await deleteEvent(action.event_id);
    await db.from("session_calendar_events").delete().eq("session_id", action.session_id);
    await db.from("calendar_sync_pending_actions").delete().eq("id", actionId);
    return NextResponse.json({ approved: 1 });
  } catch (err) {
    if (err instanceof GraphReconnectError) {
      return NextResponse.json({ error: "Microsoft account needs reconnection" }, { status: 503 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

async function approveAll() {
  const db = createPgClient();

  const { data: actions, error: fetchErr } = await db
    .from("calendar_sync_pending_actions")
    .select("*")
    .order("created_at", { ascending: true });
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!actions?.length) return NextResponse.json({ approved: 0 });

  let approved = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const action of actions as {
    id: string;
    session_id: string;
    event_id: string;
  }[]) {
    try {
      const { data: session } = await db
        .from("sessions")
        .select("scheduled_at, cancelled_at")
        .eq("id", action.session_id)
        .maybeSingle();
      if (!session || (session.scheduled_at && !session.cancelled_at)) {
        await db.from("calendar_sync_pending_actions").delete().eq("id", action.id);
        skipped++;
        continue;
      }

      await deleteEvent(action.event_id);
      await db.from("session_calendar_events").delete().eq("session_id", action.session_id);
      await db.from("calendar_sync_pending_actions").delete().eq("id", action.id);
      approved++;
    } catch (err) {
      if (err instanceof GraphReconnectError) {
        errors.push(`${action.session_id}: Microsoft account needs reconnection`);
        break;
      }
      errors.push(`${action.session_id}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({ approved, skipped, errors: errors.length ? errors : undefined });
}
