import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { TaskStatus } from "@/types";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");
  const countOnly = searchParams.get("count") === "true";

  if (countOnly) {
    const { count, error } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "done");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ count: count ?? 0 });
  }

  let query = supabase
    .from("tasks")
    .select("*, clients(name)")
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tasks = (data ?? []).map((task: Record<string, unknown>) => ({
    ...task,
    client_name: (task.clients as { name?: string } | null)?.name ?? null,
  }));

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<{
    title: string;
    description: string | null;
    status: TaskStatus;
    assignee: string | null;
    bucket_id: string | null;
    due_date: string | null;
    client_id: string | null;
  }>;

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: body.title.trim(),
      description: body.description ?? null,
      status: body.status ?? "todo",
      assignee: body.assignee ?? null,
      bucket_id: body.bucket_id ?? null,
      due_date: body.due_date ?? null,
      client_id: body.client_id ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
