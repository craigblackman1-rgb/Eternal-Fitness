import Link from "next/link";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import { HubCard, HubCardHeader } from "@/components/hub";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { EmptyState } from "@/components/hub/EmptyState";
import { IconFileText, IconClock, IconMail, IconCheckCircle, IconAlertTriangle, IconBarChart3, IconChevronRight } from "@/components/icons";
import { formatUpdateTime } from "@/lib/updates/status";
import { ExerciseTrendsPanel } from "@/components/progress/ExerciseTrendsPanel";
import { buildExerciseTrends } from "@/lib/progress";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Human-readable document kind labels.
const KIND_LABELS: Record<string, string> = {
  terms: "Terms & Conditions",
  risk_assessment: "Risk Assessment",
  annual_review: "Annual Review",
  parq: "PAR-Q",
};

function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function PortalDashboardPage() {
  const session = await getPortalSessionFromCookies();
  if (!session) return null; // layout already redirects; guard for types.

  const data = createPortalDataClient(session.clientId);
  const [signed, outstanding, updates, setLogHistory] = await Promise.all([
    data.getSignedDocuments(),
    data.getOutstandingDocuments(),
    data.getUpdateHistory(),
    data.getSetLogHistory(),
  ]);

  // Lane C — own-data-only progress trends. Empty/sparse-safe: no logged
  // sets simply shows the empty state below, never a broken chart.
  const exerciseTrends = buildExerciseTrends(setLogHistory.logs, setLogHistory.sessionMeta);

  return (
    <div className="space-y-10">
      <section aria-labelledby="portal-welcome">
        <h1 id="portal-welcome" className="text-2xl font-semibold tracking-tight">
          Your documents &amp; updates
        </h1>
        <p className="mt-1 text-muted-foreground">
          A read-only view of what you&rsquo;ve signed, what&rsquo;s still outstanding, and the
          updates Eternal Fitness has sent you.
        </p>
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

      {/* Signed documents ------------------------------------------------ */}
      <section aria-labelledby="portal-signed">
        <HubCard>
          <HubCardHeader
            icon={<IconCheckCircle className="w-5 h-5 text-[var(--status-success)]" aria-hidden="true" />}
            title="Signed documents"
            subtitle={`${signed.length} document${signed.length === 1 ? "" : "s"} on file`}
            color="teal"
          />
          {signed.length === 0 ? (
            <EmptyState
              icon={<IconFileText className="w-7 h-7" />}
              title="No signed documents yet"
              description="Once you've signed a document, it will appear here."
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {signed.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/documents/${doc.id}/sign`}
                    className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-off-white/60 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{doc.title || kindLabel(doc.kind)}</p>
                      <p className="text-sm text-muted-foreground">
                        {kindLabel(doc.kind)}
                        {doc.version > 1 ? ` · v${doc.version}` : ""} · Signed{" "}
                        {formatDate(doc.client_signed_date || doc.signed_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={doc.status} />
                      <IconChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </HubCard>
      </section>

      {/* Outstanding / unsigned documents ------------------------------- */}
      <section aria-labelledby="portal-outstanding">
        <HubCard>
          <HubCardHeader
            icon={<IconAlertTriangle className="w-5 h-5 text-[var(--status-warning)]" aria-hidden="true" />}
            title="Outstanding documents"
            subtitle={`${outstanding.length} awaiting signature or attention`}
            color="teal"
          />
          {outstanding.length === 0 ? (
            <EmptyState
              icon={<IconCheckCircle className="w-7 h-7" />}
              title="All caught up"
              description="You have no documents waiting on your signature right now."
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {outstanding.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/documents/${doc.id}/sign`}
                    className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-off-white/60 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{doc.title || kindLabel(doc.kind)}</p>
                      <p className="text-sm text-muted-foreground">
                        {kindLabel(doc.kind)}
                        {doc.version > 1 ? ` · v${doc.version}` : ""}
                        {doc.sent_at ? ` · Sent ${formatDate(doc.sent_at)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={doc.status} />
                      <IconChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </HubCard>
      </section>

      {/* Update-email history ------------------------------------------- */}
      <section aria-labelledby="portal-updates">
        <HubCard>
          <HubCardHeader
            icon={<IconMail className="w-5 h-5 text-[var(--status-primary)]" aria-hidden="true" />}
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
