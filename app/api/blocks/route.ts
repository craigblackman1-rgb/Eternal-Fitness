import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Creates an empty draft block instantly — no AI generation. Sessions are
// added afterward via /api/blocks/[id]/sessions (template-based, also fast).
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, blockNote } = await request.json();
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("client_number", parseInt(clientId))
    .single();
  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { data: existingBlocks, error: existingError } = await supabase
    .from("blocks")
    .select("block_number")
    .eq("client_id", client.id)
    .order("block_number", { ascending: false })
    .limit(1);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const blockNumber = (existingBlocks?.[0]?.block_number ?? 0) + 1;

  const { data: created, error: insertError } = await supabase
    .from("blocks")
    .insert({
      client_id: client.id,
      block_number: blockNumber,
      status: "draft",
      block_note: blockNote || null,
    })
    .select()
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json(created, { status: 201 });
}
