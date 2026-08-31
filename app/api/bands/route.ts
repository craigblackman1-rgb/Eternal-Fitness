import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM bands WHERE active = true ORDER BY sort_order ASC`,
  );
  return NextResponse.json(res.rows);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { colour, colour_hex, tension_label, tension_kg, sort_order } = await request.json() as {
    colour: string;
    colour_hex: string;
    tension_label: string;
    tension_kg?: number | null;
    sort_order?: number | null;
  };

  if (!colour?.trim() || !colour_hex?.trim() || !tension_label?.trim()) {
    return NextResponse.json({ error: "colour, colour_hex, and tension_label are required" }, { status: 400 });
  }

  const pool = getPool();

  // Auto-assign sort_order if not provided (append to end)
  let order = sort_order;
  if (order == null) {
    const maxRes = await pool.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM bands`);
    order = maxRes.rows[0].next;
  }

  const res = await pool.query(
    `INSERT INTO bands (colour, colour_hex, tension_label, tension_kg, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [colour.trim(), colour_hex.trim(), tension_label.trim(), tension_kg ?? null, order],
  );

  return NextResponse.json(res.rows[0], { status: 201 });
}
