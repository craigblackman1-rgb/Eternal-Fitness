import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * CR-EF-143 — adjust the session count for a block.
 *
 * POST /api/blocks/[id]/adjust-sessions
 * Body: { session_count: number }
 *
 * - Increasing: adds empty (content-free) session rows to fill the gap.
 * - Decreasing: removes uncompleted, uncharged sessions from the highest
 *   session numbers. Never removes completed or charged-cancelled sessions.
 *   Validates that the new count >= already-consumed slots.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const newCount = body.session_count;

  if (typeof newCount !== "number" || !Number.isInteger(newCount) || newCount < 1 || newCount > 18) {
    return NextResponse.json({ error: "session_count must be an integer between 1 and 18" }, { status: 400 });
  }

  // Fetch block + client context
  const { data: block, error: blockError } = await supabase
    .from("blocks")
    .select("id, client_id, block_number")
    .eq("id", params.id)
    .single();
  if (blockError || !block) return NextResponse.json({ error: "Block not found" }, { status: 404 });

  // Fetch all sessions (including sub-sessions for completeness)
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, session_number, status, charged_free, parent_session_id")
    .eq("block_id", params.id)
    .order("session_number", { ascending: true });
  if (sessionsError) return NextResponse.json({ error: sessionsError.message }, { status: 500 });

  const allSessions = sessions ?? [];
  // Pot sessions = top-level only (sub-sessions don't count toward the pot)
  const potSessions = allSessions.filter((s) => !s.parent_session_id);
  const currentCount = potSessions.length;

  if (newCount === currentCount) {
    return NextResponse.json({ message: "No change needed", added: 0, removed: 0 });
  }

  // --- INCREASING ---
  if (newCount > currentCount) {
    const toAdd = newCount - currentCount;
    if (currentCount + toAdd > 18) {
      return NextResponse.json({ error: "Cannot exceed 18 sessions per block" }, { status: 400 });
    }

    // Find the highest existing session_number for pot sessions
    const maxNumber = potSessions.reduce((max, s) => Math.max(max, s.session_number), 0);

    // Find the highest week in use
    const maxWeek = potSessions.reduce((max, s) => {
      // All pot sessions have a week; default to 1
      return max;
    }, 1);

    const insertRows = [];
    for (let i = 1; i <= toAdd; i++) {
      const sessionNumber = maxNumber + i;
      const sessionData = {
        session_id: crypto.randomUUID(),
        block_id: params.id,
        client_id: block.client_id,
        session_number: sessionNumber,
        archetype: null,
        week: maxWeek,
        phase: null,
        focus_label: null,
        time_tier: "standard",
        versions: {
          studio: { warm_up: [], main_block: [], cooldown: [] },
          home: { warm_up: [], main_block: [], cooldown: [] },
        },
        coaching_notes: "Added via block edit (session count increase).",
        client_intro: "",
      };

      insertRows.push({
        block_id: params.id,
        session_number: sessionNumber,
        archetype: null,
        week: maxWeek,
        phase: null,
        data: sessionData,
      });
    }

    const { error: insertError } = await supabase.from("sessions").insert(insertRows);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({ message: `Added ${toAdd} session(s)`, added: toAdd, removed: 0 });
  }

  // --- DECREASING ---
  const toRemove = currentCount - newCount;

  // Count consumed slots: completed + charged cancellations
  let consumedSlots = 0;
  for (const s of potSessions) {
    const status = s.status;
    const isCompleted = status === "completed";
    const isChargedCancel = status === "cancelled" && s.charged_free === "charged";
    if (isCompleted || isChargedCancel) {
      consumedSlots++;
    }
  }

  if (newCount < consumedSlots) {
    return NextResponse.json(
      {
        error: `Cannot reduce to ${newCount} — ${consumedSlots} session(s) are already completed or charged. Remove ${consumedSlots} or fewer.`,
        consumedSlots,
      },
      { status: 400 },
    );
  }

  // Identify removable sessions: not completed, not charged-cancelled, not a sub-session.
  // Remove from highest session_number first (preserve lower-numbered sessions).
  const removable = potSessions
    .filter((s) => {
      const status = s.status;
      const isCompleted = status === "completed";
      const isChargedCancel = status === "cancelled" && s.charged_free === "charged";
      return !isCompleted && !isChargedCancel;
    })
    .sort((a, b) => b.session_number - a.session_number);

  const toDelete = removable.slice(0, toRemove);
  if (toDelete.length < toRemove) {
    return NextResponse.json(
      {
        error: `Only ${toDelete.length} removable session(s) found — cannot remove ${toRemove}. ${consumedSlots} are completed or charged.`,
        consumedSlots,
        removableCount: toDelete.length,
      },
      { status: 400 },
    );
  }

  const deleteIds = toDelete.map((s) => s.id);
  const { error: deleteError } = await supabase
    .from("sessions")
    .delete()
    .in("id", deleteIds);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ message: `Removed ${toDelete.length} session(s)`, added: 0, removed: toDelete.length });
}
