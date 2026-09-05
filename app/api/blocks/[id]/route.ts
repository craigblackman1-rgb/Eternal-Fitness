import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("blocks").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const allowed = ["block_note", "summary", "status", "scheduled_start", "title"];
  const updates: Record<string, unknown> = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  // CR-EF-153 — title is Esther's own free-text name for the block. Server-side
  // guard because a client-side-only check is not a guard: trim, cap length,
  // reject anything that isn't a string, and store blank as null (the fallback
  // display path in lib/block-name.ts treats null/blank identically).
  if ("title" in updates) {
    if (updates.title !== null && typeof updates.title !== "string") {
      return NextResponse.json({ error: "title must be a string or null" }, { status: 400 });
    }
    const trimmed = typeof updates.title === "string" ? updates.title.trim() : "";
    if (trimmed.length > 80) {
      return NextResponse.json({ error: "title must be 80 characters or fewer" }, { status: 400 });
    }
    updates.title = trimmed || null;
  }

  const { data, error } = await supabase.from("blocks").update(updates).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
