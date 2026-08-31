import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    colour?: string;
    colour_hex?: string;
    tension_label?: string;
    tension_kg?: number | null;
    sort_order?: number;
    active?: boolean;
  };

  const pool = getPool();
  const allowed = ["colour", "colour_hex", "tension_label", "tension_kg", "sort_order", "active"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  }

  const setClauses = Object.keys(update).map((k, i) => `${k} = $${i + 2}`);
  const values = [params.id, ...Object.values(update)];

  const res = await pool.query(
    `UPDATE bands SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
    values,
  );

  if (res.rowCount === 0) {
    return NextResponse.json({ error: "Band not found" }, { status: 404 });
  }
  return NextResponse.json(res.rows[0]);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getPool();
  // Soft-delete — set active=false rather than removing the row,
  // so historical set_logs with band_colour references stay valid.
  const res = await pool.query(
    `UPDATE bands SET active = false WHERE id = $1 RETURNING id`,
    [params.id],
  );

  if (res.rowCount === 0) {
    return NextResponse.json({ error: "Band not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
