import Link from "next/link";
import { cn } from "@/lib/utils";

interface HubQuickAction {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface HubQuickActionsProps {
  actions: HubQuickAction[];
  className?: string;
  /** Flat list style with 1px dividers between actions (matches the client-detail template). */
  divider?: boolean;
}

/**
 * Quick actions list — consistent icon + label pattern for sidebar
 * and inline action panels.
 */
export function HubQuickActions({ actions, className, divider = false }: HubQuickActionsProps) {
  return (
    <div className={cn(divider ? "flex flex-col" : "space-y-0.5", className)}>
      {actions.map((action, i) => (
        <Link
          key={action.href}
          href={action.href}
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
