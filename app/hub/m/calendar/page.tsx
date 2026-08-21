import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import type { Session } from "@/types";
import { deriveSessionStatus } from "@/lib/session-status";
import { DEFAULT_ARCHETYPE_FOCUS_LABELS } from "@/lib/planAgentPrompt";
import { DayAgenda } from "@/components/hub/DayAgenda";
import {
  todayLocalISODate,
  shiftDay,
  isoToLocalDate,
} from "@/lib/schedule-dates";


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

function sessionName(s: SessionRow): string {
  return (
    s.data?.focus_label?.trim() ||
    DEFAULT_ARCHETYPE_FOCUS_LABELS[s.archetype ?? ""] ||
    `Session ${s.session_number}`
  );
}

function windowBounds() {
  const today = todayLocalISODate();
  return {
    today,
    start: shiftDay(today, -4),
    end: shiftDay(today, 7),
  };
}

export default async function MobileCalendarPage() {
  const supabase = createClient();
  const { today, start, end } = windowBounds();

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
      scheduledAt: s.scheduled_at as string,
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

  return (
    <>
      <header className="mtop">
        <div className="mtop-row">
          <div className="mbrand">
            <img src="/images/ef-heart-logo.svg" alt="Eternal Fitness" />
            <span className="mbrand-sub">Trainer Hub</span>
          </div>
          <Link className="desktop-link" href="/hub/schedule">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
            Desktop
          </Link>
        </div>
      </header>

      <main className="mcontent has-fab">
        <div className="note">
          <span className="note-b">i</span>
          <div>
            <b>Day-agenda calendar.</b> One row per day, forward and back from today. Empty days still
            render — tap one to book a session. Weeks are Monday–Sunday.
          </div>
        </div>

        <DayAgenda
          sessions={agendaSessions}
          today={today}
          windowStart={start}
          windowEnd={end}
          scope="trainer"
          bookHrefForDay={(day) => `/hub/m/book?scope=trainer&day=${day}`}
        />
      </main>

      <Link className="fab" href={`/hub/m/book?scope=trainer&day=${today}`} data-od-id="agenda-add">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Book session
      </Link>
    </>
  );
}
