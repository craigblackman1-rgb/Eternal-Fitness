"use client";

import Link from "next/link";
import { useDrawerManager } from "./DrawerManager";
import { IconClipboardCheck, IconAlertCircle, IconCheckSquare } from "@/components/icons";
import type { DBBlock } from "@/types";

/* ── NeedsYouQueue — the single ordered queue of things that need Esther.
   EVERY item is derived from real data. No fabrications.
   Items are rendered when the underlying condition is genuinely true.
   The queue is ordered by what blocks the most. */

interface QueueItem {
  id: string;
  dot: "warn" | "due" | "ok" | "muted";
  headline: string;
  subline?: string;
  actionLabel?: string;
  actionDrawerId?: string;
  actionHref?: string;
}

export interface NeedsYouInput {
  pendingTaskCount: number;
  draftBlockCount: number;
  undatedSessionCount: number;
  blockSessionCountMismatch: boolean;
  unpaidBlocks: string[];
  missingBandSet: boolean;
  outstandingActions: string[];
  autoOutstanding: string[];
  effectiveStatus: string;
  dueInfo: { nextDueDate: string | null; daysUntilDue: number | null; status: string | null };
  hasAllDocsSigned: boolean;
  healthFlagsCount: number;
  trainingRulesCount: number;
  clientNumber: number;
  latestBlock: DBBlock | null;
  /** S1 — home-training only. */
  isHomeTraining?: boolean;
  goneQuiet?: boolean;
  lastClientLogAt?: string | null;
  quietDays?: number;
  packageUnderSpecified?: boolean;
  /** Which commercial terms are missing, e.g. ["rate","expiry"]. */
  missingPackageTerms?: string[];
  clientFirstName?: string;
}

/**
 * The queue's items, built once from real data.
 *
 * Exported so the section header's count and the rendered rows come from the
 * SAME list. They used to be computed separately, which is why the header
 * could read "4 things" above two rows: it summed pendingTaskCount (3 tasks
 * = one row) as three, and omitted the band-set item entirely.
 */
export function buildNeedsYouItems(input: NeedsYouInput): QueueItem[] {
  const {
    pendingTaskCount,
    draftBlockCount,
    undatedSessionCount,
    blockSessionCountMismatch,
    unpaidBlocks,
    missingBandSet,
    outstandingActions,
    autoOutstanding,
    clientNumber,
    latestBlock,
    isHomeTraining,
    goneQuiet,
    lastClientLogAt,
    quietDays,
    packageUnderSpecified,
    missingPackageTerms,
    clientFirstName,
  } = input;
  const items: QueueItem[] = [];

  // S1 priority 0 — a home-training client who has stopped self-logging is the
  // most urgent thing on the record: nothing else on the page will show it,
  // because no session is "late", there is just silence. Esther-facing only;
  // nothing is sent to the client from here.
  if (isHomeTraining && goneQuiet) {
    const name = clientFirstName || "This client";
    items.push({
      id: "gone-quiet",
      dot: "due",
      headline: lastClientLogAt
        ? `${name} has not logged a set in over ${quietDays ?? 7} days`
        : `${name} has never logged a set`,
      subline: lastClientLogAt
        ? `Last self-logged set ${new Date(lastClientLogAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. Home training is self-logged, so silence is the only signal.`
        : "Home training is self-logged, so nothing has come through the portal at all.",
      actionLabel: "Write an update",
      actionHref: `/hub/clients/${clientNumber}/updates/new`,
    });
  }

  // Priority 1: Open tasks
  if (pendingTaskCount > 0) {
    items.push({
      id: "tasks",
      dot: "warn",
      headline: `${pendingTaskCount} open task${pendingTaskCount === 1 ? "" : "s"}`,
      actionLabel: "Open tasks",
      actionDrawerId: "dw-comms",
    });
  }

  // Priority 2: Draft blocks that can't run
  if (draftBlockCount > 0) {
    items.push({
      id: "draft-blocks",
      dot: "warn",
      headline: `${draftBlockCount} block${draftBlockCount === 1 ? "" : "s"} still draft`,
      subline: "Cannot run until approved",
      actionLabel: "Review",
      actionHref: latestBlock ? `/hub/clients/${clientNumber}/blocks/${latestBlock.id}` : undefined,
    });
  }

  // Priority 3: Sessions with no workout assigned (gap sessions in current block)
  // This is derived from undated sessions count
  if (undatedSessionCount > 0) {
    items.push({
      id: "undated-sessions",
      dot: "warn",
      headline: `${undatedSessionCount} session${undatedSessionCount === 1 ? "" : "s"} with no date set`,
      actionLabel: "Set dates",
      actionHref: latestBlock ? `/hub/clients/${clientNumber}/blocks/${latestBlock.id}` : undefined,
    });
  }

  // Priority 4: Block session count disagrees with typed count
  if (blockSessionCountMismatch) {
    items.push({
      id: "count-mismatch",
      dot: "warn",
      headline: "Session counts disagree",
      subline: "The typed count doesn't match what's been completed",
      actionLabel: "Check",
      actionDrawerId: "dw-arrangement",
    });
  }

  // Priority 5: Unpaid blocks
  if (unpaidBlocks.length > 0) {
    items.push({
      id: "unpaid",
      dot: "due",
      headline: `${unpaidBlocks[0]} is unpaid`,
      subline: unpaidBlocks.length > 1 ? `${unpaidBlocks.length - 1} more unpaid` : undefined,
      actionLabel: "Raise invoice",
      actionHref: "/hub/cashflow/invoices",
    });
  }

  // Priority 6: Missing band set on a band block
  if (missingBandSet) {
    items.push({
      id: "band-set",
      dot: "muted",
      headline: "No band set chosen",
      actionLabel: "Choose one",
      actionDrawerId: "dw-arrangement",
    });
  }

  // Priority 7: Outstanding compliance actions
  if (autoOutstanding.length > 0) {
    for (const action of autoOutstanding) {
      items.push({
        id: `auto-${action.slice(0, 30)}`,
        dot: "warn",
        headline: action,
      });
    }
  }

  // Priority 8: Manual outstanding actions
  if (outstandingActions.length > 0) {
    for (const action of outstandingActions) {
      items.push({
        id: `manual-${action.slice(0, 30)}`,
        dot: "warn",
        headline: action,
      });
    }
  }

  // S1 priority 9 — a package that exists in name only. Distinct from
  // "unpaid": the package is named but has no agreed rate or expiry, so
  // nothing can be invoiced or chased against it.
  if (packageUnderSpecified) {
    const missing = missingPackageTerms ?? [];
    const missingLabel =
      missing.length === 2 ? "rate or expiry" : missing.length === 1 ? `${missing[0]}` : "terms";
    items.push({
      id: "package-underspecified",
      dot: "muted",
      headline: `The package has no ${missingLabel} set`,
      subline: "It is named, but nothing can be invoiced or chased against it.",
      actionLabel: "Set it up",
      actionDrawerId: "dw-arrangement",
    });
  }

  return items;
}

