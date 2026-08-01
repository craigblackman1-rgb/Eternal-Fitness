import { NextResponse } from "next/server";
import { getClientsUpdateDueSoon } from "@/lib/updates-due-db";
import { buildUpdateDueReminderEmail } from "@/lib/email-templates/update-due-reminder";
import { getEmailSender } from "@/lib/email";

export const dynamic = "force-dynamic";

function resolveNotifyEmail(): string {
  if (process.env.ESTHER_NOTIFY_EMAIL) {
    return process.env.ESTHER_NOTIFY_EMAIL;
  }
  const raw = process.env.MAIL_FROM || "";
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  if (raw.trim()) return raw.trim();
  return "esther@eternal-fitness.co.uk";
}

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  const provided = auth.replace(/^Bearer\s+/i, "") || url.searchParams.get("secret") || "";
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await getClientsUpdateDueSoon(7);

  if (clients.length === 0) {
    return NextResponse.json({ sent: false, count: 0 });
  }

  const html = buildUpdateDueReminderEmail(clients);
  const to = resolveNotifyEmail();
  const subject = `${clients.length} client${clients.length !== 1 ? "s" : ""} due an update`;

  const sender = getEmailSender();
  const result = await sender.send({ to, subject, html });

  const overdue = clients.filter((c) => c.status === "overdue").length;

  return NextResponse.json({
    sent: true,
    count: clients.length,
    overdue,
    dueSoon: clients.length - overdue,
    dryRun: result.dryRun ?? false,
    to,
  });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
