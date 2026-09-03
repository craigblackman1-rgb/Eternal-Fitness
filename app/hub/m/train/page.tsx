import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function TrainTabPage() {
  const supabase = createClient();

  const { data: sessionRows } = await supabase
    .from("sessions")
    .select("id, data, scheduled_at, cancelled_at")
    .not("scheduled_at", "is", null)
    .is("cancelled_at", null);

  const sessions = (sessionRows ?? []) as {
    id: string;
    data: {
      session_log?: { started_at?: string | null; completed_at?: string | null } | null;
    } | null;
    scheduled_at: string;
  }[];

  // Normalise scheduled_at to strict ISO-8601 so WebKit (iOS Safari) doesn't
  // render "Invalid Date". Node/V8 parses the raw format correctly.
  for (const s of sessions) {
    s.scheduled_at = new Date(s.scheduled_at).toISOString();
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  const todaySessions = sessions
    .filter((s) => {
      const at = new Date(s.scheduled_at);
      return at >= todayStart && at < todayEnd;
    })
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const inProgress = todaySessions.find(
    (s) => s.data?.session_log?.started_at && !s.data?.session_log?.completed_at,
  );
  const nextUpcoming = todaySessions.find((s) => !s.data?.session_log?.completed_at);

  const target = inProgress ?? nextUpcoming;
  if (target) redirect(`/hub/m/train/${target.id}`);

  return (
    <main className="mcontent">
      <div className="sec-label" style={{ marginTop: 10 }}>
        <h2>Train</h2>
      </div>
      <div className="empty">
        <div className="empty-t">No session scheduled for today</div>
        <div className="empty-d">
          Nothing to deliver right now. Open a session from the Today tab once it&apos;s time.
        </div>
      </div>
    </main>
  );
}
