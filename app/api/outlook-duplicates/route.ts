import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// CR-EF-028 — list sessions whose push-sync is paused on a possible
// duplicate-event collision.
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "open";
  const countOnly = searchParams.get("count") === "true";

  let query = supabase
    .from("outlook_duplicate_candidates")
    .select(
      countOnly ? "id" : "*, sessions(id, session_number, block_id)",
      countOnly ? { count: "exact", head: true } : undefined
    )
    .order("existing_start_at", { ascending: true });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (countOnly) {
    const { count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count });
  }

  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sessions only carry block_id -- resolve client name + scheduled_at/data
  // in a couple of follow-up queries rather than a nested embed (pg-client
  // shim only supports single-level to-one embeds).
  const list = (rows ?? []) as Array<Record<string, unknown> & { sessions: { id: string; session_number: number; block_id: string } | null }>;
  const blockIds = [...new Set(list.map((r) => r.sessions?.block_id).filter(Boolean))] as string[];
  const { data: blocks } = blockIds.length
    ? await supabase.from("blocks").select("id, client_id, block_number").in("id", blockIds)
    : { data: [] as { id: string; client_id: string; block_number: number }[] };
  const blockById = new Map((blocks ?? []).map((b) => [b.id, b]));
  const clientIds = [...new Set((blocks ?? []).map((b) => b.client_id))];
  const { data: clients } = clientIds.length
    ? await supabase.from("clients").select("id, name").in("id", clientIds)
    : { data: [] as { id: string; name: string }[] };
  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));

  const sessionIds = list.map((r) => r.sessions?.id).filter(Boolean) as string[];
  const { data: sessionRows } = sessionIds.length
    ? await supabase.from("sessions").select("id, scheduled_at, data").in("id", sessionIds)
    : { data: [] as { id: string; scheduled_at: string; data: Record<string, unknown> }[] };
  const sessionById = new Map((sessionRows ?? []).map((s) => [s.id, s]));

  const enriched = list.map((r) => {
    const sess = r.sessions;
    const block = sess ? blockById.get(sess.block_id) : undefined;
    const client = block ? clientById.get(block.client_id) : undefined;
    const fullSession = sess ? sessionById.get(sess.id) : undefined;
    return {
      ...r,
      client_name: client?.name ?? "Unknown client",
      block_number: block?.block_number ?? null,
      session_number: sess?.session_number ?? null,
      scheduled_at: fullSession?.scheduled_at ?? null,
      duration_minutes: null,
    };
  });

  return NextResponse.json(enriched);
}
