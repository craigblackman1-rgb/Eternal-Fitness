import { NextResponse } from "next/server";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { getPool } from "@/lib/pg-client";

/**
 * Portal set-log routes — the client-authored counterpart to the staff route at
 * app/api/sessions/[id]/set-logs. Auth is the isolated portal session (never
 * staff auth), and the security boundary is server-side session ownership:
 * every request re-verifies that the session id in the URL belongs to a block
 * belonging to the authenticated client_id, AND that the client is on the
 * home_training delivery mode. logged_by is hardcoded to 'client' server-side —
 * a client-supplied value is never read.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns 'ok' when the session belongs to the client and they are on the
 *  home-training tier; otherwise the reason for refusal. */
async function checkSessionAccess(
  sessionId: string,
  clientId: string,
): Promise<"ok" | "not_found" | "wrong_mode"> {
  if (!UUID_RE.test(sessionId)) return "not_found";
  const pool = getPool();
  const res = await pool.query(
    `SELECT c.delivery_mode
       FROM sessions s
       JOIN blocks b ON b.id = s.block_id
       JOIN clients c ON c.id = b.client_id
      WHERE s.id = $1 AND b.client_id = $2
      LIMIT 1`,
    [sessionId, clientId],
  );
  const row = res.rows[0];
  if (!row) return "not_found";
  return row.delivery_mode === "home_training" ? "ok" : "wrong_mode";
}

function accessResponse(access: "not_found" | "wrong_mode"): NextResponse {
  if (access === "wrong_mode") {
    return NextResponse.json(
      { error: "Set logging is not available for your account." },
      { status: 403 },
    );
  }
  return NextResponse.json({ error: "Session not found" }, { status: 404 });
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getPortalSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await checkSessionAccess(params.id, session.clientId);
  if (access !== "ok") return accessResponse(access);

  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM set_logs
      WHERE session_id = $1
      ORDER BY exercise_ref ASC, set_number ASC`,
    [params.id],
  );
  return NextResponse.json(res.rows);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getPortalSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await checkSessionAccess(params.id, session.clientId);
  if (access !== "ok") return accessResponse(access);

  let body: {
    exercise_ref?: string;
    set_number?: number;
    reps?: number | null;
    weight_kg?: number | null;
    duration_seconds?: number | null;
    completed?: boolean;
    notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const exerciseRef = (body.exercise_ref ?? "").trim();
  if (!exerciseRef) {
    return NextResponse.json({ error: "exercise_ref is required" }, { status: 400 });
  }
  if (
    typeof body.set_number !== "number" ||
    !Number.isInteger(body.set_number) ||
    body.set_number < 1
  ) {
    return NextResponse.json({ error: "set_number must be a positive integer" }, { status: 400 });
  }

  const pool = getPool();
  const res = await pool.query(
    `INSERT INTO set_logs
       (session_id, exercise_ref, set_number, reps, weight_kg, duration_seconds,
        completed, logged_by, logged_at, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'client', NOW(), $8)
     RETURNING *`,
    [
      params.id,
      exerciseRef,
      body.set_number,
      body.reps ?? null,
      body.weight_kg ?? null,
      body.duration_seconds ?? null,
      body.completed ?? true,
      body.notes ?? null,
    ],
  );
  return NextResponse.json(res.rows[0], { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getPortalSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await checkSessionAccess(params.id, session.clientId);
  if (access !== "ok") return accessResponse(access);

  let body: {
    id?: string;
    reps?: number | null;
    weight_kg?: number | null;
    duration_seconds?: number | null;
    completed?: boolean;
    notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const logId = body.id ?? "";
  if (!UUID_RE.test(logId)) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const allowed = ["reps", "weight_kg", "duration_seconds", "completed", "notes"] as const;
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of allowed) {
    if (key in body) {
      values.push(body[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  }
  sets.push("logged_at = NOW()");

  values.push(logId);
  const idParam = `$${values.length}`;
  values.push(params.id);
  const sessionParam = `$${values.length}`;

  // Clients may only edit their own client-authored rows — never a
  // trainer-authored log on the same session.
  const pool = getPool();
  const res = await pool.query(
    `UPDATE set_logs
        SET ${sets.join(", ")}
      WHERE id = ${idParam}
        AND session_id = ${sessionParam}
        AND logged_by = 'client'
      RETURNING *`,
    values,
  );
  if (res.rows.length === 0) {
    return NextResponse.json({ error: "Set log not found" }, { status: 404 });
  }
  return NextResponse.json(res.rows[0]);
}
