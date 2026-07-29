import { notFound } from "next/navigation";
import Link from "next/link";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createAdminClient } from "@/lib/supabase-admin";
import type { ClientDocument } from "@/lib/documents/types";
import { HubCard, HubCardHeader } from "@/components/hub";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { IconChevronLeft, IconPrinter, IconDownload } from "@/components/icons";

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

  const typed = doc as ClientDocument;
  const isSigned = typed.status === "signed" && !!typed.client_signature;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/portal/documents" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <IconChevronLeft className="w-4 h-4" />
        All documents
      </Link>

      {/* Document header */}
      <div className="rounded-2xl border border-border/60 bg-white p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-2">
          {kindLabel(typed.kind)}{typed.version > 1 ? ` · version ${typed.version}` : ""}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{typed.title || kindLabel(typed.kind)}</h1>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
          {typed.sent_at && (
            <span>Sent to you <b className="font-semibold text-foreground">{formatDate(typed.sent_at)}</b></span>
          )}
          {isSigned && typed.client_signed_date && (
            <span>Signed <b className="font-semibold text-foreground">{formatDate(typed.client_signed_date)}</b></span>
          )}
          {typed.client_name && (
            <span>Signed by <b className="font-semibold text-foreground">{typed.client_name}</b></span>
          )}
        </div>

        <div className="mt-4">
          <StatusBadge status={typed.status} />
        </div>
      </div>

      {/* Action bar */}
      <div className="sticky top-0 z-20 rounded-2xl border border-border/60 bg-white p-4 flex flex-wrap items-center gap-3">
        <button type="button" className="inline-flex min-h-[2.9rem] items-center gap-2 rounded-full border border-input px-4 text-sm font-medium hover:bg-accent" onClick={() => window.print()}>
          <IconPrinter className="w-4 h-4" />
          Print
        </button>
        <button type="button" className="inline-flex min-h-[2.9rem] items-center gap-2 rounded-full border border-input px-4 text-sm font-medium hover:bg-accent">
          <IconDownload className="w-4 h-4" />
          Download PDF
        </button>
        {!isSigned && typed.requires_client_signature && (
          <Link
            href={`/portal/documents/${typed.id}/sign`}
            className="inline-flex min-h-[2.9rem] items-center gap-2 rounded-full bg-teal text-white px-4 text-sm font-semibold hover:bg-teal/90 ml-auto"
          >
            Sign this document
          </Link>
        )}
      </div>

      {/* Document body */}
      <HubCard>
        <div className="prose prose-sm max-w-none">
          {typed.body.intro && (
            <p>{typed.body.intro}</p>
          )}

          {typed.body.sections.map((section) => (
            <section key={section.id} className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              <div dangerouslySetInnerHTML={{ __html: section.html }} />
            </section>
          ))}

          {typed.body.consentGroups && typed.body.consentGroups.length > 0 && (
            <section className="mb-6">
              {typed.body.consentGroups.map((group) => (
                <div key={group.id} className="mb-4">
                  <h3 className="text-base font-semibold text-foreground mb-2">{group.legend}</h3>
                  <ul className="space-y-1.5">
                    {group.options.map((opt) => (
                      <li key={opt.key} className="flex items-start gap-2 text-sm">
                        <span className="text-teal mt-0.5">—</span>
                        <span>{opt.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {typed.body.feedbackSections && typed.body.feedbackSections.length > 0 && (
            <section className="mb-6">
              {typed.body.feedbackSections.map((fs) => (
                <div key={fs.id} className="mb-5">
                  <h3 className="text-base font-semibold text-foreground mb-2">{fs.num}. {fs.title}</h3>
                  {fs.intro && <p className="text-sm text-muted-foreground mb-3">{fs.intro}</p>}
                  <div className="space-y-3">
                    {fs.questions.map((q) => (
                      <div key={q.id} className="text-sm">
                        <p className="font-medium text-foreground">{q.label}</p>
                        {q.note && <p className="text-xs text-muted-foreground mt-0.5 italic">{q.note}</p>}
                        {typed.feedback_responses && typeof typed.feedback_responses === "object" && typed.feedback_responses.answers && typeof typed.feedback_responses.answers === "object" && (typed.feedback_responses.answers as Record<string, string>)[q.id] && (
                          <p className="mt-1 text-teal font-medium">Answered: {(typed.feedback_responses.answers as Record<string, string>)[q.id]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </HubCard>

      {/* Signed block */}
      {isSigned && (
        <div className="rounded-2xl border border-teal/40 bg-teal/5 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Signed</h3>
          <p className="text-sm text-muted-foreground">
            Signed by {typed.client_name || "you"} on {formatDate(typed.client_signed_date)}. A signed PDF copy was emailed to you and is kept in your documents. You can come back and read it at any time.
          </p>
        </div>
      )}

      {!isSigned && typed.requires_client_signature && (
        <div className="rounded-2xl border border-teal/40 bg-teal/5 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">What happens when you sign</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You will be asked to confirm you have read this, then sign by drawing your name or typing it. A signed PDF copy is emailed to you and kept in your documents. You can come back and read it at any time.
          </p>
          <Link
            href={`/portal/documents/${typed.id}/sign`}
            className="inline-flex min-h-10 items-center rounded-full bg-teal text-white px-5 text-sm font-semibold hover:bg-teal/90"
          >
            Sign this document
          </Link>
        </div>
      )}
    </div>
  );
}
