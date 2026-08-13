import { createClient } from "@/lib/supabase-server";
import { getAiConfig, aiChatStream, QUALITY_MODEL } from "@/lib/ai-client";
import { readFileSync } from "fs";
import { join } from "path";
import { buildParqSection } from "@/lib/parq-summary";
import { buildRecentUpdatesSection } from "@/lib/recent-updates-summary";
import { loadPlanAgentBundle, buildBlockHistoryText, type PlanAgentBundle } from "@/lib/planAgentData";
import {
  buildChecklistSection,
  buildEquipmentSection,
  buildExerciseMenuSection,
  buildFormatsSection,
  buildHardConstraintsSection,
  buildPrinciplesSection,
  buildSafetySection,
  buildSplitSection,
  resolveClientSplit,
  resolvePaceModes,
} from "@/lib/planAgentPrompt";
import type { ClientProfile } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(
  client: Record<string, unknown>,
  bundle: PlanAgentBundle,
): string {
  const profile = client.profile as unknown as ClientProfile;
  const health = profile?.health;
  const parqOverride = health?.parq_trainer_override
    ? { confirmed: true, note: health.parq_trainer_override_note }
    : undefined;

  const paceModes = resolvePaceModes(bundle.settings);
  const pace = paceModes[(client.pace_mode as string) ?? "medium"] ?? paceModes.medium;
  const split = resolveClientSplit(bundle.settings, profile?.logistics?.split);

  let equipmentFile: Record<string, unknown> = { space_constraints: "", custom_video_needed: [] };
  try {
    equipmentFile = JSON.parse(readFileSync(join(process.cwd(), "data", "equipment.json"), "utf-8"));
  } catch {
    // data file missing — continue without space/custom-video context
  }

  const customVideoList = (equipmentFile.custom_video_needed as string[])
    ?.map((v) => `- ${v}`)
    .join("\n") ?? "";

  const outstandingActions = ((client.outstanding_actions as string[]) ?? []);
  const actionsText = outstandingActions.length > 0
    ? outstandingActions.map((a) => `- ${a}`).join("\n")
    : "None.";

  return `You are Esther Fair's programming assistant. Esther is a personal trainer, Level 4 qualified in Cancer and Exercise Rehabilitation, also qualified in Exercise Referral, with experience in adaptive training and complex health needs.

Your role is to help Esther plan training blocks through conversation. You know this client's full profile, health history, programming history, and constraints. You programme by strength-training principles, structured with the session formats below. Esther reviews and approves all plans — you generate, she decides.

WHEN ESTHER GIVES A DIRECT INSTRUCTION IN THIS CONVERSATION, FOLLOW IT — first time, no argument.
If she tells you to change something, do it. Don't reopen the point, don't repeat an objection you've
already made, don't keep steering back toward the alternative you'd have chosen. The training
principles, session formats, build checklist, and muscle-group coverage guidance further down are
defaults for you to apply when she hasn't said otherwise — they are not rules to hold her to. She is
the qualified clinician; you generate options and do the busywork, she makes the calls.
The one exception is the HARD CONSTRAINTS AND CONTRAINDICATIONS section below — client-specific
medical/safety information already on file. If what she's asking for conflicts with something there,
say so once, plainly, in a single sentence, then do what she asked. Never refuse outright, and never
raise the same concern a second time in this conversation — she has heard it and made her call.

---

CLIENT: ${client.name}
COMPLIANCE STATUS: ${client.compliance_status ?? "unknown"}
GROUP TYPE: ${client.group_type === "calendar_block" ? "Calendar Block (shared programme)" : "Individual Journey (bespoke)"}
PACE: ${pace.label} — target roughly ${pace.total} work exercises per session${pace.finisher ? ", finisher allowed" : ", no finisher for this client"}

---

${buildHardConstraintsSection(profile?.programming_adaptations ?? [], profile?.health?.contraindications ?? [], bundle.ruleTypesById)}

OUTSTANDING ACTIONS:
${actionsText}

CLIENT PROFILE:
${JSON.stringify(profile, null, 2)}

BLOCK HISTORY:
${buildBlockHistoryText(bundle.blocks)}

---

PAR-Q SCREENING:
${buildParqSection(bundle.parq, parqOverride)}

---

RECENT CLIENT UPDATES (already communicated to this client — don't repeat, build on it):
${buildRecentUpdatesSection(bundle.recentUpdates)}

---

${buildSplitSection(split, profile?.logistics?.sessions_per_week ?? 1)}

TRAINING PRINCIPLES:
${buildPrinciplesSection(bundle.settings)}

SESSION FORMATS — structure each session's main work from these:
${buildFormatsSection(bundle.settings)}

---

STUDIO EQUIPMENT — the complete list, use nothing else:
${buildEquipmentSection(bundle.equipmentRows)}

Space: ${equipmentFile.space_constraints ?? ""}

CUSTOM VIDEOS NEEDED IN TRAINERIZE (flag if using any of these):
${customVideoList}

---

EXERCISE LIBRARY — every exercise you programme MUST be chosen from this list, using its exact name:
${buildExerciseMenuSection(bundle.menuExercises)}

---

BUILD CHECKLIST — work through this before producing a plan:
${buildChecklistSection(bundle.settings)}

TIMING SENSE CHECK:
- Would Esther get through this in 60 min at this client's pace?

SAFETY RULES — never violate:
${buildSafetySection(bundle.settings)}

FORMATTING:
Your replies render as markdown. Structure every plan with ## session headings, and present exercises
as markdown tables with columns: Exercise | Sets | Reps | Tempo | Rest | Modification. Use bullet
lists for rationale and flags, bold for key clinical cautions. Never return one unstructured block of prose.`;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { clientNumber, messages } = await request.json() as { clientNumber: number; messages: ChatMessage[] };

  if (!clientNumber || !messages) {
    return new Response("clientNumber and messages are required", { status: 400 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("*, compliance_status, outstanding_actions, group_type, pace_mode")
    .eq("client_number", clientNumber)
    .single();

  if (!client) {
    return new Response("Client not found", { status: 404 });
  }

  const aiConfig = getAiConfig();
  if (!aiConfig.provider) {
    return new Response("Plan Agent is not configured — set OPENROUTER_API_KEY or ANTHROPIC_API_KEY", { status: 503 });
  }

  const bundle = await loadPlanAgentBundle(supabase, client.id);
  const systemPrompt = buildSystemPrompt(client, bundle);

  // Plan Agent is quality-critical (it's meant to save Esther time) — always request
  // the best available model rather than whatever cheaper default is configured
  // elsewhere in the app.
  const planModel = aiConfig.provider === "openrouter" ? QUALITY_MODEL.openrouter : QUALITY_MODEL.claude;

  let readable: ReadableStream<Uint8Array> | null;
  try {
    readable = await aiChatStream({
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      maxTokens: 8000,
      model: planModel,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 300) : "unknown error";
    // Log the model actually billed (planModel), not aiConfig.model — that's just
    // the app's configured default and doesn't reflect the QUALITY_MODEL override
    // above; logging it here hid the real cost driver during the 2026-08-13 incident.
    console.error(`[plan-chat] AI stream failed via ${aiConfig.provider} (${planModel}): ${detail}`);
    return new Response(`Plan Agent failed via ${aiConfig.provider} (${planModel}): ${detail}`, { status: 502 });
  }

  if (!readable) {
    return new Response("Plan Agent is not configured", { status: 503 });
  }

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
