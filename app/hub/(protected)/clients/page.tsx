import { createClient } from "@/lib/supabase-server";
import { IconUsers, IconUserPlus } from "@/components/icons";
import { HubCard, HubPageHeader, EmptyState } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { ClientsTable } from "./clients-table";
import Link from "next/link";

export default async function ClientsPage() {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*, compliance_status, outstanding_actions, group_type, pace_mode")
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Clients"
        subtitle="Manage client profiles and training blocks"
        actions={
          <Link href="/hub/clients/new">
            <Button className="bg-rose hover:bg-rose/90 text-white rounded-lg px-3.5 py-1.5 h-auto text-sm font-semibold gap-1.5">
              <IconUserPlus className="w-4 h-4" /> New Client
            </Button>
          </Link>
        }
      />

      {clients && clients.length > 0 ? (
        <ClientsTable clients={clients} />
      ) : (
        <HubCard>
          <EmptyState
            icon={<IconUsers className="w-9 h-9" />}
            title="No clients yet"
            description="Add your first client to start building training blocks"
            cta={{ label: "Add Your First Client", href: "/hub/clients/new" }}
          />
        </HubCard>
      )}
    </div>
  );
}
