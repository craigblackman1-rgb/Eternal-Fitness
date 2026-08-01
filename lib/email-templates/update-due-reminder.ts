import { buildBrandedUpdateEmail } from "./shell";
import { UPDATE_INTERVAL_LABELS } from "@/lib/updates-due";
import type { ClientUpdateDue } from "@/lib/updates-due-db";

const ROSE = "#C1839F";
const TEAL = "#087E8B";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function statusBadge(client: ClientUpdateDue): string {
  const d = client.daysUntilDue ?? 0;
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `${d}d`;
}

function buildClientRow(client: ClientUpdateDue): string {
  const label = UPDATE_INTERVAL_LABELS[client.interval] || client.interval;
  const date = formatDate(client.nextDueDate);
  const badge = statusBadge(client);
  const isOverdue = client.status === "overdue";

  return `<tr>
    <td style="padding: 8px 0 4px; font-size: 14px; color: #3C3C3C; font-weight: 600;">${client.name}</td>
    <td style="padding: 8px 0 4px 16px; font-size: 13px; color: #525A61; white-space: nowrap;">${label}</td>
    <td style="padding: 8px 0 4px 16px; font-size: 13px; color: #525A61; white-space: nowrap;">${date}</td>
    <td style="padding: 8px 0 4px 16px; text-align: right; font-size: 12px; font-weight: 700; color: ${isOverdue ? ROSE : "#525A61"}; white-space: nowrap;">${badge}</td>
  </tr>`;
}

export function buildUpdateDueReminderEmail(clients: ClientUpdateDue[]): string {
  const overdue = clients.filter((c) => c.status === "overdue");
  const dueSoon = clients.filter((c) => c.status !== "overdue");
  const total = clients.length;

  const sections: Parameters<typeof buildBrandedUpdateEmail>[0]["sections"] = [];

  if (overdue.length > 0) {
    sections.push({
      label: `${overdue.length} overdue`,
      color: ROSE,
      html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%;">
        ${overdue.map(buildClientRow).join("")}
      </table>`,
    });
  }

  if (dueSoon.length > 0) {
    sections.push({
      label: `${dueSoon.length} due soon`,
      color: TEAL,
      html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%;">
        ${dueSoon.map(buildClientRow).join("")}
      </table>`,
    });
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/hub/reports/updates`
    : null;

  const overdueLine =
    overdue.length > 0
      ? ` &mdash; <strong style="color: ${ROSE};">${overdue.length}</strong> ${overdue.length === 1 ? "is" : "are"} overdue`
      : "";

  return buildBrandedUpdateEmail({
    documentTitle: "Client updates due this week — Eternal Fitness",
    previewText: `${total} client${total !== 1 ? "s" : ""} ${total !== 1 ? "have" : "has"} updates due this week`,
    title: `${total} update${total !== 1 ? "s" : ""} due`,
    subtitle: "Periodic update reminder",
    greetingName: "Esther",
    introHtml:
      `<p style="margin: 0;">You have <strong style="color: ${ROSE};">${total} client${total !== 1 ? "s" : ""}</strong> whose periodic updates are due within the next 7 days${overdueLine}.</p>` +
      (dashboardUrl
        ? `<p style="margin: 12px 0 0;"><a href="${dashboardUrl}" style="color: ${TEAL}; font-weight: 600;">View the updates dashboard &rarr;</a></p>`
        : ""),
    sections,
    footerNote:
      "This is an automated reminder from Eternal Fitness. You receive this because you're the business owner.",
  });
}
