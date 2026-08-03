import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { IconCalendar, IconEye, IconFileSignature } from "@/components/icons";
import { HubCard } from "@/components/hub/HubCard";
import { HubCardHeader } from "@/components/hub/HubCardHeader";
import { KpiTile } from "@/components/hub/KpiTile";
import { AgreementsTable } from "./agreements-table";

export default async function AgreementsPage() {
  const supabase = createClient();

  const { data: agreements, error } = await supabase
    .from("signed_agreements")
    .select("*, clients(client_number)")
    .order("signed_at", { ascending: false });

  const rows = (agreements ?? []).map((a: any) => ({
    id: a.id,
    client_name: a.client_name,
    client_email: a.client_email ?? null,
    client_phone: a.client_phone ?? null,
    parq_completed: a.parq_completed,
    medical_clearance: a.medical_clearance,
    signed_at: a.signed_at,
    client_number: a.clients?.client_number ?? null,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Signed Agreements (legacy record)</h1>
        <p className="text-muted-foreground mt-1">
          Pre-migration agreements, kept for reference. New and updated Personal Training Agreements are
          now sent and signed from each client&apos;s Documents tab — see{" "}
          <Link href="/hub/documents" className="text-teal font-medium hover:underline">All Documents</Link>.
        </p>
      </div>

      {/* Stats — branded */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <KpiTile icon={<IconFileSignature className="w-5 h-5" />} label="Total agreements" value={agreements?.length ?? 0} />
        <KpiTile icon={<IconEye className="w-5 h-5" />} label="PAR-Q on file" value={agreements?.filter((a: any) => a.parq_completed === "yes").length ?? 0} />
        <KpiTile icon={<IconCalendar className="w-5 h-5" />} label="Medical clearance filed" value={agreements?.filter((a: any) => a.medical_clearance === "yes").length ?? 0} />
      </div>

      {/* Agreements list */}
      <HubCard>
        <HubCardHeader icon={<IconFileSignature className="w-4 h-4" />} title="All Agreements" />
        {error ? (
          <div className="text-center py-8">
            <p className="text-sm text-rose">Error loading agreements: {error.message}</p>
          </div>
        ) : (
          <AgreementsTable data={rows} />
        )}
      </HubCard>
    </div>
  );
}
