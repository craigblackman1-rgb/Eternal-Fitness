"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { IconTriangleAlert, IconAlertCircle, IconCheckCircle } from "@/components/icons";

type Severity = "danger" | "warning" | "info" | "success";

interface HubAlertProps {
  severity: Severity;
  title: string;
  /** Always-visible line under the title — stays shown even while collapsed. */
  summary?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Hides `children` behind a click, header + summary stay visible. Closed by default. */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

/**
 * Alert strip for the Trainer Hub, matching the `.hub-alert`/`.alert` pattern
 * in the ef-control-hub mockups: tinted background, thin border, ink title —
 * never a solid loud banner. `collapsible` is opt-in per call site (CR-EF-076)
 * — every existing usage keeps its current always-expanded behaviour.
 */
export function HubAlert({ severity, title, summary, children, action, className, collapsible = false, defaultOpen = false }: HubAlertProps) {
  const [open, setOpen] = useState(defaultOpen);
  const styles: Record<Severity, { bg: string; icon: string; border: string; Icon: typeof IconAlertCircle }> = {
    danger: {
      bg: "bg-[var(--status-danger-bg)]",
      icon: "text-[var(--status-danger)]",
      border: "border-[var(--status-danger-border)]",
      Icon: IconAlertCircle,
    },
    warning: {
      bg: "bg-[var(--status-warning-bg)]",
      icon: "text-[var(--status-warning)]",
      border: "border-[var(--status-warning-border)]",
      Icon: IconTriangleAlert,
    },
    success: {
      bg: "bg-[var(--status-success-bg)]",
      icon: "text-[var(--status-success)]",
      border: "border-[var(--status-success-border)]",
      Icon: IconCheckCircle,
    },
    info: {
      bg: "bg-[var(--status-primary-bg)]",
      icon: "text-[var(--status-primary)]",
      border: "border-[var(--status-primary-border)]",
      Icon: IconAlertCircle,
    },
  };
  const { bg, icon, border, Icon } = styles[severity];

  return (
    <div role="status" className={cn("rounded-lg border px-4 py-3.5", bg, border, className)}>
      <div className="flex items-start gap-2.5">
        <Icon className={cn("w-[18px] h-[18px] shrink-0 mt-0.5", icon)} />
        <div className="flex-1 min-w-0">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="flex items-center gap-2 w-full text-left"
            >
              <p className="font-bold text-sm text-foreground flex-1">{title}</p>
              <svg
                className={cn("w-4 h-4 shrink-0 transition-transform", icon, open && "rotate-180")}
                viewBox="0 0 16 16"
                fill="none"
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <p className="font-bold text-sm text-foreground">{title}</p>
          )}
          {summary && <div className="text-sm text-foreground/75 mt-0.5">{summary}</div>}
          {(!collapsible || open) && children && <div className="text-sm text-foreground/75 mt-1.5">{children}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
