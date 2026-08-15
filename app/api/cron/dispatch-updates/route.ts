import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase-admin";
import { dispatchUpdateEmail } from "@/lib/updates/send";
import { hasPriorSend, recordEmailEvent } from "@/lib/email-send-events";

export const dynamic = "force-dynamic";

function secretsMatch(provided: string, secret: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

/**
 * Cron dispatcher for scheduled update emails.
 *
 * Hit this on a schedule (e.g. a Coolify Scheduled Task every 5 minutes):
 *   curl -X POST https://<hub>/api/cron/dispatch-updates \
 *        -H "Authorization: Bearer $CRON_SECRET"
 *
 * It finds every 'scheduled' update whose time has passed, sends it, and marks
 * it 'sent' (or 'failed', with the error recorded). Uses the service-role
 * client because there's no logged-in user on a cron call.
 *
 * The secret can be provided as an Authorization: Bearer header or a ?secret=
 * query param (some schedulers only do GET). GET and POST both work.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  const provided = auth.replace(/^Bearer\s+/i, "") || url.searchParams.get("secret") || "";
  if (!secretsMatch(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabase
    .from("sent_updates")
    .select("id, subject, body_html, client_email")
    .eq("status", "scheduled")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { id: string; outcome: string }[] = [];

  for (const update of due ?? []) {
    if (!update.client_email) {
      const { error: failErr } = await supabase
        .from("sent_updates")
        .update({ status: "failed", send_error: "No recipient email", updated_at: nowIso })
        .eq("id", update.id);
      if (failErr) {
        console.error("[updates:cron]", { updateId: update.id, action: "fail-no-email", error: failErr.message });
      }
      results.push({ id: update.id, outcome: "failed:no-email" });
      continue;
    }

    // Pre-transition to "sending" so a record exists if the process crashes.
    const { error: sendingErr } = await supabase
      .from("sent_updates")
      .update({ status: "sending", updated_at: nowIso })
      .eq("id", update.id);
    if (sendingErr) {
      console.error("[updates:cron]", { updateId: update.id, action: "sending-transition", error: sendingErr.message });
      results.push({ id: update.id, outcome: "failed:send-transition" });
      continue;
    }

    const alreadySent = await hasPriorSend("update", update.id);
    const res = await dispatchUpdateEmail({
      to: update.client_email,
      subject: update.subject,
      html: update.body_html,
    });

    if (res.emailed) {
      await recordEmailEvent({
        entityType: "update",
        entityId: update.id,
        event: alreadySent ? "resent" : "sent",
        recipient: update.client_email,
        sgMessageId: res.messageId,
      });
    }

    const patch: Record<string, unknown> = {
      status: res.error ? "failed" : "sent",
      emailed: res.emailed,
      sg_message_id: res.messageId || null,
      send_error: res.error || (res.dryRun ? "Email sending isn't configured — logged, not emailed" : null),
      updated_at: new Date().toISOString(),
    };
    if (!res.error) patch.sent_at = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("sent_updates")
      .update(patch)
      .eq("id", update.id);

    if (updateErr) {
      console.error("[updates:cron]", {
        updateId: update.id,
        action: "final-update",
        note: "email may have been dispatched but DB update failed",
        error: updateErr.message,
      });
    }

    results.push({ id: update.id, outcome: res.error ? "failed" : res.emailed ? "sent" : "logged-dry-run" });
  }

  return NextResponse.json({ success: true, processed: results.length, results });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
