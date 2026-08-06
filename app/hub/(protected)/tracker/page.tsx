import { createClient } from "@/lib/supabase-server";
import { computeComplianceFlags } from "@/lib/compliance";
import { MedicalTracker, type TrackerClient, type DocInfo, type DocState } from "@/components/hub/MedicalTracker";
import type { DBClient } from "@/types";

interface DocRow {
  id: string;
  client_id: string;
  kind: string;
  status: string;
  signed_at: string | null;
  client_signed_date: string | null;
}

function deriveDocState(
  signedDate: string | null,
  hasSentPending: boolean,
  hasTrainerOverride: boolean,
  overrideNote: string | null,
  declareDeclined: boolean,
): DocInfo | null {
  if (declareDeclined) {
    return { signedDate, expiryDate: null, note: null, state: "dec" };
  }
  if (signedDate) {
    const d = new Date(signedDate);
    const expiry = new Date(d);
    expiry.setFullYear(expiry.getFullYear() + 1);
    const now = new Date();
    if (expiry < now) return { signedDate, expiryDate: expiry.toISOString().slice(0, 10), note: null, state: "exp" };
    const daysUntilExpiry = Math.round((expiry.getTime() - now.getTime()) / 86400000);
    if (daysUntilExpiry <= 45) return { signedDate, expiryDate: expiry.toISOString().slice(0, 10), note: null, state: "due" };
    return { signedDate, expiryDate: expiry.toISOString().slice(0, 10), note: null, state: "ok" };
  }
  if (hasTrainerOverride) {
    return { signedDate: null, expiryDate: null, note: overrideNote ?? "Trainer override — pending migration", state: "ok" };
  }
  if (hasSentPending) {
    return { signedDate: null, expiryDate: null, note: null, state: "pend" };
  }
  return null;
}

