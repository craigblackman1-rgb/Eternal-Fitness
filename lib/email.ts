/**
 * Reusable email send layer. Designed so the Decoded Ops hub can adopt it too.
 *
 * Three backends, auto-selected in priority order:
 *   1. Resend (preferred) — set RESEND_API_KEY.
 *   2. Twilio SendGrid Web API (fallback) — set SENDGRID_API_KEY.
 *   3. SMTP relay (fallback) — set SMTP_HOST / SMTP_USER / SMTP_PASS.
 * If none are set, send() is a graceful dry run (nothing leaves the app).
 *
 * From address (all backends): MAIL_FROM or RESEND_FROM or SENDGRID_FROM or SMTP_FROM,
 * accepting either "email@x.com" or "Name <email@x.com>".
 *
 * Env vars:
 *   RESEND_API_KEY   — Resend API key (enables the Resend backend)
 *   SENDGRID_API_KEY — SendGrid API key (enables the Web API backend)
 *   MAIL_FROM        — From address, e.g. "Esther Fair <esther@eternal-fitness.co.uk>"
 *   SMTP_HOST/PORT/USER/PASS/FROM — SMTP relay fallback
 */

export interface EmailAttachment {
  filename: string;
  /** Raw file bytes. */
  content: Buffer;
  contentType?: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: true;
  messageId: string;
  /** true when no email backend is configured — nothing was actually sent */
  dryRun?: boolean;
}

export interface EmailSender {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

type Backend = "resend" | "sendgrid" | "smtp" | "none";

function selectBackend(): Backend {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SENDGRID_API_KEY) return "sendgrid";
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  return "none";
}

const DEFAULT_FROM = "Eternal Fitness <noreply@eternal-fitness.co.uk>";

function getFromRaw(): string {
  return (
    process.env.MAIL_FROM ||
    process.env.RESEND_FROM ||
    process.env.SENDGRID_FROM ||
    process.env.SMTP_FROM ||
    DEFAULT_FROM
  );
}

/** Parse "Name <email@x.com>" or "email@x.com" into its parts. */
function parseFrom(raw: string): { email: string; name?: string } {
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1] || undefined, email: match[2].trim() };
  return { email: raw.trim() };
}

/** Cheap HTML→text fallback so every email carries a plain-text part (deliverability). */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&mdash;/gi, "—")
    .replace(/&hellip;/gi, "…")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// --- Resend ------------------------------------------------------------

async function sendResend(input: SendEmailInput): Promise<SendEmailResult> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const text = input.text || htmlToText(input.html);

  const { data, error } = await resend.emails.send({
    from: getFromRaw(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: text || undefined,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message || JSON.stringify(error)}`);
  }

  return { success: true, messageId: data?.id || "resend-accepted" };
}

// --- SendGrid Web API ------------------------------------------------------

async function sendSendgrid(input: SendEmailInput): Promise<SendEmailResult> {
  const from = parseFrom(getFromRaw());
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map((email) => ({ email }));
  const text = input.text || htmlToText(input.html);

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: recipients }],
      from,
      subject: input.subject,
      // SendGrid requires text/plain before text/html.
      content: [
        { type: "text/plain", value: text || " " },
        { type: "text/html", value: input.html },
      ],
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        type: a.contentType || "application/octet-stream",
        content: a.content.toString("base64"),
        disposition: "attachment",
      })),
    }),
  });

  if (res.status !== 202) {
    const detail = await res.text().catch(() => "");
    throw new Error(`SendGrid send failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  return { success: true, messageId: res.headers.get("x-message-id") || "sendgrid-accepted" };
}

// --- SMTP relay (fallback) -------------------------------------------------

async function sendNodemailer(input: SendEmailInput): Promise<SendEmailResult> {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: parseInt(process.env.SMTP_PORT || "587", 10) === 465,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });

  const to = Array.isArray(input.to) ? input.to.join(", ") : input.to;

  const info = await transporter.sendMail({
    from: getFromRaw(),
    to,
    subject: input.subject,
    html: input.html,
    text: input.text || htmlToText(input.html) || undefined,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });

  return { success: true, messageId: info.messageId };
}

export function getEmailSender(): EmailSender {
  const backend = selectBackend();
  if (backend === "resend") return { send: sendResend };
  if (backend === "sendgrid") return { send: sendSendgrid };
  if (backend === "smtp") return { send: sendNodemailer };
  return {
    async send(_input: SendEmailInput) {
      return { success: true, messageId: "dry-run-no-email-backend", dryRun: true };
    },
  };
}

export function getEmailStatus(): { configured: boolean; backend: Backend; from: string } {
  const backend = selectBackend();
  return { configured: backend !== "none", backend, from: getFromRaw() };
}
