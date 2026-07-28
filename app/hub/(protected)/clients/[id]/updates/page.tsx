import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HubCard, HubCardHeader } from "@/components/hub";
import { Badge } from "@/components/ui/badge";
import { TokenPill } from "@/components/hub/StatusBadge";
import { IconChevronLeft, IconMail, IconPlus, IconCalendar, IconClock, IconEye } from "@/components/icons";
import { EmptyState } from "@/components/hub/EmptyState";
import { UpdateRowActions } from "@/components/hub/UpdateRowActions";
import { EmailDeliveryTimeline } from "@/components/hub/EmailDeliveryTimeline";
import { getTemplateKind } from "@/lib/email-templates/registry";
import { updateStatusMeta, formatUpdateTime } from "@/lib/updates/status";
import type { SentUpdate } from "@/types";

const STATUS_ORDER: Record<string, number> = { scheduled: 0, sending: 1, draft: 2, failed: 3, sent: 4, cancelled: 5 };

export default async function UpdatesHistoryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const clientNumber = parseInt(params.id);

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("client_number", clientNumber)
    .single();

  if (!client) notFound();

  const { data: updates } = await supabase
    .from("sent_updates")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const all = (updates || []) as SentUpdate[];
  const sorted = [...all].sort((a, b) => {
    const s = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (s !== 0) return s;
    const at = new Date(a.sent_at || a.scheduled_for || a.created_at).getTime();
    const bt = new Date(b.sent_at || b.scheduled_for || b.created_at).getTime();
    return bt - at;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/hub/clients/${params.id}`} className="text-muted-foreground hover:text-foreground">
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Updates</h1>
          <p className="text-muted-foreground">{client.name}</p>
        </div>
        <Link href={`/hub/clients/${params.id}/updates/new`}>
          <Button className="rounded-full gap-1.5 bg-rose hover:bg-rose/90 text-white">
            <IconPlus className="h-4 w-4" />
            New Update
          </Button>
        </Link>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<IconMail className="h-6 w-6" />}
          title="No updates yet"
          description={`Generate an update from ${client.name}'s training data, edit it, then send now, schedule it, or save a draft.`}
          cta={{ label: "Generate First Update", href: `/hub/clients/${params.id}/updates/new` }}
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((update) => {
            const meta = updateStatusMeta(update.status);
            const isScheduled = update.status === "scheduled";
            const timeLabel = isScheduled
              ? `Sends ${formatUpdateTime(update.scheduled_for)}`
              : update.status === "draft"
                ? `Saved ${formatUpdateTime(update.created_at)}`
                : formatUpdateTime(update.sent_at || update.created_at);

            return (
              <HubCard key={update.id}>
                <HubCardHeader
                  icon={isScheduled ? <IconClock className="w-4 h-4" /> : <IconMail className="w-4 h-4" />}
                  title={update.subject}
                  color="teal"
                  action={<UpdateRowActions clientNumber={clientNumber} updateId={update.id} status={update.status} hasEmail={!!update.client_email} subject={update.subject} body_html={update.body_html} />}
                  noBottomPadding
                />
                <div className="px-5 pb-5">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <IconCalendar className="h-3 w-3" />
                      {timeLabel}
                    </span>
                    <TokenPill token={meta.token} label={meta.label} />
                    {update.block_number > 0 && (
                      <Badge variant="outline" className="rounded-full text-xs">Block {update.block_number}</Badge>
                    )}
                    <Badge variant="outline" className="rounded-full text-xs">{getTemplateKind(update.template_kind).label}</Badge>
                    {update.status === "sent" && (
                      <Badge variant={update.emailed ? "default" : "secondary"} className="rounded-full text-xs">
                        {update.emailed ? "Emailed" : "Logged"}
                      </Badge>
                    )}
                    {update.status === "failed" && update.send_error && (
                      <span className="text-destructive truncate max-w-[220px]" title={update.send_error}>
                        {update.send_error}
                      </span>
                    )}
                    {update.status === "sent" && update.opened_at && (
                      <span className="flex items-center gap-1 text-teal" title={`Opened ${formatUpdateTime(update.opened_at)}`}>
                        <IconEye className="h-3 w-3" />
                        Opened
                        {update.open_count > 1 && <span className="text-muted-foreground">({update.open_count})</span>}
                      </span>
                    )}
                  </div>
                  {update.status !== "draft" && (
                    <details className="mt-3 group">
                      <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none">
                        Delivery history
                      </summary>
                      <div className="mt-2 pl-1">
                        <EmailDeliveryTimeline entityType="update" entityId={update.id} />
                      </div>
                    </details>
                  )}
                </div>
              </HubCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
