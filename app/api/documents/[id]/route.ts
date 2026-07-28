import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getEmailSender } from "@/lib/email";
import { buildDocumentReadyEmail } from "@/lib/email-templates/document-ready";
import { hasPriorSend, recordEmailEvent } from "@/lib/email-send-events";

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://eternal-fitness.co.uk";

// Public read for the client sign page — mediated by the unguessable UUID.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_documents")
    .select("id, kind, title, body, status, version, requires_client_signature, requires_trainer_signature, client_name, client_signature, client_signed_date, trainer_name, trainer_signature, trainer_signed_date")
    .eq("id", params.id)
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

// Esther edits the document (title / body) or sends it (status → sent).
// action "send_email" is the ONLY way status becomes "sent" — it's what
// actually dispatches through a real email backend and records `emailed`
// accurately. There used to be a second, bare "send" action that just flipped
// status without ever emailing anything or setting `emailed` — that's what
// let a document read as "sent" when nothing had gone out. Removed; nothing
// else called it (confirmed via repo-wide search before deleting).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, body, action } = await request.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (action === "send_email") {
    return sendDocumentEmail(params.id);
  } else {
    if (title !== undefined) update.title = title;
    if (body !== undefined) update.body = body;
  }

  const { error } = await supabase.from("client_documents").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Any document can be deleted — including signed history (Esther may want to
// tidy up drafts, test rows, or records created in error). Intentional hard
// delete, mirroring app/api/updates/[updateId]/route.ts's DELETE.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase.from("client_documents").select("id").eq("id", params.id).single();
  if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { error } = await supabase.from("client_documents").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

async function sendDocumentEmail(docId: string): Promise<NextResponse> {
  const admin = createAdminClient();

  const { data: doc, error: docError } = await admin
    .from("client_documents")
    .select("id, title, status, client_id, client_name")
    .eq("id", docId)
    .single();
  if (docError || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const { data: client, error: clientError } = await admin
    .from("clients")
    .select("id, name, email")
    .eq("id", doc.client_id)
    .single();
  if (clientError || !client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const recipient = (client.email || "").trim();
  if (!recipient) {
    return NextResponse.json(
      { error: "No email address on file for this client. Add one on the client record, then try again." },
      { status: 400 },
    );
  }

  const signUrl = `${SITE_ORIGIN}/documents/${doc.id}/sign`;
  const html = buildDocumentReadyEmail({
    clientName: doc.client_name || client.name,
    greetingName: client.name,
    documentTitle: doc.title,
    signUrl,
  });

  const alreadySent = await hasPriorSend("document", docId);

  const sender = getEmailSender();
  const result = await sender.send({
    to: recipient,
    subject: `Your document is ready to sign: ${doc.title}`,
    html,
  });

  const { error: updError } = await admin.from("client_documents").update({
    status: "sent",
    sent_at: new Date().toISOString(),
    sg_message_id: result.messageId || null,
    updated_at: new Date().toISOString(),
    // Distinct from status — status "sent" just means a send was attempted;
    // this is whether a real email backend actually dispatched it.
    emailed: !result.dryRun,
  }).eq("id", docId);
  if (updError) return NextResponse.json({ error: updError.message }, { status: 500 });

  if (!result.dryRun) {
    await recordEmailEvent({
      entityType: "document",
      entityId: docId,
      event: alreadySent ? "resent" : "sent",
      recipient,
      sgMessageId: result.messageId,
    });
  }

  return NextResponse.json({ success: true, dryRun: Boolean(result.dryRun) });
}
