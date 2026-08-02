import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === "increment_usage") {
    const { data: row } = await supabase
      .from("workout_templates")
      .select("usage_count")
      .eq("id", params.id)
      .single();

    const current = (row as { usage_count: number } | null)?.usage_count ?? 0;

    const { data: updated, error } = await supabase
      .from("workout_templates")
      .update({ usage_count: current + 1, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
