import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { TemplateEditorClient } from "./TemplateEditorClient";
import type { DocumentTemplate } from "@/lib/documents/types";

export default async function TemplateEditPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("document_templates").select("*").eq("id", params.id).single();
  if (!data) notFound();

  const { data: clients } = await supabase
    .from("clients")
    .select("client_number, name")
    .order("name", { ascending: true });

  return (
    <TemplateEditorClient
      template={data as DocumentTemplate}
      clients={(clients ?? []).filter((c) => c.client_number != null) as { client_number: number; name: string }[]}
    />
  );
}
