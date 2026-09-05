import Link from "next/link";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import type { PortalDocument } from "@/lib/portal-data";
import { HubCard, HubCardHeader, EmptyState } from "@/components/hub";
import { StatusBadge } from "@/components/hub/StatusBadge";
import {
  IconFileText, IconCheckCircle, IconAlertTriangle, IconChevronRight,
  IconSearch, IconClock, IconPencil,
} from "@/components/icons";
import { DocumentsFilterClient } from "./DocumentsFilterClient";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const KIND_LABELS: Record<string, string> = {
  terms: "Training agreement & studio terms",
  risk_assessment: "Risk assessment",
  annual_review: "Annual review",
  parq: "Health questionnaire (PAR‑Q+)",
  consent: "Consent form",
  feedback: "Client feedback",
};

function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function needsAction(doc: PortalDocument): boolean {
  return doc.requires_client_signature && doc.status !== "signed";
}

export default async function PortalDocumentsPage() {
  const session = await getPortalSessionFromCookies();
  if (!session) return null;

  const data = createPortalDataClient(session.clientId);
  const [signed, outstanding] = await Promise.all([
    data.getSignedDocuments(),
    data.getOutstandingDocuments(),
  ]);

  const allDocs: PortalDocument[] = [...outstanding, ...signed];

  return (
    <div className="space-y-8">
      <section aria-labelledby="docs-heading">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-2">Your documents</p>
        <h1 id="docs-heading" className="text-2xl font-semibold tracking-tight text-foreground">Everything in one place</h1>
        <p className="mt-1 text-muted-foreground">
          {allDocs.length} document{allDocs.length === 1 ? "" : "s"}.{" "}
          {outstanding.filter(needsAction).length} need{outstanding.filter(needsAction).length === 1 ? "s" : ""} something from you;
          the rest are yours to read, download or print whenever you like. Signed copies stay here permanently.
        </p>
      </section>

      {allDocs.length === 0 ? (
        <EmptyState
          icon={<IconFileText className="w-7 h-7" />}
          title="No documents yet"
          description="When Esther shares a document with you, it will appear here."
        />
      ) : (
        <DocumentsFilterClient documents={allDocs} signedIds={new Set(signed.map((d) => d.id))} />
      )}

      {/* Paper alternative */}
      <div className="rounded-surface border border-teal/30 bg-teal/5 p-5">
        <div className="flex gap-3">
          <div className="w-[30px] h-[30px] rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.5" /></svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Would you rather have these on paper?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Ask Esther and she will print anything here in large print and bring it to your next session, or post it to you. Call{" "}
              <a href="tel:07517658128" className="text-teal font-medium hover:underline">07517 658 128</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
