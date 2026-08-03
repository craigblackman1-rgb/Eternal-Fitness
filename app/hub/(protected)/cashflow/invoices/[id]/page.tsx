import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { InvoiceDetailClient } from "./InvoiceDetailClient";
import type { DBInvoice, DBInvoiceLineItem } from "@/types";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, clients(name, client_number)")
    .eq("id", params.id)
    .single();

  if (!invoice) notFound();

  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", params.id)
    .order("sort_order");

  return (
    <InvoiceDetailClient
      invoice={invoice as DBInvoice & { clients?: { name: string; client_number: number } | null }}
      lineItems={(lineItems ?? []) as DBInvoiceLineItem[]}
    />
  );
}
