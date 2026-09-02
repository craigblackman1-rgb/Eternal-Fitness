import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";
import { parseExerciseName } from "@/lib/progress";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exercise = new URL(request.url).searchParams.get("exercise");
  if (!exercise) {
    return NextResponse.json({ error: "exercise query parameter is required" }, { status: 400 });
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

  const pool = getPool();

  const [recordsRes, loggedRes] = await Promise.all([
    pool.query(
      `SELECT id, metric, value, rep_count, achieved_at, source, note, recorded_by, band_colour
         FROM personal_records
        WHERE client_id = $1 AND exercise = $2
        ORDER BY achieved_at DESC`,
      [client.id, exercise],
    ),
    pool.query(
      `SELECT sl.id AS set_log_id, sl.exercise_ref, sl.weight_kg, sl.reps,
              sl.duration_seconds, sl.band_colour, sl.logged_at,
              s.id AS session_id, s.session_number, s.scheduled_at,
              b.id AS block_id, b.block_number
         FROM set_logs sl
         JOIN sessions s ON s.id = sl.session_id
         JOIN blocks b ON b.id = s.block_id
        WHERE b.client_id = $1
          AND sl.completed = true
          AND COALESCE(sl.is_warmup, false) = false
        ORDER BY sl.logged_at DESC`,
      [client.id],
    ),
  ]);

  // Filter logged rows to only those matching the requested exercise name
  const logged = loggedRes.rows.filter(
    (row) => parseExerciseName(row.exercise_ref) === exercise,
  );

  return NextResponse.json({
    records: recordsRes.rows,
    logged,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const body = await request.json();
  const { exercise, unit, value: rawValue, reps, achieved_at, note } = body;

  if (!exercise || typeof exercise !== "string") {
    return NextResponse.json({ error: "exercise is required" }, { status: 400 });
  }
  if (!unit || !["kg", "band", "reps", "time"].includes(unit)) {
    return NextResponse.json({ error: "unit must be kg, band, reps, or time" }, { status: 400 });
  }
  if (!achieved_at || typeof achieved_at !== "string") {
    return NextResponse.json({ error: "achieved_at is required" }, { status: 400 });
  }

  // Validate date — can't be in the future
  const today = new Date().toISOString().slice(0, 10);
  if (achieved_at > today) {
    return NextResponse.json({ error: "The date can't be in the future." }, { status: 400 });
  }

  const pool = getPool();
  const userName = user.name || user.email || "Staff";

  // Map unit to metric + value + band_colour
  let metric: string;
  let value: number | null = null;
  let repCount: number | null = reps != null ? Number(reps) : null;
  let bandColour: string | null = null;

  if (unit === "kg") {
    metric = "weight";
    value = rawValue != null ? Number(rawValue) : null;
    if (value == null || value <= 0 || Number.isNaN(value)) {
      return NextResponse.json({ error: "Enter a value." }, { status: 400 });
    }
  } else if (unit === "band") {
    metric = "band";
    bandColour = typeof rawValue === "string" ? rawValue.trim() : null;
    if (!bandColour) {
      return NextResponse.json({ error: "Enter a value." }, { status: 400 });
    }
    // Look up sort_order for the band colour (active bands across all sets)
    const bandRes = await pool.query(
      `SELECT sort_order FROM bands WHERE LOWER(colour) = LOWER($1) AND active = true LIMIT 1`,
      [bandColour],
    );
    if (bandRes.rows.length === 0) {
      return NextResponse.json({ error: "Enter a value." }, { status: 400 });
    }
    value = bandRes.rows[0].sort_order;
  } else if (unit === "reps") {
    metric = "reps";
    value = rawValue != null ? Number(rawValue) : null;
    if (value == null || value <= 0 || Number.isNaN(value)) {
      return NextResponse.json({ error: "Enter a value." }, { status: 400 });
    }
    repCount = null; // reps metric doesn't use rep_count
  } else {
    // time
    metric = "duration";
    // Accept "mm:ss" or raw seconds
    if (typeof rawValue === "string" && rawValue.includes(":")) {
      const parts = rawValue.split(":");
      value = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else {
      value = rawValue != null ? Number(rawValue) : null;
    }
    if (value == null || value <= 0 || isNaN(value)) {
      return NextResponse.json({ error: "Enter a value." }, { status: 400 });
    }
  }

  let trimmedNote = typeof note === "string" ? note.trim() || null : null;
  if (trimmedNote && trimmedNote.length > 500) {
    return NextResponse.json({ error: "Note is too long" }, { status: 400 });
  }

  const achievedAtISO = `${achieved_at}T12:00:00Z`;

  const result = await pool.query(
    `INSERT INTO personal_records
       (client_id, exercise, metric, value, rep_count, achieved_at, source, recorded_by, note, band_colour)
     VALUES ($1, $2, $3, $4, $5, $6, 'manual', $7, $8, $9)
     RETURNING id, metric, value, rep_count, achieved_at, source, recorded_by, note, band_colour`,
    [client.id, exercise, metric, value, repCount, achievedAtISO, userName, trimmedNote, bandColour],
  );

  return NextResponse.json(result.rows[0], { status: 201 });
}
