import { createClient } from "@/lib/supabase-server";
import type { DBClient, DBBlock, BlockSummary, DBSession, SetLog } from "@/types";
import { buildSixWeekUpdateHtml } from "@/lib/email-templates/six-week-update";
import type { SixWeekUpdateData } from "@/lib/email-templates/six-week-update";
import { buildFourWeekUpdateHtml } from "@/lib/email-templates/four-week-update";
import type { FourWeekUpdateData } from "@/lib/email-templates/four-week-update";
import { buildFlexibleUpdateHtml } from "@/lib/email-templates/flexible-update";
import type { FlexibleSection } from "@/lib/email-templates/flexible-update";
import { getAiConfig, aiChat, QUALITY_MODEL, type AiConfig } from "@/lib/ai-client";
import { buildSessionLogSection } from "@/lib/session-log-summary";
import { buildComplianceSection } from "@/lib/compliance-summary";
import { buildStrengthProgressionSection } from "@/lib/strength-progression-summary";

export interface UpdateDraft {
  subject: string;
  html: string;
  /** Section HTML keyed by registry section key for fixed-shape kinds, or
   *  `{ sections: FlexibleSection[] }` for the flexible kind. */
  data: SixWeekUpdateData | FourWeekUpdateData | Record<string, unknown>;
  blockNumber: number;
  generatedAt: string;
  provider: string | null;
}

const VOICE_RULES = `Rules:
- Never use "transformation", "results", "crush it", "push your limits", "before and after"
- Frame everything clinically and respectfully
- Never invent or exaggerate progress that wasn't actually described to you
- Write in first person as Esther
- Use plain English, not jargon
- This is an email to a real client — be personal and specific

Before you write anything: read the ENTIRE input below end to end — the conversation notes, the
session log, and the structured data — at least once, fully, before drafting any section. Esther's
most specific and useful details are often buried mid-conversation, not at the start or end. Build a
mental note of every concrete detail you find (a named exercise, a number, a date, a specific thing
she said happened) before you start writing.

Esther always provides more than enough detail to write every section for real — she has never sent
you an update request that genuinely lacked the information needed. Every section of this email MUST
contain real, specific written content. Do not, under any circumstances, output a placeholder like
"[CLIENT — ...]", "I don't have the details for X yet", "[ATTENDANCE — add ...]", or any bracketed
note asking for more information — that is never an acceptable output, no matter what template kind
this is. If a section seems to lack detail, you have not read the input closely enough: go back
through the conversation notes, session log, and structured data again and find what's actually
there before concluding otherwise. Every distinct topic Esther raised needs its own real content.`;

function systemPreamble(): string {
  return `You are Esther Fair, a personal trainer in Worthing, West Sussex, Level 4 qualified in Cancer and Exercise Rehabilitation.
You write warm, expert, first-person emails to your clients. You speak as you would in person — not corporate, not hypey.

${VOICE_RULES}`;
}

function clientContextBlock(
  clientName: string,
  profile: unknown,
  blocks: DBBlock[],
  summaries: BlockSummary[],
  nextBlock: DBBlock | null,
  conversationSummary?: string,
  sessionLogSection?: string,
  complianceSection?: string,
  strengthSection?: string,
): string {
  let text = `Client: ${clientName}

Client Profile:
${JSON.stringify(profile, null, 2)}

Completed Blocks:
${JSON.stringify(blocks, null, 2)}

Block Summaries (structured):
${JSON.stringify(summaries, null, 2)}

Next Block:
${JSON.stringify(nextBlock, null, 2)}
${conversationSummary ? `\nEsther's notes from a chat about this update — this is the primary source for what to say. It's more current and specific than the stored data above, and it also tells you what this update should actually cover (which sections it needs and what belongs in each):\n${conversationSummary}\n` : ""}`;

  if (sessionLogSection) {
    text += `\n\nRECENT SESSION LOG:\n${sessionLogSection}\n`;
  }
  if (strengthSection) {
    text += `\n\n${strengthSection}\n`;
  }
  if (complianceSection) {
    text += `\n\nCOMPLIANCE STATUS:\n${complianceSection}\n`;
  }
  return text;
}

function parseAiJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

export async function generateUpdateDraft(
  clientNumber: number,
  templateKind: string,
  options: { conversationSummary?: string } = {},
): Promise<UpdateDraft> {
  const supabase = createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("client_number", clientNumber)
    .single();

  if (!client) {
    throw new Error("Client not found");
  }

  const dbClient = client as unknown as DBClient;
  const profile = dbClient.profile;

  const { data: completedBlocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("client_id", dbClient.id)
    .in("status", ["complete", "active"])
    .order("block_number", { ascending: false })
    .limit(3);

  const blockIds = (completedBlocks ?? []).map((b) => b.id);
  const { data: sessions } = blockIds.length > 0
    ? await supabase
        .from("sessions")
        .select("*")
        .in("block_id", blockIds)
        .order("session_number", { ascending: true })
    : { data: null };

  const { data: latestPlanned } = await supabase
    .from("blocks")
    .select("*")
    .eq("client_id", dbClient.id)
    .in("status", ["active", "approved", "draft"])
    .order("block_number", { ascending: false })
    .limit(1);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: setLogs } = sessionIds.length > 0
    ? await supabase.from("set_logs").select("*").in("session_id", sessionIds).order("logged_at", { ascending: true })
    : { data: [] as SetLog[] };

  const blocks = (completedBlocks || []) as DBBlock[];
  const nextBlock = (latestPlanned?.[0] as DBBlock) || null;
  const summaries = (dbClient.block_summaries || []) as BlockSummary[];
  const blockNumber = blocks[0]?.block_number ?? 0;
  const aiConfig = getAiConfig();

  const sessionLogSection = buildSessionLogSection((sessions ?? []) as DBSession[]);
  const complianceSection = buildComplianceSection(dbClient);
  const strengthSection = buildStrengthProgressionSection((setLogs ?? []) as SetLog[]);

  if (templateKind === "flexible_update") {
    return aiConfig.provider
      ? generateFlexibleViaAi(aiConfig, profile, blocks, summaries, nextBlock, dbClient.name, blockNumber, options.conversationSummary, sessionLogSection, complianceSection, strengthSection)
      : generateFlexibleFallback(dbClient.name, blockNumber);
  }

  if (templateKind === "four_week_update") {
    return aiConfig.provider
      ? generateFourWeekViaAi(aiConfig, profile, blocks, summaries, nextBlock, dbClient.name, blockNumber, options.conversationSummary, sessionLogSection, complianceSection, strengthSection)
      : generateFourWeekFallback(profile, blocks, summaries, nextBlock, dbClient.name, blockNumber);
  }

  return aiConfig.provider
    ? generateSixWeekViaAi(aiConfig, profile, blocks, summaries, nextBlock, dbClient.name, blockNumber, options.conversationSummary, sessionLogSection, complianceSection, strengthSection)
    : generateSixWeekFallback(profile, blocks, summaries, nextBlock, dbClient.name, blockNumber);
}

// ---- six_week_update --------------------------------------------------------

