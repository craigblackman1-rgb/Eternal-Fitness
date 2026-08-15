import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPool } from "@/lib/pg-client";
import { DOCUMENT_KIND_LABEL, type DocumentKind } from "@/lib/documents/types";

const ALLOWED_MIME = new Set(["application/pdf", "image/png", "image/jpeg"]);
const MAX_SIZE = 10 * 1024 * 1024;

const VALID_KINDS = new Set<string>(Object.keys(DOCUMENT_KIND_LABEL));

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const clientNumberRaw = form.get("client_id");
  const kind = form.get("kind") as string | null;
  const titleRaw = form.get("title") as string | null;
  const clientSignedDate = form.get("client_signed_date") as string | null;
  const file = form.get("file");

  if (!clientNumberRaw || !kind || !file || !(file instanceof File)) {
    return NextResponse.json({ error: "client_id, kind, and file are required" }, { status: 400 });
  }

  if (!VALID_KINDS.has(kind)) {
    return NextResponse.json({ error: `Invalid kind "${kind}"` }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Only PDF, PNG, and JPEG files are accepted" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File must be 10 MB or less" }, { status: 400 });
  }

  const clientNumber = Number(clientNumberRaw);
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("client_number", clientNumber)
    .single();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());

  const title = titleRaw && titleRaw.trim() ? titleRaw.trim() : DOCUMENT_KIND_LABEL[kind as DocumentKind];

  const pool = getPool();
  const pg = await pool.connect();
  try {
    await pg.query("BEGIN");

    const docRes = await pg.query(
      `INSERT INTO client_documents
        (client_id, kind, title, body, status, version, source_type, source_file_name, source_file_mime, source_file_size, client_signed_date, requires_client_signature, requires_trainer_signature)
       VALUES ($1, $2, $3, $4, $5, 1, 'scan', $6, $7, $8, $9, false, false)
       RETURNING id`,
      [
        client.id,
        kind,
        title,
        JSON.stringify({ sections: [] }),
        "signed",
        file.name,
        file.type,
        file.size,
        clientSignedDate || null,
      ],
    );
    const docId: string = docRes.rows[0].id;

    await pg.query(
      `INSERT INTO client_document_files (document_id, data) VALUES ($1, $2)`,
      [docId, buffer],
    );

    await pg.query("COMMIT");
    return NextResponse.json({ id: docId }, { status: 201 });
  } catch (e) {
    await pg.query("ROLLBACK");
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 },
    );
  } finally {
    pg.release();
  }
}
