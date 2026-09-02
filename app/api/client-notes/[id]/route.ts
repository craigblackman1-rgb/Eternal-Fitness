import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { pinned?: boolean; note?: string };

  const update: Record<string, unknown> = {};

  if (typeof body.pinned === "boolean") {
    update.pinned = body.pinned;
  }

  if (typeof body.note === "string") {
    const trimmed = body.note.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "note cannot be empty" }, { status: 400 });
    }
    update.note = trimmed;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "pinned or note is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("client_notes")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("client_notes").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
