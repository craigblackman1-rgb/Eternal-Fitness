import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconChevronLeft } from "@/components/icons";
import { BlockOverviewClient } from "./BlockOverviewClient";
import { groupSessionsByWeek, isoToMonday, projectUnbookedDates } from "@/lib/schedule-dates";
import { deriveSessionStatus } from "@/lib/session-status";
import { deriveSessionPot } from "@/lib/session-pot";
import { deriveBlockStatus } from "@/lib/block-status";
import { deriveChronologicalPositions } from "@/lib/session-chronological-order";
import { blockDisplayName } from "@/lib/block-name";
import type { Weekday } from "@/lib/scheduling";
import type { Session, SessionStatus, DBSession, BlockStatus } from "@/types";

const archetypeTint: Record<string, string> = {
  A: "bg-teal/10 text-teal",
  B: "bg-rose/10 text-rose",
  C: "bg-dark-navy/10 text-dark-navy",
};

interface SessionRow {
  id: string;
  block_id: string;
  session_number: number;
  archetype: string | null;
  week: number;
  phase: string;
  data: Session;
  scheduled_at: string | null;
  status: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  completed_at: string | null;
  parent_session_id: string | null;
  charged_free: "charged" | "free" | null;
}

/**
 * CR-EF-037 — the first-class `status` column is the source of truth, but it
 * can lag the older JSON/columns. Derive defensively with the migration's
 * own backfill precedence.
 */
function sessionStatus(s: SessionRow): SessionStatus {
  return deriveSessionStatus({
    status: s.status,
    cancelled_at: s.cancelled_at,
    scheduled_at: s.scheduled_at,
    completed_at: s.completed_at,
    session_log: s.data?.session_log,
  });
}

