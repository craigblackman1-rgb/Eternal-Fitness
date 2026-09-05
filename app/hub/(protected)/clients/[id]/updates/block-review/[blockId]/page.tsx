import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { DBSession, SetLog } from "@/types";
import {
  computeAttendanceFacts,
  computePbsInBlockRange,
  computeBelowBestFacts,
  computeRulesInEffect,
} from "@/lib/block-review-facts";
import { BlockReviewClient } from "./BlockReviewClient";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ── S8 — Block review & update (design-systems v3/09-update-review.html) ──
   One screen: the block's own facts (attendance, PBs, still-below-best,
   standing training rules — all computed, never typed), Esther's internal
   decision (client_reviews), and the client-facing update email
   (sent_updates) — assembled from the same facts rather than a blank
   compose box. See lib/block-review-facts.ts for how each fact is derived,
   and NewUpdateClient's `initialDraft`/`embedded`/`onBeforeSubmit` props
   (added for this screen) for how the two writes share one footer. */
export default async function BlockReviewPage({ params }: { params: { id: string; blockId: string } }) {
  const supabase = createClient();
  const clientNumber = parseInt(params.id);
  if (isNaN(clientNumber)) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserName = (user as any)?.name || "Staff";

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("client_number", clientNumber)
    .single();
  if (!client) notFound();

  const { data: block } = await supabase
    .from("blocks")
    .select("*")
    .eq("id", params.blockId)
    .eq("client_id", client.id)
    .single();
  if (!block) notFound();

  // This block's own sessions — attendance is computed from these rows only.
  const { data: blockSessionsRaw } = await supabase
    .from("sessions")
    .select("*")
    .eq("block_id", block.id)
    .order("session_number", { ascending: true });
  const blockSessions = (blockSessionsRaw ?? []) as DBSession[];

  // The next block (by number), for the "what's next" seed and header line.
  const { data: nextBlock } = await supabase
    .from("blocks")
    .select("*")
    .eq("client_id", client.id)
    .eq("block_number", block.block_number + 1)
    .maybeSingle();

  let nextBlockSessions: DBSession[] = [];
  if (nextBlock) {
    const { data } = await supabase.from("sessions").select("*").eq("block_id", nextBlock.id);
    nextBlockSessions = (data ?? []) as DBSession[];
  }

  // Every one of the client's blocks/sessions, to derive set_logs for the
  // below-best comparison (that fact is deliberately NOT scoped to this
  // block alone — see lib/block-review-facts.ts).
  const { data: allBlocks } = await supabase.from("blocks").select("id").eq("client_id", client.id);
  const allBlockIds = (allBlocks ?? []).map((b) => b.id);
  let allSetLogs: SetLog[] = [];
  if (allBlockIds.length > 0) {
    const { data: allSessions } = await supabase.from("sessions").select("id").in("block_id", allBlockIds);
    const allSessionIds = (allSessions ?? []).map((s) => s.id);
    if (allSessionIds.length > 0) {
      const { data: logs } = await supabase.from("set_logs").select("*").in("session_id", allSessionIds);
      allSetLogs = (logs ?? []) as SetLog[];
    }
  }

  const { data: personalRecords } = await supabase
    .from("personal_records")
    .select("exercise, metric, value, rep_count, achieved_at")
    .eq("client_id", client.id);

  const { data: ruleTypes } = await supabase.from("training_rule_types").select("id, label");
  const ruleTypesById = new Map((ruleTypes ?? []).map((rt: any) => [rt.id, rt]));
  const adaptations = (client.profile?.programming_adaptations ?? []) as { id: string; detail: string; rule_type_id: string }[];

  // Default send-to address — same resolution chain as the plain "New Update"
  // compose page: master record, then signed PAR-Q, then signed agreement.
  let defaultEmail = "";
  if (client.email) {
    defaultEmail = client.email;
  } else {
    const { data: parq } = await supabase
      .from("signed_parq")
      .select("email")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (parq?.email) defaultEmail = parq.email;
  }
  if (!defaultEmail) {
    const { data: agreement } = await supabase
      .from("signed_agreements")
      .select("client_email")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (agreement?.client_email) defaultEmail = agreement.client_email;
  }

  const attendance = computeAttendanceFacts(blockSessions);
  const blockDates = blockSessions.map((s) => s.scheduled_at).filter((d): d is string => !!d).sort();
  const pbsThisBlock = computePbsInBlockRange(
    (personalRecords ?? []) as any[],
    blockDates[0] ?? null,
    blockDates[blockDates.length - 1] ?? null,
  );
  const belowBest = computeBelowBestFacts(allSetLogs);
  const rulesInEffect = computeRulesInEffect(adaptations, ruleTypesById as Map<string, { label?: string | null }>);

  const nextBlockDates = nextBlockSessions.map((s) => s.scheduled_at).filter((d): d is string => !!d).sort();
  const nextBlockInfo = nextBlock
    ? {
        blockNumber: nextBlock.block_number,
        sessionCount: nextBlockSessions.filter((s) => !s.parent_session_id).length,
        startDateLabel: nextBlockDates[0] ? fmtDate(nextBlockDates[0]) : null,
      }
    : null;

  return (
    <BlockReviewClient
      clientNumber={clientNumber}
      clientName={client.name}
      defaultEmail={defaultEmail}
      currentUserName={currentUserName}
      block={{ id: block.id, blockNumber: block.block_number, status: block.status }}
      nextBlock={nextBlockInfo}
      attendance={attendance}
      pbsThisBlock={pbsThisBlock}
      belowBest={belowBest}
      rulesInEffect={rulesInEffect}
    />
  );
}
