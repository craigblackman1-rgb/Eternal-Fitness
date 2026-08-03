import { createClient } from "@/lib/supabase-server";
import { HubPageHeader, KpiTile, EmptyState, HubCard } from "@/components/hub";
import { IconFileText, IconFileSignature, IconCalendar } from "@/components/icons";
import { DocumentsTable, type DocumentTableRow } from "./documents-table";

type Joined = { client_number: number; name: string; email: string | null } | null;

export default async function AllDocumentsPage() {
  const supabase = createClient();

  const { data: docs } = await supabase
    .from("client_documents")
    .select(
      "id, kind, title, status, version, created_at, emailed, signed_at, sent_at, clients(client_number, name, email)",
    )
    .order("created_at", { ascending: false });

  const rows: DocumentTableRow[] = (
    (docs ?? []) as unknown as {
      id: string;
      kind: string;
      title: string;
      status: string;
      version: number;
      created_at: string;
      emailed: boolean | null;
      signed_at: string | null;
      sent_at: string | null;
      clients: Joined;
    }[]
  ).map((d) => ({
    id: d.id,
    clientName: d.clients?.name ?? "—",
    clientNumber: d.clients?.client_number ?? null,
    hasEmail: Boolean(d.clients?.email && d.clients.email.trim()),
    kind: d.kind,
    title: d.title,
    status: d.status,
    version: d.version,
    created_at: d.created_at,
    emailed: d.emailed,
    signed_at: d.signed_at ?? null,
    sent_at: d.sent_at ?? null,
  }));

  const signed = rows.filter((r) => r.status === "signed").length;
  const awaiting = rows.filter((r) => r.status === "sent").length;
  const drafts = rows.filter((r) => r.status === "draft").length;

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="All Documents"
        subtitle="Every document sent and signed across all clients"
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiTile
          icon={<IconFileText className="w-5 h-5" />}
          label="Total"
          value={rows.length}
        />
        <KpiTile
          icon={<IconFileSignature className="w-5 h-5" />}
          label="Signed"
          value={signed}
          statusToken="success"
        />
        <KpiTile
          icon={<IconCalendar className="w-5 h-5" />}
          label="Awaiting signature"
          value={awaiting}
          statusToken="warning"
        />
        <KpiTile
          icon={<IconFileText className="w-5 h-5" />}
          label="Drafts"
          value={drafts}
          statusToken="neutral"
        />
      </div>

      {rows.length === 0 ? (
        <HubCard>
          <EmptyState
            icon={<IconFileText className="w-9 h-9" />}
            title="No documents yet"
            description="Create documents from a client's profile or send one from a template."
          />
        </HubCard>
      ) : (
        <DocumentsTable data={rows} />
      )}
    </div>
  );
}
