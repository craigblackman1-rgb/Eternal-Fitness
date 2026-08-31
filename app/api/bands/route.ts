import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("band_set_id");

  const pool = getPool();
  let res;
  if (setId) {
    res = await pool.query(
      `SELECT * FROM bands WHERE active = true AND band_set_id = $1 ORDER BY sort_order ASC`,
      [setId],
    );
  } else {
    // Backwards compat: return all active bands when no set specified
    res = await pool.query(
      `SELECT * FROM bands WHERE active = true ORDER BY sort_order ASC`,
    );
  }
  return NextResponse.json(res.rows);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { colour, colour_hex, tension_label, tension_kg, sort_order, band_set_id } = await request.json() as {
    colour: string;
    colour_hex: string;
    tension_label: string;
    tension_kg?: number | null;
    sort_order?: number | null;
    band_set_id: string;
  };

  if (!colour?.trim() || !colour_hex?.trim() || !tension_label?.trim()) {
    return NextResponse.json({ error: "colour, colour_hex, and tension_label are required" }, { status: 400 });
  }
  if (!band_set_id) {
    return NextResponse.json({ error: "band_set_id is required" }, { status: 400 });
  }

  const pool = getPool();

  // Auto-assign sort_order if not provided (append to end within the set)
  let order = sort_order;
  if (order == null) {
    const maxRes = await pool.query(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM bands WHERE band_set_id = $1`,
      [band_set_id],
    );
    order = maxRes.rows[0].next;
  }

  const res = await pool.query(
    `INSERT INTO bands (colour, colour_hex, tension_label, tension_kg, sort_order, band_set_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [colour.trim(), colour_hex.trim(), tension_label.trim(), tension_kg ?? null, order, band_set_id],
  );

  return NextResponse.json(res.rows[0], { status: 201 });
}
