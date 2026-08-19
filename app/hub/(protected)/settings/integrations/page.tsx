import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { IntegrationsManager } from "./IntegrationsManager";
import { HubPageHeader } from "@/components/hub";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Integrations"
        subtitle="Connect the studio calendar so every scheduled session appears in Outlook automatically. The calendar is a view of the training plan — sessions are still scheduled in the hub."
      />
      <IntegrationsManager />
    </div>
  );
}
