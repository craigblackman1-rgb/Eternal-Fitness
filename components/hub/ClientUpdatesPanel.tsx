import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HubCard, HubCardHeader } from "@/components/hub";
import { TokenPill } from "@/components/hub/StatusBadge";
import { IconMail, IconPlus } from "@/components/icons";
import { EmptyState } from "@/components/hub/EmptyState";
import { UpdateRowActions } from "@/components/hub/UpdateRowActions";
import { updateStatusMeta, formatUpdateTime } from "@/lib/updates/status";
import type { SentUpdate } from "@/types";

const STATUS_ORDER: Record<string, number> = { scheduled: 0, draft: 1, failed: 2, sent: 3, cancelled: 4 };

/** Updates list for the client profile Updates tab — template's single-card table, with
 *  Subject and Emailed columns kept so no per-update information is lost. */
export function ClientUpdatesPanel({
  clientNumber,
  updates,
  reportHref,
}: {
  clientNumber: number;
  updates: SentUpdate[];
  reportHref?: string;
}) {
  const sorted = [...updates].sort((a, b) => {
    const s = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (s !== 0) return s;
    const at = new Date(a.sent_at || a.scheduled_for || a.created_at).getTime();
    const bt = new Date(b.sent_at || b.scheduled_for || b.created_at).getTime();
    return bt - at;
  });

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<IconMail className="w-7 h-7" />}
        title="No updates yet"
        description="Generate a branded 6-week update from this client's training data, then review, schedule, or send it."
        cta={{ label: "New Update", href: `/hub/clients/${clientNumber}/updates/new` }}
      />
    );
  }

  return (
    <HubCard padded={false} className="overflow-hidden">
      <HubCardHeader
        icon={<IconMail className="w-4 h-4" />}
        title="6-Week Updates"
        color="rose"
        action={
          <div className="flex items-center gap-3">
            {reportHref && (
              <Link href={reportHref} className="text-xs font-medium text-teal hover:underline">
                Full history &amp; report
              </Link>
            )}
            <Link href={`/hub/clients/${clientNumber}/updates/new`}>
              <Button size="sm" className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white">
                <IconPlus className="h-4 w-4" />
                New Update
              </Button>
            </Link>
          </div>
        }
        className="px-5 pt-5"
        noBottomPadding
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
              <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Period</th>
              <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Subject</th>
              <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Sent</th>
              <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Status</th>
              <th className="text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider h-10 px-5 py-0 whitespace-nowrap">Emailed</th>
              <th className="h-10 px-5 py-0"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => {
              const meta = updateStatusMeta(u.status);
              const isScheduled = u.status === "scheduled";
              const timeLabel = isScheduled
                ? `Sends ${formatUpdateTime(u.scheduled_for)}`
                : u.status === "draft"
                  ? `Saved ${formatUpdateTime(u.created_at)}`
                  : formatUpdateTime(u.sent_at || u.created_at);

              return (
                <tr key={u.id} className="border-b border-[var(--hub-border)] last:border-0">
                  <td className="px-5 py-2.5 whitespace-nowrap">
                    {u.block_number > 0 ? (
                      <span className="font-medium text-foreground">Block {u.block_number}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 max-w-[280px]">
                    <span className="font-medium text-foreground">{u.subject}</span>
                  </td>
                  <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">{timeLabel}</td>
                  <td className="px-5 py-2.5 whitespace-nowrap">
                    <TokenPill token={meta.token} label={meta.label} />
                  </td>
                  <td className="px-5 py-2.5 whitespace-nowrap">
                    {u.status === "sent" ? (
                      <TokenPill token={u.emailed ? "success" : "neutral"} label={u.emailed ? "Emailed" : "Not sent"} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <UpdateRowActions
                      clientNumber={clientNumber}
                      updateId={u.id}
                      status={u.status}
                      hasEmail={!!u.client_email}
                      subject={u.subject}
                      body_html={u.body_html}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </HubCard>
  );
}
