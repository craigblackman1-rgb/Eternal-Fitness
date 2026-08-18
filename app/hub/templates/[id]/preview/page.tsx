import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { TemplatePreviewClient } from "./TemplatePreviewClient";
import type { DocumentTemplate } from "@/lib/documents/types";

export const dynamic = "force-dynamic";

export default async function TemplatePreviewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("document_templates").select("*").eq("id", params.id).single();
  if (!data) notFound();

  return <TemplatePreviewClient template={data as DocumentTemplate} />;
}
