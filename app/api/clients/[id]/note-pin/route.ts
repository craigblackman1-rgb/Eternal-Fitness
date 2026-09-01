import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * PATCH /api/clients/[id]/note-pin
 *
 * Toggle pin state for a session or exercise note. Profile notes pin via
 * the existing PATCH /api/client-notes/[id] route (client_notes.pinned).
 *
 * Body: { source: "session" | "exercise", session_id: string, exercise_uid?: string, pinned: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    source?: string;
    session_id?: string;
    exercise_uid?: string;
    pinned?: boolean;
  };

  if (
    !body.source ||
    !body.session_id ||
    typeof body.pinned !== "boolean" ||
    !["session", "exercise"].includes(body.source)
  ) {
    return NextResponse.json(
      { error: "source (session|exercise), session_id, and pinned boolean are required" },
      { status: 400 },
    );
  }

  // Fetch current pinned_note_refs
  const { data: client, error: fetchErr } = await supabase
    .from("clients")
    .select("pinned_note_refs")
    .eq("id", params.id)
    .single();

  if (fetchErr || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const refs: Array<{
    source: string;
    session_id: string;
    exercise_uid?: string;
  }> = Array.isArray((client as Record<string, unknown>).pinned_note_refs)
    ? ((client as Record<string, unknown>).pinned_note_refs as Array<{
        source: string;
        session_id: string;
        exercise_uid?: string;
      }>)
    : [];

  // Build a key for matching
  const key = (r: { source: string; session_id: string; exercise_uid?: string }) =>
    `${r.source}:${r.session_id}:${r.exercise_uid ?? ""}`;

  const target = key({
    source: body.source,
    session_id: body.session_id,
    exercise_uid: body.exercise_uid,
  });

  let updated: typeof refs;
  if (body.pinned) {
    // Add if not already present
    if (refs.some((r) => key(r) === target)) {
      updated = refs;
    } else {
      updated = [
        ...refs,
        {
          source: body.source,
          session_id: body.session_id,
          ...(body.exercise_uid ? { exercise_uid: body.exercise_uid } : {}),
        },
      ];
    }
  } else {
    // Remove
    updated = refs.filter((r) => key(r) !== target);
  }

  const { error: updateErr } = await supabase
    .from("clients")
    .update({ pinned_note_refs: updated })
    .eq("id", params.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ pinned_note_refs: updated });
}
