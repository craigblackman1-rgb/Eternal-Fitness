import { NextResponse } from "next/server";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";

/**
 * GET /api/portal/training — the logged-in portal client's current training
 * block (home version prescription only), gated to delivery_mode='home_training'.
 * A studio_1to1 client hitting this directly gets a 403, never another
 * client's data — every read is scoped to the authenticated client_id.
 */
export async function GET() {
  const session = await getPortalSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = createPortalDataClient(session.clientId);
  const client = await data.getClient();
  if (!client) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (client.delivery_mode !== "home_training") {
    return NextResponse.json(
      { error: "Training plans are not available for your account." },
      { status: 403 },
    );
  }

  const plan = await data.getTrainingPlan();
  if (!plan) {
    return NextResponse.json({ plan: null, setLogs: [] });
  }

  const setLogs = await data.getSetLogsForSessions(plan.sessions.map((s) => s.id));
  return NextResponse.json({ plan, setLogs });
}
