import { cn } from "@/lib/utils";

interface HubCardHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  /** Semantic color for the icon badge. Defaults to "rose". */
  color?: "rose" | "teal" | "navy" | "slate" | "amber";
  className?: string;
  /** Remove bottom padding when card content is immediately adjacent. */
  noBottomPadding?: boolean;
  /** Add a 1px divider under the header. Off by default — preserves existing usage across the hub. */
  divider?: boolean;
}

const badgeColors: Record<string, { bg: string; text: string }> = {
  rose: { bg: "bg-rose/10", text: "text-rose" },
  teal: { bg: "bg-teal/10", text: "text-teal" },
  navy: { bg: "bg-dark-navy/10", text: "text-dark-navy" },
  slate: { bg: "bg-slate/10", text: "text-slate" },
  amber: { bg: "bg-amber/10", text: "text-[var(--color-amber-text)]" },
};

/**
 * Card header with optional icon badge, title, subtitle, and action.
 * Use inside <HubCard> — not inside shadcn <Card>.
 */
export function HubCardHeader({ icon, title, subtitle, action, color = "rose", className, noBottomPadding, divider }: HubCardHeaderProps) {
  const c = badgeColors[color];
  return (
    <div className={cn("flex flex-row items-start justify-between gap-3 pb-4", noBottomPadding ? "pb-0" : "", divider ? "border-b border-[var(--hub-border)]" : "", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className={cn("w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0", c.bg, c.text)}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
