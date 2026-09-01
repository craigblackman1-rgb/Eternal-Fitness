import { createClient } from "@/lib/supabase-server";
import { deriveSessionPot } from "@/lib/session-pot";
import { CancellationReview } from "@/components/hub/CancellationReview";
import type { DBSession } from "@/types";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SessionRow = Pick<DBSession, "id" | "block_id" | "session_number" | "scheduled_at" | "cancel_reason" | "charged_free" | "status" | "cancelled_at" | "parent_session_id">;

export default async function CancellationReviewPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. All unreviewed cancellations — CR-EF-101: exclude sub-sessions (they
  //    have no allowance implication, so asking Esther charged/free is meaningless)
  const { data: unreviewedRows } = await supabase
    .from("sessions")
    .select("id, block_id, session_number, scheduled_at, cancel_reason, charged_free, status, cancelled_at, parent_session_id, data")
    .eq("status", "cancelled")
    .is("charged_free", null)
    .is("parent_session_id", null)
    .order("scheduled_at", { ascending: false });

  const unreviewed = (unreviewedRows ?? []) as SessionRow[];
  if (unreviewed.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Cancellation review</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Review cancelled sessions and decide whether to charge or mark free</p>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-card)] p-10 text-center">
          <p className="text-sm text-muted-foreground">All cancelled sessions have been reviewed.</p>
        </div>
      </div>
    );
  }

  // 2. Collect unique client_ids via blocks
  const blockIds = [...new Set(unreviewed.map((s) => s.block_id))];
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

  // 3. Clients for names + sessions_purchased
  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, name, sessions_purchased")
    .in("id", clientIds);

  const clientsMap = new Map<string, { name: string; sessionsPurchased: number | null }>();
  for (const c of clientRows ?? []) {
    clientsMap.set(c.id, { name: c.name, sessionsPurchased: c.sessions_purchased });
  }

  // 4. All sessions per client (for pot calculation — CR-EF-101: pot excludes sub-sessions)
  const { data: allSessionRows } = await supabase
    .from("sessions")
    .select("id, status, charged_free, cancelled_at, block_id, parent_session_id")
    .in("block_id", blockIds);

  // Group all sessions by client
  const sessionsByClient = new Map<string, SessionRow[]>();
  for (const s of allSessionRows ?? []) {
    const clientId = blockClientIdMap.get(s.block_id);
    if (!clientId) continue;
    if (!sessionsByClient.has(clientId)) sessionsByClient.set(clientId, []);
    sessionsByClient.get(clientId)!.push(s);
  }

  // 5. Build client data with pot breakdowns
  const clientData = clientIds.map((clientId) => {
    const client = clientsMap.get(clientId) ?? { name: "Unknown", sessionsPurchased: null };
    const allSessions = sessionsByClient.get(clientId) ?? [];
    const unreviewedSessions = unreviewed.filter((s) => blockClientIdMap.get(s.block_id) === clientId);
    const pot = deriveSessionPot(allSessions, client.sessionsPurchased);

    return {
      clientId,
      clientName: client.name,
      sessionsPurchased: client.sessionsPurchased,
      pot,
      sessions: unreviewedSessions.map((s) => ({
        id: s.id,
        sessionNumber: s.session_number,
        scheduledAt: s.scheduled_at,
        cancelReason: s.cancel_reason,
        blockNumber: blockNumberMap.get(s.block_id) ?? 0,
        focusLabel: (s as any).data?.focus_label ?? "",
      })),
    };
  }).filter((c) => c.sessions.length > 0)
    .sort((a, b) => a.clientName.localeCompare(b.clientName));

  const totalUnreviewed = clientData.reduce((sum, c) => sum + c.sessions.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Cancellation review</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalUnreviewed} cancelled session{totalUnreviewed === 1 ? "" : "s"} waiting for a charged / free decision
          </p>
        </div>
      </div>
      <CancellationReview clients={clientData} />
    </div>
  );
}
