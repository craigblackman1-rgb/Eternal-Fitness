import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { Session } from "@/types";
import { ensureUids } from "@/lib/exercise-ref";
import { attachSupplementaryWork } from "@/lib/supplementary-attach";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: original, error: fetchError } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", params.id)
    .single();
  if (fetchError || !original) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const { data: existingSessions, error: existingError } = await supabase
    .from("sessions")
    .select("session_number, parent_session_id")
    .eq("block_id", original.block_id);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const rows = (existingSessions ?? []) as { id: string; session_number: number; parent_session_id: string | null }[];
  // New slots number from the highest slot number, not sub-sessions (CR-EF-125).
  const slotRows = rows.filter((s) => !s.parent_session_id);
  const sessionNumber = slotRows.reduce((max, s) => Math.max(max, s.session_number), 0) + 1;
  if (sessionNumber > 18) {
    return NextResponse.json({ error: "This block already has the maximum of 18 sessions" }, { status: 400 });
  }

  const originalData = (original.data ?? {}) as Session;
  const clonedData: Session = {
    ...originalData,
    session_id: crypto.randomUUID(),
    session_number: sessionNumber,
    session_log: undefined,
  };
  delete clonedData.session_log;

  // BUG-EF-111 — regenerate exercise uids so the clone never shares uids
  // with the original (or any other session derived from the same source).
  const sectionKeys = ["warm_up", "main_block", "cooldown"] as const;
  for (const v of Object.keys(clonedData.versions ?? {})) {
    const ver = clonedData.versions?.[v as keyof typeof clonedData.versions];
    if (ver && typeof ver === "object") {
      for (const sk of sectionKeys) {
        const arr = (ver as unknown as Record<string, unknown>)[sk];
        if (Array.isArray(arr)) {
          (ver as unknown as Record<string, unknown>)[sk] = ensureUids(arr as { uid?: string }[], { forceNew: true });
        }
      }
    }
  }

  // BUG-EF-124 — pre-insert existence check for a duplicate non-sub-session at
  // this (block_id, session_number). Clone always creates a top-level session, so
  // no parent_session_id guard is needed. Callers do not currently consume the
  // `existing` field but it is returned for forward compat.
  const { data: conflictRow } = await supabase
    .from("sessions")
    .select("*")
    .eq("block_id", original.block_id)
    .eq("session_number", sessionNumber)
    .is("parent_session_id", null)
    .maybeSingle();
  if (conflictRow) {
    return NextResponse.json(
      { error: `Session ${sessionNumber} already exists in this block`, existing: conflictRow },
      { status: 409 },
    );
  }

  const { data: created, error: insertError } = await supabase
    .from("sessions")
    .insert({
      block_id: original.block_id,
      session_number: sessionNumber,
      archetype: original.archetype,
      week: original.week,
      phase: original.phase,
      data: clonedData,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // CR-EF-125 — attach supplementary workouts when a top-level session is cloned.
  // Cloned sub-sessions (parent_session_id set) are not re-supplemented.
  if (!original.parent_session_id) {
    // Look up the client_id via the block.
    const { data: blockRow } = await supabase
      .from("blocks")
      .select("client_id")
      .eq("id", original.block_id)
      .single();
    if (blockRow) {
      await attachSupplementaryWork({
        clientId: blockRow.client_id,
        parentSession: {
          id: created.id,
          block_id: original.block_id,
          session_number: sessionNumber,
          scheduled_at: created.scheduled_at ?? null,
          status: created.status ?? null,
        },
        db: supabase,
      });
    }
  }

  return NextResponse.json(created, { status: 201 });
}
