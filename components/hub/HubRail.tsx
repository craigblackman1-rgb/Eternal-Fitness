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
 * The one hub-wide "content + side rail" layout. A single width (280px), a
 * single breakpoint (lg), and sticky-by-default — replacing the per-page
 * 280/300/340px/⅓-col improvisation catalogued in the structure-consistency
 * audit (`.context/audit-hub-structure-consistency-2026-08-17.md` §3).
 *
 * The rail grid uses `items-start` deliberately: the side column must stay at
 * its natural height so `position: sticky` can take effect. That is not the
 * same `items-start` anti-pattern the audit flags on *card* bands — there the
 * grid stretches hollow cards; here it enables stickiness.
 */
export function HubRail({ main, side, className, railClassName }: HubRailProps) {
  return (
    <div className={cn("grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] items-start", className)}>
      <div className="min-w-0">{main}</div>
      <aside className={cn("flex flex-col gap-[18px] lg:sticky lg:top-5", railClassName)}>{side}</aside>
    </div>
  );
}
