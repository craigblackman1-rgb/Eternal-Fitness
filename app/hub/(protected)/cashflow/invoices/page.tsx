import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { HubPageHeader, HubCard, EmptyState } from "@/components/hub";
import { IconPlus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { InvoicesTable } from "./invoices-table";

export default async function InvoicesPage() {
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, clients(name, client_number, display_code)")
    .order("created_at", { ascending: false });

  const list = invoices ?? [];

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Invoices"
        subtitle="Create and send structured invoices to clients"
        actions={
          <Link href="/hub/cashflow/invoices/new">
            <Button className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white">
              <IconPlus className="w-4 h-4" />
              New invoice
            </Button>
          </Link>
        }
      />

      {list.length > 0 ? (
        <HubCard padded={false}>
          <InvoicesTable data={list} />
        </HubCard>
      ) : (
        <HubCard>
          <EmptyState
            icon={<IconPlus className="w-9 h-9" />}
            title="No invoices yet"
            description="Create your first invoice to send to a client"
            cta={{ label: "Create invoice", href: "/hub/cashflow/invoices/new" }}
          />
        </HubCard>
      )}
    </div>
  );
}
