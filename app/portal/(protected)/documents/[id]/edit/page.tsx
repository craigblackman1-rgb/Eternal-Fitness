import { notFound } from "next/navigation";
import Link from "next/link";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createAdminClient } from "@/lib/supabase-admin";
import type { ClientDocument } from "@/lib/documents/types";
import { HubCard, HubCardHeader } from "@/components/hub";
import { IconChevronLeft, IconFileText } from "@/components/icons";
import { DocumentEditorClient } from "./DocumentEditorClient";

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

export const dynamic = "force-dynamic";

export default async function PortalDocumentEditPage({ params }: { params: { id: string } }) {
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

  const typed = doc as ClientDocument;
  const isSigned = typed.status === "signed" && !!typed.client_signature;

  if (isSigned) {
    return (
      <div className="space-y-6">
        <Link href="/portal/documents" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <IconChevronLeft className="w-4 h-4" />
          All documents
        </Link>

        <HubCard>
          <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Already signed" color="teal" />
          <p className="text-sm text-muted-foreground mb-4">
            This document has been signed and cannot be edited. You can view it or download a signed copy.
          </p>
          <Link
            href={`/portal/documents/${typed.id}`}
            className="inline-flex min-h-10 items-center rounded-full bg-teal text-white px-5 text-sm font-semibold hover:bg-teal/90"
          >
            View signed document
          </Link>
        </HubCard>
      </div>
    );
  }

  if (!typed.body.feedbackSections || typed.body.feedbackSections.length === 0) {
    return (
      <div className="space-y-6">
        <Link href="/portal/documents" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <IconChevronLeft className="w-4 h-4" />
          All documents
        </Link>

        <HubCard>
          <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Not editable" color="slate" />
          <p className="text-sm text-muted-foreground mb-4">
            This document type cannot be edited in the portal. Please contact Esther if you need to make changes.
          </p>
          <Link
            href={`/portal/documents/${typed.id}`}
            className="inline-flex min-h-10 items-center rounded-full border border-input px-5 text-sm font-medium hover:bg-accent"
          >
            View document
          </Link>
        </HubCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/portal/documents" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <IconChevronLeft className="w-4 h-4" />
        All documents
      </Link>

      <section aria-labelledby="edit-heading">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-2">{kindLabel(typed.kind)}</p>
        <h1 id="edit-heading" className="text-2xl font-semibold tracking-tight text-foreground">{typed.title || kindLabel(typed.kind)}</h1>
        {typed.body.intro && (
          <p className="mt-2 text-muted-foreground">{typed.body.intro}</p>
        )}
      </section>

      <DocumentEditorClient doc={typed} />
    </div>
  );
}
