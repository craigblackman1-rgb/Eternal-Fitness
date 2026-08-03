import type { DBClient, DBClientComplianceStatus, SignedAgreement, SignedPARQ } from "@/types";

export interface ComplianceFlags {
  requiresGpClearance: boolean;
  autoOutstanding: string[];
  effectiveStatus: DBClientComplianceStatus;
}

export function computeComplianceFlags({
  client,
  latestParq,
  latestAgreement,
  hasSignedParqDocument = false,
  hasSignedAgreementDocument = false,
}: {
  client: Pick<DBClient, "compliance_status" | "profile" | "gp_letter_status" | "annual_review_due_date">;
  latestParq: SignedPARQ | null;
  latestAgreement: SignedAgreement | null;
  /** A signed `client_documents` row of kind "parq" — the document-engine path
   *  (including scanned/uploaded historical PDFs), which doesn't populate the
   *  legacy `signed_parq` table but still satisfies the PAR-Q requirement. */
  hasSignedParqDocument?: boolean;
  /** Same as above, for kind "terms" (the Personal Training Agreement). */
  hasSignedAgreementDocument?: boolean;
}): ComplianceFlags {
  // Esther sets this by hand (Health and clearance card on Edit client) — it used to be
  // inferred automatically from high-risk PAR-Q answers, but that's a clinical judgement
  // call, not a technical one, so it's now a manual flag.
  const requiresGpClearance = !!client.profile?.health?.gp_clearance_required;
  const gpClearanceObtained = !!client.profile?.health?.gp_clearance;
  const parqTrainerOverride = !!client.profile?.health?.parq_trainer_override;

  const autoOutstanding: string[] = [];
  if (!latestParq && !hasSignedParqDocument && !parqTrainerOverride) autoOutstanding.push("No PAR-Q on file");
  if (!latestParq && !hasSignedParqDocument && parqTrainerOverride) autoOutstanding.push("PAR-Q trainer-overridden — pending migration from Microsoft Forms");
  if (!hasSignedAgreementDocument && (!latestAgreement || latestAgreement.status !== "signed")) autoOutstanding.push("No signed agreement on file");
  if (requiresGpClearance && !gpClearanceObtained) autoOutstanding.push("GP clearance required — not yet obtained");
  if (client.gp_letter_status === "requested") autoOutstanding.push("GP letter requested — awaiting return");
  if (client.annual_review_due_date && new Date(client.annual_review_due_date) < new Date()) {
    autoOutstanding.push("Annual medical review is overdue");
  }

  let effectiveStatus: DBClientComplianceStatus;
  if (client.compliance_status === "do_not_train") {
    effectiveStatus = "do_not_train";
  } else if (requiresGpClearance && !gpClearanceObtained) {
    effectiveStatus = "pending_medical";
  } else if (autoOutstanding.length > 0) {
    effectiveStatus = "action_needed";
  } else {
    effectiveStatus = "clear";
  }

  return { requiresGpClearance, autoOutstanding, effectiveStatus };
}
