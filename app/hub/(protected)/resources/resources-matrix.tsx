"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ResourceDef } from "@/lib/resources";
import { HubCard } from "@/components/hub";
import { Toolbar, toolbarSelectClasses } from "@/components/hub";
import { cn } from "@/lib/utils";

interface ClientResourceRow {
  id: string;
  name: string;
  client_number: number | null;
  resource_visibility: Record<string, boolean> | null;
}

const resourceIcons: Record<string, React.ReactNode> = {
  "calorie-calculator": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  ),
  "showdown-soundboard": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  ),
};

const summaryColors = ["teal", "rose"] as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ResourcePill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-[11px] py-[3px] pl-2 text-[11.5px] font-semibold",
        enabled
          ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
          : "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] border-[var(--status-neutral-border)]",
      )}
    >
      <span
        className={cn(
          "h-[7px] w-[7px] rounded-full shrink-0",
          enabled ? "bg-[var(--status-success-text)]" : "bg-[var(--status-neutral)]",
        )}
      />
      {enabled ? "Enabled" : "Off"}
    </span>
  );
}

export function ResourcesMatrix({
  clients,
  resources,
}: {
  clients: ClientResourceRow[];
  resources: ResourceDef[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const summary = resources.map((r) => {
    const enabledCount = clients.filter(
      (c) => c.resource_visibility?.[r.key] === true,
    ).length;
    return { ...r, enabledCount, totalCount: clients.length };
  });

  const filtered = useMemo(() => {
    let result = clients;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (filter === "any") {
      result = result.filter((c) =>
        resources.some((r) => c.resource_visibility?.[r.key] === true),
      );
    } else if (filter === "none") {
      result = result.filter(
        (c) => !resources.some((r) => c.resource_visibility?.[r.key] === true),
      );
    }
    return result;
  }, [clients, search, filter, resources]);

  return (
    <div className="space-y-[18px]">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {summary.map((r, i) => {
          const pct = r.totalCount > 0 ? Math.round((r.enabledCount / r.totalCount) * 100) : 0;
          const col = summaryColors[i % summaryColors.length];
          return (
            <div
              key={r.key}
              className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[16px] shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] p-4 flex items-center gap-3.5"
            >
              <div
                className={cn(
                  "w-11 h-11 rounded-[12px] grid place-items-center shrink-0",
                  col === "teal"
                    ? "bg-[var(--status-success-bg)] text-teal"
                    : "bg-[var(--status-primary-bg)] text-rose",
                )}
              >
                {resourceIcons[r.key] ?? (
                  <div className="w-5 h-5 rounded bg-current/20" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-bold text-foreground m-0">{r.name}</p>
                <p className="text-[12.5px] text-[var(--color-body)] m-0 mt-[3px]">
                  {r.enabledCount} of {r.totalCount} client{r.totalCount !== 1 ? "s" : ""} enabled
                </p>
                <div className="w-[100px] h-1.5 rounded-full bg-[var(--hub-border)] overflow-hidden mt-1.5">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      col === "teal" ? "bg-teal" : "bg-rose",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <Link
                href={`/hub/resources/preview/${r.key}`}
                className="shrink-0 self-start text-[12px] font-semibold text-teal hover:underline whitespace-nowrap"
              >
                Preview →
              </Link>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <Toolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search clients…"
        count={`${filtered.length} client${filtered.length !== 1 ? "s" : ""}`}
      >
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={toolbarSelectClasses}
          aria-label="Filter by resource state"
        >
          <option value="all">All clients</option>
          <option value="any">Any resource enabled</option>
          <option value="none">No resources enabled</option>
        </select>
      </Toolbar>

      {/* Matrix table */}
      <HubCard padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-5 h-10 border-b border-[var(--hub-border)]">
                  Client
                </th>
                {resources.map((r) => (
                  <th
                    key={r.key}
                    className="text-center text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-5 h-10 border-b border-[var(--hub-border)]"
                  >
                    {r.name}
                  </th>
                ))}
                <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] px-5 h-10 border-b border-[var(--hub-border)] w-1" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + resources.length}
                    className="px-5 py-8 text-center text-muted-foreground"
                  >
                    No clients match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-[var(--hub-hover)] [&:last-child>td]:border-b-0"
                  >
                    <td className="px-5 py-3 border-b border-[var(--hub-border)]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--status-primary-bg)] text-rose grid place-items-center text-xs font-bold shrink-0">
                          {initials(client.name)}
                        </div>
                        <span className="font-semibold text-foreground">{client.name}</span>
                      </div>
                    </td>
                    {resources.map((r) => (
                      <td
                        key={r.key}
                        className="px-5 py-3 border-b border-[var(--hub-border)] text-center"
                      >
                        <ResourcePill
                          enabled={client.resource_visibility?.[r.key] === true}
                        />
                      </td>
                    ))}
                    <td className="px-5 py-3 border-b border-[var(--hub-border)]">
                      <Link
                        href={`/hub/clients/${client.client_number ?? client.id}/edit`}
                        className="text-teal no-underline font-medium hover:underline"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </HubCard>

      {/* Note */}
      <div className="flex gap-3 rounded-[12px] p-3.5 text-[12.5px] leading-[1.55] bg-[var(--status-primary-bg)] border border-[var(--status-primary-border)]">
        <span className="w-[22px] h-[22px] rounded-full bg-rose text-white grid place-items-center text-[11px] font-extrabold shrink-0">
          i
        </span>
        <div>
          <strong>Only two resources exist today.</strong> This page is built to scale — a new resource becomes one more matrix column, not a new page. If the list grows past 3–4, the per-client rail card (on each client's Overview tab) should switch from showing both resources inline to a "2 of 4 enabled → view all" summary linking here.
        </div>
      </div>
    </div>
  );
}
