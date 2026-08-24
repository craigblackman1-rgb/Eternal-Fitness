import { createClient } from "@/lib/supabase-server";
import { sessionDurationMinutes } from "@/lib/scheduling";
import type { Session, TimeTier, Task } from "@/types";
import { TodayScreen } from "./TodayScreen";

export interface TodayEntry {
  id: string;
  clientId: string | null;
  clientName: string;
  clientNumber: number | null;
  complianceStatus: string | null;
  sessionNumber: number;
  archetype: string;
  blockNumber: number | null;
  scheduledAt: string;
  durationMinutes: number;
  sessionLogCompletedAt: string | null;
  sessionLogStartedAt: string | null;
}

export default async function TodayPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: sessionRows } = await supabase
    .from("sessions")
    .select("id, block_id, session_number, archetype, data, scheduled_at, cancelled_at")
    .not("scheduled_at", "is", null)
    .is("cancelled_at", null)
    .order("scheduled_at", { ascending: true });

  const sessions: Array<{
    id: string;
    block_id: string;
    session_number: number;
    archetype: string;
    data: Session | null;
    scheduled_at: string | null;
  }> = sessionRows ?? [];

  const blockIds = [...new Set(sessions.map((s) => s.block_id).filter(Boolean))];
  const { data: blockRows } = blockIds.length
    ? await supabase.from("blocks").select("id, client_id, block_number").in("id", blockIds)
    : { data: [] as { id: string; client_id: string; block_number: number }[] };
  const blocks = blockRows ?? [];
  const blockById = new Map(blocks.map((b) => [b.id, b]));

  const clientIds = [...new Set(blocks.map((b) => b.client_id).filter(Boolean))];
  const { data: clientRows } = clientIds.length
    ? await supabase.from("clients").select("id, name, client_number, compliance_status").in("id", clientIds)
    : { data: [] as { id: string; name: string; client_number: number | null; compliance_status: string | null }[] };
  const clients = clientRows ?? [];
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const entries: TodayEntry[] = sessions
    .filter((s) => s.scheduled_at)
    .map((s) => {
      const block = blockById.get(s.block_id);
      const client = block ? clientById.get(block.client_id) : undefined;
      const timeTier = (s.data?.time_tier ?? null) as TimeTier | null;
      const sessionLog = s.data?.session_log ?? null;
      return {
        id: s.id,
        clientId: block?.client_id ?? null,
        clientName: client?.name ?? "Unknown client",
        clientNumber: client?.client_number ?? null,
        complianceStatus: client?.compliance_status ?? null,
        sessionNumber: s.session_number,
        archetype: s.archetype,
        blockNumber: block?.block_number ?? null,
        scheduledAt: s.scheduled_at as string,
        durationMinutes: sessionDurationMinutes(timeTier),
        sessionLogCompletedAt: sessionLog?.completed_at ?? null,
        sessionLogStartedAt: sessionLog?.started_at ?? null,
      };
    });

  const { data: taskRows } = await supabase
    .from("tasks")
    .select("*, clients(name)")
    .order("created_at", { ascending: false });

  const tasks: Task[] = (taskRows ?? []).map((task: Record<string, unknown>) => ({
    ...task,
    client_name: (task.clients as { name?: string } | null)?.name ?? null,
  })) as unknown as Task[];

  const { count: openBookingCount } = await supabase
    .from("outlook_booking_events")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  return <TodayScreen entries={entries} tasks={tasks} openBookingCount={openBookingCount ?? 0} currentUserName={user?.name ?? null} />;
}
