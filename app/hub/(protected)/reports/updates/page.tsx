import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { IconSend, IconClock, IconEye, IconUsers, IconPlus, IconDownload } from "@/components/icons";
import { Button } from "@/components/ui/button";
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

  const tiles = [
    {
      label: "Sent this month",
      value: sentThisMonth,
      icon: IconSend,
      tone: "rose" as const,
      delta: monthDelta !== 0 ? (monthDelta > 0 ? `↑${monthDelta}` : `↓${Math.abs(monthDelta)}`) : null,
      deltaTone: "teal" as const,
    },
    {
      label: "Draft / queued",
      value: draftQueued,
      icon: IconClock,
      tone: "amber" as const,
      delta: null,
    },
    {
      label: "Open rate",
      value: `${openRate}%`,
      icon: IconEye,
      tone: "teal" as const,
      delta: null,
    },
    {
      label: "Clients covered",
      value: clientsCovered,
      icon: IconUsers,
      tone: "neutral" as const,
      delta: null,
    },
  ];

  const iconTone: Record<string, string> = {
    rose: "bg-[var(--status-primary-bg)] text-[var(--status-primary)]",
    teal: "bg-[var(--status-success-bg)] text-[var(--status-success)]",
    amber: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
    neutral: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)]",
  };

  const deltaToneStyles: Record<string, string> = {
    teal: "bg-[var(--status-success-bg)] text-[var(--status-success)]",
  };

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
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="bg-[var(--hub-card)] rounded-2xl border border-[var(--hub-border)] shadow-sm p-4 flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconTone[t.tone]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground leading-none">{t.label}</p>
                <p className="text-2xl font-bold leading-tight text-foreground mt-1.5 tabular-nums">{t.value}</p>
              </div>
              {t.delta && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${deltaToneStyles[t.deltaTone ?? "teal"]}`}>
                  {t.delta}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <UpdatesReport updates={updates} />
    </div>
  );
}
