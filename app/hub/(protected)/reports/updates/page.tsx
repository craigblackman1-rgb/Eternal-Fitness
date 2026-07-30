import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { IconSend, IconClock, IconEye, IconUsers, IconPlus, IconDownload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { KpiTile } from "@/components/hub/KpiTile";
import { UpdatesReport } from "./UpdatesReport";
import type { UpdateWithClient } from "@/types";

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

      <UpdatesReport updates={updates} />
    </div>
  );
}
