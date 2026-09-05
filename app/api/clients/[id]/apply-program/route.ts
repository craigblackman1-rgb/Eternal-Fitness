import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * POST /api/clients/[id]/apply-program — set client.active_program_id
 */

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clientId } = params;
  const body = await request.json();
  const { program_id } = body;

  if (!program_id || typeof program_id !== "string") {
    return NextResponse.json({ error: "program_id is required" }, { status: 400 });
  }

  // Verify program exists
  const { data: program, error: progErr } = await supabase
    .from("programs")
    .select("id")
    .eq("id", program_id)
    .single();

  if (progErr || !program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  // Verify client exists
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .single();

  if (clientErr || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Set active program
  const { error: updateErr } = await supabase
    .from("clients")
    .update({ active_program_id: program_id })
    .eq("id", clientId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
