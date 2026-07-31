import { cn } from "@/lib/utils";

interface HubCardProps {
  children: React.ReactNode;
  className?: string;
  /** Padded content area. Set to false for full-bleed content (tables, lists). */
  padded?: boolean;
}

/**
 * Unified card for the Trainer Hub. Replaces both shadcn <Card> and
 * inline `div` patterns. Every card in the hub should use this component.
 */
export function HubCard({ children, className, padded = true }: HubCardProps) {
  return (
    <div className={cn("bg-[var(--hub-card)] rounded-[16px] border border-[var(--hub-border)] shadow-sm", className)}>
      {padded ? <div className="p-5">{children}</div> : children}
    </div>
  );
}
