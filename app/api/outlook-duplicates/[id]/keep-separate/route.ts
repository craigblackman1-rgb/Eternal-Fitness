import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { keepSeparateDuplicateCandidate } from "@/lib/outlook-duplicates";

// CR-EF-028 — confirm the collision was a false positive; the next sync
// creates the app's own event as usual.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await keepSeparateDuplicateCandidate(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
