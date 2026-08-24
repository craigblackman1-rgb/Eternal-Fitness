import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { DOCUMENT_KIND_LABEL, isFullySigned } from "@/lib/documents/types";
import { getEmailSender } from "@/lib/email";

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://eternal-fitness.co.uk";

// Same resolution order as app/api/leads/route.ts's resolveBusinessEmail() and
// app/api/cron/check-updates-due/route.ts's resolveNotifyEmail(), so
// ESTHER_NOTIFY_EMAIL redirects every staff-notification path with one env var.
function resolveNotifyEmail(): string {
  if (process.env.ESTHER_NOTIFY_EMAIL) {
    return process.env.ESTHER_NOTIFY_EMAIL;
  }
  const raw = process.env.MAIL_FROM || "";
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  if (raw.trim()) return raw.trim();
  return "esther.fair@eternal-fitness.co.uk";
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Apply a signature. The client signs unauthenticated via the document UUID, so
// this uses the service-role client. role = 'client' | 'trainer'.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { role, name, signature, date, consent_choices, feedback_responses } = await request.json();

  if (role !== "client" && role !== "trainer") {
    return NextResponse.json({ error: "role must be 'client' or 'trainer'" }, { status: 400 });
  }
  if (!name?.trim() || !signature?.trim()) {
    return NextResponse.json({ error: "Name and signature are required" }, { status: 400 });
  }

  const { data: doc, error: readErr } = await admin
    .from("client_documents")
    .select("*")
    .eq("id", params.id)
    .single();
  if (readErr || !doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const signedDate = date || new Date().toISOString().slice(0, 10);
  const update: Record<string, unknown> =
    role === "client"
      ? { client_name: name.trim(), client_signature: signature.trim(), client_signed_date: signedDate }
      : { trainer_name: name.trim(), trainer_signature: signature.trim(), trainer_signed_date: signedDate };

  // Trainer signature is applied automatically by Esther Fair upon client submission
  // (same convention as the legacy standalone /agreement and /parq pages), so a client
  // signing a document that requires a trainer signature doesn't sit waiting on Esther.
  if (role === "client" && doc.requires_trainer_signature && !doc.trainer_signature) {
    update.trainer_name = "Esther Fair";
    update.trainer_signature = "Esther Fair";
    update.trainer_signed_date = signedDate;
  }

  if (role === "client" && consent_choices && typeof consent_choices === "object") {
    update.consent_choices = consent_choices;
  }
  if (role === "client" && feedback_responses && typeof feedback_responses === "object") {
    update.feedback_responses = feedback_responses;
  }

  const next = { ...doc, ...update };
  if (isFullySigned(next)) {
    update.status = "signed";
    update.signed_at = new Date().toISOString();
  } else if (doc.status === "draft") {
    update.status = "sent";
  }
  update.updated_at = new Date().toISOString();

  const { error } = await admin.from("client_documents").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Newly fully signed (CR-EF-026): supersede any other still-open document
  // of the same kind for this client, so an abandoned earlier "Sent" attempt
  // doesn't keep sitting in the register next to the one that actually got
  // signed, reading as "not signed" at a glance.
  if (update.status === "signed") {
    await admin
      .from("client_documents")
      .update({ status: "superseded", updated_at: new Date().toISOString() })
      .eq("client_id", doc.client_id)
      .eq("kind", doc.kind)
      .neq("id", doc.id)
      .in("status", ["draft", "sent"]);
  }

  // CR-EF-087: notify Esther when a client (not a trainer) has signed a
  // document. The status update above is already committed, so an email
  // failure must never fail the sign request — swallow and log it.
  if (role === "client" && update.status === "signed") {
    try {
      const clientDisplayName = name.trim() || doc.client_name || "A client";
      const kindLabel = DOCUMENT_KIND_LABEL[doc.kind as keyof typeof DOCUMENT_KIND_LABEL] || doc.kind;
      const docUrl = `${SITE_ORIGIN}/hub/clients/${doc.client_id}/documents/${doc.id}`;
      const sender = getEmailSender();
      await sender.send({
        to: resolveNotifyEmail(),
        subject: `${clientDisplayName} signed ${kindLabel}`,
        html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.5;">
          <p><strong>${escapeHtml(clientDisplayName)}</strong> signed the ${escapeHtml(kindLabel)} &ldquo;${escapeHtml(doc.title)}&rdquo;.</p>
          <p>Signed on ${escapeHtml(signedDate)}.</p>
          <p><a href="${escapeHtml(docUrl)}">View document in the hub</a></p>
        </div>`,
      });
    } catch (notifyErr) {
      console.error("[documents/sign:notify]", notifyErr);
    }
  }

  return NextResponse.json({ success: true, signed: update.status === "signed" });
}
