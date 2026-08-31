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
   *
   * When true, the padded wrapper becomes a flex column so its children can use
   * `flex-1` on the body element to fill available space.
   */
  stretch?: boolean;
}

/**
 * Unified card for the Trainer Hub. Replaces both shadcn <Card> and
 * inline `div` patterns. Every card in the hub should use this component.
 *
 * Card contract (CR-EF-039 §2):
 *  - display: flex; flex-direction: column; height: 100% (when stretch)
 *  - Body must be flex: 1 so rows of cards bottom-align regardless of content
 *  - Parent grid MUST stay align-items: stretch (the default)
 */
export function HubCard({ children, className, padded = true, stretch = false }: HubCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col bg-[var(--hub-card)] border border-[var(--hub-border)] shadow-sm",
        stretch && "h-full",
        className,
      )}
      style={{ borderRadius: "var(--r-surface)" }}
    >
      {padded ? (
        <div className={cn("p-5", stretch && "flex-1 flex flex-col min-h-0")}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
