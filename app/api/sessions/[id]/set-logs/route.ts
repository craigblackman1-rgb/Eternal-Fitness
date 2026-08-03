import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";
import { checkAndUpsertPB } from "@/lib/personal-records";

async function getClientIdForSession(sessionId: string): Promise<string | null> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT b.client_id
       FROM sessions s
       JOIN blocks b ON b.id = s.block_id
      WHERE s.id = $1
      LIMIT 1`,
    [sessionId],
  );
  return res.rows[0]?.client_id ?? null;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("set_logs")
    .select("*")
    .eq("session_id", params.id)
    .order("exercise_ref", { ascending: true })
    .order("set_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    exercise_ref,
    set_number,
    reps,
    weight_kg,
    duration_seconds,
    completed,
    notes,
  } = await request.json() as {
    exercise_ref: string;
    set_number: number;
    reps?: number | null;
    weight_kg?: number | null;
    duration_seconds?: number | null;
    completed?: boolean;
    notes?: string | null;
  };

  if (!exercise_ref?.trim()) {
    return NextResponse.json({ error: "exercise_ref is required" }, { status: 400 });
  }
  if (typeof set_number !== "number" || !Number.isInteger(set_number) || set_number < 1) {
    return NextResponse.json({ error: "set_number must be a positive integer" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("set_logs")
    .insert({
      session_id: params.id,
      exercise_ref: exercise_ref.trim(),
      set_number,
      reps: reps ?? null,
      weight_kg: weight_kg ?? null,
      duration_seconds: duration_seconds ?? null,
      completed: completed ?? true,
      logged_by: "trainer",
      logged_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clientId = await getClientIdForSession(params.id);
  if (clientId) {
    const isNewPb = await checkAndUpsertPB(clientId, data as import("@/types").SetLog);
    return NextResponse.json({ ...data, is_new_pb: isNewPb }, { status: 201 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...fields } = await request.json() as {
    id: string;
    reps?: number | null;
    weight_kg?: number | null;
    duration_seconds?: number | null;
    completed?: boolean;
    notes?: string | null;
  };

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const allowed = ["reps", "weight_kg", "duration_seconds", "completed", "notes"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  }
  update.logged_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("set_logs")
    .update(update)
    .eq("id", id)
    .eq("session_id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const clientId = await getClientIdForSession(params.id);
  if (clientId) {
    const isNewPb = await checkAndUpsertPB(clientId, data as import("@/types").SetLog);
    return NextResponse.json({ ...data, is_new_pb: isNewPb });
  }
  return NextResponse.json(data);
}
