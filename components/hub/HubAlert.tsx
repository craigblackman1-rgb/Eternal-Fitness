import { cn } from "@/lib/utils";
import { IconTriangleAlert, IconAlertCircle, IconCheckCircle } from "@/components/icons";

type Severity = "danger" | "warning" | "info" | "success";

interface HubAlertProps {
  severity: Severity;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Alert strip for the Trainer Hub, matching the `.hub-alert`/`.alert` pattern
 * in the ef-control-hub mockups: tinted background, thin border, ink title —
 * never a solid loud banner.
 */
export function HubAlert({ severity, title, children, action, className }: HubAlertProps) {
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
      bg: "bg-[var(--hub-hover)]",
      icon: "text-slate",
      border: "border-[var(--hub-border)]",
      Icon: IconAlertCircle,
    },
  };
  const { bg, icon, border, Icon } = styles[severity];

  return (
    <div role="status" className={cn("rounded-lg border px-4 py-3.5", bg, border, className)}>
      <div className="flex items-start gap-2.5">
        <Icon className={cn("w-[18px] h-[18px] shrink-0 mt-0.5", icon)} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">{title}</p>
          {children && <div className="text-sm text-foreground/75 mt-0.5">{children}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
