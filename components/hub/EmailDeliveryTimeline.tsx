import type { ReactNode } from "react";
import { getEmailEvents, type EmailEntityType, type EmailEventType } from "@/lib/email-send-events";
import { getStatusClasses } from "@/lib/hubStatus";
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

// Two-way split (ok vs. problem), matching the mockup's teal/danger timeline
// dots rather than the finer-grained per-event coloring this used to have.
const EVENT_TOKEN: Record<EmailEventType, "success" | "danger"> = {
  sent: "success",
  resent: "success",
  delivered: "success",
  opened: "success",
  clicked: "success",
  bounced: "danger",
  complained: "danger",
};

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
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
      <ul className="flex flex-col">
        {events.map((e, i) => {
          const c = getStatusClasses(EVENT_TOKEN[e.event]);
          return (
            <li key={e.id} className="relative flex items-start gap-3 py-1.5">
              {i < events.length - 1 && (
                <span className="absolute left-[9px] top-[26px] bottom-[-6px] w-px bg-[var(--hub-border)]" />
              )}
              <span className={`relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill ${c.bg} ${c.text}`}>
                {EVENT_ICON[e.event]}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {EVENT_LABEL[e.event]}
                  {e.recipient ? <span className="text-muted-foreground font-normal"> · {e.recipient}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground mt-px">{formatEventTime(e.occurred_at)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
