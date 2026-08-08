import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { TemplateEditorClient } from "./TemplateEditorClient";
import type { WorkoutTemplate } from "@/types";

export default async function WorkoutTemplateEditPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!data) notFound();

  const template = data as WorkoutTemplate;

  let sourceClientName: string | null = null;
  if (template.source_client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", template.source_client_id)
      .single();
    sourceClientName = (client as { name: string } | null)?.name ?? null;
  }

  return (
    <TemplateEditorClient
      template={template}
      sourceClientName={sourceClientName}
    />
  );
}