function buildSixWeekSections(
  profile: import("@/types").ClientProfile,
  blocks: DBBlock[],
  summaries: BlockSummary[],
  nextBlock: DBBlock | null,
  clientName: string,
): SixWeekUpdateData {
  const latestSummary = summaries[summaries.length - 1];

  let attendanceSection: string;
  if (latestSummary) {
    const { sessions_attended, sessions_scheduled, attendance_notes } = latestSummary.attendance;
    attendanceSection = `<p>You attended <strong>${sessions_attended}</strong> out of <strong>${sessions_scheduled}</strong> sessions over this block.`;
    if (attendance_notes) attendanceSection += ` ${attendance_notes}`;
    attendanceSection += `</p>`;
  } else {
    attendanceSection = `<p>[ATTENDANCE — add sessions attended / scheduled]</p>`;
  }

  let highlightsSection: string;
  if (latestSummary?.highlights) {
    highlightsSection = `<p>${latestSummary.highlights}</p>`;
    if (latestSummary.movements_introduced?.length > 0) {
      highlightsSection += `<p>Movements we introduced or progressed:</p><ul style="padding-left:20px;">${latestSummary.movements_introduced.map((m) => `<li style="margin-bottom:4px;">${m}</li>`).join("")}</ul>`;
    }
  } else if (blocks.length > 0) {
    const blockNotes = blocks.filter((b) => b.block_note).map((b) => b.block_note);
    if (blockNotes.length > 0) {
      highlightsSection = `<p>Over this period we worked on:</p><ul style="padding-left:20px;">${blockNotes.map((n) => `<li style="margin-bottom:4px;">${n}</li>`).join("")}</ul>`;
    } else {
      highlightsSection = `<p>[HIGHLIGHTS — describe what's improved, movements added, strength gains]</p>`;
    }
  } else {
    highlightsSection = `<p>[HIGHLIGHTS — describe what's improved, movements added, strength gains]</p>`;
  }

  let bigWinSection: string;
  if (latestSummary?.big_win) {
    bigWinSection = `<p>${latestSummary.big_win}</p>`;
  } else {
    bigWinSection = `<p>[THE BIG WIN — the single standout achievement this block and why it matters]</p>`;
  }

  let whatsNextSection: string;
  if (latestSummary?.next_block_focus) {
    whatsNextSection = `<p>${latestSummary.next_block_focus}</p>`;
  } else if (nextBlock?.block_note) {
    whatsNextSection = `<p>${nextBlock.block_note}</p>`;
  } else {
    whatsNextSection = `<p>[WHAT'S NEXT — what the next block focuses on]</p>`;
  }

  let worthSayingSection: string;
  if (latestSummary?.worth_saying) {
    worthSayingSection = `<p>${latestSummary.worth_saying}</p>`;
  } else if (profile.notes.esther_observations) {
    worthSayingSection = `<p>${profile.notes.esther_observations}</p>`;
  } else {
    worthSayingSection = `<p>[WORTH SAYING — extra thoughts, encouragement, observations]</p>`;
  }

  return { clientName, attendanceSection, bigWinSection, highlightsSection, whatsNextSection, worthSayingSection };
}

function generateSixWeekFallback(
  profile: import("@/types").ClientProfile,
  blocks: DBBlock[],
  summaries: BlockSummary[],
  nextBlock: DBBlock | null,
  clientName: string,
  blockNumber: number,
): UpdateDraft {
  const data = buildSixWeekSections(profile, blocks, summaries, nextBlock, clientName);
  return {
    subject: "Your last 6 weeks with me 🏋️",
    html: buildSixWeekUpdateHtml(data),
    data,
    blockNumber,
    generatedAt: new Date().toISOString(),
    provider: null,
  };
}

async function generateSixWeekViaAi(
  aiConfig: AiConfig,
  profile: unknown,
  blocks: DBBlock[],
  summaries: BlockSummary[],
  nextBlock: DBBlock | null,
  clientName: string,
  blockNumber: number,
  conversationSummary?: string,
  sessionLogSection?: string,
  complianceSection?: string,
  strengthSection?: string,
): Promise<UpdateDraft> {
  const system = systemPreamble();
  const user = `Write a 6-week update email for ${clientName}. Here is what I know:

${clientContextBlock(clientName, profile, blocks, summaries, nextBlock, conversationSummary, sessionLogSection, complianceSection, strengthSection)}
Return valid JSON with these fields:
{
  "subject": "string",
  "attendanceSection": "HTML string for attendance & consistency section",
  "bigWinSection": "HTML string for the single biggest win this block and why it matters",
  "highlightsSection": "HTML string for strength & fitness highlights section",
  "whatsNextSection": "HTML string for what's next section",
  "worthSayingSection": "HTML string for worth saying section"
}

No markdown, no preamble, no explanation.`;

  const model = aiConfig.provider === "openrouter" ? QUALITY_MODEL.openrouter : QUALITY_MODEL.claude;
  const text = await aiChat({ system, user, maxTokens: 4000, model });
  if (!text) throw new Error("AI returned no response");
  const parsed = parseAiJson(text);

  const data: SixWeekUpdateData = {
    clientName,
    attendanceSection: (parsed.attendanceSection as string) || "[ATTENDANCE]",
    bigWinSection: (parsed.bigWinSection as string) || "[THE BIG WIN]",
    highlightsSection: (parsed.highlightsSection as string) || "[HIGHLIGHTS]",
    whatsNextSection: (parsed.whatsNextSection as string) || "[WHAT'S NEXT]",
    worthSayingSection: (parsed.worthSayingSection as string) || "[WORTH SAYING]",
  };

  return {
    subject: (parsed.subject as string) || "Your last 6 weeks with me 🏋️",
    html: buildSixWeekUpdateHtml(data),
    data,
    blockNumber,
    generatedAt: new Date().toISOString(),
    provider: aiConfig.provider,
  };
}

