import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { IconChevronLeft, IconChevronRight, IconFileText, IconCalendar } from "@/components/icons";
import { EmptyState } from "@/components/hub/EmptyState";
import { NewDocumentButton } from "./NewDocumentButton";
import { DOCUMENT_KIND_LABEL, type ClientDocument } from "@/lib/documents/types";

function formatDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ClientDocumentsPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const clientNumber = parseInt(params.id);

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("client_number", clientNumber)
    .single();
  if (!client) notFound();

  const { data: docs } = await supabase
    .from("client_documents")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const documents = (docs || []) as ClientDocument[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/hub/clients/${clientNumber}`} className="text-muted-foreground hover:text-foreground">
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">{client.name}</p>
        </div>
        <NewDocumentButton clientNumber={clientNumber} />
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={<IconFileText className="h-6 w-6" />}
          title="No documents yet"
          description="Create a document from a template, edit it, send it to the client to sign, and track every version here."
        />
      ) : (
        <div className="space-y-3">
          {documents.map((d) => (
            <Link key={d.id} href={`/hub/clients/${clientNumber}/documents/${d.id}`}>
              <Card className="shadow-sm bg-[var(--hub-card)] rounded-2xl border border-[var(--hub-border)] hover:border-rose/40 transition">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center shrink-0">
                      <IconFileText className="h-4 w-4 text-teal" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{d.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{DOCUMENT_KIND_LABEL[d.kind] ?? d.kind}</span>
                        <span className="flex items-center gap-1">
                          <IconCalendar className="h-3 w-3" />
                          {formatDate(d.created_at)}
                        </span>
                        <Badge variant="outline" className="rounded-full text-xs">v{d.version}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={d.status} />
                    <IconChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
