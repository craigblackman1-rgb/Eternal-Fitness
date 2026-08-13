import { createClient } from "@/lib/supabase-server";
import { getAiConfig, aiChatStream } from "@/lib/ai-client";
import { buildParqSection } from "@/lib/parq-summary";
import { buildRecentUpdatesSection } from "@/lib/recent-updates-summary";
import { buildSessionLogSection } from "@/lib/session-log-summary";
import { buildComplianceSection } from "@/lib/compliance-summary";
import { buildStrengthProgressionSection } from "@/lib/strength-progression-summary";
import { getTemplateKind } from "@/lib/email-templates/registry";
import type { BlockSummary, DBBlock, DBClient, DBSession, SentUpdate, SetLog, SignedPARQ } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(
  client: DBClient,
  blocks: DBBlock[],
  summaries: BlockSummary[],
  parq: SignedPARQ | null,
  recentUpdates: SentUpdate[],
  sessions: DBSession[],
  setLogs: SetLog[],
  templateKindId: string,
): string {
  const kind = getTemplateKind(templateKindId);
  const profile = client.profile;

  const blockHistory = blocks.length > 0
    ? blocks.map((b) => `Block ${b.block_number}: ${b.block_note ?? "No note"} [Status: ${b.status}]`).join("\n")
    : "No completed blocks yet.";

  const summariesText = summaries.length > 0
    ? JSON.stringify(summaries.slice(-2), null, 2)
    : "No structured block summaries recorded yet.";

  return `You are helping Esther Fair, a personal trainer who is also Level 4 qualified in Cancer and Exercise Rehabilitation, draft a "${kind.label}" client update email.

You write AS Esther, first person, warm and expert — never corporate, never hypey.

VOICE RULES — never violate:
- Never use "transformation", "results", "crush it", "push your limits", "before and after"
- Frame everything clinically and respectfully — this is a real client, some with serious health conditions
- Never invent progress or specifics that aren't given to you — if something is missing, say so and ask Esther, don't guess
- Plain English, not jargon

Your job in this conversation is to ask Esther what happened, what's worth telling this client, and
what's coming next — then when she's ready she'll click "Create Draft" and the email will be produced
from this conversation plus the client's stored data below. You are not writing the final email in the
chat itself — you're gathering and reflecting back what should go in it, section by section:
${kind.sections.map((s) => `- ${s.label}`).join("\n")}

---

CLIENT: ${client.name}

CLIENT PROFILE:
${JSON.stringify(profile, null, 2)}

RECENT BLOCK HISTORY:
${blockHistory}

STRUCTURED BLOCK SUMMARIES (most recent):
${summariesText}

---

PAR-Q SCREENING:
${buildParqSection(parq)}

---

PREVIOUSLY SENT UPDATES (don't repeat what's already been said — build on it):
${buildRecentUpdatesSection(recentUpdates)}

---

RECENT SESSION LOG:
${buildSessionLogSection(sessions)}

---

${buildStrengthProgressionSection(setLogs)}

---

COMPLIANCE STATUS:
${buildComplianceSection(client)}`;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { clientNumber, messages, templateKind } = (await request.json()) as {
    clientNumber: number;
    messages: ChatMessage[];
    templateKind?: string;
  };

  if (!clientNumber || !messages) {
    return new Response("clientNumber and messages are required", { status: 400 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("client_number", clientNumber)
    .single();

  if (!client) {
    return new Response("Client not found", { status: 404 });
  }

  const aiConfig = getAiConfig();
  if (!aiConfig.provider) {
    return new Response("Update Agent is not configured — set OPENROUTER_API_KEY or ANTHROPIC_API_KEY", { status: 503 });
  }

  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("client_id", client.id)
    .in("status", ["complete", "active"])
    .order("block_number", { ascending: false })
    .limit(3);

  const blockIds = (blocks ?? []).map((b) => b.id);
  const { data: sessions } = blockIds.length > 0
    ? await supabase
        .from("sessions")
        .select("*")
        .in("block_id", blockIds)
        .order("session_number", { ascending: true })
    : { data: null };

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: setLogs } = sessionIds.length > 0
    ? await supabase.from("set_logs").select("*").in("session_id", sessionIds).order("logged_at", { ascending: true })
    : { data: [] as SetLog[] };

  const { data: parq } = await supabase
    .from("signed_parq")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: recentUpdates } = await supabase
    .from("sent_updates")
    .select("*")
    .eq("client_id", client.id)
    .order("sent_at", { ascending: false })
    .limit(5);

  const systemPrompt = buildSystemPrompt(
    client as DBClient,
    (blocks ?? []) as DBBlock[],
    (client.block_summaries ?? []) as BlockSummary[],
    parq,
    recentUpdates ?? [],
    (sessions ?? []) as DBSession[],
    (setLogs ?? []) as SetLog[],
    templateKind || "six_week_update",
  );

  let readable: ReadableStream<Uint8Array> | null;
  try {
    readable = await aiChatStream({
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      maxTokens: 4000,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 300) : "unknown error";
    console.error(`[update-chat] AI stream failed via ${aiConfig.provider} (${aiConfig.model}): ${detail}`);
    return new Response(`Update Agent failed via ${aiConfig.provider} (${aiConfig.model}): ${detail}`, { status: 502 });
  }

  if (!readable) {
    return new Response("Update Agent is not configured", { status: 503 });
  }

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
