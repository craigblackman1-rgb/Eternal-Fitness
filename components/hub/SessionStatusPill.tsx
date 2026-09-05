import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/types";

interface SessionStatusPillProps {
  status: SessionStatus;
  /** CR-EF-037 — a scheduled session with no confirmed_at renders as
   *  "Unconfirmed" with a dashed outline modifier (not a sixth state). */
  unconfirmed?: boolean;
  /** CR-EF-037 — derived flag: completed_at date ≠ scheduled_for date. */
  offDay?: boolean;
  /** CR-EF-037 — derived flag: a lower session number completed after a higher one. */
  outOfSequence?: boolean;
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
    color: "#464D54",
    background: "rgba(82,90,97,.10)",
    border: "rgba(82,90,97,.26)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width={11} height={11} className="shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="5" opacity=".55" />
      </svg>
    ),
  },
  scheduled: {
    label: "Scheduled",
    color: "#8A5570",
    background: "rgba(193,131,159,.12)",
    border: "rgba(193,131,159,.34)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width={11} height={11} className="shrink-0" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  in_progress: {
    label: "In progress",
    color: "#8A6A2E",
    background: "#F7EFDD",
    border: "rgba(176,138,62,.34)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width={11} height={11} className="shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  completed: {
    label: "Completed",
    color: "#066A75",
    background: "rgba(8,126,139,.10)",
    border: "rgba(8,126,139,.28)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" width={11} height={11} className="shrink-0" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  cancelled: {
    label: "Cancelled",
    color: "#7A4257",
    background: "rgba(138,78,99,.10)",
    border: "rgba(138,78,99,.28)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" width={11} height={11} className="shrink-0" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    ),
  },
};

const UNCONFIRMED_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width={11} height={11} className="shrink-0" aria-hidden="true">
    <path d="M12 8v5l3 2" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const WARNING_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width={11} height={11} className="shrink-0" aria-hidden="true">
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

const SEQ_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width={11} height={11} className="shrink-0" aria-hidden="true">
    <path d="M7 7h10M7 12h10M7 17h6" />
    <path d="m17 15 3 3-3 3" />
  </svg>
);

/** The shared 5-state colour contract — used by the pill and by the schedule
 *  month view's colour-coded chips so the two never drift apart. */
export function sessionStatusColors(status: SessionStatus): Pick<SessionStatusConfig, "color" | "background" | "border"> {
  const cfg = CONFIG[status];
  return { color: cfg.color, background: cfg.background, border: cfg.border };
}

/** Flag pill for derived indicators (off-day, out-of-sequence). Sits beside a
 *  state pill, never replaces it. */
export function FlagPill({ icon, label, title, className }: { icon: ReactNode; label: string; title?: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center whitespace-nowrap rounded-pill border px-2 py-0.5 text-[11.5px] font-bold", className)}
      style={{
        gap: 5,
        color: "#7A4257",
        background: "rgba(138,78,99,.09)",
        borderColor: "rgba(138,78,99,.3)",
      }}
      title={title}
    >
      {icon}
      {label}
    </span>
  );
}

export function SessionStatusPill({ status, unconfirmed, offDay, outOfSequence, className }: SessionStatusPillProps) {
  const cfg = CONFIG[status];

  if (unconfirmed) {
    return (
      <span
        className={cn("inline-flex items-center whitespace-nowrap rounded-pill border", className)}
        style={{
          gap: 5,
          padding: "2px 10px",
          fontSize: 12,
          fontWeight: 600,
          color: "#8A6A2E",
          background: "transparent",
          borderColor: "rgba(176,138,62,.55)",
          borderStyle: "dashed",
        }}
      >
        {UNCONFIRMED_ICON}
        Unconfirmed
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="inline-flex items-center whitespace-nowrap rounded-pill border"
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
      {offDay && (
        <FlagPill icon={WARNING_ICON} label="Off-day" title="Completed on a different day than booked" />
      )}
      {outOfSequence && (
        <FlagPill icon={SEQ_ICON} label="Out of sequence" title="Completed after a later session in the same block" />
      )}
    </span>
  );
}
