"use client";

import { cn } from "@/lib/utils";
import { IconSearch } from "@/components/icons";

export interface ToolbarSegment {
  label: string;
  value: string;
}

interface ToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchMaxWidth?: string;
  count?: string;
  variant?: "canvas" | "embedded";
  className?: string;
  children?: React.ReactNode;
  segments?: ToolbarSegment[];
  activeSegment?: string;
  onSegmentChange?: (value: string) => void;
}

const FOCUS_RING = "focus:outline-none focus:border-[var(--color-rose)] focus:ring-[3px] focus:ring-[rgba(193,131,159,0.3)]";

export const toolbarSelectClasses = cn(
  "h-9 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)]",
  "px-2.5 text-[13px] text-foreground",
  "font-[inherit] cursor-pointer outline-none",
  "hover:border-[var(--hub-field-border-hover)]",
  FOCUS_RING,
);

/**
 * Shared search + filter + segmented pill toolbar. Renders directly on the
 * canvas by default (variant="canvas"); use variant="embedded" to add
 * card-header padding + bottom divider for use inside HubCard.
 */
export function Toolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  searchMaxWidth = "320px",
  count,
  variant = "canvas",
  className,
  children,
  segments,
  activeSegment,
  onSegmentChange,
}: ToolbarProps) {
  const isEmbedded = variant === "embedded";

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 flex-wrap",
        isEmbedded && "px-5 py-[14px] border-b border-[var(--hub-border)]",
        className,
      )}
    >
      <div
        className="relative flex-1 min-w-[200px]"
        style={{ maxWidth: searchMaxWidth }}
      >
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground pointer-events-none" />
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            "w-full h-9 rounded-lg border border-[var(--hub-field-border)]",
            "bg-[var(--hub-card)] pl-[34px] pr-3 text-[13px]",
            "text-foreground placeholder:text-muted-foreground",
            "font-[inherit] outline-none",
            "hover:border-[var(--hub-field-border-hover)]",
            FOCUS_RING,
          )}
        />
      </div>

      {children}

      {segments && segments.length > 0 && (
        <div className="inline-flex bg-[var(--hub-canvas)] border border-[var(--hub-border)] rounded-lg p-0.5 gap-0.5">
          {segments.map((seg) => (
            <button
              key={seg.value}
              type="button"
              onClick={() => onSegmentChange?.(seg.value)}
              className={cn(
                "border-0 bg-transparent font-[inherit] text-[12.5px] font-semibold px-3 py-1.5 rounded-md cursor-pointer transition-colors",
                activeSegment === seg.value
                  ? "bg-white text-[var(--status-primary)] shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {seg.label}
            </button>
          ))}
        </div>
      )}

      {count && (
        <span className="ml-auto text-xs text-muted-foreground shrink-0 tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
}
