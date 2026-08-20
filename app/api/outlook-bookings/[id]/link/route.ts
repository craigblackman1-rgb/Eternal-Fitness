import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// CR-EF-050 — manually link (or override) which client an Outlook event
// belongs to. Doesn't create a session — that's the separate confirm step,
// which needs a block chosen too.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { clientId } = body as { clientId?: string };
  if (!clientId || typeof clientId !== "string") {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const { data: client, error: clientErr } = await supabase.from("clients").select("id").eq("id", clientId).maybeSingle();
  if (clientErr) return NextResponse.json({ error: clientErr.message }, { status: 500 });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Two steps, not one: this pg-client shim resolves "clients(...)" relation
  // embeds into a subquery that references the target table by name, which
  // Postgres's UPDATE...RETURNING doesn't allow (RETURNING can only see the
  // row's own columns, unqualified) -- combining .update().select(embed) in
  // one call fails with a real Postgres error, not a graceful no-op.
  const { error: updateErr } = await supabase
    .from("outlook_booking_events")
    .update({ client_id: clientId, updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  const { data, error } = await supabase
    .from("outlook_booking_events")
    .select("*, clients(id, name, client_number, email)")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
