import type { DBClient } from "@/types";

export function buildComplianceSection(client: DBClient): string {
  const parts: string[] = [];

  if (client.gp_letter_status && client.gp_letter_status !== "not_required") {
    if (client.gp_letter_status === "received" && client.gp_letter_received_date) {
      parts.push(`GP letter: received (${client.gp_letter_received_date})`);
    } else {
      parts.push(`GP letter: ${client.gp_letter_status}`);
      if (client.gp_letter_requested_date) {
        parts.push(`  Requested: ${client.gp_letter_requested_date}`);
      }
    }
  }

  if (client.annual_review_due_date) {
    parts.push(`Annual review due: ${client.annual_review_due_date}`);
  }

  if (client.clearance_from) {
    let line = `Medical clearance from: ${client.clearance_from}`;
    if (client.specialist_name) line += ` (${client.specialist_name})`;
    parts.push(line);
  }

  if (parts.length === 0) return "No compliance flags for this client.";
  return parts.join("\n");
}
