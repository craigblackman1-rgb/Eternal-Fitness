import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { dispatchUpdateEmail, DEFAULT_UPDATE_SUBJECT } from "@/lib/updates/send";
import { recordEmailEvent } from "@/lib/email-send-events";

type Action = "test" | "send" | "log" | "draft" | "schedule";

interface CreateBody {
  action: Action;
  subject?: string;
  html?: string;
  sections?: Record<string, string>;
  blockNumber?: number;
  templateKind?: string;
  clientEmail?: string;
  scheduledFor?: string; // ISO string, for action = schedule
  testRecipient?: string; // for action = test
}

async function resolveClient(supabase: ReturnType<typeof createClient>, id: string) {
  const clientNumber = parseInt(id);
  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .eq("client_number", clientNumber)
    .single();
  return data;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await resolveClient(supabase, params.id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = (await request.json()) as CreateBody;
  const {
    action,
    html = "",
    sections,
    blockNumber = 0,
    templateKind = "six_week_update",
    clientEmail,
    scheduledFor,
    testRecipient,
  } = body;
  const subject = body.subject || DEFAULT_UPDATE_SUBJECT;

  // 1. Test send — fires a real email to a chosen inbox, never logged.
  if (action === "test") {
    if (!testRecipient) return NextResponse.json({ error: "No test recipient" }, { status: 400 });
    const result = await dispatchUpdateEmail({ to: testRecipient, subject: `[TEST] ${subject}`, html });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ success: true, emailed: result.emailed, test: true });
  }

  // Remember the client's email on their record so it prefills next time.
  if (clientEmail) {
    await supabase.from("clients").update({ email: clientEmail }).eq("id", client.id).then(undefined, () => {});
  }

  const base = {
    client_id: client.id,
    subject,
    body_html: html,
    block_number: blockNumber,
    template_kind: templateKind,
    sections: sections ?? null,
    client_email: clientEmail ?? null,
  };

  // 2. Draft — saved, editable, not sent.
  if (action === "draft") {
    const { data, error } = await supabase
      .from("sent_updates")
      .insert({ ...base, status: "draft", emailed: false })
      .select("id")
      .single();
    if (error) {
      console.error("[updates:send]", { clientId: client.id, action: "draft", error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: data.id, status: "draft" });
  }

  // 3. Schedule — saved with a future send time; the cron dispatcher sends it.
  if (action === "schedule") {
    if (!scheduledFor) return NextResponse.json({ error: "A scheduled time is required" }, { status: 400 });
    const when = new Date(scheduledFor);
    if (isNaN(when.getTime())) return NextResponse.json({ error: "Invalid scheduled time" }, { status: 400 });
    if (when.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ error: "Scheduled time is in the past" }, { status: 400 });
    }
    if (!clientEmail) return NextResponse.json({ error: "Client email is required to schedule" }, { status: 400 });
    const { data, error } = await supabase
      .from("sent_updates")
      .insert({ ...base, status: "scheduled", scheduled_for: when.toISOString(), emailed: false })
      .select("id")
      .single();
    if (error) {
      console.error("[updates:send]", { clientId: client.id, action: "schedule", error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: data.id, status: "scheduled", scheduledFor: when.toISOString() });
  }

  // 4. Log — Esther delivered it another way, but wants a record.
  if (action === "log") {
    const { error } = await supabase
      .from("sent_updates")
      .insert({ ...base, status: "sent", emailed: false, sent_at: new Date().toISOString() });
    if (error) {
      console.error("[updates:send]", { clientId: client.id, action: "log", error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, emailed: false });
  }

  // 5. Send now — insert-first pattern for reliability.
  if (action === "send") {
    if (!clientEmail) return NextResponse.json({ error: "Client email address is required" }, { status: 400 });

    // Pre-insert a row with status "sending" so a record exists even if the
    // process crashes between email dispatch and the final status update.
    const { data: pendingRow, error: insertErr } = await supabase
      .from("sent_updates")
      .insert({ ...base, status: "sending", emailed: false })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[updates:send]", { clientId: client.id, action: "send", error: insertErr.message });
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const result = await dispatchUpdateEmail({ to: clientEmail, subject, html });

    // Update the pre-inserted row with the send outcome.
    const patch: Record<string, unknown> = {
      status: result.error ? "failed" : "sent",
      emailed: result.emailed,
      sg_message_id: result.messageId || null,
      send_error: result.error || (result.dryRun ? "Email sending isn't configured — logged, not emailed" : null),
      updated_at: new Date().toISOString(),
    };
    if (!result.error) patch.sent_at = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("sent_updates")
      .update(patch)
      .eq("id", pendingRow.id);

    if (updateErr) {
      // The email may have gone out — log the DB error but still report success
      // if the email was dispatched (the row exists with status "sending").
      console.error("[updates:send]", {
        clientId: client.id,
        action: "send",
        note: "email may have been dispatched but DB update failed",
        error: updateErr.message,
      });
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
    }

    if (result.dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        emailed: false,
        error: "Email sending isn't configured — the email was NOT sent, but the update was logged. Set SENDGRID_API_KEY (or SMTP_*) to actually send.",
      });
    }
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Brand-new row — this is always the first send for this entity.
    await recordEmailEvent({
      entityType: "update",
      entityId: pendingRow.id,
      event: "sent",
      recipient: clientEmail,
      sgMessageId: result.messageId,
    });

    return NextResponse.json({ success: true, emailed: true, messageId: result.messageId });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
