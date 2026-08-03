import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { computeComplianceFlags } from "@/lib/compliance";
import { HubCard, HubPageHeader, StatusBadge, KpiTile, EmptyState } from "@/components/hub";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconAlertTriangle, IconCheckCircle, IconClipboardCheck, IconUsers } from "@/components/icons";
import type { DBClient, SignedAgreement, SignedPARQ } from "@/types";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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
  const { data: signedDocuments } = await supabase
    .from("client_documents")
    .select("client_id, kind, status")
    .in("kind", ["parq", "terms"])
    .eq("status", "signed");

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

  const rows = (clients ?? []).map((client: DBClient) => {
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

  const needsAction = rows.filter((r) => r.flags.effectiveStatus === "action_needed" || r.flags.effectiveStatus === "pending_medical").length;
  const doNotTrain = rows.filter((r) => r.flags.effectiveStatus === "do_not_train").length;
  const clear = rows.filter((r) => r.flags.effectiveStatus === "clear").length;

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Compliance Tracker"
        subtitle="Read-only, at-a-glance view across every client. All editing happens on each client's profile."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiTile icon={<IconCheckCircle className="w-5 h-5" />} label="Clear" value={clear} statusToken="success" />
        <KpiTile icon={<IconAlertTriangle className="w-5 h-5" />} label="Action Needed" value={needsAction} statusToken="warning" />
        <KpiTile icon={<IconClipboardCheck className="w-5 h-5" />} label="Do Not Train" value={doNotTrain} statusToken="danger" />
      </div>

      {rows.length === 0 ? (
        <HubCard>
          <EmptyState icon={<IconUsers className="w-9 h-9" />} title="No clients yet" description="Add a client to see their compliance status here" />
        </HubCard>
      ) : (
        <HubCard padded={false}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[var(--hub-border)] hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold bg-[var(--hub-hover)] h-10">Client</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold bg-[var(--hub-hover)] h-10">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold bg-[var(--hub-hover)] h-10">PAR-Q</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold bg-[var(--hub-hover)] h-10">Agreement</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold bg-[var(--hub-hover)] h-10">GP Letter</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold bg-[var(--hub-hover)] h-10">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ client, latestParq, latestAgreement, flags }) => (
                  <TableRow key={client.id} className="border-[var(--hub-border)] hover:bg-[var(--hub-hover)] transition-colors">
                    <TableCell>
                      <Link href={`/hub/clients/${client.client_number}`} className="font-medium text-foreground hover:text-rose hover:underline">
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={flags.effectiveStatus} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {latestParq ? formatDate(latestParq.created_at) : "Not on file"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {latestAgreement && latestAgreement.status === "signed" ? formatDate(latestAgreement.signed_at) : "Not signed"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">
                      {client.gp_letter_status.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {flags.autoOutstanding.length + (client.outstanding_actions?.length ?? 0) > 0 ? (
                        <span className="text-amber-600 font-medium">
                          {flags.autoOutstanding.length + (client.outstanding_actions?.length ?? 0)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </HubCard>
      )}
    </div>
  );
}
