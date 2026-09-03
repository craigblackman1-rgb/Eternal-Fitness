import { cn } from "@/lib/utils";
import { getStatusClasses, type StatusToken } from "@/lib/hubStatus";

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  statusToken?: StatusToken;
  className?: string;
  /** When set, the tile renders as a button (e.g. the medical tracker's click-to-filter KPIs). */
  onClick?: () => void;
  /** Selected state for interactive tiles. */
  active?: boolean;
}

/**
 * Stat card — single anatomy for every KPI band in the Hub (dashboard,
 * tracker, agreements). Horizontal: icon badge | label-over-value | trend.
 * Pass `onClick` to make it an interactive filter tile (with `active` for the
 * selected state); omit it for a plain, non-interactive stat card.
 */
export function KpiTile({ icon, label, value, trend, trendUp, statusToken = "primary", className, onClick, active }: KpiTileProps) {
  const c = getStatusClasses(statusToken);
  const interactive = typeof onClick === "function";

  const classes = cn(
    "bg-[var(--hub-card)] border p-4 flex items-center gap-3.5 shadow-sm",
    interactive && "text-left font-[inherit] cursor-pointer transition-colors hover:bg-[var(--hub-hover)] hover:border-[var(--hub-field-border)]",
    active ? "border-[var(--color-rose)] shadow-[0_0_0_3px_rgba(193,131,159,.15)]" : "border-[var(--hub-border)]",
    className,
  );

  const content = (
    <>
      <div className={cn("w-11 h-11 flex items-center justify-center shrink-0", c.bg, c.text)} style={{ borderRadius: "var(--r-control)" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums text-foreground leading-tight">{value}</p>
      </div>
      {trend && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-semibold leading-none shrink-0",
            trendUp === false
              ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
              : "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
          )}
        >
          {trendUp === false ? "↓" : "↑"}{trend}
        </span>
      )}
    </>
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={classes} style={{ borderRadius: "var(--r-surface)" }}>
        {content}
      </button>
    );
  }

  return <div className={classes} style={{ borderRadius: "var(--r-surface)" }}>{content}</div>;
}
