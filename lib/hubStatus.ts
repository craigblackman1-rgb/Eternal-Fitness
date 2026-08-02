import type { DBClientComplianceStatus, DocumentStatus, ClearanceStatus } from "@/types";

export type StatusToken = "primary" | "success" | "warning" | "danger" | "neutral";

export interface StatusClasses {
  bg: string;
  text: string;
  border: string;
}

export interface StatusLookup {
  token: StatusToken;
  label: string;
}

// Text uses the darker --status-*-text variant where one exists — the base
// --status-* hue only clears the 3:1 non-text threshold (fine for icons/
// borders), not the 4.5:1 text threshold badge labels need. See globals.css.
const statusClassMap: Record<StatusToken, StatusClasses> = {
  primary: {
    bg: "bg-[var(--status-primary-bg)]",
    text: "text-[var(--status-primary-text)]",
    border: "border-[var(--status-primary-border)]",
  },
  success: {
    bg: "bg-[var(--status-success-bg)]",
    text: "text-[var(--status-success-text)]",
    border: "border-[var(--status-success-border)]",
  },
  warning: {
    bg: "bg-[var(--status-warning-bg)]",
    text: "text-[var(--status-warning-text)]",
    border: "border-[var(--status-warning-border)]",
  },
  danger: {
    bg: "bg-[var(--status-danger-bg)]",
    text: "text-[var(--status-danger)]",
    border: "border-[var(--status-danger-border)]",
  },
  neutral: {
    bg: "bg-[var(--status-neutral-bg)]",
    text: "text-[var(--status-neutral)]",
    border: "border-[var(--status-neutral-border)]",
  },
};

const blockStatusMap: Record<string, StatusLookup> = {
  on_track: { token: "success", label: "On Track" },
  draft:    { token: "neutral", label: "Draft" },
  active:   { token: "primary", label: "Active" },
  approved: { token: "success", label: "Approved" },
  complete: { token: "success", label: "Complete" },
  review:   { token: "warning", label: "Review" },
  archived: { token: "neutral", label: "Archived" },
};

const scheduleStatusMap: Record<string, StatusLookup> = {
  draft:    { token: "neutral", label: "To Do" },
  approved: { token: "primary", label: "Scheduled" },
  active:   { token: "warning", label: "In Progress" },
  complete: { token: "success", label: "Done" },
};

const complianceStatusMap: Record<DBClientComplianceStatus, StatusLookup> = {
  do_not_train:    { token: "danger",  label: "Do Not Train" },
  pending_medical: { token: "warning", label: "Pending Clearance" },
  action_needed:   { token: "warning", label: "Action Needed" },
  clear:           { token: "success", label: "Clear" },
};

const documentStatusMap: Record<DocumentStatus, StatusLookup> = {
  draft:        { token: "neutral", label: "Draft" },
  sent:         { token: "warning", label: "Sent" },
  received:     { token: "primary", label: "Received" },
  signed:       { token: "success", label: "Signed" },
  expired:      { token: "danger",  label: "Expired" },
  needs_update: { token: "warning", label: "Needs Update" },
  superseded:   { token: "neutral", label: "Superseded" },
};

const keywordStatusMap: Record<string, StatusLookup> = {
  published:       { token: "success", label: "Published" },
  needs_writing:   { token: "warning", label: "Needs Writing" },
  needs_updating:  { token: "danger",  label: "Needs Updating" },
  // Legacy values — kept so any row not yet migrated still renders sensibly.
  pending:         { token: "neutral", label: "Pending" },
  reviewed:        { token: "success", label: "Reviewed" },
  needs_rewrite:   { token: "warning", label: "Needs Rewrite" },
};

const invoiceStatusMap: Record<string, StatusLookup> = {
  draft:   { token: "neutral", label: "Draft" },
  sent:    { token: "warning", label: "Sent" },
  paid:    { token: "success", label: "Paid" },
  overdue: { token: "danger",  label: "Overdue" },
  void:    { token: "neutral", label: "Void" },
};

const clearanceStatusMap: Record<ClearanceStatus, StatusLookup> = {
  CLEARED:                { token: "success", label: "Cleared" },
  PENDING:                { token: "warning", label: "Pending" },
  "NOT YET REQUESTED":    { token: "neutral", label: "Not Yet Requested" },
  "NOT REQUIRED":         { token: "neutral", label: "Not Required" },
};

export function getStatusClasses(token: StatusToken): StatusClasses {
  return statusClassMap[token];
}

export function getBlockStatus(status: string): StatusLookup | null {
  return blockStatusMap[status] ?? null;
}

export function getScheduleStatus(status: string): StatusLookup | null {
  return scheduleStatusMap[status] ?? null;
}

export function getComplianceStatus(status: DBClientComplianceStatus): StatusLookup {
  return complianceStatusMap[status];
}

export function lookupStatus(status: string): StatusLookup | null {
  return (
    blockStatusMap[status] ??
    complianceStatusMap[status as DBClientComplianceStatus] ??
    documentStatusMap[status as DocumentStatus] ??
    invoiceStatusMap[status] ??
    clearanceStatusMap[status as ClearanceStatus] ??
    keywordStatusMap[status] ??
    null
  );
}
