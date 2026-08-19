import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/types";

interface SessionStatusPillProps {
  status: SessionStatus;
  className?: string;
}

interface SessionStatusConfig {
  label: string;
  color: string;
  background: string;
  border: string;
  icon: ReactNode;
}

const CONFIG: Record<SessionStatus, SessionStatusConfig> = {
  planned: {
    label: "Planned",
    color: "#525A61",
    background: "rgba(82,90,97,.10)",
    border: "rgba(82,90,97,.20)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width={11} height={11} className="shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="5" opacity=".5" />
      </svg>
    ),
  },
  scheduled: {
    label: "Scheduled",
    color: "#C1839F",
    background: "rgba(193,131,159,.10)",
    border: "rgba(193,131,159,.20)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width={11} height={11} className="shrink-0" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  in_progress: {
    label: "In progress",
    color: "#B08A3E",
    background: "#F7EFDD",
    border: "rgba(176,138,62,.20)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width={11} height={11} className="shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  completed: {
    label: "Completed",
    color: "#087E8B",
    background: "rgba(8,126,139,.10)",
    border: "rgba(8,126,139,.20)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" width={11} height={11} className="shrink-0" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  cancelled: {
    label: "Cancelled",
    color: "#8A4E63",
    background: "rgba(138,78,99,.10)",
    border: "rgba(138,78,99,.20)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" width={11} height={11} className="shrink-0" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    ),
  },
};

/** The shared 5-state colour contract — used by the pill and by the schedule
 *  month view's colour-coded chips so the two never drift apart. */
export function sessionStatusColors(status: SessionStatus): Pick<SessionStatusConfig, "color" | "background" | "border"> {
  const cfg = CONFIG[status];
  return { color: cfg.color, background: cfg.background, border: cfg.border };
}

export function SessionStatusPill({ status, className }: SessionStatusPillProps) {
  const cfg = CONFIG[status];
  return (
    <span
      className={cn("inline-flex items-center whitespace-nowrap rounded-full border", className)}
      style={{
        gap: 5,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
        color: cfg.color,
        backgroundColor: cfg.background,
        borderColor: cfg.border,
      }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
