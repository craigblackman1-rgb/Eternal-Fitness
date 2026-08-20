import Link from "next/link";
import { cn } from "@/lib/utils";

interface HubQuickAction {
  /** Either href (navigates) or onClick (e.g. opens a drawer/dialog) — exactly one. */
  href?: string;
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
  /** Bar variant only — fills the button as the primary action. At most one per bar. */
  primary?: boolean;
  /** Bar variant only — small count pill after the label. Omit or 0 hides it. */
  badgeCount?: number;
}

interface HubQuickActionsProps {
  actions: HubQuickAction[];
  className?: string;
  /** Flat list style with 1px dividers between actions (matches the client-detail template). */
  divider?: boolean;
  /** Horizontal pill-button row, top-left of a page, above the page header. */
  variant?: "list" | "bar";
}

/**
 * Quick actions — consistent icon + label pattern across the hub.
 * `variant="bar"` is the one shared top-left treatment every major surface
 * uses (dashboard, client detail, block, schedule); `list`/`divider` remain
 * for panels that still show actions inside a card rather than the bar.
 */
export function HubQuickActions({ actions, className, divider = false, variant = "list" }: HubQuickActionsProps) {
  if (variant === "bar") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mr-0.5">
          Quick actions
        </span>
        {actions.map((action) => {
          const key = action.href ?? action.label;
          const classes = cn(
            "inline-flex items-center gap-2 min-h-10 px-3.5 rounded-lg border text-[13px] font-semibold transition-colors",
            action.primary
              ? "bg-rose text-white border-rose hover:bg-rose/90"
              : "bg-[var(--hub-card)] text-foreground border-[var(--hub-field-border)] hover:border-rose hover:bg-[var(--status-primary-bg)]",
          );
          const content = (
            <>
              <span className={cn("w-4 h-4 shrink-0", action.primary ? "text-white" : "text-rose")}>{action.icon}</span>
              {action.label}
              {!!action.badgeCount && (
                <span className="inline-grid place-items-center min-w-[18px] h-[18px] px-[5px] rounded-full border text-[11px] font-bold leading-none tabular-nums bg-[var(--status-danger-bg)] text-[var(--status-danger)] border-[var(--status-danger-border)]">
                  {action.badgeCount}
                </span>
              )}
            </>
          );
          return action.href ? (
            <Link key={key} href={action.href} className={classes}>
              {content}
            </Link>
          ) : (
            <button key={key} type="button" onClick={action.onClick} className={classes}>
              {content}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn(divider ? "flex flex-col" : "space-y-0.5", className)}>
      {actions.map((action, i) => (
        <Link
          key={action.href}
          href={action.href as string}
          className={cn(
            "text-sm font-medium flex items-center gap-2.5 transition-colors",
            divider
              ? "group py-[9px] text-foreground hover:text-rose"
              : "rounded-lg px-2.5 py-2 text-foreground hover:bg-[var(--hub-hover)]",
            divider && i > 0 && "border-t border-[var(--hub-border)]",
          )}
        >
          <span className={cn("w-4 h-4 shrink-0 text-muted-foreground", divider && "group-hover:text-rose")}>{action.icon}</span>
          {action.label}
        </Link>
      ))}
    </div>
  );
}
