import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { dispatchUpdateEmail } from "@/lib/updates/send";
import { hasPriorSend, recordEmailEvent } from "@/lib/email-send-events";

/**
 * Send a saved draft/scheduled update right now (the "send it now instead of
 * waiting" button), or resend one that's already gone out. Marks the record
 * sent/failed just like the cron dispatcher.
 *
 * Uses insert-first reliability: transitions the row to "sending" before
 * dispatch, then resolves to "sent" or "failed" afterward.
 */
export async function POST(request: Request, { params }: { params: { updateId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: update } = await supabase
    .from("sent_updates")
    .select("id, status, subject, body_html, client_email")
    .eq("id", params.updateId)
    .single();

  if (!update) return NextResponse.json({ error: "Update not found" }, { status: 404 });
  // "sent" is allowed through as a resend — the client asked for it again, or the
  // first send needs re-triggering (bounced, wrong address now fixed, etc).
  if (!["draft", "scheduled", "failed", "sent"].includes(update.status)) {
    return NextResponse.json({ error: "This update can't be sent from its current status" }, { status: 409 });
  }

  // Allow overriding the recipient from the request (edit screen may have a fresher one).
  const body = await request.json().catch(() => ({}));
  const to = (body.clientEmail as string) || update.client_email;
  if (!to) return NextResponse.json({ error: "No recipient email on this update" }, { status: 400 });

  // Transition to "sending" before dispatch.
  const { error: sendingErr } = await supabase
    .from("sent_updates")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", update.id);
  if (sendingErr) {
    console.error("[updates:send]", { updateId: update.id, action: "sending-transition", error: sendingErr.message });
    return NextResponse.json({ error: sendingErr.message }, { status: 500 });
  }

  const alreadySent = await hasPriorSend("update", update.id);
  const result = await dispatchUpdateEmail({ to, subject: update.subject, html: update.body_html });

  if (result.emailed) {
    await recordEmailEvent({
      entityType: "update",
      entityId: update.id,
      event: alreadySent ? "resent" : "sent",
      recipient: to,
      sgMessageId: result.messageId,
    });
  }

  // Resolve to final status.
  const patch: Record<string, unknown> = {
    status: result.error ? "failed" : "sent",
    emailed: result.emailed,
    client_email: to,
    sg_message_id: result.messageId || null,
    send_error: result.error || null,
    updated_at: new Date().toISOString(),
  };
  if (!result.error) patch.sent_at = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("sent_updates")
    .update(patch)
    .eq("id", update.id);

  if (updateErr) {
    console.error("[updates:send]", {
      updateId: update.id,
      action: "final-update",
      note: "email may have been dispatched but DB update failed",
      error: updateErr.message,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  }

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, emailed: result.emailed, dryRun: result.dryRun });
}
