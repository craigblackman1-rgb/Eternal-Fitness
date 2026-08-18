import { redirect } from "next/navigation";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import { getBestWeightsForClient } from "@/lib/exercise-best-weights";
import { HubCard } from "@/components/hub";
import { EmptyState } from "@/components/hub/EmptyState";
import { IconActivity } from "@/components/icons";
import TrainingClient from "./TrainingClient";

/**
 * Home-training plan view — the first plan/session content ever shown in the
 * portal. Server-gated to delivery_mode='home_training': a studio 1:1 client
 * who hits this URL directly is redirected back to the portal home with no
 * plan data ever fetched. All reads are scoped to the authenticated client_id.
 */
export default async function PortalTrainingPage() {
  const session = await getPortalSessionFromCookies();
  if (!session) return null; // layout already redirects; guard for types.

  const data = createPortalDataClient(session.clientId);
  const client = await data.getClient();
  if (!client || client.delivery_mode !== "home_training") {
    redirect("/portal");
  }

  const plan = await data.getTrainingPlan();
  if (!plan || plan.sessions.length === 0) {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Your training</h1>
          <p className="mt-1 text-muted-foreground">
            Your current plan and session logging will appear here.
          </p>
        </section>
        <HubCard>
          <EmptyState
            icon={<IconActivity className="w-7 h-7" />}
            title="No training plan yet"
            description="Esther hasn't published a training block for you yet. Check back soon — your sessions will appear here as soon as your plan is ready."
          />
        </HubCard>
      </div>
    );
  }

  const setLogs = await data.getSetLogsForSessions(plan.sessions.map((s) => s.id));
  const bestWeights = await getBestWeightsForClient(session.clientId);

  return <TrainingClient plan={plan} initialLogs={setLogs} bestWeights={bestWeights} />;
}
