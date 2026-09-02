import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { normaliseClientEquipment } from "@/lib/client-equipment";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: client, error } = await supabase.from("clients").select("*").eq("client_number", parseInt(params.id)).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: blocks } = await supabase.from("blocks").select("*").eq("client_id", client.id).order("block_number", { ascending: false });
  const blockIds = (blocks ?? []).map((b) => b.id);
  let sessions: any[] | null = null;
  if (blockIds.length > 0) {
    const { data, error: sessionsError } = await supabase
      .from("sessions")
      .select("*, blocks(block_number)")
      .in("block_id", blockIds)
      .order("session_number", { ascending: false })
      .limit(50);
    if (sessionsError) console.error("clients/[id] sessions query failed:", sessionsError.message);
    sessions = data;
  }
  const { data: clientDocuments } = await supabase.from("client_documents").select("id, kind, title, status").eq("client_id", client.id);

  const hasSignedAgreementDocument = (clientDocuments ?? []).some((d: any) => d.kind === "terms" && d.status === "signed");

  const blockSessionsCount: Record<number, number> = {};
  for (const s of sessions ?? []) {
    const bn = (s as any).blocks?.block_number;
    if (bn != null) blockSessionsCount[bn] = (blockSessionsCount[bn] ?? 0) + 1;
  }

  const lastSessionLog = sessions?.[0] ? ((sessions[0] as any).data?.session_log ?? null) : null;
  const lastSessionDate = lastSessionLog?.completed_at ?? null;

  return NextResponse.json({
    ...client,
    _blocks: blocks ?? [],
    _sessionsCount: blockSessionsCount,
    _lastSessionDate: lastSessionDate,
    _hasSignedAgreementDocument: hasSignedAgreementDocument,
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if ("equipment" in body) body.equipment = normaliseClientEquipment(body.equipment);
  const numericId = parseInt(params.id);
  const col = Number.isFinite(numericId) && numericId > 0 ? "client_number" : "id";
  const val = Number.isFinite(numericId) && numericId > 0 ? numericId : params.id;
  const { data, error } = await supabase.from("clients").update(body).eq(col, val).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("clients").delete().eq("client_number", parseInt(params.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
