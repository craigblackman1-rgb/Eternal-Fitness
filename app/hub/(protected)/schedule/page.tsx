import { createClient } from "@/lib/supabase-server";
import { HubPageHeader, HubQuickActions } from "@/components/hub";
import { IconUserPlus, IconFileText, IconUsers } from "@/components/icons";
import { sessionDurationMinutes } from "@/lib/scheduling";
import { deriveSessionStatus } from "@/lib/session-status";
import { sessionWorkoutName } from "@/lib/session-display";
import type { Session, TimeTier } from "@/types";
import type { ScheduledEntry } from "./ScheduleCalendar";
import type { UnconfirmedBooking } from "./ScheduleCalendar";
import { ScheduleShell } from "./ScheduleShell";

export const dynamic = "force-dynamic";

/**
 * CR-EF-037 — Studio-wide calendar with unified session state model.
 *
 * Fetches:
 * 1. Scheduled sessions (scheduled_at IS NOT NULL) — for the time grid
 * 2. Planned sessions (status = 'planned', no scheduled_at) — for the planned strip
 * 3. Unconfirmed Outlook bookings — for the triage queue
 *
 * The planned strip deliberately sits ABOVE the grid. Putting an undated session
 * onto a date is exactly how the original inference bug started — never place a
 * planned session in the grid.
 */
export default async function SchedulePage() {
  const supabase = createClient();

  // 1. Scheduled sessions (on the calendar) — exclude supplementary sub-sessions
  const { data: sessionRows } = await supabase
    .from("sessions")
    .select("id, block_id, session_number, archetype, data, scheduled_at, cancelled_at, cancel_reason, status, started_at, completed_at")
    .not("scheduled_at", "is", null)
    .is("parent_session_id", null)
    .order("scheduled_at", { ascending: true });

  const sessions: Array<{
    id: string;
    block_id: string;
    session_number: number;
    archetype: string;
    data: Session | null;
    scheduled_at: string | null;
    cancelled_at: string | null;
    cancel_reason: string | null;
    status: string | null;
    started_at: string | null;
    completed_at: string | null;
  }> = sessionRows ?? [];

  // 2. Planned sessions (no date, above the grid) — exclude supplementary sub-sessions
  const { data: plannedRows } = await supabase
    .from("sessions")
    .select("id, block_id, session_number, archetype, data, status")
    .eq("status", "planned")
    .is("scheduled_at", null)
    .is("parent_session_id", null)
    .order("session_number", { ascending: true });

  const plannedSessions: Array<{
    id: string;
    block_id: string;
    session_number: number;
    archetype: string;
    data: Session | null;
    status: string | null;
  }> = plannedRows ?? [];

  // 3. Sub-session counts — how many supplementary sessions attach to each parent
  const allSessionIds = [...new Set([...sessions.map((s) => s.id), ...plannedSessions.map((s) => s.id)])];
  const { data: subCountRows } = allSessionIds.length
    ? await supabase
        .from("sessions")
        .select("parent_session_id")
        .in("parent_session_id", allSessionIds)
    : { data: [] as { parent_session_id: string }[] };
  const subCountByParent = new Map<string, number>();
  for (const row of subCountRows ?? []) {
    subCountByParent.set(row.parent_session_id, (subCountByParent.get(row.parent_session_id) ?? 0) + 1);
  }

  // Resolve blocks → clients for all sessions
  const allBlockIds = [...new Set([...sessions.map((s) => s.block_id), ...plannedSessions.map((s) => s.block_id)].filter(Boolean))];
  const { data: blockRows } = allBlockIds.length
    ? await supabase.from("blocks").select("id, client_id, block_number").in("id", allBlockIds)
    : { data: [] as { id: string; client_id: string; block_number: number }[] };
  const blocks = blockRows ?? [];
  const blockById = new Map(blocks.map((b) => [b.id, b]));

  const allClientIds = [...new Set(blocks.map((b) => b.client_id).filter(Boolean))];
  const { data: clientRows } = allClientIds.length
    ? await supabase.from("clients").select("id, name, client_number").in("id", allClientIds)
    : { data: [] as { id: string; name: string; client_number: number | null }[] };
  const clients = clientRows ?? [];
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const entries: ScheduledEntry[] = sessions
    .filter((s) => s.scheduled_at)
    .map((s) => {
      const block = blockById.get(s.block_id);
      const client = block ? clientById.get(block.client_id) : undefined;
      const timeTier = (s.data?.time_tier ?? null) as TimeTier | null;
      return {
        id: s.id,
        clientId: block?.client_id ?? null,
        clientName: client?.name ?? "Unknown client",
        clientNumber: client?.client_number ?? null,
        blockId: block?.id ?? null,
        sessionNumber: s.session_number,
        archetype: s.archetype,
        blockNumber: block?.block_number ?? null,
        scheduledAt: s.scheduled_at as string,
        durationMinutes: sessionDurationMinutes(timeTier),
        status: deriveSessionStatus({
          status: s.status,
          cancelled_at: s.cancelled_at,
          completed_at: s.completed_at,
          scheduled_at: s.scheduled_at,
          session_log: s.data?.session_log,
        }),
        startedAt: s.started_at ?? null,
        completedAt: s.completed_at ?? null,
        cancelledAt: s.cancelled_at ?? null,
        cancelReason: s.cancel_reason ?? null,
        focusLabel: sessionWorkoutName(s, ""),
        supplementaryCount: subCountByParent.get(s.id) ?? 0,
      };
    });

  const plannedEntries = plannedSessions.map((s) => {
    const block = blockById.get(s.block_id);
    const client = block ? clientById.get(block.client_id) : undefined;
    const timeTier = (s.data?.time_tier ?? null) as TimeTier | null;
    return {
      id: s.id,
      clientName: client?.name ?? "Unknown client",
      clientNumber: client?.client_number ?? null,
      blockId: block?.id ?? null,
      blockNumber: block?.block_number ?? null,
      sessionNumber: s.session_number,
      archetype: s.archetype,
      durationMinutes: sessionDurationMinutes(timeTier),
      focusLabel: s.data?.focus_label ?? "",
    };
  });

  // Unconfirmed Outlook bookings for the triage queue
  const { data: outlookRows } = await supabase
    .from("outlook_booking_events")
    .select("id, subject, parsed_name, start_at, end_at, client_id")
    .eq("status", "open")
    .order("start_at", { ascending: true });

  const unconfirmedBookings: Array<{
    id: string;
    subject: string | null;
    parsed_name: string | null;
    start_at: string;
    end_at: string;
    client_id: string | null;
  }> = outlookRows ?? [];

  return (
    <div className="space-y-6">
      <HubQuickActions
        variant="bar"
        actions={[
          { href: "/hub/clients/new", label: "New client", icon: <IconUserPlus className="w-4 h-4" />, primary: true },
          { href: "/hub/exercises", label: "Browse exercise library", icon: <IconFileText className="w-4 h-4" /> },
          { href: "/hub/clients", label: "View all clients", icon: <IconUsers className="w-4 h-4" /> },
        ]}
      />
      <HubPageHeader
        title="Studio schedule"
        subtitle="The single source of truth for what is happening when. Every session carries a first-class state and real timestamps, so a booking can no longer read Completed on a date it was never delivered."
      />
      <ScheduleShell
        entries={entries}
        unconfirmedBookings={unconfirmedBookings}
        plannedEntries={plannedEntries}
      />
    </div>
  );
}
