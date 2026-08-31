import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM band_sets ORDER BY owner_type ASC, name ASC`,
  );
  return NextResponse.json(res.rows);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, owner_type, client_id } = await request.json() as {
    name: string;
    owner_type?: "studio" | "client";
    client_id?: string | null;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const pool = getPool();
  const res = await pool.query(
    `INSERT INTO band_sets (name, owner_type, client_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name.trim(), owner_type ?? "client", client_id ?? null],
  );

  return NextResponse.json(res.rows[0], { status: 201 });
}
