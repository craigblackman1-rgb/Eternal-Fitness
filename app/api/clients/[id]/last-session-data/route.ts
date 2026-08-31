import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getLastSessionAndPbData } from "@/lib/last-session-data";

/**
 * CR-EF-010 — Returns last-session prefill data and PB metadata for a client.
 * Used by the desktop session page (client-side fetch) to prefill weight fields
 * from the last session instead of the all-time best.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientNumber = parseInt(params.id);
  if (!Number.isInteger(clientNumber)) {
    return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("client_number", clientNumber)
    .single();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const data = await getLastSessionAndPbData(client.id);
  return NextResponse.json(data);
}
