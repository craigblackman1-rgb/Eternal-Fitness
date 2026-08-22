import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { DEFAULT_ARCHETYPE_FOCUS_LABELS } from "@/lib/planAgentPrompt";

interface EmbeddedSession {
  data: { focus_label?: string | null } | null;
  archetype: string | null;
  session_number: number;
}

function sessionNameFor(s: EmbeddedSession | null): string | null {
  if (!s) return null;
  return (
    s.data?.focus_label?.trim() ||
    DEFAULT_ARCHETYPE_FOCUS_LABELS[s.archetype ?? ""] ||
    `Session ${s.session_number}`
  );
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("client_notes")
    .select("*, sessions(data, archetype, session_number)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Session-titled notes: the embedded session (if any) supplies its real
  // display name — never a generic "Session note" label. Drop the embed
  // itself from the response, callers only need the derived name.
  const shaped = (data ?? []).map((row: Record<string, unknown> & { sessions?: EmbeddedSession | null }) => {
    const { sessions, ...rest } = row;
    return { ...rest, session_name: sessionNameFor(sessions ?? null) };
  });

  return NextResponse.json(shaped);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    client_id?: string;
    note?: string;
    session_id?: string;
  };

  if (!body.client_id) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }
  if (!body.note?.trim()) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  const author = user.name || user.email || "Esther Fair";

  const { data, error } = await supabase
    .from("client_notes")
    .insert({
      client_id: body.client_id,
      note: body.note.trim(),
      session_id: body.session_id || null,
      author,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
