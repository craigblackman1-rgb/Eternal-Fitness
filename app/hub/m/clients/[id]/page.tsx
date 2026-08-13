import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ClientProfile, DBClient, SignedAgreement, SignedPARQ } from "@/types";
import { computeComplianceFlags } from "@/lib/compliance";
import { buildMedicalFlags, type ClientFlag } from "@/lib/mobile-client-flags";

const ICO = {
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
    </svg>
  ),
  phone: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  ),
  mail: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  ),
  block: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  ),
  hist: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
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
  chev: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  medLg: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 12h18" />
    </svg>
  ),
  warnLg: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  ok: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
};

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
  email: string | null;
  phone: string | null;
  profile: ClientProfile | null;
  compliance_status: string;
  gp_letter_status: string;
  annual_review_due_date: string | null;
  exercise_modifications: string | null;
  referral_source: string | null;
}

interface SessionRow {
  id: string;
  block_id: string;
  session_number: number;
  data: {
    session_log?: {
      started_at?: string | null;
      completed_at?: string | null;
      rpe?: number | null;
      fatigue?: "low" | "moderate" | "high" | null;
    } | null;
  } | null;
  scheduled_at: string | null;
  cancelled_at: string | null;
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

function flagIcon(tone: ClientFlag["tone"]) {
  if (tone === "ok") return ICO.ok;
  if (tone === "danger") return ICO.medLg;
  return ICO.warnLg;
}

export default async function MobileClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const clientNumber = parseInt(params.id, 10);

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, client_number, email, phone, profile, compliance_status, gp_letter_status, annual_review_due_date, exercise_modifications, referral_source")
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
  const hasSignedParqDocument = (clientDocuments ?? []).some((d: { kind: string; status: string }) => d.kind === "parq" && d.status === "signed");
  const hasSignedAgreementDocument = (clientDocuments ?? []).some((d: { kind: string; status: string }) => d.kind === "terms" && d.status === "signed");

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

  const hasFlag = flags.some((f) => f.tone !== "ok");
  const activeFlagCount = flags.filter((f) => f.tone !== "ok").length;

  const { data: blocksData } = await supabase
    .from("blocks")
    .select("id, block_number, status, summary, block_note")
    .eq("client_id", row.id)
    .order("block_number", { ascending: false });
  const blocks = (blocksData ?? []) as { id: string; block_number: number; status: string; summary: string | null; block_note: string | null }[];

  const blockIds = blocks.map((b) => b.id);
  const { data: sessionsData } = blockIds.length
    ? await supabase
        .from("sessions")
        .select("id, block_id, session_number, data, scheduled_at, cancelled_at")
        .in("block_id", blockIds)
    : { data: [] as SessionRow[] };
  const sessions = (sessionsData ?? []) as SessionRow[];

  const blockById = new Map(blocks.map((b) => [b.id, b]));

  const currentBlock = blocks.find((b) => b.status === "active") ?? blocks.find((b) => b.status === "approved") ?? blocks[0] ?? null;
  const currentBlockSessions = currentBlock ? sessions.filter((s) => s.block_id === currentBlock.id) : [];
  const blockDone = currentBlockSessions.filter((s) => s.data?.session_log?.completed_at).length;
  const blockTotal = currentBlockSessions.length;
  const blockPct = blockTotal > 0 ? Math.round((blockDone / blockTotal) * 100) : 0;
  const blockFocus = currentBlock?.summary ?? currentBlock?.block_note ?? null;

  const history = sessions
    .filter((s) => s.data?.session_log?.completed_at)
    .sort(
      (a, b) =>
        new Date(b.data!.session_log!.completed_at as string).getTime() -
        new Date(a.data!.session_log!.completed_at as string).getTime(),
    )
    .slice(0, 5);

