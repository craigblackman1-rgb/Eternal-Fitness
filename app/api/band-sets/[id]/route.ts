import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    name?: string;
    client_id?: string | null;
  };

  const pool = getPool();
  const allowed = ["name", "client_id"] as const;
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
    `UPDATE band_sets SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
    values,
  );

  if (res.rowCount === 0) {
    return NextResponse.json({ error: "Band set not found" }, { status: 404 });
  }
  return NextResponse.json(res.rows[0]);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Don't allow deleting the EF Studio set
  if (params.id === "00000000-0000-0000-0000-000000000001") {
    return NextResponse.json({ error: "Cannot delete the EF Studio set" }, { status: 400 });
  }

  const pool = getPool();
  // Deleting the set cascades to bands (ON DELETE CASCADE) and nulls client references (ON DELETE SET NULL)
  const res = await pool.query(
    `DELETE FROM band_sets WHERE id = $1 RETURNING id`,
    [params.id],
  );

  if (res.rowCount === 0) {
    return NextResponse.json({ error: "Band set not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
