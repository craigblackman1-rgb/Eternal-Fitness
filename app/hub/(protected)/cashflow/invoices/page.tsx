import { createClient } from "@/lib/supabase-server";
import { InvoicesPageClient } from "./InvoicesPageClient";

export default async function InvoicesPage() {
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, clients(name, client_number, display_code)")
    .order("created_at", { ascending: false });

  const list = invoices ?? [];

  const outstandingTotal = list
    .filter((inv) => inv.status !== "paid" && inv.status !== "void")
    .reduce((sum, inv) => sum + Number(inv.total), 0);

  return (
    <InvoicesPageClient invoices={list} outstandingTotal={outstandingTotal} />
  );
}
