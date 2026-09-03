import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * CR-EF-146 — carry remaining sessions from one block into another.
 *
 * POST /api/blocks/[id]/carry-over
 * Body: { target_block_id?: string }
 *
 * "Remaining" = pot sessions (parent_session_id IS NULL) that are NOT
 * completed and NOT cancelled-as-charged. These are sessions that consumed
 * no slot from the client's pot and can be freely re-assigned.
 *
 * If target_block_id is provided, sessions move to that existing block.
 * If omitted, a new draft block is created for the same client.
 *
 * After carry-over:
 * - Source block's remaining count drops to zero (or only consumed slots).
 * - Target block gains the sessions as unassigned/free-to-book.
 * - An audit note is appended to the target block's block_note.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const targetBlockId: string | undefined = body.target_block_id;

  // --- Fetch source block ---
  const { data: sourceBlock, error: sourceError } = await supabase
    .from("blocks")
    .select("id, client_id, block_number, block_note")
    .eq("id", params.id)
    .single();
  if (sourceError || !sourceBlock) return NextResponse.json({ error: "Source block not found" }, { status: 404 });

  // --- Fetch source block's sessions ---
  const { data: sourceSessions, error: sessError } = await supabase
    .from("sessions")
    .select("id, session_number, status, charged_free, parent_session_id")
    .eq("block_id", params.id)
    .order("session_number", { ascending: true });
  if (sessError) return NextResponse.json({ error: sessError.message }, { status: 500 });

  const allSessions = sourceSessions ?? [];
  const potSessions = allSessions.filter((s) => !s.parent_session_id);

  // --- Identify remaining sessions (not completed, not charged-cancelled) ---
  const remaining = potSessions.filter((s) => {
    const status = s.status;
    const isCompleted = status === "completed";
    const isChargedCancel = status === "cancelled" && s.charged_free === "charged";
    return !isCompleted && !isChargedCancel;
  });

  // Include sub-sessions of remaining sessions
  const remainingIds = new Set(remaining.map((s) => s.id));
  const remainingSubSessions = allSessions.filter(
    (s) => s.parent_session_id && remainingIds.has(s.parent_session_id),
  );
  const allToMove = [...remaining, ...remainingSubSessions];

  if (allToMove.length === 0) {
    return NextResponse.json({ error: "No remaining sessions to carry over" }, { status: 400 });
  }

  // --- Resolve target block ---
  let targetBlock: { id: string; block_number: number; block_note: string | null };

  if (targetBlockId) {
    // Use existing target block
    const { data: existing, error: targetError } = await supabase
      .from("blocks")
      .select("id, block_number, block_note")
      .eq("id", targetBlockId)
      .eq("client_id", sourceBlock.client_id) // must be same client
      .single();
    if (targetError || !existing) {
      return NextResponse.json({ error: "Target block not found or belongs to a different client" }, { status: 404 });
    }
    targetBlock = existing;
  } else {
    // Create a new draft block for the same client
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

  // --- Find the highest session_number in the target block ---
  const { data: targetSessions } = await supabase
    .from("sessions")
    .select("session_number, parent_session_id")
    .eq("block_id", targetBlock.id);
  const targetPotSessions = (targetSessions ?? []).filter((s) => !s.parent_session_id);
  const maxTargetNumber = targetPotSessions.reduce((max, s) => Math.max(max, s.session_number), 0);

  // --- Move sessions: update block_id and renumber ---
  let nextNumber = maxTargetNumber + 1;
  const movedIds: string[] = [];

  for (const session of remaining) {
    const newNumber = nextNumber++;
    const { error: moveError } = await supabase
      .from("sessions")
      .update({
        block_id: targetBlock.id,
        session_number: newNumber,
      })
      .eq("id", session.id);
    if (moveError) {
      return NextResponse.json({ error: `Failed to move session ${session.session_number}: ${moveError.message}` }, { status: 500 });
    }
    movedIds.push(session.id);
  }

  // Move sub-sessions (they inherit parent's new session_number)
  const parentNumberMap = new Map<string, number>();
  for (let i = 0; i < remaining.length; i++) {
    parentNumberMap.set(remaining[i].id, maxTargetNumber + 1 + i);
  }

  for (const sub of remainingSubSessions) {
    const parentNewNumber = parentNumberMap.get(sub.parent_session_id!) ?? nextNumber;
    const { error: moveError } = await supabase
      .from("sessions")
      .update({
        block_id: targetBlock.id,
        session_number: parentNewNumber,
      })
      .eq("id", sub.id);
    if (moveError) {
      return NextResponse.json({ error: `Failed to move sub-session: ${moveError.message}` }, { status: 500 });
    }
    movedIds.push(sub.id);
  }

  // --- Write audit note to target block ---
  const auditLine = `Carried over ${remaining.length} session(s) from Block ${sourceBlock.block_number} on ${new Date().toLocaleDateString("en-GB")}.`;
  const existingNote = targetBlock.block_note ?? "";
  const newNote = existingNote ? `${existingNote}\n${auditLine}` : auditLine;

  await supabase
    .from("blocks")
    .update({ block_note: newNote })
    .eq("id", targetBlock.id);

  return NextResponse.json({
    message: `Moved ${remaining.length} session(s) to Block ${targetBlock.block_number}`,
    moved: remaining.length,
    targetBlockId: targetBlock.id,
    targetBlockNumber: targetBlock.block_number,
  });
}
