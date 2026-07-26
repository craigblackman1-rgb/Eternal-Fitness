import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { PlanAgentSettingsManager } from "./PlanAgentSettingsManager";

export default async function PlanAgentSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  const { data: settings } = await supabase
    .from("plan_agent_settings")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Plan agent rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The principles, checklists and safety rules the Plan Agent follows when building training
            plans. Edit here — no deploy needed — the agent picks these up on the next conversation.
          </p>
        </div>
      </div>
      <PlanAgentSettingsManager initialSettings={(settings ?? []) as Array<{
        key: string;
        label: string;
        section: string;
        value_type: string;
        value: unknown;
        sort_order: number;
        description: string | null;
      }>} />
    </div>
  );
}
