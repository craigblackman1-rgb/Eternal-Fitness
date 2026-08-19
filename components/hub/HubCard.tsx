import { cn } from "@/lib/utils";

interface HubCardProps {
  children: React.ReactNode;
  className?: string;
  /** Padded content area. Set to false for full-bleed content (tables, lists). */
  padded?: boolean;
  /**
   * Fill the parent grid cell and grow the body to consume it — the card-height
   * contract from the structure-consistency audit: `flex h-full flex-col` with a
   * `flex-1` body, so multi-column card bands no longer leave dead space at the
   * bottom or go ragged via `items-start`. Leave off for standalone cards.
   */
  stretch?: boolean;
}

/**
 * Unified card for the Trainer Hub. Replaces both shadcn <Card> and
 * inline `div` patterns. Every card in the hub should use this component.
 */
export function HubCard({ children, className, padded = true, stretch = false }: HubCardProps) {
  return (
    <div className={cn("flex flex-col bg-[var(--hub-card)] rounded-[16px] border border-[var(--hub-border)] shadow-sm", stretch && "h-full", className)}>
      {padded ? <div className={cn("p-5", stretch && "flex-1 min-h-0")}>{children}</div> : children}
    </div>
  );
}
