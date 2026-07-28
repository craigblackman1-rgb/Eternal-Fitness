import type { ReactNode } from "react";
import { getEmailEvents, type EmailEntityType, type EmailEventType } from "@/lib/email-send-events";
import { IconSend, IconCheckCircle, IconEye, IconAlertTriangle } from "@/components/icons";

const EVENT_LABEL: Record<EmailEventType, string> = {
  sent: "Sent",
  resent: "Resent",
  delivered: "Delivered",
  opened: "Opened",
  clicked: "Link clicked",
  bounced: "Bounced",
  complained: "Marked as spam",
};

const EVENT_ICON: Record<EmailEventType, ReactNode> = {
  sent: <IconSend className="h-3.5 w-3.5" />,
  resent: <IconSend className="h-3.5 w-3.5" />,
  delivered: <IconCheckCircle className="h-3.5 w-3.5" />,
  opened: <IconEye className="h-3.5 w-3.5" />,
  clicked: <IconEye className="h-3.5 w-3.5" />,
  bounced: <IconAlertTriangle className="h-3.5 w-3.5" />,
  complained: <IconAlertTriangle className="h-3.5 w-3.5" />,
};

const EVENT_COLOR: Record<EmailEventType, string> = {
  sent: "text-teal",
  resent: "text-teal",
  delivered: "text-[var(--status-success)]",
  opened: "text-[var(--status-success)]",
  clicked: "text-[var(--status-success)]",
  bounced: "text-destructive",
  complained: "text-destructive",
};

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Read-only, server-rendered send/delivery timeline for one update or
 *  document — answers "did this actually go out, and when" for a client
 *  who says they never received something, without needing Resend access. */
export async function EmailDeliveryTimeline({ entityType, entityId }: { entityType: EmailEntityType; entityId: string }) {
  const events = await getEmailEvents(entityType, entityId);

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No send activity recorded yet.</p>
    );
  }

  const sendCount = events.filter((e) => e.event === "sent" || e.event === "resent").length;

  return (
    <div className="space-y-3">
      {sendCount > 1 && (
        <p className="text-xs text-muted-foreground">
          Sent {sendCount} times — first send below, each resend logged separately.
        </p>
      )}
      <ul className="space-y-2.5">
        {events.map((e) => (
          <li key={e.id} className="flex items-start gap-2.5 text-sm">
            <span className={`shrink-0 mt-0.5 ${EVENT_COLOR[e.event]}`}>{EVENT_ICON[e.event]}</span>
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {EVENT_LABEL[e.event]}
                {e.recipient ? <span className="text-muted-foreground font-normal"> · {e.recipient}</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">{formatEventTime(e.occurred_at)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
