import { cn } from "@/lib/utils";

interface ContextStripItem {
  label: string;
  value: string;
}

export function ContextStrip({
  items,
  className,
}: {
  items: ContextStripItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 sm:gap-6 rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] px-4 sm:px-5 py-3 text-[13px] flex-wrap",
        className,
      )}
    >
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-2">
          {i > 0 && (
            <span className="w-px h-4 bg-[var(--hub-border)] -mx-1" />
          )}
          <span className="text-muted-foreground font-medium">
            {item.label}
          </span>
          <span className="text-foreground font-semibold">{item.value}</span>
        </span>
      ))}
    </div>
  );
}
