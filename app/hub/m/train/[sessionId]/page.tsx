import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { DBSession, SetLog, DeliveryMode } from "@/types";
import type { Band } from "@/lib/bands";
import { sessionDurationMinutes } from "@/lib/scheduling";
import { getBestWeightsForClient } from "@/lib/exercise-best-weights";
import { getLastSessionAndPbData } from "@/lib/last-session-data";
import { backfillExerciseMedia } from "@/lib/exercise-media";
import { ensureUids } from "@/lib/exercise-ref";
import { getPool } from "@/lib/pg-client";
import { TrainScreen } from "./TrainScreen";

export default async function TrainSessionPage({ params }: { params: { sessionId: string } }) {
  const supabase = createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", params.sessionId)
    .single();

  if (!session) notFound();

  const { data: block } = await supabase
    .from("blocks")
    .select("id, client_id, block_number")
    .eq("id", session.block_id)
    .single();

  let client: { name: string; client_number: number | null; delivery_mode: DeliveryMode } | null = null;
  if (block) {
    const { data: c } = await supabase
      .from("clients")
      .select("name, client_number, delivery_mode")
      .eq("id", block.client_id)
      .single();
    client = c ?? null;
  }

  const { data: setLogs } = await supabase
    .from("set_logs")
    .select("*")
    .eq("session_id", params.sessionId)
    .order("exercise_ref", { ascending: true })
    .order("set_number", { ascending: true });

  const bestWeights = block ? await getBestWeightsForClient(block.client_id) : {};
  const lastSessionAndPb = block ? await getLastSessionAndPbData(block.client_id) : { lastSession: {}, pbDates: {} };

  // CR-EF-014: fetch active bands for the colour picker.
  const pool = getPool();
  const bandsRes = await pool.query(
    `SELECT * FROM bands WHERE active = true ORDER BY sort_order ASC`,
  );
  const bands: Band[] = bandsRes.rows;

  const blockNumber = block?.block_number ?? null;
  const sessionRow = session as DBSession;
  let sessionData = sessionRow.data ?? null;
  const sessionLog = sessionData?.session_log ?? null;
  const deliveryMode: DeliveryMode = client?.delivery_mode ?? "studio_1to1";

  // Resolve exercise thumbnails/video links by name from the exercises library
  // before rendering — AI-generated sessions never embed media, so backfill the
  // version TrainScreen will actually render (home vs studio).
  if (sessionData) {
    const versionKey = deliveryMode === "home_training" ? "home" : "studio";
    const versionData = sessionData.versions?.[versionKey];
    if (versionData) {
      const warmUp = versionData.warm_up ?? [];
      const mainBlock = versionData.main_block ?? [];
      const cooldown = versionData.cooldown ?? [];
      const backfilled = await backfillExerciseMedia(supabase, [...warmUp, ...mainBlock, ...cooldown]);
      sessionData = {
        ...sessionData,
        versions: {
          ...sessionData.versions,
          [versionKey]: {
            warm_up: ensureUids(backfilled.slice(0, warmUp.length)),
            main_block: ensureUids(backfilled.slice(warmUp.length, warmUp.length + mainBlock.length)),
            cooldown: ensureUids(backfilled.slice(warmUp.length + mainBlock.length)),
          },
        },
      };
    }
  }

  return (
    <TrainScreen
      sessionId={sessionRow.id}
      sessionNumber={sessionRow.session_number}
      archetype={sessionRow.archetype}
      phase={sessionRow.phase}
      week={sessionRow.week}
      data={sessionData}
      sessionLog={sessionLog}
      scheduledAt={sessionRow.scheduled_at ?? null}
      blockNumber={blockNumber}
      clientId={block?.client_id ?? null}
      clientName={client?.name ?? "Unknown client"}
      clientNumber={client?.client_number ?? null}
      setLogs={(setLogs ?? []) as SetLog[]}
      deliveryMode={deliveryMode}
      bestWeights={bestWeights}
      lastSessionData={lastSessionAndPb.lastSession}
      pbDates={lastSessionAndPb.pbDates}
      bands={bands}
    />
  );
}
