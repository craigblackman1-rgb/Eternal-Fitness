import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getEmailSender } from "@/lib/email";
import { buildInvoiceReadyEmail } from "@/lib/email-templates/invoice-ready";
import { buildInvoiceBody } from "@/lib/documents/invoice-body";
import { hasPriorSend, recordEmailEvent } from "@/lib/email-send-events";

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://eternal-fitness.co.uk";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, clients(id, name, email)")
    .eq("id", params.id)
    .single();

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (invoice.status !== "draft") {
    return NextResponse.json({ error: "Invoice has already been sent" }, { status: 400 });
  }

  const { data: lines } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", params.id)
    .order("sort_order");

  const lineItems = (lines ?? []).map((li: Record<string, unknown>) => ({
    description: li.description as string,
    quantity: li.quantity as number,
    unit_price: li.unit_price as number,
    line_total: li.line_total as number,
  }));

  const body = buildInvoiceBody({
    invoice_number: invoice.invoice_number,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    vat_total: invoice.vat_total,
    total: invoice.total,
    notes: invoice.notes,
    line_items: lineItems,
  });

  const admin = createAdminClient();
  const { data: doc, error: docErr } = await admin
    .from("client_documents")
    .insert({
      client_id: invoice.client_id,
      kind: "invoice",
      title: `Invoice ${invoice.invoice_number}`,
      body,
      requires_client_signature: false,
      requires_trainer_signature: false,
      status: "draft",
      version: 1,
    })
    .select("id")
    .single();

  if (docErr || !doc) {
    return NextResponse.json({ error: docErr?.message || "Failed to create document" }, { status: 500 });
  }

  await supabase
    .from("invoices")
    .update({
      client_document_id: doc.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  const recipient = (invoice.clients?.email || "").trim();
  if (!recipient) {
    return NextResponse.json(
      { error: "No email address on file for this client. Add one on the client record, then try again." },
      { status: 400 },
    );
  }

  const viewUrl = `${SITE_ORIGIN}/documents/${doc.id}/sign`;
  const html = buildInvoiceReadyEmail({
    clientName: invoice.clients?.name || "",
    greetingName: invoice.clients?.name || "",
    invoiceNumber: invoice.invoice_number,
    totalFormatted: `£${Number(invoice.total).toFixed(2)}`,
    dueDate: invoice.due_date,
    viewUrl,
  });

  const alreadySent = await hasPriorSend("document", doc.id);
  const sender = getEmailSender();

  let result;
  try {
    result = await sender.send({
      to: recipient,
      subject: `Your invoice is ready: ${invoice.invoice_number}`,
      html,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Email send failed";
    return NextResponse.json({ error: `Email send failed: ${message}` }, { status: 502 });
  }

  await supabase
    .from("invoices")
    .update({ status: "sent", updated_at: new Date().toISOString() })
    .eq("id", params.id);

  await admin
    .from("client_documents")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sg_message_id: result.messageId || null,
      updated_at: new Date().toISOString(),
      emailed: !result.dryRun,
    })
    .eq("id", doc.id);

  if (!result.dryRun) {
    await recordEmailEvent({
      entityType: "document",
      entityId: doc.id,
      event: alreadySent ? "resent" : "sent",
      recipient,
      sgMessageId: result.messageId,
    });
  }

  return NextResponse.json({ success: true, documentId: doc.id, dryRun: Boolean(result.dryRun) });
}
