import { createClient } from "@/lib/supabase-server";
import { RESOURCES } from "@/lib/resources";
import { HubPageHeader } from "@/components/hub";
import { ResourcesMatrix } from "./resources-matrix";

interface ClientResourceRow {
  id: string;
  name: string;
  client_number: number | null;
  resource_visibility: Record<string, boolean> | null;
}

export default async function ResourcesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, client_number, resource_visibility")
    .neq("client_status", "archived")
    .order("name");

  const clients: ClientResourceRow[] = (data ?? []) as ClientResourceRow[];

  return (
    <div>
      <HubPageHeader
        title="Portal resources"
        subtitle="Every extra tool available in a client's portal, and who currently has each one switched on. Toggling stays in each client's Edit form — this page is the glance-across-everyone view that was missing."
      />
      <div className="mt-5">
        <ResourcesMatrix clients={clients} resources={RESOURCES} />
      </div>
    </div>
  );
}