// ---- four_week_update --------------------------------------------------------

function generateFourWeekFallback(
  profile: import("@/types").ClientProfile,
  blocks: DBBlock[],
  summaries: BlockSummary[],
  nextBlock: DBBlock | null,
  clientName: string,
  blockNumber: number,
): UpdateDraft {
  const base = buildSixWeekSections(profile, blocks, summaries, nextBlock, clientName);
  const data: FourWeekUpdateData = {
    ...base,
    whatEverySessionSection: `<p>[WHAT EVERY SESSION IS ACTUALLY DOING — describe the quieter, less obvious value of the sessions]</p>`,
    keepAnEyeOnSection: `<p>[KEEP AN EYE ON — anything to flag for this client]</p>`,
  };
  return {
    subject: "Your last 4 weeks with me 🏋️",
    html: buildFourWeekUpdateHtml(data),
    data,
    blockNumber,
    generatedAt: new Date().toISOString(),
    provider: null,
  };
}

async function generateFourWeekViaAi(
  aiConfig: AiConfig,
  profile: unknown,
  blocks: DBBlock[],
  summaries: BlockSummary[],
  nextBlock: DBBlock | null,
  clientName: string,
  blockNumber: number,
  conversationSummary?: string,
  sessionLogSection?: string,
  complianceSection?: string,
  strengthSection?: string,
): Promise<UpdateDraft> {
  const system = systemPreamble();
  const user = `Write a 4-week update email for ${clientName}. Here is what I know:

${clientContextBlock(clientName, profile, blocks, summaries, nextBlock, conversationSummary, sessionLogSection, complianceSection, strengthSection)}
Return valid JSON with these fields:
{
  "subject": "string",
  "attendanceSection": "HTML string for attendance & consistency section",
  "bigWinSection": "HTML string for the single biggest win this block and why it matters",
  "highlightsSection": "HTML string for strength & fitness highlights section",
  "whatEverySessionSection": "HTML string on what every session is actually doing for this client, even the quiet weeks",
  "keepAnEyeOnSection": "HTML string on anything worth flagging for this client",
  "whatsNextSection": "HTML string for what's next section",
  "worthSayingSection": "HTML string for worth saying section"
}

No markdown, no preamble, no explanation.`;

  const model = aiConfig.provider === "openrouter" ? QUALITY_MODEL.openrouter : QUALITY_MODEL.claude;
  const text = await aiChat({ system, user, maxTokens: 4000, model });
  if (!text) throw new Error("AI returned no response");
  const parsed = parseAiJson(text);

  const data: FourWeekUpdateData = {
    clientName,
    attendanceSection: (parsed.attendanceSection as string) || "[ATTENDANCE]",
    bigWinSection: (parsed.bigWinSection as string) || "[THE BIG WIN]",
    highlightsSection: (parsed.highlightsSection as string) || "[HIGHLIGHTS]",
    whatEverySessionSection: (parsed.whatEverySessionSection as string) || "[WHAT EVERY SESSION IS DOING]",
    keepAnEyeOnSection: (parsed.keepAnEyeOnSection as string) || "[KEEP AN EYE ON]",
    whatsNextSection: (parsed.whatsNextSection as string) || "[WHAT'S NEXT]",
    worthSayingSection: (parsed.worthSayingSection as string) || "[WORTH SAYING]",
  };

  return {
    subject: (parsed.subject as string) || "Your last 4 weeks with me 🏋️",
    html: buildFourWeekUpdateHtml(data),
    data,
    blockNumber,
    generatedAt: new Date().toISOString(),
    provider: aiConfig.provider,
  };
}

