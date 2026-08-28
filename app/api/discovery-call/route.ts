import { NextResponse } from "next/server";
import { confirmBooking, SlotTakenError, AvailabilityError } from "@/lib/booking-availability";
import { supabase } from "@/lib/supabase";
import { getEmailSender } from "@/lib/email";

/**
 * POST /api/discovery-call — public intake + booking confirm endpoint.
 *
 * Validates the intake fields, confirms the Outlook calendar booking via
 * confirmBooking(), persists a discovery_call_leads row, and best-effort
 * sends Esther a notification email. Email failure does NOT fail the
 * booking — the calendar event and DB row are the source of truth.
 *
 * Anti-spam pattern matches app/api/leads/route.ts (honeypot + IP rate-limit).
 */

// ─── Anti-spam / rate-limit (same pattern as leads route) ──────────────────

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const requestLog = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  for (const [k, timestamps] of requestLog) {
    const recent = timestamps.filter((t) => t > cutoff);
    if (recent.length === 0) requestLog.delete(k);
    else if (recent.length !== timestamps.length) requestLog.set(k, recent);
  }

  const timestamps = (requestLog.get(key) || []).filter((t) => t > cutoff);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    requestLog.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  requestLog.set(key, timestamps);
  return false;
}

// ─── Email helpers (same as leads route) ───────────────────────────────────

