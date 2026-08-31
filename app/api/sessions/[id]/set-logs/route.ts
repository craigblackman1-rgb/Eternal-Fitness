import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";
import { checkAndUpsertPB } from "@/lib/personal-records";
import { markSessionInProgress, getSessionStatus } from "@/lib/session-transitions";

// CR-EF-031 — a completed session is read-only. Reject the write with a clear
// 403 rather than silently mutating a finished workout (the bug this guard kills:
// sets logged / prescription edited / Complete re-pressed after the session was
// done). Reopening is the only escape hatch, via POST /api/sessions/[id]/reopen.
async function rejectIfCompleted(sessionId: string): Promise<NextResponse | null> {
  const status = await getSessionStatus(sessionId);
  if (status === "completed") {
    return NextResponse.json(
      { error: "This session is completed and read-only. Reopen it before logging or editing sets." },
      { status: 403 },
    );
  }
  return null;
}

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

// Resolve the logged_at timestamp for a write. Absent (every existing caller today)
// → NOW(), exactly as before. Present → validate it isn't more than 5 minutes in
// the future (clock-skew tolerance) or more than 24 hours in the past (implausible
// for a live set log), then use it verbatim instead of NOW().
function resolveLoggedAt(
  loggedAt: string | null | undefined,
): { value: string } | { error: string } {
  if (!loggedAt) return { value: new Date().toISOString() };

  const parsed = new Date(loggedAt);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "logged_at is not a valid date" };
  }

  const skewMs = parsed.getTime() - Date.now();
  if (skewMs > 5 * 60 * 1000) {
    return { error: "logged_at is more than 5 minutes in the future" };
  }
  if (skewMs < -24 * 60 * 60 * 1000) {
    return { error: "logged_at is more than 24 hours in the past" };
  }

  return { value: loggedAt };
}

// Idempotent create keyed on client_op_id. On replay of the same client_op_id the
// INSERT becomes a no-op (partial unique index, see 20260813_set_logs_idempotency.sql)
// and the already-existing row is returned instead — same shape as a fresh insert.
async function insertSetLogIdempotent(
  sessionId: string,
  row: {
    exercise_ref: string;
    set_number: number;
    reps: number | null;
    weight_kg: number | null;
    duration_seconds: number | null;
    completed: boolean;
    is_warmup: boolean;
    band_colour: string | null;
    logged_at: string;
    notes: string | null;
  },
  clientOpId: string,
): Promise<import("@/types").SetLog> {
  const pool = getPool();
  const inserted = await pool.query(
    `INSERT INTO set_logs
       (session_id, exercise_ref, set_number, reps, weight_kg, duration_seconds,
        completed, is_warmup, band_colour, logged_by, logged_at, notes, client_op_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'trainer', $10, $11, $12)
     ON CONFLICT (client_op_id) WHERE client_op_id IS NOT NULL DO NOTHING
     RETURNING *`,
    [
      sessionId,
      row.exercise_ref,
      row.set_number,
      row.reps,
      row.weight_kg,
      row.duration_seconds,
      row.completed,
      row.is_warmup,
      row.band_colour,
      row.logged_at,
      row.notes,
      clientOpId,
    ],
  );
  if (inserted.rows.length) return inserted.rows[0];

  const existing = await pool.query(
    `SELECT * FROM set_logs WHERE client_op_id = $1 LIMIT 1`,
    [clientOpId],
  );
  return existing.rows[0];
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

  const guarded = await rejectIfCompleted(params.id);
  if (guarded) return guarded;

  const {
    exercise_ref,
    set_number,
    reps,
    weight_kg,
    duration_seconds,
    completed,
    notes,
    client_op_id,
    logged_at,
    is_warmup,
    band_colour,
  } = await request.json() as {
    exercise_ref: string;
    set_number: number;
    reps?: number | null;
    weight_kg?: number | null;
    duration_seconds?: number | null;
    completed?: boolean;
    notes?: string | null;
    client_op_id?: string | null;
    logged_at?: string | null;
    is_warmup?: boolean | null;
    band_colour?: string | null;
  };

  if (!exercise_ref?.trim()) {
    return NextResponse.json({ error: "exercise_ref is required" }, { status: 400 });
  }
  if (typeof set_number !== "number" || !Number.isInteger(set_number) || set_number < 1) {
    return NextResponse.json({ error: "set_number must be a positive integer" }, { status: 400 });
  }

  const loggedAt = resolveLoggedAt(logged_at);
  if ("error" in loggedAt) {
    return NextResponse.json({ error: loggedAt.error }, { status: 400 });
  }

  const row = {
    session_id: params.id,
    exercise_ref: exercise_ref.trim(),
    set_number,
    reps: reps ?? null,
    weight_kg: weight_kg ?? null,
    duration_seconds: duration_seconds ?? null,
    completed: completed ?? true,
    is_warmup: is_warmup ?? false,
    band_colour: band_colour ?? null,
    logged_by: "trainer",
    logged_at: loggedAt.value,
    notes: notes ?? null,
  };

  let data: import("@/types").SetLog;
  if (client_op_id) {
    data = await insertSetLogIdempotent(params.id, row, client_op_id);
  } else {
    const res = await supabase.from("set_logs").insert(row).select().single();
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
    data = res.data;
  }
  await markSessionInProgress(params.id);

  const clientId = await getClientIdForSession(params.id);
  if (clientId) {
    const isNewPb = await checkAndUpsertPB(clientId, data);
    return NextResponse.json({ ...data, is_new_pb: isNewPb }, { status: 201 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guarded = await rejectIfCompleted(params.id);
  if (guarded) return guarded;

  const body = await request.json() as {
    id: string;
    reps?: number | null;
    weight_kg?: number | null;
    duration_seconds?: number | null;
    completed?: boolean;
    notes?: string | null;
    client_op_id?: string | null;
    logged_at?: string | null;
    is_warmup?: boolean | null;
    band_colour?: string | null;
  };

  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const allowed = ["reps", "weight_kg", "duration_seconds", "completed", "notes", "is_warmup", "band_colour"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  }

  const loggedAt = resolveLoggedAt(body.logged_at);
  if ("error" in loggedAt) {
    return NextResponse.json({ error: loggedAt.error }, { status: 400 });
  }
  update.logged_at = loggedAt.value;

  const { data, error } = await supabase
    .from("set_logs")
    .update(update)
    .eq("id", body.id)
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
