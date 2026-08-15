export type DocumentKind = "terms" | "risk_assessment" | "annual_review" | "consent" | "feedback" | "parq" | "invoice" | "leg_pain_questionnaire" | "note";

export type DocumentStatus = "draft" | "sent" | "signed" | "superseded";

export interface DocumentSection {
  id: string;
  title: string;
  html: string;
}

export interface ConsentGroup {
  id: string;
  legend: string;
  options: { key: string; label: string }[];
}

export interface FeedbackQuestion {
  id: string;
  type: "text" | "choice" | "multi";
  label: string;
  /** Required for type "choice"/"multi" — rendered as a radio group or checkbox group respectively. */
  options?: { value: string; label: string }[];
  /** Clinical/explanatory note shown under the question (e.g. "If yes, give details in Section 5") — used by PAR-Q. */
  note?: string;
}

export interface FeedbackSection {
  id: string;
  /** Cosmetic "Section N" label, kept as data since it's author-set, not derived. */
  num: string;
  title: string;
  intro?: string;
  questions: FeedbackQuestion[];
}

export interface FeedbackConsent {
  id: string;
  label: string;
}

export interface DocumentBody {
  intro?: string;
  sections: DocumentSection[];
  consentGroups?: ConsentGroup[];
  /** Free-text/choice questionnaire content — used by the "feedback" kind. */
  feedbackSections?: FeedbackSection[];
  feedbackConsents?: FeedbackConsent[];
}

export interface DocumentTemplate {
  id: string;
  kind: DocumentKind;
  name: string;
  version: number;
  body: DocumentBody;
  requires_client_signature: boolean;
  requires_trainer_signature: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientDocument {
  id: string;
  client_id: string;
  kind: DocumentKind;
  title: string;
  template_id: string | null;
  template_version: number | null;
  body: DocumentBody;
  requires_client_signature: boolean;
  requires_trainer_signature: boolean;
  status: DocumentStatus;
  version: number;
  supersedes_id: string | null;
  client_name: string | null;
  client_signature: string | null;
  client_signed_date: string | null;
  trainer_name: string | null;
  trainer_signature: string | null;
  trainer_signed_date: string | null;
  sent_at: string | null;
  signed_at: string | null;
  /** Whether the last send actually dispatched through a real email backend —
   *  vs. status merely being "sent" while no email backend was configured
   *  (dry run) or a real send failed. Null for rows sent before this existed. */
  source_type?: "generated" | "scan";
  source_file_name?: string | null;
  source_file_mime?: string | null;
  source_file_size?: number | null;
  emailed?: boolean | null;
  consent_choices?: Record<string, boolean> | null;
  /** Free-text/choice questionnaire answers — used by the "feedback" kind. Question id -> text answer, or { consents: {...} } for checkbox state. */
  feedback_responses?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  // The 'terms' template was updated 2026-07-04 to BE the real, dual-signed
  // Personal Training Agreement (not a generic T&Cs doc) — label reflects that.
  terms: "Personal Training Agreement",
  risk_assessment: "Risk Assessment",
  annual_review: "Annual Review",
  consent: "Consent",
  feedback: "Client Feedback",
  parq: "PAR-Q",
  invoice: "Invoice",
  leg_pain_questionnaire: "Leg Pain Questionnaire",
  // Non-template catch-all for uploaded documents (doctor's notes, ad-hoc
  // notes, etc.) that don't fit any of the standard template kinds above.
  note: "Note / Other document",
};

/** Whether every required signature is present — used to decide "signed" status. */
export function isFullySigned(doc: Pick<ClientDocument, "requires_client_signature" | "requires_trainer_signature" | "client_signature" | "trainer_signature">): boolean {
  if (doc.requires_client_signature && !doc.client_signature) return false;
  if (doc.requires_trainer_signature && !doc.trainer_signature) return false;
  return true;
}
