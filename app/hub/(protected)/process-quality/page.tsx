import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { HubPageHeader } from "@/components/hub";
import { computeComplianceFlags } from "@/lib/compliance";
import { ProcessQualityManager } from "./ProcessQualityManager";
import type { ProcessEntry, Sop, ImprovementEntry, DBClient, SignedAgreement, SignedPARQ, StudioEquipment } from "@/types";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function ProcessQualityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/hub/login");

  const [
    { data: processEntries },
    { data: sops },
    { data: improvementLog },
    { data: clients },
    { data: allParq },
    { data: allAgreements },
    { data: equipment },
    { data: signedDocuments },
  ] = await Promise.all([
    supabase.from("process_entries").select("*").order("ref", { ascending: true }),
    supabase.from("sops").select("*").order("ref", { ascending: true }),
    supabase.from("improvement_log").select("*").order("ref", { ascending: true }),
    supabase.from("clients").select("*").order("name"),
    supabase.from("signed_parq").select("*").order("created_at", { ascending: false }),
    supabase.from("signed_agreements").select("*").order("created_at", { ascending: false }),
    supabase.from("studio_equipment").select("*").order("sort_order", { ascending: true }),
    supabase.from("client_documents").select("client_id, kind, status").in("kind", ["parq", "terms"]).eq("status", "signed"),
  ]);

  const latestParqByClient = new Map<string, SignedPARQ>();
  for (const p of allParq ?? []) {
    if (p.client_id && !latestParqByClient.has(p.client_id)) latestParqByClient.set(p.client_id, p);
  }
  const latestAgreementByClient = new Map<string, SignedAgreement>();
  for (const a of allAgreements ?? []) {
    if (a.client_id && !latestAgreementByClient.has(a.client_id)) latestAgreementByClient.set(a.client_id, a);
  }
  const signedParqDocClientIds = new Set(
    (signedDocuments ?? []).filter((d) => d.kind === "parq").map((d) => d.client_id),
  );
  const signedAgreementDocClientIds = new Set(
    (signedDocuments ?? []).filter((d) => d.kind === "terms").map((d) => d.client_id),
  );

  const clientRows = (clients ?? []).map((client: DBClient) => {
    const latestParq = latestParqByClient.get(client.id) ?? null;
    const latestAgreement = latestAgreementByClient.get(client.id) ?? null;
    return {
      client,
      latestParq,
      latestAgreement,
      flags: computeComplianceFlags({
        client,
        latestParq,
        latestAgreement,
        hasSignedParqDocument: signedParqDocClientIds.has(client.id),
        hasSignedAgreementDocument: signedAgreementDocClientIds.has(client.id),
      }),
    };
  });

  const totalClients = clientRows.length;
  const clearClients = clientRows.filter((r) => r.flags.effectiveStatus === "clear").length;
  const medicalClearanceValid = clientRows.filter((r) => {
    if (r.flags.requiresGpClearance) {
      return !!r.client.profile?.health?.gp_clearance;
    }
    return true;
  }).length;

  const clearanceAtRiskClients = clientRows
    .filter((r) => r.flags.effectiveStatus === "pending_medical" || r.flags.effectiveStatus === "do_not_train")
    .map((r) => ({
      name: r.client.name,
      reason: r.flags.autoOutstanding.join("; "),
      status: r.flags.effectiveStatus,
    }));

  const now = new Date();
  const overdueReviewClients = clientRows
    .filter((r) => r.client.annual_review_due_date && new Date(r.client.annual_review_due_date) < now)
    .map((r) => ({
      name: r.client.name,
      dueDate: r.client.annual_review_due_date!,
    }));

  const equipmentList = (equipment ?? []) as StudioEquipment[];
  const activeEquipment = equipmentList.filter((e) => e.active).length;
  const totalEquipment = equipmentList.length;

  const processReviewDue = (processEntries ?? []).filter((p: any) => p.status === "review").length;
  const reviewsDue = processReviewDue + overdueReviewClients.length;

  const sopCount = (sops ?? []).length;

  const overviewData = {
    totalClients,
    clearClients,
    medicalClearanceValid,
    clearanceAtRiskClients,
    overdueReviewClients,
    activeEquipment,
    totalEquipment,
    reviewsDue,
    sopCount,
  };

  return (
    <div>
      <HubPageHeader
        title="Process & Quality"
        subtitle="Plain English. One page per process. Built so Esther can edit it without a deploy."
        className="mb-6"
      />
      <ProcessQualityManager
        initialProcessEntries={(processEntries ?? []) as ProcessEntry[]}
        initialSops={(sops ?? []) as Sop[]}
        initialImprovementLog={(improvementLog ?? []) as ImprovementEntry[]}
        overviewData={overviewData}
      />
    </div>
  );
}
