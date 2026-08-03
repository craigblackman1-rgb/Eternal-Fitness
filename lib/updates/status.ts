import type { UpdateStatus } from "@/types";
import type { StatusToken } from "@/lib/hubStatus";

interface StatusMeta {
  label: string;
  token: StatusToken;
}

// Resolved via token directly rather than the shared lookupStatus() —
// "sent"/"draft" already exist in hubStatus.ts's document-status map with
// different colours, so reusing that global string lookup here would
// silently pick up the wrong (document) meaning for the same word.
const META: Record<UpdateStatus, StatusMeta> = {
  draft: { label: "Draft", token: "warning" },
  scheduled: { label: "Scheduled", token: "primary" },
  sending: { label: "Sending…", token: "warning" },
  sent: { label: "Sent", token: "success" },
  failed: { label: "Failed", token: "danger" },
  cancelled: { label: "Cancelled", token: "neutral" },
};

export function updateStatusMeta(status: UpdateStatus): StatusMeta {
  return META[status] ?? META.sent;
}

/** Short, human date+time for a scheduled/sent timestamp. */
export function formatUpdateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}
