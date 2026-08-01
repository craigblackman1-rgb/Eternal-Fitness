import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { IconSend, IconClock, IconEye, IconUsers, IconPlus, IconDownload, IconMail } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { KpiTile } from "@/components/hub/KpiTile";
import { HubCard, HubCardHeader } from "@/components/hub";
import { TokenPill } from "@/components/hub/StatusBadge";
import { UpdatesReport } from "./UpdatesReport";
import type { UpdateWithClient } from "@/types";
import { getClientsWithUpdateDue } from "@/lib/updates-due-db";
import { UPDATE_INTERVAL_LABELS, type UpdateDueStatus } from "@/lib/updates-due";
import type { StatusToken } from "@/lib/hubStatus";

export const dynamic = "force-dynamic";

export default async function UpdatesReportPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sent_updates")
    .select("*, client:clients(name, client_number, package_type)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) console.error("[reports/updates]", error.message);

  const updates = (data || []) as UpdateWithClient[];

  // ── KPI computations ──────────────────────────────────────

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const sentThisMonth = updates.filter(
    (u) => u.status === "sent" && u.sent_at && new Date(u.sent_at) >= startOfThisMonth,
  ).length;

  const sentLastMonth = updates.filter(
    (u) =>
      u.status === "sent" &&
      u.sent_at &&
      new Date(u.sent_at) >= startOfLastMonth &&
      new Date(u.sent_at) <= endOfLastMonth,
  ).length;

  const monthDelta = sentThisMonth - sentLastMonth;

  const draftQueued = updates.filter(
    (u) => u.status === "draft" || u.status === "scheduled",
  ).length;

  const emailedSent = updates.filter((u) => u.status === "sent" && u.emailed);
  const opened = emailedSent.filter((u) => u.opened_at);
  const openRate = emailedSent.length > 0
    ? Math.round((opened.length / emailedSent.length) * 100)
    : 0;

  const distinctClientIds = new Set(
    emailedSent.map((u) => u.client_id),
  );
  const clientsCovered = distinctClientIds.size;

  const updatesDueClients = await getClientsWithUpdateDue();

  const STATUS_COLORS: Record<UpdateDueStatus, { token: StatusToken; label: string }> = {
    overdue: { token: "danger", label: "Overdue" },
    due_soon: { token: "warning", label: "Due soon" },
    upcoming: { token: "primary", label: "Upcoming" },
  };

  // ── Tiles ─────────────────────────────────────────────────

  const monthDeltaAbs = Math.abs(monthDelta);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Email updates</h1>
          <p className="text-sm text-muted-foreground mt-1">6-week progress emails sent to clients and, with consent, their referrers.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/hub/clients">
            <Button variant="outline" size="sm" className="rounded-lg gap-1.5">
              <IconDownload className="h-3.5 w-3.5" />
              Export
            </Button>
          </Link>
          <Link href="/hub/clients">
            <Button size="sm" className="rounded-lg gap-1.5">
              <IconPlus className="h-3.5 w-3.5" />
              New update
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiTile
          icon={<IconSend className="h-5 w-5" />}
          label="Sent this month"
          value={sentThisMonth}
          trend={monthDelta !== 0 ? String(monthDeltaAbs) : undefined}
          trendUp={monthDelta > 0 ? true : monthDelta < 0 ? false : undefined}
          statusToken="primary"
        />
        <KpiTile
          icon={<IconClock className="h-5 w-5" />}
          label="Draft / queued"
          value={draftQueued}
          statusToken="warning"
        />
        <KpiTile
          icon={<IconEye className="h-5 w-5" />}
          label="Open rate"
          value={`${openRate}%`}
          statusToken="success"
        />
        <KpiTile
          icon={<IconUsers className="h-5 w-5" />}
          label="Clients covered"
          value={clientsCovered}
          statusToken="neutral"
        />
      </div>

      {updatesDueClients.length > 0 && (
        <HubCard padded={false}>
          <HubCardHeader
            icon={<IconMail className="w-4 h-4" />}
            title="Updates due"
            subtitle="Clients approaching or past their next periodic update — derived from each client's interval schedule"
            color="amber"
            divider
            className="px-5 pt-5 pb-3.5"
          />
          <div className="px-5 pb-5">
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)] text-left">
                    <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Client</th>
                    <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Interval</th>
                    <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Last sent</th>
                    <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Next due</th>
                    <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10 text-right">Days</th>
                    <th className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 h-10">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {updatesDueClients.map((row) => {
                    const initials = row.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                    const sc = STATUS_COLORS[row.status!];
                    const daysClass = row.status === "overdue" ? "text-[var(--status-danger)]" : row.status === "due_soon" ? "text-[var(--status-warning)]" : "text-foreground";
                    return (
                      <tr key={row.clientId} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)] transition-colors">
                        <td className="px-5 py-3">
                          <Link href={`/hub/clients/${row.clientNumber}`} className="inline-flex items-center gap-2.5 min-w-0 group">
                            <span className="w-7 h-7 rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] grid place-items-center text-[11px] font-bold shrink-0">{initials}</span>
                            <span className="font-semibold text-foreground group-hover:text-rose transition-colors truncate">{row.name}</span>
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{UPDATE_INTERVAL_LABELS[row.interval]}</td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{row.lastSentAt ? new Date(row.lastSentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{row.nextDueDate ? new Date(row.nextDueDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                        <td className={`px-5 py-3 text-right font-semibold tabular-nums ${daysClass}`}>
                          {row.daysUntilDue != null ? (row.daysUntilDue < 0 ? `+${Math.abs(row.daysUntilDue)}` : row.daysUntilDue) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <TokenPill token={sc.token} label={sc.label} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </HubCard>
      )}

      <UpdatesReport updates={updates} />
    </div>
  );
}
