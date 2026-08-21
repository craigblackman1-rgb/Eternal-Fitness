import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ClientProfile, DBClient, SignedAgreement, SignedPARQ } from "@/types";
import { computeComplianceFlags } from "@/lib/compliance";
import { buildMedicalFlags, type ClientFlag } from "@/lib/mobile-client-flags";
import { deriveSessionStatus } from "@/lib/session-status";
import { DEFAULT_ARCHETYPE_FOCUS_LABELS } from "@/lib/planAgentPrompt";
import { ClientModeView } from "./ClientModeView";
import type {
  BlockView,
  CalendarSessionView,
  RecentSessionView,
  WorkoutView,
} from "./ClientModeView";

const ICO = {
  back: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  monitor: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  exit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
};

interface ClientRow {
  id: string;
  name: string;
  client_number: number | null;
  email: string | null;
  phone: string | null;
  profile: ClientProfile | null;
  compliance_status: string;
  gp_letter_status: string;
  annual_review_due_date: string | null;
  exercise_modifications: string | null;
}

interface SessionRow {
  id: string;
  block_id: string;
  session_number: number;
  archetype: string | null;
  status: string | null;
  completed_at: string | null;
  data: {
    focus_label?: string | null;
    session_log?: {
      completed_at?: string | null;
      rpe?: number | null;
      fatigue?: "low" | "moderate" | "high" | null;
    } | null;
  } | null;
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

/** Session names are `focus_label`, never `Block {n} · S{n}` (CR-EF-034). */
function sessionName(s: SessionRow): string {
  return (
    s.data?.focus_label?.trim() ||
    DEFAULT_ARCHETYPE_FOCUS_LABELS[s.archetype ?? ""] ||
    `Session ${s.session_number}`
  );
}

export default async function MobileClientModePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const clientNumber = parseInt(params.id, 10);

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, client_number, email, phone, profile, compliance_status, gp_letter_status, annual_review_due_date, exercise_modifications")
    .eq("client_number", clientNumber)
    .single();

  if (!client) notFound();
  const row = client as ClientRow;

  const { data: parqs } = await supabase
    .from("signed_parq")
    .select("*")
    .eq("client_id", row.id)
    .order("created_at", { ascending: false });
  const { data: agreements } = await supabase
    .from("signed_agreements")
    .select("*")
    .eq("client_id", row.id)
    .order("created_at", { ascending: false });
  const { data: clientDocuments } = await supabase
    .from("client_documents")
    .select("id, kind, status")
    .eq("client_id", row.id);

  const latestParq = (parqs?.[0] ?? null) as SignedPARQ | null;
  const latestAgreement = (agreements?.[0] ?? null) as SignedAgreement | null;
  const hasSignedParqDocument = (clientDocuments ?? []).some(
    (d: { kind: string; status: string }) => d.kind === "parq" && d.status === "signed",
  );
  const hasSignedAgreementDocument = (clientDocuments ?? []).some(
    (d: { kind: string; status: string }) => d.kind === "terms" && d.status === "signed",
  );

  const compliance = computeComplianceFlags({
    client: row as unknown as DBClient,
    latestParq,
    latestAgreement,
    hasSignedParqDocument,
    hasSignedAgreementDocument,
  });

  const flags: ClientFlag[] = [];
  if (compliance.effectiveStatus === "do_not_train") {
    flags.push({ tone: "danger", title: "Do not train", detail: "Outstanding paperwork must be resolved before any further sessions." });
  } else if (compliance.effectiveStatus === "pending_medical") {
    flags.push({ tone: "danger", title: "Pending medical clearance", detail: "Do not train until clearance is confirmed." });
  }
  for (const action of compliance.autoOutstanding) {
    flags.push({ tone: "warning", title: "Compliance", detail: action });
  }
  flags.push(...buildMedicalFlags({ profile: row.profile, exercise_modifications: row.exercise_modifications }));

  if (flags.length === 0) {
    flags.push({ tone: "ok", title: "No active medical flags", detail: "PAR-Q and agreement on file. Nothing outstanding before training." });
  }

  const activeFlagCount = flags.filter((f) => f.tone !== "ok").length;

  const { data: blocksData } = await supabase
    .from("blocks")
    .select("id, block_number, status, block_note")
    .eq("client_id", row.id)
    .order("block_number", { ascending: false });
  const blocks = (blocksData ?? []) as { id: string; block_number: number; status: string; block_note: string | null }[];

  const blockIds = blocks.map((b) => b.id);
  const { data: sessionsData } = blockIds.length
    ? await supabase
        .from("sessions")
        .select("id, block_id, session_number, archetype, status, completed_at, data, scheduled_at, cancelled_at")
        .in("block_id", blockIds)
    : { data: [] as SessionRow[] };
  const sessions = (sessionsData ?? []) as SessionRow[];

