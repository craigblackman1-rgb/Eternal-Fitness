import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AvailabilityManager } from "./AvailabilityManager";

/**
 * CR-EF-097 — Hub availability page (desktop).
 *
 * The single place Esther's diary is defined. Everything the public booking
 * page and the client portal offer is derived from this screen: pattern
 * minus time off plus one-off extras, filtered by booking rules.
 *
 * Cool-grey hub register (DESIGN.md §13) — never the warm marketing tokens.
 */

interface OverrideClash {
  sessionId: string;
  sessionNumber: number;
  scheduledAt: string;
  clientName: string;
  blockNumber: number;
}

interface OverrideWithClashes {
  overrideId: string;
  clashes: OverrideClash[];
}

export default async function AvailabilityPage() {
  const supabase = createClient();

  // Auth check
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/hub/login");

  // Fetch all availability data in parallel
  const [settingsRes, patternRes, overridesRes] = await Promise.all([
    supabase.from("booking_settings").select("*").limit(1).single(),
    supabase
      .from("availability_pattern")
      .select("*")
      .order("day_of_week")
      .order("sort_order"),
    supabase
      .from("availability_overrides")
      .select("*")
      .order("start_date", { ascending: false }),
  ]);

  const settings = settingsRes.data;
  const pattern = patternRes.data ?? [];
  const overrides = overridesRes.data ?? [];

  // Count booked sessions this week for summary
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const { count: bookedThisWeek } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .not("scheduled_at", "is", null)
    .is("cancelled_at", null)
    .gte("scheduled_at", monday.toISOString())
    .lte("scheduled_at", sunday.toISOString());

  // ── Real clash detection: fetch actual sessions inside each time-off override ──
  const activeTimeOff = overrides.filter(
    (o) => o.active && o.override_type === "time_off"
  );

  // Collect all override date windows in one query to avoid N+1
  const clashSessionIds = new Set<string>();
  const overrideWindows: { overrideId: string; start: string; end: string }[] =
    [];

  for (const o of activeTimeOff) {
    const start = `${o.start_date}T00:00:00Z`;
    const end = `${o.end_date}T23:59:59Z`;
    overrideWindows.push({ overrideId: o.id, start, end });

    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, session_number, scheduled_at, block_id")
      .not("scheduled_at", "is", null)
      .is("cancelled_at", null)
      .not("status", "eq", "cancelled")
      .not("status", "eq", "completed")
      .gte("scheduled_at", start)
      .lte("scheduled_at", end);

    if (sessions) {
      for (const s of sessions) {
        clashSessionIds.add(s.id);
      }
    }
  }

  // Fetch block → client mapping for all clashing sessions (single query)
  const sessionToBlock = new Map<string, { block_id: string; session_number: number; scheduled_at: string }>();
  const blockIds = new Set<string>();

  if (clashSessionIds.size > 0) {
    // Re-fetch with block_id to build the mapping
    for (const o of activeTimeOff) {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, session_number, scheduled_at, block_id")
        .not("scheduled_at", "is", null)
        .is("cancelled_at", null)
        .not("status", "eq", "cancelled")
        .not("status", "eq", "completed")
        .gte("scheduled_at", `${o.start_date}T00:00:00Z`)
        .lte("scheduled_at", `${o.end_date}T23:59:59Z`);

      if (sessions) {
        for (const s of sessions) {
          sessionToBlock.set(s.id, {
            block_id: s.block_id,
            session_number: s.session_number,
            scheduled_at: s.scheduled_at,
          });
          blockIds.add(s.block_id);
        }
      }
    }
  }

  // Single batch query for client names via blocks
  const blockToClient = new Map<string, { client_id: string; block_number: number }>();
  const clientIds = new Set<string>();

  if (blockIds.size > 0) {
    const { data: blocks } = await supabase
      .from("blocks")
      .select("id, client_id, block_number")
      .in("id", [...blockIds]);

    if (blocks) {
      for (const b of blocks) {
        blockToClient.set(b.id, {
          client_id: b.client_id,
          block_number: b.block_number,
        });
        clientIds.add(b.client_id);
      }
    }
  }

  // Single batch query for client names
  const clientNames = new Map<string, string>();
  if (clientIds.size > 0) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name")
      .in("id", [...clientIds]);

    if (clients) {
      for (const c of clients) {
        clientNames.set(c.id, c.name);
      }
    }
  }

  // Assemble per-override clash data with real client names
  const overrideClashData: OverrideWithClashes[] = overrideWindows.map(
    ({ overrideId, start, end }) => {
      const clashes: OverrideClash[] = [];
      for (const [sessionId, info] of sessionToBlock) {
        if (info.scheduled_at >= start && info.scheduled_at <= end) {
          const blockInfo = blockToClient.get(info.block_id);
          if (blockInfo) {
            clashes.push({
              sessionId,
              sessionNumber: info.session_number,
              scheduledAt: info.scheduled_at,
              clientName: clientNames.get(blockInfo.client_id) ?? "Unknown client",
              blockNumber: blockInfo.block_number,
            });
          }
        }
      }
      clashes.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
      return { overrideId, clashes };
    }
  );

  const clashesCount = overrideClashData.reduce(
    (sum, oc) => sum + oc.clashes.length,
    0
  );

  return (
    <AvailabilityManager
      initialSettings={settings}
      initialPattern={pattern}
      initialOverrides={overrides}
      bookedThisWeek={bookedThisWeek ?? 0}
      clashesCount={clashesCount}
      overrideClashes={overrideClashData}
    />
  );
}
