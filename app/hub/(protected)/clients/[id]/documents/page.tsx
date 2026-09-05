import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, TokenPill } from "@/components/hub/StatusBadge";
import { IconChevronLeft, IconChevronRight, IconFileText, IconCalendar } from "@/components/icons";
import { EmptyState } from "@/components/hub/EmptyState";
import { NewDocumentButton } from "./NewDocumentButton";
import { DOCUMENT_KIND_LABEL, type ClientDocument } from "@/lib/documents/types";
import { uploadKind, uploadKindLabel, formatBytes } from "@/lib/documents/upload-kind";
import { OpenUploadButton } from "@/components/hub/OpenUploadButton";

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
  const uploads = documents.filter((d) => d.source_type === "scan");
  const generated = documents.filter((d) => d.source_type !== "scan");
  const isEmpty = documents.length === 0;

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

      {isEmpty ? (
        <EmptyState
          icon={<IconFileText className="h-6 w-6" />}
          title="No documents yet"
          description="Create a document from a template, edit it, send it to the client to sign, and track every version here."
        />
      ) : (
        <div className="space-y-6">
          {/* Uploaded documents */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
              Uploaded
            </p>
            {uploads.length === 0 ? (
              <p className="text-[13px] text-muted-foreground py-2">
                No files uploaded yet — use Upload file for a photographed form or a letter.
              </p>
            ) : (
              <div className="space-y-3">
                {uploads.map((d) => {
                  const kind = uploadKind(d.source_file_mime, d.source_file_name);
                  return (
                    <OpenUploadButton
                      key={d.id}
                      variant="row"
                      clientName={client.name}
                      doc={{
                        id: d.id,
                        title: d.title,
                        source_file_name: d.source_file_name,
                        source_file_mime: d.source_file_mime,
                        source_file_size: d.source_file_size,
                        created_at: d.created_at,
                      }}
                    >
                      <Card className="shadow-sm bg-[var(--hub-card)] rounded-surface border border-[var(--hub-border)] hover:border-rose/40 transition">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-pill bg-[var(--hub-hover)] text-muted-foreground flex items-center justify-center shrink-0">
                              <IconFileText className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{d.title}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                <TokenPill
                                  token={kind === "pdf" ? "danger" : kind === "img" ? "success" : "neutral"}
                                  label={uploadKindLabel(kind)}
                                />
                                {d.source_file_name && (
                                  <span className="font-mono">{d.source_file_name}</span>
                                )}
                                <span className="flex items-center gap-1">
                                  <IconCalendar className="h-3 w-3" />
                                  {formatDate(d.created_at)}
                                </span>
                                {d.source_file_size != null && d.source_file_size > 0 && (
                                  <span>{formatBytes(d.source_file_size)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <TokenPill token="neutral" label="Uploaded" />
                            <span className="text-xs text-muted-foreground font-medium">Open</span>
                          </div>
                        </CardContent>
                      </Card>
                    </OpenUploadButton>
                  );
                })}
              </div>
            )}
          </div>

          {/* Generated documents */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
              Created in the hub
            </p>
            <div className="space-y-3">
              {generated.map((d) => (
                <Link key={d.id} href={`/hub/clients/${clientNumber}/documents/${d.id}`}>
                  <Card className="shadow-sm bg-[var(--hub-card)] rounded-surface border border-[var(--hub-border)] hover:border-rose/40 transition">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-pill bg-teal/10 flex items-center justify-center shrink-0">
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
                            <Badge variant="outline" className="rounded-pill text-xs">v{d.version}</Badge>
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
          </div>
        </div>
      )}
    </div>
  );
}
