"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { IconSearch, IconChevronLeft, IconChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface HubColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null;
  className?: string;
  headerClassName?: string;
}

interface HubTableProps<T> {
  data: T[];
  columns: HubColumn<T>[];
  getRowHref: (row: T) => string;
  searchPlaceholder?: string;
  searchKeys?: (keyof T | ((row: T) => string))[];
  emptyState?: React.ReactNode;
  /** Extra toolbar content rendered to the right of the search input (filters, counts). */
  toolbar?: React.ReactNode;
  /** Rows per page; pagination footer appears only when data exceeds this. Default 25. */
  pageSize?: number;
  /** Singular count label for the toolbar. Default "record". Pass "client" etc. */
  countLabel?: string;
}

export function HubTable<T>({
  data,
  columns,
  getRowHref,
  searchPlaceholder = "Search...",
  searchKeys = ["name" as keyof T],
  emptyState,
  toolbar,
  pageSize = 25,
  countLabel = "record",
}: HubTableProps<T>) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const lower = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        if (typeof key === "function") {
          return String(key(row)).toLowerCase().includes(lower);
        }
        const val = row[key as keyof T];
        return val != null && String(val).toLowerCase().includes(lower);
      }),
    );
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;
      if (col.sortValue) {
        aVal = col.sortValue(a);
        bVal = col.sortValue(b);
      } else {
        aVal = (a as any)[sortKey] ?? null;
        bVal = (b as any)[sortKey] ?? null;
      }
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === "string" && typeof bVal === "string"
        ? aVal.localeCompare(bVal)
        : aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const paged = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-48">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9 rounded-lg border-[var(--hub-border)] bg-[var(--hub-card)]"
          />
        </div>
        {toolbar}
        <p className="ml-auto text-xs text-muted-foreground tabular-nums">
          {sorted.length} {sorted.length === 1 ? countLabel : `${countLabel}s`}
        </p>
      </div>

      {sorted.length === 0 ? (
        emptyState || (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No results found.
          </p>
        )
      ) : (
        <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--hub-border)] hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "text-xs uppercase tracking-wider text-muted-foreground font-medium bg-[var(--hub-hover)] h-10",
                      col.sortable && "cursor-pointer select-none hover:text-foreground",
                      col.headerClassName,
                    )}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable && sortKey === col.key && (
                        <span className="text-[10px] leading-none">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((row, i) => {
                const rowId = (row as any).id ?? i;
                const href = getRowHref(row);
                return (
                  <TableRow
                    key={rowId}
                    className="border-[var(--hub-border)] hover:bg-[var(--hub-hover)] transition-colors cursor-pointer"
                    onClick={() => router.push(href)}
                    onAuxClick={(e) => {
                      if (e.button === 1) window.open(href, "_blank");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(href);
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open ${href}`}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={cn("text-sm py-2.5", col.className)}>
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--hub-border)] bg-[var(--hub-hover)]">
              <p className="text-xs text-muted-foreground tabular-nums">
                Page {safePage + 1} of {pageCount}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="p-1.5 rounded-lg border border-[var(--hub-border)] bg-white disabled:opacity-40 hover:bg-[var(--hub-hover)] transition-colors"
                  aria-label="Previous page"
                >
                  <IconChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="p-1.5 rounded-lg border border-[var(--hub-border)] bg-white disabled:opacity-40 hover:bg-[var(--hub-hover)] transition-colors"
                  aria-label="Next page"
                >
                  <IconChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
