import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { unresolveDuplicateCandidate } from "@/lib/outlook-duplicates";

// CR-EF-028 — undo a link or keep-separate decision, reopening the row.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await unresolveDuplicateCandidate(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
