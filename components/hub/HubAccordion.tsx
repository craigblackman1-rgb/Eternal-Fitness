"use client";

import { cn } from "@/lib/utils";

interface HubAccordionItemProps {
  /** Summary content rendered inside the <summary>. */
  children: React.ReactNode;
  /** Content revealed when open. */
  panel: React.ReactNode;
  /** Start open. */
  defaultOpen?: boolean;
  /** Disabled state — header is muted, not interactive. */
  disabled?: boolean;
  className?: string;
}

/**
 * A single collapsible section. Uses native <details>/<summary> so it works
 * without JS, is keyboard-operable for free, and prints expanded.
 *
 * Contract (CR-EF-039 §1):
 *  - min-height: 48px (52px below 620px for touch)
 *  - Chevron: 16px right-pointing, rotate(90deg) when open
 *  - Divider: 1px var(--hub-border) between items and between trigger+panel
 *  - Transition: 160ms ease on chevron rotate + 3px panel fade-in
 *  - Open header fill: var(--hub-hover)
 *  - Radius: var(--r-nested) — 10px
 */
export function HubAccordionItem({ children, panel, defaultOpen, disabled, className }: HubAccordionItemProps) {
  return (
    <details
      open={defaultOpen}
      className={cn("hub-acc-item", disabled && "is-disabled", className)}
    >
      <summary
        {...(disabled ? { tabIndex: -1, "aria-disabled": true as const } : {})}
      >
        <svg
          className="hub-acc-chev"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        {children}
      </summary>
      <div className="hub-acc-panel">{panel}</div>
    </details>
  );
}

interface HubAccordionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container for one or more <HubAccordionItem>s. When standing alone on the
 * canvas, wrap in a HubCard (the accordion drops its own border/radius inside
 * a card via the CSS rule `.hub-card-b > .hub-acc`).
 */
export function HubAccordion({ children, className }: HubAccordionProps) {
  return <div className={cn("hub-acc", className)}>{children}</div>;
}
