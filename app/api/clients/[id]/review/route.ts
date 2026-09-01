import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { ReviewDecisionInput } from "@/types";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: ReviewDecisionInput = await request.json();

  if (!body.decision || !["continue", "adjust", "restart"].includes(body.decision)) {
    return NextResponse.json({ error: "Invalid decision value" }, { status: 400 });
  }
  if (!body.note || body.note.trim().length === 0) {
    return NextResponse.json({ error: "Note is required" }, { status: 400 });
  }

  const numericId = parseInt(params.id);
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("client_number", numericId)
    .single();
  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("client_reviews")
    .insert({
      client_id: client.id,
      decision: body.decision,
      note: body.note.trim(),
      recorded_by: user.id,
      recorded_by_name: body.recorded_by_name || user.name || "Staff",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const numericId = parseInt(params.id);
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("client_number", numericId)
    .single();
  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { data: reviews, error } = await supabase
    .from("client_reviews")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(reviews ?? []);
}
