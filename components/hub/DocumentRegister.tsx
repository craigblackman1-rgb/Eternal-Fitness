import Link from "next/link";
import { StatusBadge, TokenPill } from "@/components/hub/StatusBadge";
import { DocumentRowActions } from "@/components/hub/DocumentRowActions";
import { DocumentHeaderActions } from "@/components/hub/DocumentHeaderActions";
import { IconFileSignature, IconDownload } from "@/components/icons";
import { DOCUMENT_KIND_LABEL, type DocumentKind } from "@/lib/documents/types";

interface RegisterDocument {
  id: string;
  kind: string;
  title: string;
  status: string;
  version: number;
  created_at: string;
  updated_at?: string | null;
  client_name?: string | null;
  trainer_name?: string | null;
  emailed?: boolean | null;
  source_type?: "generated" | "scan";
  consent_choices?: Record<string, boolean> | null;
}

interface DocumentRegisterProps {
  clientNumber: number;
  documents?: RegisterDocument[];
  clientEmail?: string | null;
  clientName?: string | null;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * At-a-glance granted/total for the register row. A box the client never
 * touched has no key in consent_choices, so it doesn't count as granted —
 * this is a lower bound, not a full picture (see the document detail page
 * for the actual per-option breakdown against the template's consent groups).
 */
function consentSummary(choices?: Record<string, boolean> | null): string | null {
  if (!choices || Object.keys(choices).length === 0) return null;
  const total = Object.keys(choices).length;
  const granted = Object.values(choices).filter(Boolean).length;
  return `${granted}/${total} consents`;
}

type Row = {
  key: string;
  id: string;
  label: string;
  status: string;
  emailed?: boolean | null;
  consentSummary?: string | null;
  sourceType: "generated" | "scan";
  date: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
  href: string;
  editHref?: string;
  icon: React.ReactNode;
};

export function DocumentRegister({ clientNumber, documents = [], clientEmail, clientName }: DocumentRegisterProps) {
  const hasEmail = Boolean(clientEmail && clientEmail.trim());
  const rows: Row[] = [
    ...documents.map((d) => ({
      key: `doc-${d.id}`,
      id: d.id,
      label: `${DOCUMENT_KIND_LABEL[d.kind as DocumentKind] ?? d.title}${d.version > 1 ? ` (v${d.version})` : ""}`,
      status: d.status,
      emailed: d.emailed,
      consentSummary: consentSummary(d.consent_choices),
      sourceType: (d.source_type === "scan" ? "scan" : "generated") as "generated" | "scan",
      date: d.created_at,
      version: d.version ?? 1,
      updatedAt: d.updated_at || d.created_at,
      updatedBy: d.client_name || d.trainer_name || "—",
      href: `/hub/clients/${clientNumber}/documents/${d.id}`,
      editHref: d.source_type === "scan" ? undefined : `/hub/clients/${clientNumber}/documents/${d.id}`,
      icon: <IconFileSignature className="h-4 w-4 text-muted-foreground" />,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Document register</span>
        <DocumentHeaderActions clientNumber={clientNumber} />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No documents on file yet — create one with &ldquo;Create &amp; send&rdquo;.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--hub-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-canvas)] text-xs text-muted-foreground">
                <th className="px-3 py-1.5 text-left font-medium">Document</th>
                <th className="px-3 py-1.5 text-left font-medium">Status</th>
                <th className="px-3 py-1.5 text-left font-medium">Date</th>
                <th className="px-3 py-1.5 text-left font-medium">Version</th>
                <th className="px-3 py-1.5 text-left font-medium">Last updated</th>
                <th className="px-3 py-1.5 text-left font-medium">Last updated by</th>
                <th className="px-3 py-1.5 text-right font-medium">&nbsp;</th>
                <th className="px-3 py-1.5 text-right font-medium">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)]">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2 font-medium text-foreground">{r.icon}{r.label}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={r.status} />
                      {r.sourceType === "scan" && (
                        <TokenPill token="neutral" label="Scanned original" />
                      )}
                      {r.sourceType !== "scan" && r.status === "sent" && r.emailed === false && (
                        <TokenPill token="neutral" label="Not delivered" />
                      )}
                      {r.consentSummary && (
                        <TokenPill token="neutral" label={r.consentSummary} />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">v{r.version}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(r.updatedAt)}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.updatedBy}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2.5">
                      {r.sourceType === "scan" && (
                        <Link
                          href={`/api/documents/${r.id}/file`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"
                        >
                          <IconDownload className="h-3 w-3" />
                          Download original
                        </Link>
                      )}
                      {/* Delete works for scan docs too (they're always status
                          "signed" so locked, meaning Send/Resend/Copy-link
                          already correctly stay hidden) — previously this
                          whole block was skipped for scan rows, so an
                          uploaded-to-the-wrong-client document had no way to
                          be removed from this screen at all. */}
                      <DocumentRowActions docId={r.id} status={r.status} hasEmail={hasEmail} clientName={clientName} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {r.editHref && (
                      <Link href={r.editHref} className="text-teal font-medium hover:underline mr-3">Open</Link>
                    )}
                    <Link href={r.href} className="text-rose font-medium hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
