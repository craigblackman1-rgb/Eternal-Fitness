import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HubCard, HubCardHeader } from "@/components/hub";
import { TokenPill } from "@/components/hub/StatusBadge";
import { IconMail, IconSend } from "@/components/icons";
import { EmptyState } from "@/components/hub/EmptyState";
import { UpdateRowActions } from "@/components/hub/UpdateRowActions";
import { updateStatusMeta, formatUpdateTime } from "@/lib/updates/status";
import { stripHtml } from "@/lib/strip-html";
import type { SentUpdate } from "@/types";

const STATUS_ORDER: Record<string, number> = { scheduled: 0, draft: 1, failed: 2, sent: 3, cancelled: 4 };

/** Updates list for the client profile Comms tab — a single "Client Updates"
 *  card of per-update entries (subject, timestamp, status pill, body excerpt,
 *  row actions), matching hub-client-detail-refined.html's `.update-item` list
 *  rather than a dense table. */
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
        title="Client Updates"
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
                <IconSend className="h-4 w-4" />
                Send Update
              </Button>
            </Link>
          </div>
        }
        className="px-5 pt-5"
        noBottomPadding
      />
      <div className="px-5 pb-5 space-y-3">
        {sorted.map((u) => {
          const meta = updateStatusMeta(u.status);
          const isScheduled = u.status === "scheduled";
          const timeLabel = isScheduled
            ? `Sends ${formatUpdateTime(u.scheduled_for)}`
            : u.status === "draft"
              ? `Saved ${formatUpdateTime(u.created_at)}`
              : formatUpdateTime(u.sent_at || u.created_at);
          const excerpt = stripHtml(u.body_html || "").trim();

          return (
            <div key={u.id} className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-card)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{u.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {u.block_number > 0 ? `Block ${u.block_number} · ` : ""}
                    {timeLabel}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <TokenPill token={meta.token} label={meta.label} />
                  {u.status === "sent" && (
                    <TokenPill token={u.emailed ? "success" : "neutral"} label={u.emailed ? "Emailed" : "Not sent"} />
                  )}
                </div>
              </div>
              {excerpt && (
                <p className="mt-2.5 text-sm text-foreground/80 line-clamp-3 whitespace-pre-line">{excerpt}</p>
              )}
              <div className="mt-3 flex items-center justify-end border-t border-[var(--hub-border)] pt-2.5">
                <UpdateRowActions
                  clientNumber={clientNumber}
                  updateId={u.id}
                  status={u.status}
                  hasEmail={!!u.client_email}
                  subject={u.subject}
                  body_html={u.body_html}
                />
              </div>
            </div>
          );
        })}
      </div>
    </HubCard>
  );
}
