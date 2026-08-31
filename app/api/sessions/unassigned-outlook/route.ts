import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * CR-EF-111 — list every session that was auto-created from an Outlook
 * booking and has no workout assigned yet. The structural signature:
 *   focus_label starts with "Outlook booking — "
 *   archetype IS NULL AND week IS NULL AND phase IS NULL
 *
 * Returns sessions enriched with client name and block number for display.
 * Supports ?count=true for the tab badge (returns { count } only).
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get("count") === "true";

  // Query sessions matching the Outlook placeholder signature.
  // focus_label starts with 'Outlook booking — ' and all content fields are null.
  // We fetch from sessions joined with clients and blocks for display context.
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, session_number, data, scheduled_at, client_id, block_id, archetype, week, phase")
    .is("archetype", null)
    .is("week", null)
    .is("phase", null)
    .order("session_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter to only those whose focus_label starts with the Outlook prefix.
  // (Postgres ILIKE would work but the prefix is short and this is a small set.)
  const outlookSessions = (sessions ?? []).filter((s) => {
    const label = (s.data as Record<string, unknown>)?.focus_label;
    return typeof label === "string" && label.startsWith("Outlook booking — ");
  });

  if (countOnly) {
    return NextResponse.json({ count: outlookSessions.length });
  }

  // Enrich with client names and block numbers.
  const clientIds = [...new Set(outlookSessions.map((s) => s.client_id).filter(Boolean))];
  const blockIds = [...new Set(outlookSessions.map((s) => s.block_id).filter(Boolean))];

  const [clientsRes, blocksRes] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("clients").select("id, name").in("id", clientIds)
      : { data: [], error: null },
    blockIds.length > 0
      ? supabase.from("blocks").select("id, block_number").in("id", blockIds)
      : { data: [], error: null },
  ]);

  const clientMap = new Map<string, string>();
  for (const c of (clientsRes.data ?? []) as { id: string; name: string }[]) {
    clientMap.set(c.id, c.name);
  }
  const blockMap = new Map<string, number>();
  for (const b of (blocksRes.data ?? []) as { id: string; block_number: number }[]) {
    blockMap.set(b.id, b.block_number);
  }

  const enriched = outlookSessions.map((s) => ({
    id: s.id,
    session_number: s.session_number,
    focus_label: (s.data as Record<string, unknown>)?.focus_label ?? null,
    scheduled_at: s.scheduled_at,
    client_id: s.client_id,
    client_name: clientMap.get(s.client_id) ?? "Unknown",
    block_id: s.block_id,
    block_number: blockMap.get(s.block_id) ?? null,
  }));

  return NextResponse.json(enriched);
}
