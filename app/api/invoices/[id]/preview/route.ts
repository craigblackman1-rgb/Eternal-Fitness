import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { buildInvoiceBody } from "@/lib/documents/invoice-body";
import { buildInvoiceReadyEmail } from "@/lib/email-templates/invoice-ready";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, clients(id, name, email)")
    .eq("id", params.id)
    .single();

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

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

  const emailHtml = buildInvoiceReadyEmail({
    clientName: invoice.clients?.name || "",
    greetingName: invoice.clients?.name || "",
    invoiceNumber: invoice.invoice_number,
    totalFormatted: `£${Number(invoice.total).toFixed(2)}`,
    dueDate: invoice.due_date,
    viewUrl: "#preview",
  });

  return NextResponse.json({ body, emailHtml });
}