export default async function TrackerPage() {
  const supabase = createClient();

  const { data: clients } = await supabase.from("clients").select("*").order("name");

  const { data: allParq } = await supabase
    .from("signed_parq")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: allAgreements } = await supabase
    .from("signed_agreements")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: allDocs } = await supabase
    .from("client_documents")
    .select("id, client_id, kind, status, signed_at, client_signed_date")
    .in("kind", ["parq", "terms", "risk_assessment", "consent"])
    .order("created_at", { ascending: false });

  const clientDocsByKind = new Map<string, Map<string, DocRow[]>>();
  for (const doc of (allDocs ?? []) as DocRow[]) {
    if (!clientDocsByKind.has(doc.client_id)) {
      clientDocsByKind.set(doc.client_id, new Map());
    }
    const byKind = clientDocsByKind.get(doc.client_id)!;
    if (!byKind.has(doc.kind)) {
      byKind.set(doc.kind, []);
    }
    byKind.get(doc.kind)!.push(doc);
  }

  const latestLegacyParqByClient = new Map<string, any>();
  for (const p of allParq ?? []) {
    if (p.client_id && !latestLegacyParqByClient.has(p.client_id)) {
      latestLegacyParqByClient.set(p.client_id, p);
    }
  }

  const latestLegacyAgreementByClient = new Map<string, any>();
  for (const a of allAgreements ?? []) {
    if (a.client_id && !latestLegacyAgreementByClient.has(a.client_id)) {
      latestLegacyAgreementByClient.set(a.client_id, a);
    }
  }

  const trackerClients: TrackerClient[] = (clients ?? []).map((client: DBClient) => {
    const legacyParq = latestLegacyParqByClient.get(client.id) ?? null;
    const legacyAgreement = latestLegacyAgreementByClient.get(client.id) ?? null;

    const byKind = clientDocsByKind.get(client.id) ?? new Map();

    function bestDocRow(docKind: string): { signed: DocRow | null; sentPending: boolean } {
      const rows = byKind.get(docKind) ?? [];
      const signed = rows.find((r) => r.status === "signed") ?? null;
      const sentPending = !signed && rows.some((r) => r.status === "sent");
      return { signed, sentPending };
    }

    const parqRows = bestDocRow("parq");
    const hasParqTrainerOverride = !!client.profile?.health?.parq_trainer_override;
    const parqOverrideNote = client.profile?.health?.parq_trainer_override_note ?? null;
    const parqSignedDate =
      parqRows.signed?.client_signed_date ??
      parqRows.signed?.signed_at ??
      legacyParq?.created_at ??
      null;
    const parqHasSentPending = parqRows.sentPending;
    const parqDoc = deriveDocState(parqSignedDate, parqHasSentPending, hasParqTrainerOverride, parqOverrideNote, false);

    const gpClearanceObtained = !!client.profile?.health?.gp_clearance;
    const gpClearanceRequired = !!client.profile?.health?.gp_clearance_required;
    const gpLetterStatus = client.gp_letter_status;
    let gpDoc: DocInfo | null = null;
    if (gpClearanceObtained || gpLetterStatus === "received") {
      const receivedDate = client.gp_letter_received_date ?? null;
      if (receivedDate) {
        const d = new Date(receivedDate);
        const expiry = new Date(d);
        expiry.setFullYear(expiry.getFullYear() + 1);
        const now = new Date();
        if (expiry < now) {
          gpDoc = { signedDate: receivedDate, expiryDate: expiry.toISOString().slice(0, 10), note: null, state: "exp" };
        } else {
          const daysUntilExpiry = Math.round((expiry.getTime() - now.getTime()) / 86400000);
          gpDoc = { signedDate: receivedDate, expiryDate: expiry.toISOString().slice(0, 10), note: null, state: daysUntilExpiry <= 45 ? "due" : "ok" };
        }
      } else {
        gpDoc = { signedDate: null, expiryDate: null, note: null, state: "ok" };
      }
    } else if (gpLetterStatus === "requested") {
      gpDoc = { signedDate: null, expiryDate: null, note: null, state: "pend" };
    } else if (gpClearanceRequired) {
      gpDoc = { signedDate: null, expiryDate: null, note: null, state: "out" };
    } else {
      gpDoc = { signedDate: null, expiryDate: null, note: null, state: "na" };
    }

    const agreementRows = bestDocRow("terms");
    const agreementSignedDate =
      agreementRows.signed?.client_signed_date ??
      agreementRows.signed?.signed_at ??
      (legacyAgreement?.status === "signed" ? legacyAgreement?.signed_at ?? null : null);
    const agreementDoc = deriveDocState(agreementSignedDate, agreementRows.sentPending, false, null, false);

    const riskRows = bestDocRow("risk_assessment");
    const riskSignedDate = riskRows.signed?.client_signed_date ?? riskRows.signed?.signed_at ?? null;
    const riskDoc = deriveDocState(riskSignedDate, riskRows.sentPending, false, null, false);

    const consentRows = bestDocRow("consent");
    const consentSignedDate = consentRows.signed?.client_signed_date ?? consentRows.signed?.signed_at ?? null;
    const consentDoc = deriveDocState(consentSignedDate, consentRows.sentPending, false, null, false);

    const hasSignedParqDocument = parqRows.signed !== null || legacyParq !== null;
    const hasSignedAgreementDocument = agreementRows.signed !== null ||
      (legacyAgreement !== null && legacyAgreement.status === "signed");

    const flags = computeComplianceFlags({
      client,
      latestParq: legacyParq,
      latestAgreement: legacyAgreement,
      hasSignedParqDocument,
      hasSignedAgreementDocument,
    });

    const profileConditions = client.profile?.health?.conditions ?? [];

    return {
      id: client.id,
      clientNumber: client.client_number ?? null,
      name: client.name,
      conditions: profileConditions,
      complianceStatus: flags.effectiveStatus,
      hold: flags.effectiveStatus === "do_not_train",
      nextReview: client.annual_review_due_date ?? null,
      documents: {
        parq: parqDoc ?? { signedDate: null, expiryDate: null, note: null, state: "out" as DocState },
        gp: gpDoc ?? { signedDate: null, expiryDate: null, note: null, state: "out" as DocState },
        agreement: agreementDoc ?? { signedDate: null, expiryDate: null, note: null, state: "out" as DocState },
        risk: riskDoc ?? { signedDate: null, expiryDate: null, note: null, state: "out" as DocState },
        consent: consentDoc ?? { signedDate: null, expiryDate: null, note: null, state: "out" as DocState },
      },
    };
  });

  return <MedicalTracker clients={trackerClients} />;
}
