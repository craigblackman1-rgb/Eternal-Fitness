import { createClient } from "@/lib/supabase-server";
import { TemplatesLibrary } from "./TemplatesLibrary";
import type { DocumentTemplate } from "@/lib/documents/types";

export default async function TemplatesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("document_templates")
    .select("*")
    .order("kind", { ascending: true });
  const templates = (data || []) as DocumentTemplate[];

  return <TemplatesLibrary templates={templates} />;
}
