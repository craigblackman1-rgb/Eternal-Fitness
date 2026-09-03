import { createClient } from "@/lib/supabase-server";
import type { Session } from "@/types";
import { deriveSessionStatus } from "@/lib/session-status";
import { DEFAULT_ARCHETYPE_FOCUS_LABELS } from "@/lib/planAgentPrompt";
import {
  todayLocalISODate,
  shiftDay,
  isoToLocalDate,
} from "@/lib/schedule-dates";
import { OutlookTriageClient } from "./OutlookTriageClient";

const PAST_MAX = 30;
const FUTURE_DAYS = 14;


interface SessionRow {
  id: string;
  block_id: string;
  session_number: number;
  archetype: string | null;
  data: Session | null;
  scheduled_at: string | null;
  cancelled_at: string | null;
  status: string | null;
  completed_at: string | null;
}

export interface OutlookBookingRow {
  id: string;
  event_id: string;
  subject: string;
  start_at: string;
  end_at: string;
  parsed_name: string | null;
  client_id: string | null;
  status: string;
  session_id: string | null;
  clients: { id: string; name: string; client_number: number | null; email: string | null } | null;
}

function sessionName(s: SessionRow): string {
  return (
    s.data?.focus_label?.trim() ||
    DEFAULT_ARCHETYPE_FOCUS_LABELS[s.archetype ?? ""] ||
    `Session ${s.session_number}`
  );
}

function windowBounds(pastDays: number) {
  const today = todayLocalISODate();
  const clamped = Math.min(Math.max(pastDays, 0), PAST_MAX);
  return {
    today,
    start: clamped > 0 ? shiftDay(today, -clamped) : today,
    end: shiftDay(today, FUTURE_DAYS),
  };
}

export default async function MobileCalendarPage({
  searchParams,
}: {
  searchParams?: { past?: string };
}) {
  const pastDays = Number(searchParams?.past) || 0;
  const supabase = createClient();
  const { today, start, end } = windowBounds(pastDays);

  const { data: sessionRows } = await supabase
    .from("sessions")
    .select("id, block_id, session_number, archetype, data, scheduled_at, cancelled_at, status, completed_at")
    .not("scheduled_at", "is", null)
    .order("scheduled_at", { ascending: true });

  const sessions: SessionRow[] = ((sessionRows ?? []) as SessionRow[]).filter((s) => {
    const day = isoToLocalDate(s.scheduled_at as string);
    return day >= start && day <= end;
  });

  const blockIds = [...new Set(sessions.map((s) => s.block_id).filter(Boolean))];
  const { data: blockRows } = blockIds.length
    ? await supabase.from("blocks").select("id, client_id, block_number").in("id", blockIds)
    : { data: [] as { id: string; client_id: string; block_number: number }[] };
  const blocks = blockRows ?? [];
  const blockById = new Map(blocks.map((b) => [b.id, b]));

  const clientIds = [...new Set(blocks.map((b) => b.client_id).filter(Boolean))];
  const { data: clientRows } = clientIds.length
    ? await supabase.from("clients").select("id, name, client_number").in("id", clientIds)
    : { data: [] as { id: string; name: string; client_number: number | null }[] };
  const clients = clientRows ?? [];
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const agendaSessions = sessions.map((s) => {
    const block = blockById.get(s.block_id);
    const client = block ? clientById.get(block.client_id) : undefined;
    return {
      id: s.id,
      scheduledAt: s.scheduled_at ? new Date(s.scheduled_at).toISOString() : (s.scheduled_at as string),
      name: sessionName(s),
      status: deriveSessionStatus({
        status: s.status,
        cancelled_at: s.cancelled_at,
        completed_at: s.completed_at,
        scheduled_at: s.scheduled_at,
        session_log: s.data?.session_log,
      }),
      clientName: client?.name ?? "Unknown client",
      blockNumber: block?.block_number ?? null,
    };
  });

  const { data: bookingRows, error: bookingErr } = await supabase
    .from("outlook_booking_events")
    .select("id, event_id, subject, start_at, end_at, parsed_name, client_id, status, session_id, clients(id, name, client_number, email)")
    .eq("status", "open")
    .order("start_at", { ascending: true });

  if (bookingErr) {
    console.error("Failed to load outlook bookings:", bookingErr.message);
  }

  const openBookings = (bookingRows ?? []) as OutlookBookingRow[];

  // Normalise Postgres TIMESTAMPTZ to strict ISO-8601 so WebKit (iOS Safari)
  // doesn't render "Invalid Date". Node/V8 parses the raw format correctly.
  for (const b of openBookings) {
    if (b.start_at) b.start_at = new Date(b.start_at).toISOString();
    if (b.end_at) b.end_at = new Date(b.end_at).toISOString();
  }
  const openBookingCount = openBookings.length;

  return (
    <OutlookTriageClient
      agendaSessions={agendaSessions}
      today={today}
      windowStart={start}
      windowEnd={end}
      openBookings={openBookings}
      openBookingCount={openBookingCount}
      showPast={pastDays > 0}
    />
  );
}
