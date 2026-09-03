import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { deriveSessionPot } from "@/lib/session-pot";
import { MAX_BLOCK_WEEKS, type Session, type Archetype, type Phase } from "@/types";

/**
 * CR-EF-146 — carry remaining sessions from one block into another.
 *
 * POST /api/blocks/[id]/carry-over
 * Body: { target_block_id?: string }
 *
 * "Remaining" = the deriveSessionPot number — client-level:
 *   sessions_purchased − (completed + charged-cancellations).
 * It is NOT the count of non-completed session rows in the block.
 *
 * This route CREATES that many new placeholder session rows in the target
 * block (unscheduled, free-to-book), rather than moving existing rows.
 * Completed and cancelled rows stay put.
 *
 * If target_block_id is provided, sessions go to that existing block.
 * If omitted, a new draft block is created for the same client.
 *
 * Respects the 18-session block cap: if remaining exceeds capacity,
 * creates up to the cap and reports how many were placed vs left.
 *
 * Atomicity: single batch insert (one .insert([...]) call).
 * After success, an audit note is appended to the source block.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const targetBlockId: string | undefined = body.target_block_id;

  // --- Fetch source block + client context ---
  const { data: sourceBlock, error: sourceError } = await supabase
    .from("blocks")
    .select("id, client_id, block_number, block_note")
    .eq("id", params.id)
    .single();
  if (sourceError || !sourceBlock) return NextResponse.json({ error: "Source block not found" }, { status: 404 });

  const { data: client } = await supabase
    .from("clients")
    .select("sessions_purchased")
    .eq("id", sourceBlock.client_id)
    .single();

  // --- Fetch source block's sessions to compute the pot ---
  const { data: sourceSessions, error: sessError } = await supabase
    .from("sessions")
    .select("status, charged_free, parent_session_id, completed_at, cancelled_at")
    .eq("block_id", params.id);
  if (sessError) return NextResponse.json({ error: sessError.message }, { status: 500 });

  // Use the canonical deriveSessionPot — same source the dialog/header uses
  const pot = deriveSessionPot(
    (sourceSessions ?? []) as unknown as Parameters<typeof deriveSessionPot>[0],
    client?.sessions_purchased ?? null,
  );
  const remaining = pot.remaining ?? pot.estimatedRemaining;

  if (remaining <= 0) {
    return NextResponse.json({ error: "No remaining sessions to carry over" }, { status: 400 });
  }

  // --- Resolve target block ---
  let targetBlock: { id: string; block_number: number; block_note: string | null };

  if (targetBlockId) {
    const { data: existing, error: targetError } = await supabase
      .from("blocks")
      .select("id, block_number, block_note")
      .eq("id", targetBlockId)
      .eq("client_id", sourceBlock.client_id)
      .single();
    if (targetError || !existing) {
      return NextResponse.json({ error: "Target block not found or belongs to a different client" }, { status: 404 });
    }
    targetBlock = existing;
  } else {
    const { data: latestBlock } = await supabase
      .from("blocks")
      .select("block_number")
      .eq("client_id", sourceBlock.client_id)
      .order("block_number", { ascending: false })
      .limit(1)
      .single();

    const blockNumber = (latestBlock?.block_number ?? 0) + 1;

    const { data: newBlock, error: createError } = await supabase
      .from("blocks")
      .insert({
        client_id: sourceBlock.client_id,
        block_number: blockNumber,
        status: "draft",
        block_note: `Created by carry-over from Block ${sourceBlock.block_number}.`,
      })
      .select("id, block_number, block_note")
      .single();
    if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });
    targetBlock = newBlock;
  }

  // --- Find highest session_number and maxWeek in the target block ---
  const { data: targetSessions } = await supabase
    .from("sessions")
    .select("session_number, week, parent_session_id")
    .eq("block_id", targetBlock.id);
  const targetPotSessions = (targetSessions ?? []).filter((s) => !s.parent_session_id);
  const maxTargetNumber = targetPotSessions.reduce((max, s) => Math.max(max, s.session_number), 0);
  const maxWeek = targetPotSessions.reduce(
    (max, s) => (s.week != null && s.week > max ? s.week : max),
    0,
  );
  const resolvedWeek = maxWeek > 0 ? maxWeek : 1;

  // --- Enforce 18-session cap ---
  const currentCount = targetPotSessions.length;
  const HARD_CAP = 18;
  const availableSlots = HARD_CAP - currentCount;
  const toCreate = Math.min(remaining, availableSlots);
  const leftBehind = remaining - toCreate;

  if (toCreate <= 0) {
    return NextResponse.json(
      { error: `Target block is already at the ${HARD_CAP}-session cap. ${remaining} session(s) could not be carried over.` },
      { status: 400 },
    );
  }

  // Mirror sessions-POST phase resolution: inherit the phase from an existing
  // session in the same week, or null if the week has no sessions yet.
  const resolvedPhase = targetPotSessions.find((s) => s.week === resolvedWeek)?.phase ?? null;

  // --- Build placeholder session rows (atomic batch insert) ---
  const insertRows: Record<string, unknown>[] = [];
  for (let i = 1; i <= toCreate; i++) {
    const sessionNumber = maxTargetNumber + i;
    const sessionData: Session = {
      session_id: crypto.randomUUID(),
      block_id: targetBlock.id,
      client_id: sourceBlock.client_id,
      session_number: sessionNumber,
      archetype: null as unknown as Archetype,
      week: resolvedWeek,
      phase: resolvedPhase as unknown as Phase,
      focus_label: null,
      time_tier: "standard",
      versions: {
        studio: { warm_up: [], main_block: [], cooldown: [] },
        home: { warm_up: [], main_block: [], cooldown: [] },
      },
      coaching_notes: `Carried over from Block ${sourceBlock.block_number} — free to book.`,
      client_intro: "",
    };

    insertRows.push({
      block_id: targetBlock.id,
      session_number: sessionNumber,
      archetype: null,
      week: resolvedWeek,
      phase: resolvedPhase,
      data: sessionData,
    });
  }

  // Single atomic insert — no partial state on failure
  const { error: insertError } = await supabase.from("sessions").insert(insertRows);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // --- Audit note on the source block ---
  const auditLine = `Carried ${toCreate} session(s) to Block ${targetBlock.block_number}${leftBehind > 0 ? ` (${leftBehind} left — target block at capacity)` : ""} on ${new Date().toLocaleDateString("en-GB")}.`;
  const existingNote = sourceBlock.block_note ?? "";
  const newNote = existingNote ? `${existingNote}\n${auditLine}` : auditLine;

  await supabase
    .from("blocks")
    .update({ block_note: newNote })
    .eq("id", sourceBlock.id);

  return NextResponse.json({
    message: leftBehind > 0
      ? `Placed ${toCreate} of ${remaining} session(s) in Block ${targetBlock.block_number} (${leftBehind} left — block at capacity)`
      : `Carried ${toCreate} session(s) to Block ${targetBlock.block_number}`,
    placed: toCreate,
    remaining,
    leftBehind,
    targetBlockId: targetBlock.id,
    targetBlockNumber: targetBlock.block_number,
  });
}
