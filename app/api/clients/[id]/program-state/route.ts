import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getClientProgramState } from "@/lib/programs/queue";

/**
 * GET /api/clients/[id]/program-state — resolved queue state for the client's active program
 */

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clientId } = params;

  const state = await getClientProgramState(clientId);
  if (!state) {
    return NextResponse.json({ error: "No active program" }, { status: 404 });
  }

  return NextResponse.json(state);
}
