import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { disconnect } from "@/lib/graph-client";

export const dynamic = "force-dynamic";

/**
 * Removes the stored Microsoft connection and the session→event mapping rows.
 * Events already in the Outlook calendar are left in place — the dedicated
 * "Eternal Fitness" calendar can simply be deleted in Outlook if unwanted.
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await disconnect();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
