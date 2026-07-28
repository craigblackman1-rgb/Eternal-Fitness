import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase-admin";
import { recordEmailEvent, type EmailEntityType, type EmailEventType } from "@/lib/email-send-events";

/**
 * Resend Webhook receiver — tracks opens/clicks/delivery the same way the
 * SendGrid webhook did, writing into `sent_updates`/`client_documents`, and
 * also logs every event to the append-only `email_send_events` table so
 * Esther can see full delivery history (not just the latest open/click).
 *
 * Register this URL in the Resend dashboard (Webhooks → Add Endpoint):
 *   https://<hub-domain>/api/webhooks/resend
 *
 * Subscribe to: email.opened, email.clicked, email.delivered, email.bounced,
 * email.complained.
 *
 * Also enable Open Tracking and Click Tracking on the sending domain in
 * Resend (Domains → your domain) — events won't fire otherwise.
 *
 * Security: Resend signs webhooks using the Svix format (svix-id /
 * svix-timestamp / svix-signature headers), verified here via HMAC-SHA256
 * against RESEND_WEBHOOK_SECRET (the "whsec_..." signing secret Resend
 * shows when you create the webhook endpoint). If the secret is not set,
 * requests are accepted but a warning is logged (local dev convenience).
 * If the secret IS set, a verification failure of any kind rejects the
 * request — fail closed, matching the SendGrid handler's behavior.
 */

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || "";

function verifyResendSignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  body: string,
): boolean {
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  // svix-signature is a space-separated list of "v1,<base64sig>" tokens —
  // any match is valid (supports secret rotation).
  return svixSignature.split(" ").some((token) => {
    const sig = token.split(",")[1];
    if (!sig) return false;
    const sigBuf = Buffer.from(sig, "base64");
    const expectedBuf = Buffer.from(expected, "base64");
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });
}

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    [key: string]: unknown;
  };
}

const EVENT_MAP: Record<string, EmailEventType> = {
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

/** A message id belongs to exactly one of these two tables — find which. */
async function findEntity(
  supabase: ReturnType<typeof createAdminClient>,
  emailId: string,
): Promise<{ type: EmailEntityType; id: string } | null> {
  const { data: update } = await supabase
    .from("sent_updates")
    .select("id")
    .eq("sg_message_id", emailId)
    .limit(1)
    .maybeSingle();
  if (update) return { type: "update", id: update.id };

  const { data: doc } = await supabase
    .from("client_documents")
    .select("id")
    .eq("sg_message_id", emailId)
    .limit(1)
    .maybeSingle();
  if (doc) return { type: "document", id: doc.id };

  return null;
}

async function handleEvent(evt: ResendWebhookEvent): Promise<void> {
  const supabase = createAdminClient();
  const emailId = evt.data.email_id;
  const eventTs = evt.created_at ? new Date(evt.created_at).toISOString() : new Date().toISOString();
  const mapped = EVENT_MAP[evt.type];
  if (!mapped) return; // "sent" and anything unrecognised — nothing to record here

  const entity = await findEntity(supabase, emailId);
  if (!entity) return;

  await recordEmailEvent({
    entityType: entity.type,
    entityId: entity.id,
    event: mapped,
    sgMessageId: emailId,
    occurredAt: eventTs,
  });

  // Keep sent_updates' own opened_at/open_count/clicked_at/click_count columns
  // in sync — existing portal/hub UI reads those directly, not the event log.
  if (entity.type === "update") {
    if (evt.type === "email.opened") {
      const { data: row } = await supabase
        .from("sent_updates")
        .select("id, opened_at, open_count")
        .eq("id", entity.id)
        .maybeSingle();
      if (row) {
        await supabase
          .from("sent_updates")
          .update({ opened_at: row.opened_at || eventTs, open_count: (row.open_count || 0) + 1 })
          .eq("id", row.id);
      }
    } else if (evt.type === "email.clicked") {
      const { data: row } = await supabase
        .from("sent_updates")
        .select("id, clicked_at, click_count")
        .eq("id", entity.id)
        .maybeSingle();
      if (row) {
        await supabase
          .from("sent_updates")
          .update({ clicked_at: row.clicked_at || eventTs, click_count: (row.click_count || 0) + 1 })
          .eq("id", row.id);
      }
    }
  }
}

export async function POST(request: Request) {
  const body = await request.text();

  if (WEBHOOK_SECRET) {
    const svixId = request.headers.get("svix-id") || "";
    const svixTimestamp = request.headers.get("svix-timestamp") || "";
    const svixSignature = request.headers.get("svix-signature") || "";
    if (!svixId || !svixTimestamp || !svixSignature) {
      console.warn("[resend-webhook] Missing signature headers — rejecting request");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    let valid = false;
    try {
      valid = verifyResendSignature(WEBHOOK_SECRET, svixId, svixTimestamp, svixSignature, body);
    } catch (err) {
      console.error("[resend-webhook] Signature verification error — rejecting request", err);
      return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
    }
    if (!valid) {
      console.warn("[resend-webhook] Invalid signature — rejecting request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn("[resend-webhook] RESEND_WEBHOOK_SECRET not set — verification disabled");
  }

  let evt: ResendWebhookEvent;
  try {
    evt = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!evt?.data?.email_id || !evt.type) {
    return NextResponse.json({ ok: true });
  }

  await handleEvent(evt);

  return NextResponse.json({ ok: true });
}
