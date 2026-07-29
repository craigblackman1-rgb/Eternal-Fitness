import { notFound } from "next/navigation";
import Link from "next/link";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createAdminClient } from "@/lib/supabase-admin";
import type { ClientDocument } from "@/lib/documents/types";
import { HubCard, HubCardHeader } from "@/components/hub";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { IconChevronLeft, IconCheckCircle } from "@/components/icons";
import { DocumentSignClientWrapper } from "./DocumentSignClientWrapper";

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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const dynamic = "force-dynamic";

export default async function PortalDocumentSignPage({ params }: { params: { id: string } }) {
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
  const alreadySigned = typed.status === "signed" && !!typed.client_signature;

  if (alreadySigned) {
    return (
      <div className="space-y-6">
        <Link href="/portal/documents" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <IconChevronLeft className="w-4 h-4" />
          All documents
        </Link>

        <div className="rounded-2xl border border-teal/40 bg-teal/5 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-teal/20 text-teal flex items-center justify-center mx-auto mb-4">
            <IconCheckCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {typed.kind === "feedback" ? "Thank you" : "Signed — thank you"}
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            {typed.kind === "feedback"
              ? "Your feedback has been recorded. Esther has a copy on file."
              : "Your signature has been recorded. Esther has a copy on file."}
          </p>
          <Link
            href={`/portal/documents/${typed.id}`}
            className="inline-flex min-h-10 items-center rounded-full bg-teal text-white px-5 text-sm font-semibold hover:bg-teal/90"
          >
            View document
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href={`/portal/documents/${typed.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <IconChevronLeft className="w-4 h-4" />
        Back to the document
      </Link>

      <section aria-labelledby="sign-heading">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-2">Signing</p>
        <h1 id="sign-heading" className="text-2xl font-semibold tracking-tight text-foreground">{typed.title || kindLabel(typed.kind)}</h1>
        <p className="mt-1 text-muted-foreground">Three short steps. Nothing is sent until the last one, and you can stop at any point.</p>
      </section>

      <DocumentSignClientWrapper doc={typed} />
    </div>
  );
}
