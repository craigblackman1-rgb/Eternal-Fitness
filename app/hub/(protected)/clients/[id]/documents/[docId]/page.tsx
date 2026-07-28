import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { DocumentDetailClient } from "./DocumentDetailClient";
import { EmailDeliveryTimeline } from "@/components/hub/EmailDeliveryTimeline";
import type { ClientDocument } from "@/lib/documents/types";

export default async function DocumentDetailPage({ params }: { params: { id: string; docId: string } }) {
  const supabase = createClient();
  const { data: doc } = await supabase
    .from("client_documents")
    .select("*")
    .eq("id", params.docId)
    .single();
  if (!doc) notFound();

  const { data: client } = await supabase
    .from("clients")
    .select("name, email")
    .eq("id", doc.client_id)
    .single();

  return (
    <DocumentDetailClient
      clientNumber={parseInt(params.id)}
      doc={doc as ClientDocument}
      clientName={client?.name ?? null}
      clientEmail={client?.email ?? null}
      deliveryHistory={doc.status !== "draft" ? <EmailDeliveryTimeline entityType="document" entityId={doc.id} /> : null}
    />
  );
}