// ---- flexible_update ---------------------------------------------------------
// No fixed section list — the AI decides how many sections this update needs and
// what each is called, driven entirely by the chat conversation (mirrors how
// Esther drafts these by hand today: whatever the update needs, no more, no less).

function generateFlexibleFallback(clientName: string, blockNumber: number): UpdateDraft {
  const sections: FlexibleSection[] = [
    { heading: "", html: "<p>[Describe what happened this block]</p>" },
  ];
  return {
    subject: "A training update from Esther 🏋️",
    html: buildFlexibleUpdateHtml({ clientName, sections }),
    data: { sections },
    blockNumber,
    generatedAt: new Date().toISOString(),
    provider: null,
  };
}

async function generateFlexibleViaAi(
  aiConfig: AiConfig,
  profile: unknown,
  blocks: DBBlock[],
  summaries: BlockSummary[],
  nextBlock: DBBlock | null,
  clientName: string,
  blockNumber: number,
  conversationSummary?: string,
  sessionLogSection?: string,
  complianceSection?: string,
  strengthSection?: string,
): Promise<UpdateDraft> {
  const system = `${systemPreamble()}

This update doesn't follow a fixed template — you decide how many sections it needs and
what each one is called, based entirely on what Esther told you in the conversation.
Mirror the structure she described: if she talked through several distinct topics (a big
win, a specific exercise, what's next), give each its own section rather than cramming
everything into one block. Don't invent sections she didn't mention.

Before deciding the section list, go through the conversation notes topic by topic and check off
each one against the workouts/exercises/topics actually named in the structured data below (blocks,
summaries, session log). A workout or exercise that's named anywhere in the input needs a real,
specific section written from what's actually there. A placeholder like "[CLIENT — I don't have the
breakdown for X yet]" is never an acceptable section — Esther's input always has enough for you to
write something real about every topic she raised.`;
  const user = `Write a training update email for ${clientName}. Here is what I know:

${clientContextBlock(clientName, profile, blocks, summaries, nextBlock, conversationSummary, sessionLogSection, complianceSection, strengthSection)}
Return valid JSON with this shape:
{
  "subject": "string",
  "greetingName": "string — first name for the \\"Hi …,\\" greeting",
  "introText": "string — a short opening paragraph before the sections",
  "sections": [
    { "heading": "string — section title, e.g. Attendance & Consistency", "html": "HTML string for this section's content" }
  ],
  "psSection": "optional HTML string for a P.S. note after the sign-off — omit if not needed"
}

Use as many section entries as the conversation actually calls for. No markdown, no preamble, no explanation.`;

  const model = aiConfig.provider === "openrouter" ? QUALITY_MODEL.openrouter : QUALITY_MODEL.claude;
  const text = await aiChat({ system, user, maxTokens: 4000, model });
  if (!text) throw new Error("AI returned no response");
  const parsed = parseAiJson(text);

  const rawSections = Array.isArray(parsed.sections) ? (parsed.sections as Array<Record<string, unknown>>) : [];
  const sections: FlexibleSection[] = rawSections.length > 0
    ? rawSections.map((s) => ({ heading: (s.heading as string) || "", html: (s.html as string) || "" }))
    : [{ heading: "", html: "<p>[Describe what happened this block]</p>" }];

  const greetingName = (parsed.greetingName as string) || undefined;
  const introText = (parsed.introText as string) || undefined;
  const psSection = (parsed.psSection as string) || undefined;

  return {
    subject: (parsed.subject as string) || "A training update from Esther 🏋️",
    html: buildFlexibleUpdateHtml({ clientName, greetingName, introText, sections, psSection }),
    data: { sections, greetingName, introText, psSection },
    blockNumber,
    generatedAt: new Date().toISOString(),
    provider: aiConfig.provider,
  };
}
