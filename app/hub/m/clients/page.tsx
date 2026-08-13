import { createClient } from "@/lib/supabase-server";
import type { ClientProfile } from "@/types";
import { buildMedicalFlags } from "@/lib/mobile-client-flags";
import { ClientsScreen } from "./ClientsScreen";

export interface MobileClientListItem {
  /** client_number — the id used by this app's client routes (matches desktop `/hub/clients/[id]`). */
  clientNumber: number;
  name: string;
  initials: string;
  /** referral_source → first condition → primary goal, best effort. */
  descriptor: string | null;
  /** Human label for the next scheduled session, e.g. "Today 09:00". Null when none. */
  nextLabel: string | null;
  bookedToday: boolean;
  hasFlag: boolean;
  flagCount: number;
  /** e.g. "Block 3 · 9/12". Null when no block. */
  blockLabel: string | null;
}

const GOAL_LABELS: Record<string, string> = {
  strength: "Strength",
  mobility: "Mobility",
  weight_loss: "Weight Loss",
  rehabilitation: "Rehab",
  confidence: "Confidence",
  general_fitness: "General Fitness",
};

interface ClientRow {
  id: string;
  name: string;
  client_number: number | null;
  profile: ClientProfile | null;
  compliance_status: string;
  referral_source: string | null;
  exercise_modifications: string | null;
  client_status: string;
}

interface BlockRow {
  id: string;
  client_id: string;
  block_number: number;
  status: string;
  summary: string | null;
  block_note: string | null;
}

interface SessionRow {
  id: string;
  block_id: string;
  session_number: number;
  data: { session_log?: { completed_at?: string | null } } | null;
  scheduled_at: string | null;
  cancelled_at: string | null;
}

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function descriptorFor(client: ClientRow): string | null {
  if (client.referral_source) return client.referral_source;
  const firstCondition = client.profile?.health?.conditions?.[0];
  if (firstCondition) return firstCondition;
  const goal = client.profile?.goals?.primary;
  if (goal) return GOAL_LABELS[goal] ?? goal;
  return null;
}

function nextLabelFor(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((dayStart.getTime() - todayStart.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${time}`;
}

export default async function MobileClientsPage() {
  const supabase = createClient();

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, name, client_number, profile, compliance_status, referral_source, exercise_modifications, client_status")
    .order("name", { ascending: true });
  const clients = (clientRows ?? []) as ClientRow[];

  const { data: blockRows } = await supabase
    .from("blocks")
    .select("id, client_id, block_number, status, summary, block_note");
  const blocks = (blockRows ?? []) as BlockRow[];

  const { data: sessionRows } = await supabase
    .from("sessions")
    .select("id, block_id, session_number, data, scheduled_at, cancelled_at");
  const sessions = (sessionRows ?? []) as SessionRow[];

  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const blocksByClient = new Map<string, BlockRow[]>();
  for (const b of blocks) {
    const arr = blocksByClient.get(b.client_id) ?? [];
    arr.push(b);
    blocksByClient.set(b.client_id, arr);
  }
  const sessionsByBlock = new Map<string, SessionRow[]>();
  const sessionsByClient = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const arr = sessionsByBlock.get(s.block_id) ?? [];
    arr.push(s);
    sessionsByBlock.set(s.block_id, arr);
    const clientId = blockById.get(s.block_id)?.client_id;
    if (clientId) {
      const carr = sessionsByClient.get(clientId) ?? [];
      carr.push(s);
      sessionsByClient.set(clientId, carr);
    }
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  const items: MobileClientListItem[] = clients
    .filter((c) => c.client_status !== "archived" && c.client_number != null)
    .map((client) => {
      const medicalFlags = buildMedicalFlags({
        profile: client.profile,
        exercise_modifications: client.exercise_modifications,
      });
      const complianceFlagged = client.compliance_status !== "clear";
      const flagCount = medicalFlags.length + (complianceFlagged ? 1 : 0);

      const clientBlocks = (blocksByClient.get(client.id) ?? []).slice().sort((a, b) => b.block_number - a.block_number);
      const currentBlock =
        clientBlocks.find((b) => b.status === "active") ??
        clientBlocks.find((b) => b.status === "approved") ??
        clientBlocks[0];

      let blockLabel: string | null = null;
      if (currentBlock) {
        const blockSessions = sessionsByBlock.get(currentBlock.id) ?? [];
        const done = blockSessions.filter((s) => s.data?.session_log?.completed_at).length;
        blockLabel = `Block ${currentBlock.block_number} · ${done}/${blockSessions.length}`;
      }

      const clientSessions = (sessionsByClient.get(client.id) ?? [])
        .filter((s) => s.scheduled_at && !s.cancelled_at)
        .filter((s) => new Date(s.scheduled_at as string).getTime() >= now.getTime())
        .sort((a, b) => new Date(a.scheduled_at as string).getTime() - new Date(b.scheduled_at as string).getTime());
      const nextSession = clientSessions[0] ?? null;

      const bookedToday = (sessionsByClient.get(client.id) ?? []).some((s) => {
        if (!s.scheduled_at || s.cancelled_at) return false;
        const at = new Date(s.scheduled_at);
        return at >= todayStart && at < todayEnd;
      });

      return {
        clientNumber: client.client_number as number,
        name: client.name,
        initials: initialsFor(client.name),
        descriptor: descriptorFor(client),
        nextLabel: nextSession ? nextLabelFor(nextSession.scheduled_at as string) : null,
        bookedToday,
        hasFlag: flagCount > 0,
        flagCount,
        blockLabel,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return <ClientsScreen items={items} />;
}
