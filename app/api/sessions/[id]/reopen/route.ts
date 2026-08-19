import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { reopenSession, getSessionStatus } from "@/lib/session-transitions";

// CR-EF-031 — the deliberate, audited escape hatch out of a completed session's
// read-only state. Flips status back to `in_progress`, clears completed_at (column
// and its JSONB mirror), and leaves the recorded RPE/fatigue/notes in place so the
// correction is additive, not a reset. The edits that follow are captured by the
// existing trg_set_logs_audit trigger into set_log_revisions.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reopened = await reopenSession(params.id);
  if (reopened) {
    return NextResponse.json({ success: true, status: "in_progress" });
  }

  const status = await getSessionStatus(params.id);
  if (status === null) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json(
    { error: `Only a completed session can be reopened (current status: ${status}).` },
    { status: 409 },
  );
}
