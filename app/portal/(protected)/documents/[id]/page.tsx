import { notFound } from "next/navigation";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createAdminClient } from "@/lib/supabase-admin";
import type { ClientDocument } from "@/lib/documents/types";
import { PortalDocumentClient } from "@/components/portal/PortalDocumentClient";

export const dynamic = "force-dynamic";

export default async function PortalDocumentViewPage({ params }: { params: { id: string } }) {
  const session = await getPortalSessionFromCookies();
  if (!session) return null;

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("client_documents")
    .select("*")
    .eq("id", params.id)
    .eq("client_id", session.clientId)
    .single();

  if (!doc) notFound();

  return <PortalDocumentClient doc={doc as ClientDocument} />;
}