  const now = new Date();
  const upcoming = sessions
    .filter((s) => s.scheduled_at && !s.cancelled_at)
    .filter((s) => new Date(s.scheduled_at as string).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.scheduled_at as string).getTime() - new Date(b.scheduled_at as string).getTime());
  const nextSession = upcoming[0] ?? null;
  const nextLabel = nextSession ? nextLabelFor(nextSession.scheduled_at as string) : null;

  const contactSubtitle = [descriptorFor(row), nextLabel ? `next session ${nextLabel.toLowerCase()}` : "no upcoming session"].join(" · ");

  return (
    <>
      <header className="mtop">
        <div className="mtop-row">
          <Link className="mtop-back" href="/hub/m/clients" aria-label="Back to client list">
            {ICO.back}
          </Link>
          <div className="mtop-id">
            <div className="mtop-t">{row.name}</div>
            <div className="mtop-s">
              {[descriptorFor(row), currentBlock ? `Block ${currentBlock.block_number}` : null].filter(Boolean).join(" · ") || "Client"}
            </div>
          </div>
          <Link className="desktop-link" href={`/hub/clients/${row.client_number ?? ""}`}>
            {ICO.monitor}
            Desktop
          </Link>
        </div>
      </header>

      <main className="mcontent">
        {/* Contact */}
        <div className="panel">
          <div className="panel-h">
            <span className="panel-h-ic">{ICO.user}</span>
            <span>
              <span className="panel-h-t">Contact</span>
              <span className="panel-h-s">{contactSubtitle}</span>
            </span>
          </div>
          <div className="panel-b">
            <div className="kv">
              <span className="kv-k">Phone</span>
              <span className="kv-v">
                {row.phone ? (
                  <a href={`tel:${row.phone.replace(/\s/g, "")}`}>{row.phone}</a>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="kv">
              <span className="kv-k">Email</span>
              <span className="kv-v">{row.email ? <a href={`mailto:${row.email}`}>{row.email}</a> : "—"}</span>
            </div>
            <div className="kv">
              <span className="kv-k">Emergency</span>
              <span className="kv-v">
                {latestParq?.emergency_contact_name
                  ? `${latestParq.emergency_contact_name}${latestParq.emergency_contact_phone ? ` · ${latestParq.emergency_contact_phone}` : ""}`
                  : "—"}
              </span>
            </div>
            {(row.phone || row.email) && (
              <div className="callrow">
                {row.phone && (
                  <a href={`tel:${row.phone.replace(/\s/g, "")}`}>
                    {ICO.phone}
                    Call
                  </a>
                )}
                {row.email && (
                  <a href={`mailto:${row.email}`}>
                    {ICO.mail}
                    Email
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Medical & compliance */}
        <div className="panel">
          <div className="panel-h">
            <span className={`panel-h-ic ${hasFlag ? "danger" : "teal"}`}>{hasFlag ? ICO.medLg : ICO.ok}</span>
            <span>
              <span className="panel-h-t">Medical &amp; compliance</span>
              <span className="panel-h-s">
                {hasFlag ? `${activeFlagCount} active flag${activeFlagCount !== 1 ? "s" : ""}` : "Nothing outstanding"}
              </span>
            </span>
          </div>
          <div className="panel-b">
            {flags.map((f, i) => (
              <div key={i} className={`flagcard ${f.tone}`}>
                <span className="flag-ic">{flagIcon(f.tone)}</span>
                <div>
                  <b>{f.title}</b>
                  {f.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Block progress */}
        {currentBlock && (
          <div className="panel">
            <div className="panel-h">
              <span className="panel-h-ic navy">{ICO.block}</span>
              <span>
                <span className="panel-h-t">Block {currentBlock.block_number}</span>
                <span className="panel-h-s">
                  {blockDone} of {blockTotal} sessions delivered
                </span>
              </span>
            </div>
            <div className="panel-b">
              {blockFocus && (
                <div className="kv" style={{ paddingTop: 0 }}>
                  <span className="kv-k">Focus</span>
                  <span className="kv-v">{blockFocus}</span>
                </div>
              )}
              <div className="blockbar">
                <i style={{ width: `${blockPct}%` }} />
              </div>
              <div className="blockmeta">
                <span>{blockPct}% through</span>
                <span>{Math.max(0, blockTotal - blockDone)} remaining</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent sessions */}
        {history.length > 0 && (
          <div className="panel">
            <div className="panel-h">
              <span className="panel-h-ic teal">{ICO.hist}</span>
              <span>
                <span className="panel-h-t">Recent sessions</span>
                <span className="panel-h-s">Tap to read a past log — read-only</span>
              </span>
            </div>
            <div className="panel-b" style={{ paddingTop: 2, paddingBottom: 4 }}>
              {history.map((h) => {
                const completedAt = h.data?.session_log?.completed_at;
                const d = completedAt ? new Date(completedAt) : null;
                const rpe = h.data?.session_log?.rpe;
                const fatigue = h.data?.session_log?.fatigue;
                const sub = rpe != null || fatigue ? `RPE ${rpe ?? "—"} · ${fatigue ?? "—"} fatigue` : d ? "Session logged" : "";
                return (
                  <Link key={h.id} className="hrow" href={`/hub/m/train/${h.id}`}>
                    <span className="hdate">
                      <b>{d ? d.getDate() : "—"}</b>
                      <span>{d ? d.toLocaleDateString("en-GB", { month: "short" }) : ""}</span>
                    </span>
                    <span className="hbody">
                      <span className="hname">
                        Session {h.session_number} · Block {blockById.get(h.block_id)?.block_number ?? "—"}
                      </span>
                      <span className="hmeta">{sub}</span>
                    </span>
                    <span className="cchev">{ICO.chev}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {nextSession && nextLabel && (
          <Link className="btn btn-primary" href={`/hub/m/train/${nextSession.id}`} style={{ width: "100%", marginTop: 12 }}>
            Open {nextLabel.toLowerCase()} session
          </Link>
        )}

        <div className="absent">
          <b>Deliberately not here</b>
          Documents, PAR-Q editing, cashflow, email updates and any admin action live on the desktop hub. This screen is for a glance before or during a session —{" "}
          <Link href={`/hub/clients/${row.client_number ?? ""}`}>open the full record on desktop</Link>.
        </div>
      </main>
    </>
  );
}