function resolveBusinessEmail(): string {
  if (process.env.ESTHER_NOTIFY_EMAIL) {
    return process.env.ESTHER_NOTIFY_EMAIL;
  }
  const raw = process.env.MAIL_FROM || "";
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  if (raw.trim()) return raw.trim();
  return "esther.fair@eternal-fitness.co.uk";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

// ─── Validation ────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ACTIVITY = ["not-active", "a-little", "regularly"];
const VALID_CONTACT = ["phone", "text", "email"];

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please call or email us directly." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Honeypot: real visitors never see or fill this field.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ success: true });
  }

  // ── Validate required fields ────────────────────────────────────────────

  const name = typeof body.name === "string" ? truncate(body.name.trim(), 200) : "";
  const phone = typeof body.phone === "string" ? truncate(body.phone.trim(), 50) : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const goals = typeof body.goals === "string" ? truncate(body.goals.trim(), 2000) : "";
  const activityLevel = typeof body.activity === "string" ? body.activity.trim() : "";
  const contactMethod = typeof body.contactMethod === "string" ? body.contactMethod.trim() : "";
  const healthNotes = typeof body.health === "string" ? truncate(body.health.trim(), 2000) : "";
  const notes = typeof body.notes === "string" ? truncate(body.notes.trim(), 2000) : "";

  // Slot details
  const slotStartUtc = typeof body.slotStartUtc === "string" ? body.slotStartUtc.trim() : "";
  const slotEndUtc = typeof body.slotEndUtc === "string" ? body.slotEndUtc.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Your name is required." }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "A phone number is required." }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }
  if (!goals) {
    return NextResponse.json({ error: "Please tell Esther what you'd like to work towards." }, { status: 400 });
  }
  if (!VALID_ACTIVITY.includes(activityLevel)) {
    return NextResponse.json({ error: "Please choose your current activity level." }, { status: 400 });
  }
  if (!VALID_CONTACT.includes(contactMethod)) {
    return NextResponse.json({ error: "Please choose how you'd like to be contacted." }, { status: 400 });
  }
  if (!slotStartUtc || !slotEndUtc) {
    return NextResponse.json({ error: "Please choose a time slot." }, { status: 400 });
  }

  // Validate dates
  const startDate = new Date(slotStartUtc);
  const endDate = new Date(slotEndUtc);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid slot time format." }, { status: 400 });
  }
  if (startDate >= endDate) {
    return NextResponse.json({ error: "Invalid slot time range." }, { status: 400 });
  }

  // ── Confirm the Outlook calendar booking ─────────────────────────────────

  let eventId: string;
  try {
    const result = await confirmBooking({
      startUtc: slotStartUtc,
      endUtc: slotEndUtc,
      transactionId: `dc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      subject: `Discovery call — ${name}`,
      bodyHtml: `<p>Discovery call with ${escapeHtml(name)}.</p>
<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
<p><strong>Email:</strong> ${escapeHtml(email)}</p>
<p><strong>Goals:</strong> ${escapeHtml(goals)}</p>
<p><strong>Activity level:</strong> ${escapeHtml(activityLevel)}</p>
<p><strong>Preferred contact:</strong> ${escapeHtml(contactMethod)}</p>
${healthNotes ? `<p><strong>Health notes:</strong> ${escapeHtml(healthNotes)}</p>` : ""}
${notes ? `<p><strong>Notes:</strong> ${escapeHtml(notes)}</p>` : ""}`,
    });
    eventId = result.eventId;
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return NextResponse.json(
        { error: "That time was just taken. Please pick another slot.", code: "SLOT_TAKEN" },
        { status: 409 }
      );
    }
    if (err instanceof AvailabilityError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 503 }
      );
    }
    console.error("discovery-call confirmBooking error:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again or call Esther directly." },
      { status: 500 }
    );
  }

  // ── Persist the lead row ─────────────────────────────────────────────────

  const { error: insertError } = await supabase.from("discovery_call_leads").insert({
    name,
    phone,
    email,
    goals,
    activity_level: activityLevel,
    contact_method: contactMethod,
    health_notes: healthNotes,
    notes,
    slot_start_utc: slotStartUtc,
    slot_end_utc: slotEndUtc,
    calendar_event_id: eventId,
  });

  if (insertError) {
    console.error("discovery-call DB insert error:", insertError);
    // The calendar event is already created — don't fail the whole flow.
    // Log the error so it's visible, but return success to the client.
  }

  // ── Best-effort notification email to Esther ─────────────────────────────
  // Must not fail the booking. Email backend can silently dry-run.

  let notificationEmailed = false;
  try {
    const contactLabel =
      contactMethod === "phone" ? "Phone call" : contactMethod === "text" ? "Text message" : "Email";
    const activityLabel =
      activityLevel === "not-active" ? "Not currently active" : activityLevel === "a-little" ? "A little active" : "Regularly active";

    const html = `
      <p>New discovery call booking — Eternal Fitness website:</p>
      <table cellpadding="4" cellspacing="0">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
        <tr><td><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${escapeHtml(phone)}</td></tr>
        <tr><td><strong>Goals</strong></td><td>${escapeHtml(goals).replace(/\n/g, "<br/>")}</td></tr>
        <tr><td><strong>Activity level</strong></td><td>${escapeHtml(activityLabel)}</td></tr>
        <tr><td><strong>Preferred contact</strong></td><td>${escapeHtml(contactLabel)}</td></tr>
        ${healthNotes ? `<tr><td><strong>Health notes</strong></td><td>${escapeHtml(healthNotes).replace(/\n/g, "<br/>")}</td></tr>` : ""}
        ${notes ? `<tr><td><strong>Notes</strong></td><td>${escapeHtml(notes).replace(/\n/g, "<br/>")}</td></tr>` : ""}
        <tr><td><strong>Slot</strong></td><td>${escapeHtml(startDate.toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }))}</td></tr>
        <tr><td><strong>Calendar event</strong></td><td>${escapeHtml(eventId)}</td></tr>
      </table>
    `;

    const sender = getEmailSender();
    const result = await sender.send({
      to: resolveBusinessEmail(),
      subject: `New discovery call booked — ${name}`,
      html,
      replyTo: email,
    });
    notificationEmailed = result.dryRun !== true;
  } catch (err) {
    console.error("discovery-call notification email failed (non-fatal):", err);
  }

  // Update the notification_emailed flag if the row was inserted
  if (insertError === null) {
    await supabase
      .from("discovery_call_leads")
      .update({ notification_emailed: notificationEmailed })
      .eq("calendar_event_id", eventId);
  }

  return NextResponse.json({ success: true });
}
