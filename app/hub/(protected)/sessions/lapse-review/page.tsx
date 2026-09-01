import { createClient } from "@/lib/supabase-server";
import { sessionWorkoutName } from "@/lib/session-display";
import { LapseReview } from "@/components/hub/LapseReview";
import type { DBSession } from "@/types";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SessionRow = Pick<DBSession, "id" | "block_id" | "session_number" | "scheduled_at" | "lapse_flagged_at" | "data">;

export default async function LapseReviewPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. All flagged sessions (lapse_flagged_at set, status still scheduled)
  const { data: flaggedRows } = await supabase
    .from("sessions")
    .select("id, block_id, session_number, scheduled_at, lapse_flagged_at, data")
    .not("lapse_flagged_at", "is", null)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: false });

  const flagged = (flaggedRows ?? []) as SessionRow[];
  if (flagged.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Lapse review</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Sessions past their slot with no logged activity</p>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-card)] p-10 text-center">
          <p className="text-sm text-muted-foreground">No flagged sessions — all clear.</p>
        </div>
      </div>
    );
  }

  // 2. Collect unique client_ids via blocks
  const blockIds = [...new Set(flagged.map((s) => s.block_id))];
  const { data: blockRows } = await supabase
    .from("blocks")
    .select("id, client_id, block_number")
    .in("id", blockIds);

  const blockClientIdMap = new Map<string, string>();
  const blockNumberMap = new Map<string, number>();
  for (const b of blockRows ?? []) {
    blockClientIdMap.set(b.id, b.client_id);
    blockNumberMap.set(b.id, b.block_number);
  }

  const clientIds = [...new Set(blockClientIdMap.values())];

  // 3. Clients for names
  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, name")
    .in("id", clientIds);

  const clientsMap = new Map<string, string>();
  for (const c of clientRows ?? []) {
    clientsMap.set(c.id, c.name);
  }

  // 4. Group flagged sessions by client
  const sessionsByClient = new Map<string, { id: string; sessionNumber: number; scheduledAt: string | null; blockNumber: number; workoutLabel: string | null }[]>();
  for (const s of flagged) {
    const clientId = blockClientIdMap.get(s.block_id);
    if (!clientId) continue;
    if (!sessionsByClient.has(clientId)) sessionsByClient.set(clientId, []);
    sessionsByClient.get(clientId)!.push({
      id: s.id,
      sessionNumber: s.session_number,
      scheduledAt: s.scheduled_at,
      blockNumber: blockNumberMap.get(s.block_id) ?? 0,
      workoutLabel: sessionWorkoutName(s, `Session ${s.session_number}`),
    });
  }

  const clientData = clientIds
    .map((clientId) => ({
      clientId,
      clientName: clientsMap.get(clientId) ?? "Unknown",
      sessions: sessionsByClient.get(clientId) ?? [],
    }))
    .filter((c) => c.sessions.length > 0)
    .sort((a, b) => a.clientName.localeCompare(b.clientName));

  const totalFlagged = clientData.reduce((sum, c) => sum + c.sessions.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Lapse review</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalFlagged} session{totalFlagged === 1 ? "" : "s"} past their slot with no logged activity
          </p>
        </div>
      </div>
      <LapseReview clients={clientData} />
    </div>
  );
}
