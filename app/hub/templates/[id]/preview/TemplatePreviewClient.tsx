"use client";

import { useState } from "react";
import Link from "next/link";
import { DocumentView } from "@/components/documents/DocumentView";
import { IconChevronLeft, IconEye } from "@/components/icons";
import type { ClientDocument, DocumentTemplate } from "@/lib/documents/types";

/**
 * Read-only look at how a template renders as an actual document, reusing the
 * same DocumentView shell every real client document goes through — so
 * "does this look right" doesn't require sending a live document to check.
 * Any typing into questionnaire fields is local-only state, never saved.
 */
export function TemplatePreviewClient({ template }: { template: DocumentTemplate }) {
  const [consentChoices, setConsentChoices] = useState<Record<string, boolean>>({});
  const [feedbackAnswers, setFeedbackAnswers] = useState<Record<string, string>>({});
  const [feedbackConsentChoices, setFeedbackConsentChoices] = useState<Record<string, boolean>>({});

  const previewDoc: ClientDocument = {
    id: `preview-${template.id}`,
    client_id: "",
    kind: template.kind,
    title: template.name,
    template_id: template.id,
    template_version: template.version,
    body: template.body,
    requires_client_signature: template.requires_client_signature,
    requires_trainer_signature: template.requires_trainer_signature,
    status: "draft",
    version: template.version,
    supersedes_id: null,
    client_name: "Sample Client",
    client_signature: null,
    client_signed_date: null,
    trainer_name: "Esther Fair",
    trainer_signature: null,
    trainer_signed_date: null,
    sent_at: null,
    signed_at: null,
    source_type: "generated",
    emailed: null,
    consent_choices: consentChoices,
    feedback_responses: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const needsSignature = template.requires_client_signature || template.requires_trainer_signature;

  return (
    <div>
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--hub-border)] bg-[var(--status-warning-bg)] px-4 py-2.5 text-[var(--status-warning-text)] print:hidden">
        <IconEye className="h-4 w-4 shrink-0" />
        <p className="text-xs font-semibold flex-1 min-w-0">
          Preview only — sample data, nothing here is saved or sent. Signature areas are not shown.
        </p>
        <Link
          href={`/hub/templates/${template.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold shrink-0 hover:underline"
        >
          <IconChevronLeft className="h-3.5 w-3.5" />
          Back to editor
        </Link>
      </div>

      <DocumentView
        doc={previewDoc}
        showToolbar
        consentChoices={consentChoices}
        onConsentChange={(key, value) => setConsentChoices((p) => ({ ...p, [key]: value }))}
        feedbackAnswers={feedbackAnswers}
        onFeedbackAnswerChange={(id, value) => setFeedbackAnswers((p) => ({ ...p, [id]: value }))}
        feedbackConsentChoices={feedbackConsentChoices}
        onFeedbackConsentChange={(id, value) => setFeedbackConsentChoices((p) => ({ ...p, [id]: value }))}
      >
        {needsSignature && (
          <section className="doc-section">
            <p className="doc-section__num">—</p>
            <h2 className="doc-section__title">Signature</h2>
            <p className="doc-section__intro text-muted-foreground text-sm">
              {template.requires_client_signature && template.requires_trainer_signature
                ? "The real document asks for both the client's and trainer's typed name, signature and date here."
                : template.requires_client_signature
                ? "The real document asks for the client's typed name, signature and date here."
                : "The real document asks for the trainer's typed name, signature and date here."}
            </p>
          </section>
        )}
      </DocumentView>
    </div>
  );
}
