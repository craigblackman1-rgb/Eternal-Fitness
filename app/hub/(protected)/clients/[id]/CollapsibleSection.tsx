"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * Bordered accordion card for the client-detail Profile tab, matching the
 * `.collapsible-section` pattern in hub-client-detail-refined.html: a 1px
 * border card with a 36px icon chip, title, chevron, and an expandable body.
 */
export function CollapsibleSection({ title, icon, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--hub-hover)] transition-colors"
      >
        {icon && (
          <span className="w-9 h-9 rounded-lg bg-[var(--hub-hover)] text-muted-foreground flex items-center justify-center shrink-0">
            {icon}
          </span>
        )}
        <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
        <svg
          className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 border-t border-[var(--hub-border)]">{children}</div>}
    </div>
  );
}
