import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";
import type { SessionVersion } from "@/types";

interface CompletedSessionRow {
  id: string;
  data: {
    versions?: { studio?: SessionVersion; home?: SessionVersion };
    session_log?: { completed_at?: string | null };
  };
  session_number: number;
  week: number;
  phase: string;
  archetype: string;
  block_number: number;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const exclude = searchParams.get("exclude");

  const pool = getPool();

  const clientRes = await pool.query<{ id: string }>(
    `SELECT id FROM clients WHERE client_number = $1 LIMIT 1`,
    [parseInt(params.id, 10)],
  );
  const clientUuid = clientRes.rows[0]?.id;
  if (!clientUuid) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const res = await pool.query<CompletedSessionRow>(
    `SELECT s.id, s.data, s.session_number, s.week, s.phase, s.archetype, b.block_number
       FROM sessions s
       JOIN blocks b ON b.id = s.block_id
      WHERE b.client_id = $1
        AND ($2::uuid IS NULL OR s.id != $2)
        AND s.data->'session_log'->>'completed_at' IS NOT NULL
      ORDER BY (s.data->'session_log'->>'completed_at')::timestamptz DESC`,
    [clientUuid, exclude],
  );

  // Normalise Postgres TIMESTAMPTZ to strict ISO-8601 so WebKit (iOS Safari)
  // doesn't render "Invalid Date". Node/V8 parses the raw format correctly;
  // the client then only ever receives a string every engine agrees on.
  return NextResponse.json(
    res.rows.map((row) => ({
      session_id: row.id,
      session_number: row.session_number,
      block_number: row.block_number,
      week: row.week,
      phase: row.phase,
      archetype: row.archetype,
      completed_at: row.data.session_log?.completed_at
        ? new Date(row.data.session_log.completed_at).toISOString()
        : null,
      versions: row.data.versions ?? {},
    }))
  );
}
