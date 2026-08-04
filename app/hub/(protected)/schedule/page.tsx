import { createClient } from "@/lib/supabase-server";
import { HubPageHeader } from "@/components/hub";
import { sessionDurationMinutes } from "@/lib/scheduling";
import type { Session, TimeTier } from "@/types";
import { ScheduleCalendar, type ScheduledEntry } from "./ScheduleCalendar";

/**
 * Studio-wide calendar (Lane D2). Shows every client's scheduled sessions
 * across the whole studio — a session is "on the calendar" when
 * `scheduled_at IS NOT NULL AND cancelled_at IS NULL`.
 *
 * This is a separate, studio-wide view distinct from the per-block
 * BlockScheduler on the block review page. Cancelled sessions are never
 * shown here (they remain visible/undo-able in the per-block scheduler).
 *
 * The join sessions → blocks → clients is done in three queries and stitched
 * in JS because the pg-client shim only supports single-level to-one embeds.
 * Scheduling data is sparse (brand-new capability), so fetching all scheduled
 * sessions and paging by day client-side is cheap and keeps prev/next snappy.
 */
export default async function SchedulePage() {
  const supabase = createClient();

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

  // Resolve blocks → clients for the sessions we have.
  const blockIds = [...new Set(sessions.map((s) => s.block_id).filter(Boolean))];
  const { data: blockRows } = blockIds.length
    ? await supabase.from("blocks").select("id, client_id, block_number").in("id", blockIds)
    : { data: [] as { id: string; client_id: string; block_number: number }[] };
  const blocks = blockRows ?? [];
  const blockById = new Map(blocks.map((b) => [b.id, b]));

  const clientIds = [...new Set(blocks.map((b) => b.client_id).filter(Boolean))];
  const { data: clientRows } = clientIds.length
    ? await supabase.from("clients").select("id, name, client_number").in("id", clientIds)
    : { data: [] as { id: string; name: string; client_number: number | null }[] };
  const clients = clientRows ?? [];
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const entries: ScheduledEntry[] = sessions
    .filter((s) => s.scheduled_at)
    .map((s) => {
      const block = blockById.get(s.block_id);
      const client = block ? clientById.get(block.client_id) : undefined;
      const timeTier = (s.data?.time_tier ?? null) as TimeTier | null;
      return {
        id: s.id,
        clientId: block?.client_id ?? null,
        clientName: client?.name ?? "Unknown client",
        clientNumber: client?.client_number ?? null,
        sessionNumber: s.session_number,
        archetype: s.archetype,
        blockNumber: block?.block_number ?? null,
        scheduledAt: s.scheduled_at as string,
        durationMinutes: sessionDurationMinutes(timeTier),
      };
    });

  return (
    <div className="space-y-6">
      <HubPageHeader
        title="Studio schedule"
        subtitle="Every booked session across the studio. See Training Blocks for each client's block start date and approval status."
      />
      <ScheduleCalendar entries={entries} />
    </div>
  );
}
