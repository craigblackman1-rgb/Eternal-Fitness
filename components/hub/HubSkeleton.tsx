import { cn } from "@/lib/utils";

interface HubSkeletonProps {
  className?: string;
}

/**
 * Single skeleton line. Use inside HubCard body or flush content to mirror
 * the real layout one-for-one, so nothing shifts when data lands.
 *
 * Contract (CR-EF-039 §5c):
 *  - .sk base: shimmer gradient, 1.4s ease-in-out infinite
 *  - .sk-line: 11px height (9px for .sm variant)
 *  - .sk-chip: 22px × 74px pill
 *  - .sk-av: 30px × 30px square with --r-control radius
 *  - Honours prefers-reduced-motion
 */
export function HubSkeleton({ className }: HubSkeletonProps) {
  return <span className={cn("sk sk-line", className)} />;
}

export function HubSkeletonAvatar({ className }: HubSkeletonProps) {
  return <span className={cn("sk sk-av", className)} />;
}

export function HubSkeletonChip({ className }: HubSkeletonProps) {
  return <span className={cn("sk sk-chip", className)} />;
}

/**
 * Pre-built skeleton card that mirrors the real HubCard anatomy:
 * header (avatar + lines + chip) → body (3 lines) → footer (1 line).
 * Set aria-busy="true" on the parent HubCard.
 */
export function HubCardSkeleton({ className }: HubSkeletonProps) {
  return (
    <div className={cn("stack-sm", className)}>
      <span className="sk sk-line block" style={{ width: "100%" }} />
      <span className="sk sk-line block" style={{ width: "92%" }} />
      <span className="sk sk-line block sm" style={{ width: "64%" }} />
    </div>
  );
}

/**
 * Pre-built skeleton for a row-based list (table rows, list items).
 */
export function HubSkeletonRow({ className }: HubSkeletonProps) {
  return (
    <div className={cn("flex items-center gap-3 px-5 py-3", className)}>
      <HubSkeletonAvatar />
      <HubSkeleton className="flex-1" />
      <HubSkeletonChip />
    </div>
  );
}
