import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { WorkoutTemplateBrowser } from "./workout-template-browser";
import { resolveArchetypeFocusLabels, type PlanAgentSettingsMap } from "@/lib/planAgentPrompt";
import type { WorkoutTemplate } from "@/types";

export default async function WorkoutTemplatesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  const PAGE_SIZE = 1000;
  const allTemplates: WorkoutTemplate[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page } = await supabase
      .from("workout_templates")
      .select("*")
      .order("updated_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (!page || page.length === 0) break;
    allTemplates.push(...(page as WorkoutTemplate[]));
    if (page.length < PAGE_SIZE) break;
  }

  const archetypeOptions = [...new Set(allTemplates.flatMap((t) => t.archetypes))].sort();
  const movementOptions = [...new Set(allTemplates.flatMap((t) => t.movement_type))].sort();
  const muscleOptions = [...new Set(allTemplates.flatMap((t) => t.muscle_groups))].sort();
  const equipmentOptions = [...new Set(allTemplates.flatMap((t) => t.equipment))].sort();
  const conditionTagOptions = [...new Set(allTemplates.flatMap((t) => t.condition_tags))].sort();

  // Resolve the archetype focus labels (renameable under Plan Agent Settings) so the
  // browser's archetype filter reads the real A/B/C emphasis labels, not invented
  // condition-style names. Falls back to the defaults when no settings row exists.
  const { data: settingsRows } = await supabase
    .from("plan_agent_settings")
    .select("key, value_type, value");
  const settingsMap: PlanAgentSettingsMap = Object.fromEntries(
    ((settingsRows ?? []) as { key: string; value_type: string; value: unknown }[]).map((row) => [
      row.key,
      { value_type: row.value_type, value: row.value },
    ]),
  );
  const archetypeLabels = resolveArchetypeFocusLabels(settingsMap);

  return (
    <WorkoutTemplateBrowser
      templates={allTemplates}
      archetypeOptions={archetypeOptions}
      movementOptions={movementOptions}
      muscleOptions={muscleOptions}
      equipmentOptions={equipmentOptions}
      conditionTagOptions={conditionTagOptions}
      archetypeLabels={archetypeLabels}
    />
  );
}