  const currentBlock = blocks.find((b) => b.status === "active") ?? blocks.find((b) => b.status === "approved") ?? blocks[0] ?? null;
  const currentBlockSessions = currentBlock ? sessions.filter((s) => s.block_id === currentBlock.id) : [];

  const blockDone = currentBlockSessions.filter((s) => s.data?.session_log?.completed_at).length;
  const blockTotal = currentBlockSessions.length;
  const blockPct = blockTotal > 0 ? Math.round((blockDone / blockTotal) * 100) : 0;
  // block_note is the short, human-written note shown on the desktop block
  // overview — block.summary is the raw AI planning document and is never
  // rendered directly anywhere, desktop included.
  const blockView: BlockView | null = currentBlock
    ? {
        id: currentBlock.id,
        number: currentBlock.block_number,
        focus: currentBlock.block_note ?? null,
        done: blockDone,
        total: blockTotal,
        pct: blockPct,
      }
    : null;

  const recent: RecentSessionView[] = sessions
    .filter((s) => s.data?.session_log?.completed_at)
    .sort(
      (a, b) =>
        new Date(b.data!.session_log!.completed_at as string).getTime() -
        new Date(a.data!.session_log!.completed_at as string).getTime(),
    )
    .slice(0, 5)
    .map((s) => {
      const completedAt = new Date(s.data!.session_log!.completed_at as string);
      const rpe = s.data!.session_log!.rpe;
      const fatigue = s.data!.session_log!.fatigue;
      const sub =
        rpe != null || fatigue
          ? `RPE ${rpe ?? "—"} · ${fatigue ?? "—"} fatigue`
          : "Session logged";
      return {
        id: s.id,
        day: completedAt.getDate(),
        month: completedAt.toLocaleDateString("en-GB", { month: "short" }),
        name: sessionName(s),
        sub,
      };
    });

  const now = new Date();
  const upcoming = sessions
    .filter((s) => s.scheduled_at && !s.cancelled_at)
    .filter((s) => new Date(s.scheduled_at as string).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.scheduled_at as string).getTime() - new Date(b.scheduled_at as string).getTime());

  const trainTargetId = upcoming[0]?.id ?? currentBlockSessions[0]?.id ?? null;

  const calendarSessions: CalendarSessionView[] = sessions
    .filter((s) => s.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at as string).getTime() - new Date(b.scheduled_at as string).getTime())
    .map((s) => {
      const d = new Date(s.scheduled_at as string);
      return {
        id: s.id,
        day: d.getDate(),
        month: d.toLocaleDateString("en-GB", { month: "short" }),
        time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        scheduledAt: s.scheduled_at as string,
        name: sessionName(s),
        status: deriveSessionStatus({
          status: s.status,
          cancelled_at: s.cancelled_at,
          completed_at: s.completed_at,
          scheduled_at: s.scheduled_at,
          session_log: s.data?.session_log,
        }),
      };
    });

  const workouts: WorkoutView[] = [];
  const byArchetype = new Map<string, SessionRow[]>();
  for (const s of currentBlockSessions) {
    const a = s.archetype ?? "?";
    const arr = byArchetype.get(a) ?? [];
    arr.push(s);
    byArchetype.set(a, arr);
  }
  const archetypeOrder = ["A", "B", "C", ...Array.from(byArchetype.keys()).filter((a) => !["A", "B", "C"].includes(a)).sort()];
  for (const a of archetypeOrder) {
    const list = byArchetype.get(a);
    if (!list) continue;
    const done = list.filter((s) => s.data?.session_log?.completed_at).length;
    workouts.push({
      id: list[0].id,
      key: a,
      letter: a,
      name: sessionName(list[0]),
      emphasis: DEFAULT_ARCHETYPE_FOCUS_LABELS[a] ?? "Session",
      done,
      total: list.length,
    });
  }

  return (
    <>
      <header className="mtop">
        <div className="mtop-row">
          <Link className="mtop-back" href="/hub/m/clients" aria-label="Back to clients">
            {ICO.back}
          </Link>
          <span className="mbrand-sub" style={{ flex: 1, minWidth: 0 }}>
            Trainer Hub · client mode
          </span>
          <Link className="desktop-link" href={`/hub/clients/${clientNumber}`}>
            {ICO.monitor}
            Desktop
          </Link>
        </div>
      </header>

      <div className="scope-bar">
        <span className="scope-av">{initialsFor(row.name)}</span>
        <div className="scope-txt">
          <div className="scope-lbl">Viewing a client</div>
          <div className="scope-name">{row.name}</div>
        </div>
        <Link className="scope-exit" href="/hub/m/clients">
          {ICO.exit}
          Exit client
        </Link>
      </div>

      <ClientModeView
        clientId={row.id}
        clientNumber={clientNumber}
        firstName={row.name.split(" ")[0]}
        flags={flags}
        activeFlagCount={activeFlagCount}
        block={blockView}
        recent={recent}
        calendarSessions={calendarSessions}
        workouts={workouts}
        trainTargetId={trainTargetId}
      />
    </>
  );
}
