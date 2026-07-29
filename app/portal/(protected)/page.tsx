import Link from "next/link";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import { HubCard, HubCardHeader } from "@/components/hub";
import { EmptyState } from "@/components/hub/EmptyState";
import { IconFileText, IconMail, IconAlertTriangle, IconCheckCircle, IconBarChart3, IconChevronRight } from "@/components/icons";
import { formatUpdateTime } from "@/lib/updates/status";
import { ExerciseTrendsPanel } from "@/components/progress/ExerciseTrendsPanel";
import { buildExerciseTrends } from "@/lib/progress";
import { StatusBadge, TokenPill } from "@/components/hub/StatusBadge";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function PortalDashboardPage() {
  const session = await getPortalSessionFromCookies();
  if (!session) return null;

  const data = createPortalDataClient(session.clientId);
  const [signed, outstanding, updates, setLogHistory] = await Promise.all([
    data.getSignedDocuments(),
    data.getOutstandingDocuments(),
    data.getUpdateHistory(),
    data.getSetLogHistory(),
  ]);

  const exerciseTrends = buildExerciseTrends(setLogHistory.logs, setLogHistory.sessionMeta);

  const needsActionCount = outstanding.filter((d) => d.requires_client_signature && d.status !== "signed").length;

  return (
    <div className="space-y-10">
      <section aria-labelledby="portal-welcome">
        <h1 id="portal-welcome" className="text-2xl font-semibold tracking-tight">
          Your client area
        </h1>
        <p className="mt-1 text-muted-foreground">
          A read-only view of your documents, progress, and updates from Eternal Fitness.
        </p>
      </section>

      {/* Quick tools --------------------------------------------- */}
      <section aria-labelledby="portal-tools">
        <div className="rounded-2xl border border-[var(--color-border-warm)] bg-white p-5 shadow-sm">
          <h2 id="portal-tools" className="font-serif text-lg font-bold tracking-[-0.015em] text-ink mb-2">
            Quick tools
          </h2>
          <p className="text-sm text-body mb-4">
            Work out your daily calorie needs and get a personalised macro split.
          </p>
          <Link
            href="/portal/calorie-guide"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 transition-colors"
          >
            Open your calorie guide
            <IconChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Document summary cards ---------------------------------------------- */}
      <section aria-labelledby="portal-docs-summary">
        <div className="flex items-center justify-between mb-4">
          <h2 id="portal-docs-summary" className="text-lg font-semibold tracking-tight">Your documents</h2>
          <Link
            href="/portal/documents"
            className="inline-flex items-center gap-1 text-sm font-medium text-teal hover:text-teal/80 transition-colors"
          >
            View all documents
            <IconChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Signed */}
          <Link href="/portal/documents" className="group">
            <HubCard className="h-full transition-shadow group-hover:shadow-md">
              <HubCardHeader
                icon={<IconCheckCircle className="w-5 h-5 text-teal" aria-hidden="true" />}
                title="Signed"
                subtitle={`${signed.length} document${signed.length === 1 ? "" : "s"} on file`}
                color="teal"
              />
              {signed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No signed documents yet.</p>
              ) : (
                <ul className="space-y-2">
                  {signed.slice(0, 3).map((doc) => (
                    <li key={doc.id} className="text-sm text-muted-foreground truncate">
                      <span className="font-medium text-foreground">{doc.title || doc.kind}</span>
                      {doc.signed_at ? ` · Signed ${formatDate(doc.signed_at)}` : ""}
                    </li>
                  ))}
                  {signed.length > 3 && (
                    <li className="text-xs text-teal font-medium">{signed.length - 3} more…</li>
                  )}
                </ul>
              )}
            </HubCard>
          </Link>

          {/* Outstanding */}
          <Link href="/portal/documents" className="group">
            <HubCard className="h-full transition-shadow group-hover:shadow-md">
              <HubCardHeader
                icon={<IconAlertTriangle className={`w-5 h-5 ${needsActionCount > 0 ? "text-amber" : "text-muted-foreground"}`} aria-hidden="true" />}
                title="Needs you"
                subtitle={needsActionCount > 0 ? `${needsActionCount} document${needsActionCount === 1 ? "" : "s"} waiting` : "Nothing waiting"}
                color={needsActionCount > 0 ? "amber" : "slate"}
              />
              {outstanding.length === 0 ? (
                <p className="text-sm text-muted-foreground">All caught up — nothing needs your attention.</p>
              ) : (
                <ul className="space-y-2">
                  {outstanding.slice(0, 3).map((doc) => (
                    <li key={doc.id} className="text-sm text-muted-foreground truncate">
                      <span className="font-medium text-foreground">{doc.title || doc.kind}</span>
                      {doc.sent_at ? ` · Sent ${formatDate(doc.sent_at)}` : ""}
                    </li>
                  ))}
                  {outstanding.length > 3 && (
                    <li className="text-xs text-teal font-medium">{outstanding.length - 3} more…</li>
                  )}
                </ul>
              )}
            </HubCard>
          </Link>
        </div>
      </section>

      {/* Your progress ---------------------------------------------------- */}
      <section aria-labelledby="portal-progress">
        <HubCard>
          <HubCardHeader
            icon={<IconBarChart3 className="w-5 h-5" aria-hidden="true" />}
            title="Your progress"
            subtitle="Working weight and reps per exercise, from your logged sessions"
            color="teal"
          />
          <ExerciseTrendsPanel
            trends={exerciseTrends}
            emptyTitle="No logged sessions yet"
            emptyDescription="Once sets are logged against your training plan, your per-exercise progress will appear here."
            idPrefix="portal-exercise-trends"
          />
        </HubCard>
      </section>

      {/* Update-email history */}
      <section aria-labelledby="portal-updates">
        <HubCard>
          <HubCardHeader
            icon={<IconMail className="w-5 h-5" aria-hidden="true" />}
            title="Update email history"
            subtitle={`${updates.length} email${updates.length === 1 ? "" : "s"} sent`}
            color="teal"
          />
          {updates.length === 0 ? (
            <EmptyState
              icon={<IconMail className="w-7 h-7" />}
              title="No updates sent yet"
              description="When Eternal Fitness sends you a progress update, it will appear here."
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {updates.map((u) => {
                const viewable = u.status === "sent";
                const row = (
                  <>
                    <div>
                      <p className="font-medium">{u.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {u.block_number > 0 ? `Block ${u.block_number} · ` : ""}
                        {formatUpdateTime(u.sent_at)}
                        {u.opened_at ? " · Opened" : " · Not opened"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={u.status} />
                      {viewable && <IconChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
                    </div>
                  </>
                );
                return (
                  <li key={u.id}>
                    {viewable ? (
                      <Link
                        href={`/portal/updates/${u.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-off-white/60 rounded-lg px-2 -mx-2 transition-colors"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3 py-4">{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </HubCard>
      </section>
    </div>
  );
}
