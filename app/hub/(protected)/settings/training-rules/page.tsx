import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { TrainingRuleTypesManager } from "./TrainingRuleTypesManager";
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
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Training rules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The rule types available when setting a client&apos;s structured programming rules
            (Client → Edit → Training Rules). Add a new type here first — no deploy needed — then it
            shows up on every client&apos;s editor. The Plan Agent applies these systematically, grouped
            by bucket, instead of relying on it to parse free text.
          </p>
        </div>
      </div>
      <TrainingRuleTypesManager initialRuleTypes={(ruleTypes ?? []) as TrainingRuleType[]} />
    </div>
  );
}
