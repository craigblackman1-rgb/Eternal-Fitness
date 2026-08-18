"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HubCard } from "./HubCard";

interface HubAccordionSectionProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  /** Semantic color for the icon badge. Defaults to "rose". */
  color?: "rose" | "teal" | "navy" | "slate" | "amber";
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
};

/**
 * The one hub-wide accordion — a HubCard-wrapped, collapsible information
 * section with an icon+title+subtitle header and an optional "View all"
 * footer. Closed by default; the caller decides per-section which one
 * (usually just the first) starts open via `defaultOpen`.
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
  const [open, setOpen] = useState(defaultOpen);
  const c = badgeColors[color];

  return (
    <HubCard padded={false} className={className}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[var(--hub-hover)]",
          open && "border-b border-[var(--hub-border)]",
        )}
      >
        {icon && (
          <div className={cn("w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0", c.bg, c.text)}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-semibold text-foreground leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <svg
          className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")}
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
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
      )}
    </HubCard>
  );
}
