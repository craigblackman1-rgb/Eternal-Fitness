import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { IntegrationsManager } from "./IntegrationsManager";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect the studio calendar so every scheduled session appears in Outlook automatically.
          The calendar is a view of the training plan — sessions are still scheduled in the hub.
        </p>
      </div>
      <IntegrationsManager />
    </div>
  );
}
