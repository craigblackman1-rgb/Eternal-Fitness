import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * CR-EF-125 — remove a supplementary workout from a client.
 *
 * DELETE — soft-removes the row (sets removed_at/removed_by), deletes
 * sub-sessions where supplementary_source_id = rowId AND parent status
 * not completed AND the sub-session has zero set_logs rows. Returns the
 * three-group counts: { detached, kept_logged, kept_delivered }.
 */

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; rowId: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the row exists and belongs to this client.
  const { data: row, error: rowErr } = await supabase
    .from("client_supplementary_workouts")
    .select("id, client_id")
    .eq("id", params.rowId)
    .single();

  if (rowErr || !row) {
    return NextResponse.json({ error: "Row not found" }, { status: 404 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("client_number", parseInt(params.id))
    .single();

  if (!client || row.client_id !== client.id) {
    return NextResponse.json({ error: "Row does not belong to this client" }, { status: 403 });
  }

  // Soft-remove the row.
  const { error: removeErr } = await supabase
    .from("client_supplementary_workouts")
    .update({
      removed_at: new Date().toISOString(),
      removed_by: user.name ?? user.email ?? "Unknown",
    })
    .eq("id", params.rowId);

  if (removeErr) return NextResponse.json({ error: removeErr.message }, { status: 500 });

  // Find all sub-sessions for this supplementary row.
  const { data: subSessions } = await supabase
    .from("sessions")
    .select("id, parent_session_id")
    .eq("supplementary_source_id", params.rowId);

  const subs = (subSessions ?? []) as { id: string; parent_session_id: string }[];

  let detached = 0;
  let kept_logged = 0;
  let kept_delivered = 0;

  for (const sub of subs) {
    // Look up the parent session's status.
    const { data: parent } = await supabase
      .from("sessions")
      .select("status")
      .eq("id", sub.parent_session_id)
      .single();

    const parentStatus = (parent as { status: string } | null)?.status;

    // If parent is completed, keep the sub-session (delivered history).
    if (parentStatus === "completed") {
      kept_delivered++;
      continue;
    }

    // Check if the sub-session has any set_logs.
    const { count } = await supabase
      .from("set_logs")
      .select("id", { head: true, count: "exact" })
      .eq("session_id", sub.id);

    if ((count ?? 0) > 0) {
      // Has logged work — keep it.
      kept_logged++;
      continue;
    }

    // No logged work and parent not completed — delete the sub-session.
    await supabase.from("sessions").delete().eq("id", sub.id);
    detached++;
  }

  return NextResponse.json({ detached, kept_logged, kept_delivered });
}