export function NeedsYouQueue(props: NeedsYouInput) {
  const { dueInfo, hasAllDocsSigned, healthFlagsCount } = props;
  const { openDrawer } = useDrawerManager();
  const items = buildNeedsYouItems(props);

  // Quiet row at the bottom — everything is fine
  const hasIssues = items.length > 0;
  const quietText = (() => {
    const parts: string[] = [];
    if (dueInfo.nextDueDate) {
      const dueDate = new Date(dueInfo.nextDueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      parts.push(`next training update due ${dueDate}`);
    }
    if (hasAllDocsSigned) parts.push("documents are all signed");
    if (healthFlagsCount === 0) parts.push("health record is up to date");
    if (parts.length === 0) return null;
    return `Nothing else outstanding. ${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)}${parts.length > 1 ? ", " + parts.slice(1).join(", and ") : ""}.`;
  })();

  const dotClasses: Record<string, string> = {
    warn: "bg-[var(--status-warning)]",
    due: "bg-rose",
    ok: "bg-[var(--status-success)]",
    muted: "bg-[var(--color-muted)]",
  };

  return (
    <div className="px-4 pb-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 py-2 px-3 rounded-[10px] border border-transparent transition-colors duration-100 hover:bg-[var(--hub-hover)] hover:border-[var(--hub-border)]"
        >
          <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${dotClasses[item.dot]}`} />
          <span className="min-w-0 flex-1 text-[13.5px] text-[var(--color-ink)]">
            <b className="font-semibold">{item.headline}</b>
            {item.subline && (
              <span className="block text-xs text-[var(--color-muted)] mt-px">{item.subline}</span>
            )}
          </span>
          {item.actionLabel && (
            <span className="shrink-0">
              {item.actionHref ? (
                <Link
                  href={item.actionHref}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--hub-field-border)] bg-white hover:bg-[var(--hub-hover)] text-foreground px-2.5 py-1 min-h-[30px] font-[inherit] text-xs font-semibold cursor-pointer transition-colors no-underline"
                >
                  {item.actionLabel}
                </Link>
              ) : (
                <button
                  onClick={item.actionDrawerId ? (e) => openDrawer(item.actionDrawerId!, e.currentTarget) : undefined}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--hub-field-border)] bg-white hover:bg-[var(--hub-hover)] text-foreground px-2.5 py-1 min-h-[30px] font-[inherit] text-xs font-semibold cursor-pointer transition-colors"
                >
                  {item.actionLabel}
                </button>
              )}
            </span>
          )}
        </div>
      ))}

      {!hasIssues && quietText && (
        <div className="flex items-center gap-2.5 py-2 px-3 text-[13px] text-[var(--color-muted)]">
          <span className="w-[7px] h-[7px] rounded-full bg-[var(--status-success)]" />
          <span>{quietText}</span>
        </div>
      )}
    </div>
  );
}
