"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { HubAccordion, HubAccordionItem } from "./HubAccordion";

interface HubAccordionSectionProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  /** Semantic color for the icon badge. Defaults to "rose". */
  color?: "rose" | "teal" | "navy" | "slate" | "amber" | "neutral" | "danger";
  children: React.ReactNode;
  className?: string;
  /** Starts open. Callers set this explicitly per section — never inferred from render order. */
  defaultOpen?: boolean;
  /** Optional "View all →" footer link, shown only while open. */
  viewAllHref?: string;
  viewAllLabel?: string;
}

const badgeColors: Record<string, { bg: string; text: string }> = {
  rose: { bg: "bg-rose/10", text: "text-rose" },
  teal: { bg: "bg-teal/10", text: "text-teal" },
  navy: { bg: "bg-dark-navy/10", text: "text-dark-navy" },
  slate: { bg: "bg-slate/10", text: "text-slate" },
  amber: { bg: "bg-amber/10", text: "text-[var(--color-amber-text)]" },
  neutral: { bg: "bg-[var(--hub-hover)]", text: "text-muted-foreground" },
  danger: { bg: "bg-[var(--status-danger-bg)]", text: "text-[var(--status-danger)]" },
};

/**
 * The one hub-wide accordion — a card-wrapped, collapsible information
 * section with an icon+title+subtitle header and an optional "View all"
 * footer. Closed by default; the caller decides per-section which one
 * (usually just the first) starts open via `defaultOpen`.
 *
 * Now built on the canonical HubAccordion/HubAccordionItem primitives
 * (CR-EF-039 §1) — <details>/<summary> for no-JS, keyboard, and print.
 */
export function HubAccordionSection({
  icon,
  title,
  subtitle,
  color = "rose",
  children,
  className,
  defaultOpen = false,
  viewAllHref,
  viewAllLabel = "View all",
}: HubAccordionSectionProps) {
  const c = badgeColors[color];

  const summary = (
    <>
      {icon && (
        <div className={cn("w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0", c.bg, c.text)}>
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="text-[13px] font-semibold text-foreground leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </>
  );

  const panel = (
    <>
      {children}
      {viewAllHref && (
        <div className="flex justify-end px-5 py-2.5 border-t border-[var(--hub-border)] bg-[var(--hub-hover)]">
          <Link href={viewAllHref} className="text-xs font-semibold text-rose hover:underline">
            {viewAllLabel} →
          </Link>
        </div>
      )}
    </>
  );

  return (
    <HubAccordion className={className}>
      <HubAccordionItem defaultOpen={defaultOpen} panel={panel}>
        {summary}
      </HubAccordionItem>
    </HubAccordion>
  );
}
