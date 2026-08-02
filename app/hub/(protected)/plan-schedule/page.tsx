import { createClient } from "@/lib/supabase-server";
import { HubPageHeader } from "@/components/hub";
import { PlanScheduleTable } from "./PlanScheduleTable";
import type { DBBlock } from "@/types";

export type BlockWithClient = DBBlock & {
  client_name: string | null;
  client_number: number | null;
  delivery_mode: string | null;
};

export default async function PlanSchedulePage() {
  const supabase = createClient();

  const { data: blockRows } = await supabase
    .from("blocks")
    .select("*")
    .order("created_at", { ascending: false });

  const blocks: DBBlock[] = (blockRows ?? []) as DBBlock[];

  const clientIds = [...new Set(blocks.map((b) => b.client_id).filter(Boolean))];
  const { data: clientRows } = clientIds.length
    ? await supabase.from("clients").select("id, name, client_number, delivery_mode").in("id", clientIds)
    : { data: [] as { id: string; name: string; client_number: number | null; delivery_mode: string | null }[] };

  const clientById = new Map((clientRows ?? []).map((c) => [c.id, c]));

  const rows: BlockWithClient[] = blocks.map((b) => ({
    ...b,
    client_name: clientById.get(b.client_id)?.name ?? null,
    client_number: clientById.get(b.client_id)?.client_number ?? null,
    delivery_mode: clientById.get(b.client_id)?.delivery_mode ?? null,
  }));

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Plan schedule"
        subtitle="Every client's training block, its scheduled start date, and its live status."
      />
      <PlanScheduleTable data={rows} />
    </div>
  );
}
