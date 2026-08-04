import type { ReactNode } from "react";
import type { ClientDocument, DocumentKind } from "@/lib/documents/types";
import { DocumentAccessibilityControls } from "@/components/documents/DocumentAccessibilityControls";
import { DocumentBodyView } from "@/lib/documents/render";

const KIND_EYEBROW: Record<DocumentKind, string> = {
  terms: "Client document 01",
  risk_assessment: "Client document 02",
  annual_review: "Client document 03",
  consent: "Client document 05",
  feedback: "Client document 06",
  parq: "Client document 04",
  invoice: "Client document 07",
  leg_pain_questionnaire: "Client document 08",
};

const KIND_REFERENCE: Record<DocumentKind, string> = {
  terms: "EF-TERMS-2026",
  risk_assessment: "EF-RISK-2026",
  annual_review: "EF-REVIEW-2026",
  consent: "EF-CONSENT-2026",
  feedback: "EF-FEEDBACK-2026",
  parq: "EF-PARQ-2026",
  invoice: "EF-INV-2026",
  leg_pain_questionnaire: "EF-PAIN-LEG-2026",
};

function EfLogo() {
  return (
    <div className="ef-logo">
      <svg className="ef-logo__heart" viewBox="0 0 32 32" role="img" aria-label="Eternal Fitness">
        <path
          fill="#C1839F"
          d="M16 28.5S2.5 20.3 2.5 11.7A7.2 7.2 0 0 1 9.7 4.5c2.8 0 4.9 1.5 6.3 3.6 1.4-2.1 3.5-3.6 6.3-3.6a7.2 7.2 0 0 1 7.2 7.2c0 8.6-13.5 16.8-13.5 16.8Z"
        />
      </svg>
      <span className="ef-logo__mark" aria-hidden="true">
        <span className="ef-logo__eternal">Eternal</span>
        <span className="ef-logo__fitness">Fitness</span>
      </span>
    </div>
  );
}

/**
 * Shared visual shell for every client document (terms, risk_assessment,
 * annual_review, consent). One component, so a design fix here applies to all
 * four kinds at once. The structure mirrors the brand-staging reference:
 * masthead (light) -> eyebrow + serif italic title + standfirst -> meta strip
 * -> accessibility toolbar -> intro + numbered sections -> optional sign slot
 * -> footer.
 */
export function DocumentView({
  doc,
  showToolbar = true,
  signSlot,
  children,
  consentChoices,
  onConsentChange,
  feedbackAnswers,
  onFeedbackAnswerChange,
  feedbackConsentChoices,
  onFeedbackConsentChange,
}: {
  doc: ClientDocument;
  showToolbar?: boolean;
  /** Interactive signing area rendered inside its own section. */
  signSlot?: ReactNode;
  children?: ReactNode;
  /** Live consent state + handler, so the embedded consent groups are interactive. */
  consentChoices?: Record<string, boolean>;
  onConsentChange?: (key: string, value: boolean) => void;
  /** Live feedback questionnaire state + handlers (the "feedback" kind). */
  feedbackAnswers?: Record<string, string>;
  onFeedbackAnswerChange?: (id: string, value: string) => void;
  feedbackConsentChoices?: Record<string, boolean>;
  onFeedbackConsentChange?: (id: string, value: boolean) => void;
}) {
  const eyebrow = KIND_EYEBROW[doc.kind];
  const reference = KIND_REFERENCE[doc.kind];
  const version = doc.version ? `v${doc.version}` : "v1.0";

  return (
    <div className="doc-page">
      {showToolbar && <DocumentAccessibilityControls />}

      <main className="doc-sheet" id="doc-start">
        <header className="doc-masthead">
          <div className="doc-brandline">
            <EfLogo />
            <p className="doc-org">
              <strong>Esther Fair</strong> — Level 4 Personal Trainer
              <br />
              Private studio, Worthing, West Sussex
            </p>
          </div>

          <div className="doc-titleblock">
            <p className="doc-eyebrow">{eyebrow}</p>
            <h1 className="doc-title">{doc.title}</h1>
          </div>

          <dl className="doc-meta">
            <div>
              <dt>Document</dt>
              <dd>
                {doc.title} {version}
              </dd>
            </div>
            <div>
              <dt>Completed by</dt>
              <dd>{doc.client_name || "The client"}</dd>
            </div>
            <div>
              <dt>Review</dt>
              <dd>On request</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{reference}</dd>
            </div>
          </dl>
        </header>

        <div className="doc-body">
          <p className="print-runner">Eternal Fitness — {doc.title} ({version}) — confidential</p>

          <DocumentBodyView
            body={doc.body}
            consentChoices={consentChoices}
            onConsentChange={onConsentChange}
            feedbackAnswers={feedbackAnswers}
            onFeedbackAnswerChange={onFeedbackAnswerChange}
            feedbackConsentChoices={feedbackConsentChoices}
            onFeedbackConsentChange={onFeedbackConsentChange}
          />

          {signSlot && (
            <section className="doc-section" data-od-id="doc-sign">
              {signSlot}
            </section>
          )}

          {children}
        </div>

        <footer className="doc-footer">
          <p>
            <strong>Eternal Fitness</strong> — Esther Fair, Level 4 Personal Trainer. Private
            studio, Worthing, West Sussex.
          </p>
          <p>
            {doc.title}, {version} · Reference {reference} · Review on request. If you need this
            document in large print, on coloured paper, or read aloud, please ask — I will send it
            in whatever format works for you.
          </p>
        </footer>
      </main>
    </div>
  );
}
