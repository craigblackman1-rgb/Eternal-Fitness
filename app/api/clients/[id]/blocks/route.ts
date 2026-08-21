import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Lists a client's blocks. Accepts either the numeric client_number (used
// throughout the hub's client-facing routes) or the client's UUID id (used
// wherever a caller already has the row, e.g. CR-EF-050's block-picker) —
// same dual-lookup pattern as PATCH /api/clients/[id].
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const numericId = parseInt(params.id, 10);
  const col = Number.isFinite(numericId) && numericId > 0 && String(numericId) === params.id ? "client_number" : "id";

  const { data: client, error: clientErr } = await supabase.from("clients").select("id").eq(col, params.id).maybeSingle();
  if (clientErr) return NextResponse.json({ error: clientErr.message }, { status: 500 });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const { data: blocks, error } = await supabase
    .from("blocks")
    .select("id, block_number, status, block_note")
    .eq("client_id", client.id)
    .order("block_number", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(blocks ?? []);
}
