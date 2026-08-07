import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";
import type { SessionVersion } from "@/types";

interface LatestCompletedRow {
  id: string;
  data: { versions?: { studio?: SessionVersion; home?: SessionVersion }; session_log?: { completed_at?: string | null } };
  session_number: number;
  week: number;
  phase: string;
  archetype: string;
  block_number: number;
}

/** Most recent OTHER session for this client with a logged completion, across all
 *  their blocks — the source for "Roll Over Previous Session". Ordered by the
 *  session's actual completion time (data.session_log.completed_at), not creation
 *  order, so it reflects what was really last delivered, not just the last row. */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const exclude = searchParams.get("exclude");

  const pool = getPool();

  // The route param is the client-facing `client_number` (e.g. "19" in
  // /hub/clients/19/...), not `clients.id` (uuid) — resolve it first, same
  // pattern as /api/claude/generate-block.
  const clientRes = await pool.query<{ id: string }>(
    `SELECT id FROM clients WHERE client_number = $1 LIMIT 1`,
    [parseInt(params.id, 10)],
  );
  const clientUuid = clientRes.rows[0]?.id;
  if (!clientUuid) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const res = await pool.query<LatestCompletedRow>(
    `SELECT s.id, s.data, s.session_number, s.week, s.phase, s.archetype, b.block_number
       FROM sessions s
       JOIN blocks b ON b.id = s.block_id
      WHERE b.client_id = $1
        AND ($2::uuid IS NULL OR s.id != $2)
        AND s.data->'session_log'->>'completed_at' IS NOT NULL
      ORDER BY (s.data->'session_log'->>'completed_at')::timestamptz DESC
      LIMIT 1`,
    [clientUuid, exclude],
  );

  const row = res.rows[0];
  if (!row) return NextResponse.json(null);

  return NextResponse.json({
    session_id: row.id,
    session_number: row.session_number,
    block_number: row.block_number,
    week: row.week,
    phase: row.phase,
    archetype: row.archetype,
    completed_at: row.data.session_log?.completed_at ?? null,
    versions: row.data.versions ?? { warm_up: [], main_block: [], cooldown: [] },
  });
}
