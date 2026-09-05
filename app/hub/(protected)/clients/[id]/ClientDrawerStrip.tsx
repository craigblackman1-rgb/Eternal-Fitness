"use client";

import { useDrawerManager } from "./DrawerManager";

/* ── ClientDrawerStrip — five reference surfaces as one quiet row of openers.
   A count appears ONLY when something inside needs Esther; a bare label means
   "on file, nothing to do". */

interface DrawerStripItem {
  id: string;
  label: string;
  count?: number | null;
}

export function ClientDrawerStrip({ items }: { items: DrawerStripItem[] }) {
  const { openDrawer } = useDrawerManager();

  return (
    <div className="flex items-center gap-1.5 flex-wrap p-[5px_8px] bg-white border border-[var(--hub-border)] rounded-nested mb-3.5 shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)]">
      <span className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[var(--color-muted)] px-2 py-0 pl-1.5">
        About {items[0]?.label ? "" : ""}
      </span>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={(e) => openDrawer(item.id, e.currentTarget)}
          className="inline-flex items-center gap-[7px] min-h-[32px] px-[11px] rounded-lg border border-transparent bg-transparent text-[var(--color-body)] font-[inherit] text-[13px] font-medium cursor-pointer transition-colors duration-100 hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] hover:border-[var(--hub-border)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(193,131,159,.3)]"
        >
          {item.label}
          {item.count != null && item.count > 0 && (
            <span className="inline-grid place-items-center min-w-[17px] h-[17px] px-[5px] rounded-pill bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)] text-[10.5px] font-bold leading-none tabular-nums">
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
