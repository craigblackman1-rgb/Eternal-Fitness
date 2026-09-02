import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { attachSupplementaryWork } from "@/lib/supplementary-attach";

/**
 * CR-EF-125 — per-client supplementary workouts.
 *
 * GET  — returns the active list with template name, added_at, per-row counts
 *        (attached-and-logged, attached-not-logged).
 * POST — adds a workout to the client's list, backfills to booked-not-delivered
 *        sessions, returns { row, applied, skipped_completed, failed }.
 */

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("client_number", parseInt(params.id))
    .single();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const { data: rows, error } = await supabase
    .from("client_supplementary_workouts")
    .select("*, workout_templates(name, muscle_groups, equipment)")
    .eq("client_id", client.id)
    .is("removed_at", null)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich each row with per-row counts: attached-and-logged, attached-not-logged.
  const enriched = await Promise.all(
    (rows ?? []).map(async (row: Record<string, unknown>) => {
      const { data: subSessions } = await supabase
        .from("sessions")
        .select("id, status, completed_at")
        .eq("supplementary_source_id", row.id);

      const subs = (subSessions ?? []) as { id: string; status: string | null; completed_at: string | null }[];
      const logged = subs.filter((s) => s.completed_at).length;
      const notLogged = subs.filter((s) => !s.completed_at && s.status !== "cancelled").length;

      return {
        ...row,
        template_name: row.workout_templates?.name ?? "Unknown",
        attached_and_logged: logged,
        attached_not_logged: notLogged,
      };
    }),
  );

  return NextResponse.json({ rows: enriched });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { workout_template_id?: string } | null;
  if (!body?.workout_template_id) {
    return NextResponse.json({ error: "workout_template_id is required" }, { status: 400 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("client_number", parseInt(params.id))
    .single();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Check for existing active row for this template.
  const { data: existing } = await supabase
    .from("client_supplementary_workouts")
    .select("id")
    .eq("client_id", client.id)
    .eq("workout_template_id", body.workout_template_id)
    .is("removed_at", null)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "This workout is already on the supplementary list" }, { status: 409 });
  }

  // Insert the row.
  const { data: row, error: insertErr } = await supabase
    .from("client_supplementary_workouts")
    .insert({
      client_id: client.id,
      workout_template_id: body.workout_template_id,
      added_by: user.name ?? user.email ?? "Unknown",
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Backfill: find all top-level sessions for this client that are scheduled or in_progress.
  // These are dated, not delivered. Do NOT touch completed or cancelled.
  const { data: clientBlocks } = await supabase
    .from("blocks")
    .select("id")
    .eq("client_id", client.id);

  const blockIds = (clientBlocks ?? []).map((b: { id: string }) => b.id);
  if (blockIds.length === 0) {
    return NextResponse.json({ row, applied: 0, skipped_completed: 0, failed: [] }, { status: 201 });
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, block_id, session_number, parent_session_id, status, scheduled_at")
    .in("block_id", blockIds);

  const targetSessions = (sessions ?? []).filter(
    (s: { parent_session_id: string | null; status: string | null }) =>
      !s.parent_session_id &&
      (s.status === "scheduled" || s.status === "in_progress"),
  );

  let applied = 0;
  const skipped_completed = 0;
  const failed: string[] = [];

  for (const session of targetSessions) {
    try {
      await attachSupplementaryWork({
        clientId: client.id,
        parentSession: {
          id: session.id,
          block_id: session.block_id,
          session_number: session.session_number,
          scheduled_at: session.scheduled_at ?? null,
          status: session.status,
        },
        db: supabase,
      });
      applied++;
    } catch {
      failed.push(session.id);
    }
  }

  return NextResponse.json({ row, applied, skipped_completed, failed }, { status: 201 });
}
