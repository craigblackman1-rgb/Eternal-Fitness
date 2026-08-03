import type { Metadata } from "next";
import Link from "next/link";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import { RESOURCES, getEnabledResources } from "@/lib/resources";
import { HubCard, HubCardHeader } from "@/components/hub";
import { EmptyState } from "@/components/hub/EmptyState";
import { IconLayoutDashboard, IconChevronRight } from "@/components/icons";

export const metadata: Metadata = {
  title: "Resources — Eternal Fitness client area",
  description: "Tools and resources Esther has made available to you.",
};

export default async function ResourcesPage() {
  const session = await getPortalSessionFromCookies();
  if (!session) return null;

  const data = createPortalDataClient(session.clientId);
  const client = await data.getClient();
  const visibility = client?.resource_visibility ?? {};
  const enabled = getEnabledResources(visibility);

  return (
    <div className="space-y-8">
      <section aria-labelledby="resources-heading">
        <h1 id="resources-heading" className="text-2xl font-semibold tracking-tight">
          Resources
        </h1>
        <p className="mt-2 text-muted-foreground">
          Tools and resources Esther has made available to you. Nothing you do here is saved or sent
          back to her — these are yours to use whenever you want.
        </p>
      </section>

      {enabled.length === 0 ? (
        <HubCard>
          <EmptyState
            icon={<IconLayoutDashboard className="w-7 h-7" />}
            title="No resources available"
            description="Esther hasn't enabled any resources for you yet. When she does, they will appear here."
          />
        </HubCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {enabled.map((r) => (
            <Link key={r.key} href={r.route} className="group block">
              <HubCard className="h-full transition-shadow hover:shadow-md">
                <HubCardHeader
                  icon={<IconChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                  title={r.name}
                  subtitle={r.description}
                  color="teal"
                />
              </HubCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
