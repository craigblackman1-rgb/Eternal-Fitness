import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getBestWeightsForClient } from "@/lib/exercise-best-weights";

// [id] here is the client's display client_number (see app/hub/(protected)/clients/[id]),
// not the client_id UUID — resolve it before querying personal_records.
export async function GET(request: Request, { params }: { params: { id: string } }) {
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

  const bestWeights = await getBestWeightsForClient(client.id);
  return NextResponse.json(bestWeights);
}
