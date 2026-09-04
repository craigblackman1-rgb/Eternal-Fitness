import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconChevronLeft } from "@/components/icons";
import { PlanAgentTab } from "../PlanAgentTab";

export default async function PlanAgentPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("name, client_number, pace_mode")
    .eq("client_number", parseInt(params.id))
    .single();

  if (!client) notFound();

  const firstName = client.name.split(" ")[0];

  return (
    <div className="space-y-6 pb-24">
      <Link
        href={`/hub/clients/${client.client_number}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-body)] no-underline hover:text-[var(--color-ink)]"
      >
        <IconChevronLeft className="h-4 w-4" />
        {firstName}&apos;s record
      </Link>

      <PlanAgentTab
        clientNumber={client.client_number}
        clientName={client.name}
        paceMode={client.pace_mode ?? "moderate"}
      />
    </div>
  );
}
