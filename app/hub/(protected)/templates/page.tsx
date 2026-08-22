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

  // CR-EF-075: same query the template detail page already runs — the library
  // needs it so a card can assign without a hop through that page first.
  const { data: clients } = await supabase
    .from("clients")
    .select("client_number, name")
    .order("name", { ascending: true });

  return (
    <TemplatesLibrary
      templates={templates}
      clients={(clients ?? []).filter((c) => c.client_number != null) as { client_number: number; name: string }[]}
    />
  );
}
