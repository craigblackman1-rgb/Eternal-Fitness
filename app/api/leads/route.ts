import { NextResponse } from "next/server";
import { getEmailSender } from "@/lib/email";

/**
 * Shared inbox for the two public lead-capture forms (Contact page form and
 * the site-wide "Book a Free Consultation" dialog) — both previously faked a
 * success state client-side with nothing actually sent (2026-08-07 fix).
 */

const BUSINESS_EMAIL = "esther.fair@eternal-fitness.co.uk";

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

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const source = typeof body.source === "string" && SOURCE_LABELS[body.source] ? body.source : "contact_form";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!firstName) {
    return NextResponse.json({ error: "First name is required." }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const sourceLabel = SOURCE_LABELS[source];

  const rows = [
    ["Name", fullName],
    ["Email", email],
    ["Phone", phone || "—"],
    ["Source", sourceLabel],
  ];
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
      to: BUSINESS_EMAIL,
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