export default async function BlockViewPage({
  params,
}: {
  params: { id: string; blockId: string };
}) {
  const supabase = createClient();

  const { data: block } = await supabase
    .from("blocks")
    .select("*")
    .eq("id", params.blockId)
    .single();

  if (!block) notFound();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, client_number, profile, sessions_purchased, block_expiry_date, block_expiry_extensions")
    .eq("client_number", parseInt(params.id))
    .single();

  const { data: sessionsData } = await supabase
    .from("sessions")
    .select("*")
    .eq("block_id", params.blockId)
    .order("session_number", { ascending: true });

  const sessions = (sessionsData || []) as SessionRow[];
  const clientId = client?.client_number || params.id;

  // CR-EF-101 — sub-sessions excluded from pot count and numbering.
  const potSessions = sessions.filter((s) => !s.parent_session_id);
  const totalSessions = potSessions.length;
  const completedSessions = potSessions.filter((s) => sessionStatus(s) === "completed").length;
  const consumedSlots = potSessions.filter((s) => {
    const st = sessionStatus(s);
    return st === "completed" || (st === "cancelled" && s.charged_free === "charged");
  }).length;

  const sessionPot = deriveSessionPot(
    sessions as unknown as Parameters<typeof deriveSessionPot>[0],
    client?.sessions_purchased ?? null,
  );
  const remainingCount = sessionPot.remaining ?? sessionPot.estimatedRemaining;

  const derivedStatus = deriveBlockStatus(block.status, sessions);

  // CR-EF-153 — single source of truth (lib/block-name.ts). Uses potSessions
  // (real scheduled_at values, sub-sessions excluded) so the count agrees
  // with totalSessions shown elsewhere on this page.
  const blockDisplayNameLabel = blockDisplayName(
    { title: (block as { title?: string | null }).title ?? null },
    potSessions,
    totalSessions,
  );

  const clientCondition = client?.profile?.health?.conditions?.[0] ?? null;

  // Chronological positions — "Session N of M" labels
  const chronologicalPositions = deriveChronologicalPositions(
    sessions.map((s) => ({ id: s.id, scheduled_at: s.scheduled_at, parent_session_id: s.parent_session_id })),
  );

  // CR-EF-101 — sub-sessions excluded from week groups
  const displaySessions = sessions.filter((s) => !s.parent_session_id);

  const scheduledDates = displaySessions.map((s) => s.scheduled_at).filter((d): d is string => Boolean(d)).sort();
  const scheduledStartIso = (block.scheduled_start as string | null) ?? (scheduledDates[0] ?? null);
  const scheduledEndIso = scheduledDates.length > 0 ? scheduledDates[scheduledDates.length - 1] : null;

  const weekdays: Weekday[] = Array.from(
    new Set(
      displaySessions
        .filter((s) => s.scheduled_at)
        .map((s) => new Date(s.scheduled_at as string).getDay() as Weekday),
    ),
  ).sort((a, b) => a - b);

  const lastBookedIso = scheduledDates.length > 0 ? scheduledDates[scheduledDates.length - 1] : null;
  const projectedSessions = projectUnbookedDates(displaySessions, weekdays, lastBookedIso, scheduledStartIso);

  const weekGroups = groupSessionsByWeek(projectedSessions);
  const planWeeks = Array.from(new Set(displaySessions.map((s) => s.week))).sort((a, b) => a - b);

  // CR-EF-145 — the week that opens by default is the one holding the first
  // session still to be delivered. Uses projectedSessions so an unbooked
  // session resolves to a real Monday key rather than a "plan week" bucket.
  const firstIncompleteProjected = projectedSessions.find((s) => {
    const st = sessionStatus(s);
    return st !== "completed" && st !== "cancelled";
  });
  const targetWeekKey = firstIncompleteProjected
    ? firstIncompleteProjected.scheduled_at
      ? isoToMonday(firstIncompleteProjected.scheduled_at)
      : firstIncompleteProjected.projected_at
        ? isoToMonday(firstIncompleteProjected.projected_at)
        : `p${firstIncompleteProjected.week}`
    : null;

  const formatShortDateFull = (iso: string): string =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const blockDateSpanLabel = scheduledStartIso
    ? scheduledEndIso && scheduledEndIso !== scheduledStartIso
      ? `${formatShortDateFull(scheduledStartIso)} – ${formatShortDateFull(scheduledEndIso)}`
      : formatShortDateFull(scheduledStartIso)
    : "not yet scheduled";

  // Previous blocks for the "Previous blocks" section.
  // blocks.client_id is the client's UUID, NOT the client_number in the URL —
  // keyed off the wrong one this returns nothing and the block reads "of 0".
  const { data: allBlocksData } = block.client_id
    ? await supabase
        .from("blocks")
        .select("id, block_number, status, scheduled_start, title")
        .eq("client_id", block.client_id)
        .order("block_number", { ascending: false })
    : { data: [] as { id: string; block_number: number; status: string; scheduled_start: string | null; title: string | null }[] };

  const totalBlockCount = (allBlocksData || []).length;

  const previousBlocks = (allBlocksData || [])
    .filter((b) => b.id !== params.blockId)
    .map((b) => ({
      id: b.id,
      block_number: b.block_number,
      status: b.status as BlockStatus,
      scheduled_start: b.scheduled_start as string | null,
      title: b.title as string | null,
    }));

  // Fetch session counts for previous blocks
  const prevBlockIds = previousBlocks.map((b) => b.id);
  let prevSessionCounts: Record<string, { total: number; completed: number; dates: { start: string | null; end: string | null } }> = {};
  if (prevBlockIds.length > 0) {
    for (const prevId of prevBlockIds) {
      const { data: prevSessions } = await supabase
        .from("sessions")
        .select("session_number, scheduled_at, status, cancelled_at, completed_at, charged_free, parent_session_id, data")
        .eq("block_id", prevId)
        .order("session_number", { ascending: true });
      if (prevSessions) {
        const pot = (prevSessions as SessionRow[]).filter((s) => !s.parent_session_id);
        const dates = pot.map((s) => s.scheduled_at).filter((d): d is string => Boolean(d)).sort();
        prevSessionCounts[prevId] = {
          total: pot.length,
          completed: pot.filter((s) => {
            const st = deriveSessionStatus({
              status: s.status, cancelled_at: s.cancelled_at,
              scheduled_at: s.scheduled_at, completed_at: s.completed_at,
              session_log: s.data?.session_log,
            });
            return st === "completed";
          }).length,
          dates: { start: dates[0] ?? null, end: dates.length > 0 ? dates[dates.length - 1] : null },
        };
      }
    }
  }

  const previousBlocksWithCounts = previousBlocks.map((b) => {
    const counts = prevSessionCounts[b.id];
    const startLabel = counts?.dates.start ? formatShortDateFull(counts.dates.start) : null;
    const endLabel = counts?.dates.end ? formatShortDateFull(counts.dates.end) : null;
    return {
      ...b,
      sessionCount: counts?.total ?? 0,
      completedCount: counts?.completed ?? 0,
      dateRange: startLabel && endLabel ? (startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`) : "not scheduled",
      // CR-EF-153 — title if Esther set one, else the ordinal (the row
      // already shows the precise dateRange above, so no need for a second,
      // less precise month-span here).
      displayName: b.title?.trim() || `Block ${b.block_number}`,
    };
  });

  const blockForClient = {
    id: block.id,
    block_number: block.block_number,
    block_note: block.block_note as string | null,
    summary: block.summary as string | null,
    status: block.status as BlockStatus,
    title: (block as { title?: string | null }).title ?? null,
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-4">
        <Link
          href={`/hub/clients/${clientId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconChevronLeft className="h-4 w-4" />
          Back to {client?.name || "Client"}
        </Link>
      </div>

      <BlockOverviewClient
        block={blockForClient}
        clientId={String(clientId)}
        blockId={params.blockId}
        clientName={client?.name || "Client"}
        clientCondition={clientCondition}
        blockStatus={derivedStatus}
        approvedAt={(block as { approved_at?: string | null }).approved_at ?? null}
        blockDateSpanLabel={blockDateSpanLabel}
        blockDisplayNameLabel={blockDisplayNameLabel}
        totalSessions={totalSessions}
        totalBlockCount={totalBlockCount}
        completedSessions={consumedSlots}
        remainingCount={remainingCount}
        scheduledStartIso={scheduledStartIso}

        weekdays={weekdays}
        weeks={planWeeks}
        sessions={sessions as unknown as DBSession[]}
        displaySessions={displaySessions}
        chronologicalPositions={chronologicalPositions}
        weekGroups={weekGroups}
        targetWeekKey={targetWeekKey}
        previousBlocks={previousBlocksWithCounts}
        archetypeTint={archetypeTint}
        sessionsPurchased={client?.sessions_purchased ?? null}
        blockExpiryDate={client?.block_expiry_date ?? null}
        blockExpiryExtensions={client?.block_expiry_extensions ?? []}
      />
    </div>
  );
}
