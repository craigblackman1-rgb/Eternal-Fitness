import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { TrainingRuleTypesManager } from "./TrainingRuleTypesManager";
import { HubPageHeader } from "@/components/hub";
import type { TrainingRuleType } from "@/types";

export default async function TrainingRuleTypesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  const { data: ruleTypes } = await supabase
    .from("training_rule_types")
    .select("*")
    .order("bucket", { ascending: true })
    .order("label", { ascending: true });

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Training rules"
        subtitle="The rule types available when setting a client's structured programming rules (Client → Edit → Training Rules). Add a new type here first — no deploy needed — then it shows up on every client's editor. The Plan Agent applies these systematically, grouped by bucket, instead of relying on it to parse free text."
      />
      <TrainingRuleTypesManager initialRuleTypes={(ruleTypes ?? []) as TrainingRuleType[]} />
    </div>
  );
}
