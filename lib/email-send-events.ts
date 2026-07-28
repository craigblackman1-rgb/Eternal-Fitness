import { createAdminClient } from "@/lib/supabase-admin";

export type EmailEntityType = "update" | "document";
export type EmailEventType = "sent" | "resent" | "delivered" | "opened" | "clicked" | "bounced" | "complained";

export interface EmailSendEvent {
  id: string;
  entity_type: EmailEntityType;
  entity_id: string;
  event: EmailEventType;
  recipient: string | null;
  sg_message_id: string | null;
  meta: Record<string, unknown> | null;
  occurred_at: string;
}

/** Whether this entity already has a prior successful dispatch — determines
 *  whether the next one logs as "sent" (first time) or "resent". */
export async function hasPriorSend(entityType: EmailEntityType, entityId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("email_send_events")
    .select("id", { count: "exact", head: true })
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .in("event", ["sent", "resent"]);
  return (count ?? 0) > 0;
}

/** Records one row in the append-only send/delivery log. Never throws —
 *  a logging failure shouldn't fail the send/webhook it's recording. */
export async function recordEmailEvent(input: {
  entityType: EmailEntityType;
  entityId: string;
  event: EmailEventType;
  recipient?: string | null;
  sgMessageId?: string | null;
  occurredAt?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("email_send_events").insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      event: input.event,
      recipient: input.recipient ?? null,
      sg_message_id: input.sgMessageId ?? null,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      meta: input.meta ?? null,
    });
  } catch (err) {
    console.error("[email-send-events] failed to record event", { input, error: err });
  }
}

/** Full timeline for one update or document, oldest first. */
export async function getEmailEvents(entityType: EmailEntityType, entityId: string): Promise<EmailSendEvent[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_send_events")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("occurred_at", { ascending: true });
  return (data ?? []) as EmailSendEvent[];
}
