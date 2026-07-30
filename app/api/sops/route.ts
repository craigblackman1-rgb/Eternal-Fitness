import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("sops")
    .select("*")
    .order("ref", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<{
    ref: string;
    title: string;
    area: string;
    trigger: string;
    owner: string;
    last_updated: string;
    what: string;
    good_looks_like: string;
    steps: string[];
    prompt_template: string;
    applies_to: string;
    review_date: string;
    linked_client: string;
    source: string;
    status: string;
  }>;

  if (!body.ref || !body.title || !body.trigger || !body.what || !body.good_looks_like) {
    return NextResponse.json(
      { error: "ref, title, trigger, what and good_looks_like are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("sops")
    .insert({
      ref: body.ref,
      title: body.title,
      area: body.area ?? "General",
      trigger: body.trigger,
      owner: body.owner ?? "Esther Fair",
      last_updated: body.last_updated ?? null,
      what: body.what,
      good_looks_like: body.good_looks_like,
      steps: body.steps ?? [],
      prompt_template: body.prompt_template ?? null,
      applies_to: body.applies_to ?? null,
      review_date: body.review_date ?? null,
      linked_client: body.linked_client ?? null,
      source: body.source ?? null,
      status: body.status ?? "active",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
