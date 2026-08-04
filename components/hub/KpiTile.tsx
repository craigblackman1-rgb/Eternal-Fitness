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
}

/**
 * Stat card — single anatomy for every KPI band in the Hub (dashboard,
 * tracker, agreements). Horizontal: icon badge | label-over-value | trend.
 */
export function KpiTile({ icon, label, value, trend, trendUp, statusToken = "primary", className }: KpiTileProps) {
  const c = getStatusClasses(statusToken);

  return (
    <div className={cn("bg-[var(--hub-card)] rounded-[16px] border border-[var(--hub-border)] shadow-sm p-4 flex items-center gap-3.5", className)}>
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", c.bg, c.text)}>
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
              : "bg-[var(--status-success-bg)] text-[var(--status-success)]",
          )}
        >
          {trendUp === false ? "↓" : "↑"}{trend}
        </span>
      )}
    </div>
  );
}
