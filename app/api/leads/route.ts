import { NextResponse } from "next/server";
import { getEmailSender } from "@/lib/email";

/**
 * Shared inbox for the two public lead-capture forms (Contact page form and
 * the site-wide "Book a Free Consultation" dialog) — both previously faked a
 * success state client-side with nothing actually sent (2026-08-07 fix).
 */

// Same resolution order as app/api/cron/check-updates-due/route.ts's
// resolveNotifyEmail(), so ESTHER_NOTIFY_EMAIL redirects both notification
// paths with one env var.
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

const SOURCE_LABELS: Record<string, string> = {
  contact_form: "Contact page form",
  consultation_dialog: "Book a Free Consultation dialog",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

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

  const source = typeof body.source === "string" && SOURCE_LABELS[body.source] ? body.source : "contact_form";
  const firstName = typeof body.firstName === "string" ? truncate(body.firstName.trim(), 200) : "";
  const lastName = typeof body.lastName === "string" ? truncate(body.lastName.trim(), 200) : "";
  const singleName = typeof body.name === "string" ? truncate(body.name.trim(), 200) : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const topic = typeof body.topic === "string" ? truncate(body.topic.trim(), 200) : "";
  const message = typeof body.message === "string" ? truncate(body.message.trim(), 5000) : "";

  const fullName = singleName || [firstName, lastName].filter(Boolean).join(" ");

  if (!fullName) {
    return NextResponse.json({ error: "Your name is required." }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const sourceLabel = SOURCE_LABELS[source];

  const rows = [
    ["Name", fullName],
    ["Email", email],
    ["Phone", phone || "—"],
    ["Source", sourceLabel],
  ];
  if (topic) rows.push(["Topic", topic]);
  if (message) rows.push(["Message", message]);

  const html = `
    <p>New enquiry from the website (${escapeHtml(sourceLabel)}):</p>
    <table cellpadding="4" cellspacing="0">
      ${rows.map(([label, value]) => `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value).replace(/\n/g, "<br/>")}</td></tr>`).join("")}
    </table>
  `;

  try {
    const sender = getEmailSender();
    const result = await sender.send({
      to: resolveBusinessEmail(),
      subject: `New enquiry from ${fullName} — Eternal Fitness website`,
      html,
      replyTo: email,
    });

    return NextResponse.json({ success: true, dryRun: result.dryRun === true });
  } catch (err) {
    console.error("Failed to send lead enquiry email:", err);
    return NextResponse.json({ error: "Could not send your message right now. Please call or email directly." }, { status: 502 });
  }
}
