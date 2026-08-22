import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { linkDuplicateCandidate } from "@/lib/outlook-duplicates";

// CR-EF-028 — adopt the existing Outlook event instead of creating a second one.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await linkDuplicateCandidate(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
