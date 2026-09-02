import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";

function escapeFilename(name: string | null) {
  return (name || "document").replace(/"/g, '\\"');
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: doc } = await supabase
    .from("client_documents")
    .select("id, source_type, source_file_name, source_file_mime")
    .eq("id", params.id)
    .single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (doc.source_type !== "scan") {
    return NextResponse.json({ error: "No file attached to this document" }, { status: 404 });
  }

  const pool = getPool();
  const res = await pool.query(
    `SELECT data FROM client_document_files WHERE document_id = $1`,
    [params.id],
  );
  if (res.rows.length === 0) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const data: Buffer = res.rows[0].data;
  const body = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const headers = new Headers();
  headers.set("Content-Type", doc.source_file_mime || "application/octet-stream");

  const inline = new URL(request.url).searchParams.get("inline") === "1";
  headers.set(
    "Content-Disposition",
    `${inline ? "inline" : "attachment"}; filename="${escapeFilename(doc.source_file_name)}"`,
  );
  headers.set("Content-Length", String(data.length));

  return new NextResponse(body, { status: 200, headers });
}

export async function HEAD(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: doc } = await supabase
    .from("client_documents")
    .select("id, source_type, source_file_name, source_file_mime")
    .eq("id", params.id)
    .single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (doc.source_type !== "scan") {
    return NextResponse.json({ error: "No file attached to this document" }, { status: 404 });
  }

  const pool = getPool();
  const res = await pool.query(
    `SELECT length(data) AS len FROM client_document_files WHERE document_id = $1`,
    [params.id],
  );
  if (res.rows.length === 0) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", doc.source_file_mime || "application/octet-stream");

  const inline = new URL(request.url).searchParams.get("inline") === "1";
  headers.set(
    "Content-Disposition",
    `${inline ? "inline" : "attachment"}; filename="${escapeFilename(doc.source_file_name)}"`,
  );
  headers.set("Content-Length", String(res.rows[0].len));

  return new NextResponse(null, { status: 200, headers });
}
