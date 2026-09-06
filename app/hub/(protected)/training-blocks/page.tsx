import { createClient } from "@/lib/supabase-server";
import { HubPageHeader } from "@/components/hub";
import { PlanScheduleTable } from "./PlanScheduleTable";
import { deriveBlockStatus } from "@/lib/block-status";
import { blockDisplayName } from "@/lib/block-name";
import Link from "next/link";
import type { DBBlock, ClientProfile, BlockStatus } from "@/types";

const GOAL_LABELS: Record<string, string> = {
  strength: "Strength",
  mobility: "Mobility",
  weight_loss: "Weight Loss",
  rehabilitation: "Rehab",
  confidence: "Confidence",
  general_fitness: "General Fitness",
};

export type BlockWithClient = DBBlock & {
  client_name: string | null;
  client_number: number | null;
  delivery_mode: string | null;
  compliance_status: string | null;
  programme: string | null;
  sessions_completed: number;
  sessions_total: number;
  derived_status: BlockStatus;
  /** CR-EF-153 — computed via lib/block-name.ts, the single source of truth. */
  display_name: string;
};

interface ClientRow {
  id: string;
  name: string;
  client_number: number | null;
  delivery_mode: string | null;
  compliance_status: string | null;
  referral_source: string | null;
  profile: ClientProfile | null;
}

interface SessionRow {
  id: string;
  block_id: string;
  status: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  scheduled_at: string | null;
  parent_session_id: string | null;
}

function programmeFor(client: ClientRow): string | null {
  if (client.referral_source) return client.referral_source;
  const firstCondition = client.profile?.health?.conditions?.[0];
  if (firstCondition) return firstCondition;
  const goal = client.profile?.goals?.primary;
  if (goal) return GOAL_LABELS[goal] ?? goal;
  return null;
}

export default async function TrainingBlocksPage() {
  const supabase = createClient();

  const { data: blockRows } = await supabase
    .from("blocks")
    .select("*")
    .order("created_at", { ascending: false });

  const blocks: DBBlock[] = (blockRows ?? []) as DBBlock[];

  const clientIds = [...new Set(blocks.map((b) => b.client_id).filter(Boolean))];
  const { data: clientRows } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id, name, client_number, delivery_mode, compliance_status, referral_source, profile")
        .in("id", clientIds)
    : { data: [] as ClientRow[] };

  const blockIds = blocks.map((b) => b.id);
  const { data: sessionRows } = blockIds.length
    ? await supabase
        .from("sessions")
        .select("id, block_id, status, completed_at, cancelled_at, scheduled_at, parent_session_id")
        .in("block_id", blockIds)
    : { data: [] as SessionRow[] };

  const clientById = new Map((clientRows ?? []).map((c) => [c.id, c]));

  const countsByBlock = new Map<string, { completed: number; total: number }>();
  const sessionsByBlock = new Map<string, SessionRow[]>();
  for (const s of (sessionRows ?? []) as SessionRow[]) {
    const cur = countsByBlock.get(s.block_id) ?? { completed: 0, total: 0 };
    cur.total += 1;
    if (s.completed_at || s.status === "completed") cur.completed += 1;
    countsByBlock.set(s.block_id, cur);
    const list = sessionsByBlock.get(s.block_id) ?? [];
    list.push(s);
    sessionsByBlock.set(s.block_id, list);
  }

  const rows: BlockWithClient[] = blocks.map((b) => {
    const client = clientById.get(b.client_id);
    const counts = countsByBlock.get(b.id) ?? { completed: 0, total: 0 };
    const blockSessions = sessionsByBlock.get(b.id) ?? [];
    // CR-EF-101 convention — sub-sessions occupy no slot, so the pot count
    // (matching blockSessionCounts elsewhere) excludes them.
    const potSessions = blockSessions.filter((s) => !s.parent_session_id);
    return {
      ...b,
      client_name: client?.name ?? null,
      client_number: client?.client_number ?? null,
      delivery_mode: client?.delivery_mode ?? null,
      compliance_status: client?.compliance_status ?? null,
      programme: client ? programmeFor(client) : null,
      sessions_completed: counts.completed,
      sessions_total: counts.total,
      derived_status: deriveBlockStatus(b.status, blockSessions),
      display_name: blockDisplayName(b, potSessions, potSessions.length),
    };
  });

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Training history"
        subtitle={
          <>
            Every client{`'`}s current training program — start date, sessions and approval status. Looking for individual session times instead? See{" "}
            <Link href="/hub/schedule" className="text-teal font-semibold hover:underline">Studio Schedule</Link>.
          </>
        }
      />
      <PlanScheduleTable data={rows} />
    </div>
  );
}
