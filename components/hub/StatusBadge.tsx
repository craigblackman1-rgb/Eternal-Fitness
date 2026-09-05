import { cn } from "@/lib/utils";
import { lookupStatus, getStatusClasses, type StatusToken } from "@/lib/hubStatus";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const lookup = lookupStatus(status);
  if (!lookup) return null;
  return <TokenPill token={lookup.token} label={lookup.label} className={className} />;
}

/**
 * Same pill as StatusBadge, but resolved from an explicit token/label pair
 * instead of a global status-string lookup — for status domains (e.g.
 * update-email status) whose string values collide with an unrelated
 * domain already registered in lib/hubStatus.ts's lookupStatus() chain.
 */
export function TokenPill({ token, label, className }: { token: StatusToken; label: string; className?: string }) {
  const c = getStatusClasses(token);
  return (
    <span className={cn(
      "inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-semibold",
      c.bg,
      c.text,
      c.border,
      className,
    )}>
      {label}
    </span>
  );
}
