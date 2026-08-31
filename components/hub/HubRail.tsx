import { cn } from "@/lib/utils";

interface HubRailProps {
  /** Primary content column. */
  main: React.ReactNode;
  /** Sticky side rail — the card stack that sits to the right on desktop. */
  side: React.ReactNode;
  /** Applied to the outer two-column grid. */
  className?: string;
  /** Applied to the sticky side column. */
  railClassName?: string;
}

/**
 * The one hub-wide "content + side rail" layout. Uses CSS custom properties
 * from globals.css: --rail-w (300px), --rail-gap (20px), --rail-top (76px).
 *
 * Responsive: collapses at 1180px — rail drops below main content (order: 2),
 * full width, static position.
 *
 * The rail grid uses `items-start` deliberately: the side column must stay at
 * its natural height so `position: sticky` can take effect.
 */
export function HubRail({ main, side, className, railClassName }: HubRailProps) {
  return (
    <div className={cn("hub-layout", className)}>
      <div className="min-w-0">{main}</div>
      <aside className={cn("hub-rail", railClassName)}>{side}</aside>
    </div>
  );
}
