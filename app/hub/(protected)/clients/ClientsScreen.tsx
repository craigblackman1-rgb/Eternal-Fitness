"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { IconUserPlus } from "@/components/icons";
import { formatFrequencyShort, type Frequency } from "@/types";

/* ── S6 Clients screen ────────────────────────────────────────────────────
   Two sections and nothing else: the queue of what needs Esther today, then
   the plain alphabetical roster. No compliance column, no status filters —
   the reason a client needs attention is written on their row in words. */

export interface ClientRow {
  id: string;
  clientNumber: number;
  name: string;
  archived: boolean;
  frequency: Frequency | null;
  sessionsPerWeek: number | null;
  goal: string | null;
  conditionCount: number;
  reason: string | null;
  hot: boolean;
  dot: "due" | "warn" | "nil";
}

export interface QueueItem {
  id: string;
  dot: "due" | "warn";
  headline: string;
  subline?: string;
  actionLabel: string;
  href: string;
}

const GOAL_LABELS: Record<string, string> = {
  strength: "Strength",
  mobility: "Mobility",
  weight_loss: "Weight Loss",
  general_fitness: "General Fitness",
  rehab: "Rehab",
  endurance: "Endurance",
};

function goalLabel(goal: string | null): string | null {
  if (!goal) return null;
  return GOAL_LABELS[goal] ?? goal.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function facts(r: ClientRow): string {
  const parts: string[] = [];
  const freq = formatFrequencyShort(
    r.frequency ?? (r.sessionsPerWeek ? { unit: "week", per_unit: r.sessionsPerWeek } : null),
  );
  if (freq && freq !== "—") parts.push(freq);
  const g = goalLabel(r.goal);
  if (g) parts.push(g);
  // Omitted entirely at zero rather than printing "0 conditions".
  if (r.conditionCount > 0) parts.push(`${r.conditionCount} condition${r.conditionCount === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

const DOT: Record<string, string> = {
  due: "bg-rose",
  warn: "bg-[var(--status-warning)]",
  nil: "bg-transparent",
};

export function ClientsScreen({
  rows,
  queue,
  settledNames,
}: {
  rows: ClientRow[];
  queue: QueueItem[];
  settledNames: string[];
}) {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const archivedCount = rows.filter((r) => r.archived).length;
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.archived && !showArchived) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, showArchived]);

  const needCount = queue.length;

  return (
    <div className="max-w-[940px] mx-auto">
      {/* Header — no page-level primary button; every action belongs to a row. */}
      <div className="flex items-baseline gap-2.5 flex-wrap mb-3.5">
        <h1 className="m-0 text-[25px] font-bold tracking-tight text-[var(--color-ink)]">Clients</h1>
        {needCount > 0 && (
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]">
            {needCount} need{needCount === 1 ? "s" : ""} you
          </span>
        )}
        <span className="text-[13px] text-[var(--color-body)]">
          {rows.filter((r) => !r.archived).length} on the books
        </span>
      </div>

      {/* ── Needs you today ── */}
      <div className="bg-white border border-[var(--hub-border)] rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden mb-3.5">
        <div className="flex items-center gap-2.5 py-2.5 px-4 border-b border-[var(--hub-border)]">
          <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">Needs you today</h2>
          <span className="text-xs text-[var(--color-muted)]">
            {needCount > 0 ? `${needCount} thing${needCount === 1 ? "" : "s"} · in the order you'd work them` : "All clear"}
          </span>
        </div>
        <div className="px-4 pb-3">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2 px-3 rounded-[10px] border border-transparent transition-colors duration-100 hover:bg-[var(--hub-hover)] hover:border-[var(--hub-border)]"
            >
              <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${DOT[item.dot]}`} />
              <span className="min-w-0 flex-1 text-[13.5px] text-[var(--color-ink)]">
                <b className="font-semibold">{item.headline}</b>
                {item.subline && (
                  <span className="block text-xs text-[var(--color-muted)] mt-px">{item.subline}</span>
                )}
              </span>
              <Link
                href={item.href}
                className="shrink-0 inline-flex items-center justify-center rounded-lg border border-[var(--hub-field-border)] bg-white hover:bg-[var(--hub-hover)] text-foreground px-2.5 py-1 min-h-[30px] text-xs font-semibold no-underline transition-colors"
              >
                {item.actionLabel}
              </Link>
            </div>
          ))}

          {queue.length > 0 && settledNames.length > 0 && (
            <>
              <hr className="h-px bg-[var(--hub-border)] border-0 my-3" />
              <div className="flex items-center gap-2.5 py-2 px-3 text-[13px] text-[var(--color-muted)]">
                <span className="w-[7px] h-[7px] rounded-full bg-[var(--status-success)] shrink-0" />
                <span>
                  The other {settledNames.length} need nothing from you today
                  {settledNames.length <= 6 ? ` — ${settledNames.join(", ")}` : ""}.
                </span>
              </div>
            </>
          )}

          {queue.length === 0 && (
            <div className="flex items-center gap-2.5 py-2 px-3 text-[13px] text-[var(--color-muted)]">
              <span className="w-[7px] h-[7px] rounded-full bg-[var(--status-success)] shrink-0" />
              <span>Nothing needs you today.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Everyone ── */}
      <div className="bg-white border border-[var(--hub-border)] rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden">
        <div className="flex items-center gap-2.5 py-2.5 px-4 border-b border-[var(--hub-border)]">
          <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">Everyone</h2>
          <span className="text-xs text-[var(--color-muted)]">{visible.length} in the list</span>
          <div className="ml-auto flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a client…"
              aria-label="Find a client"
              className="h-8 w-[180px] rounded-lg border border-[var(--hub-field-border)] px-2.5 text-[13px] bg-white"
            />
            <Link
              href="/hub/clients/new"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-field-border)] bg-white hover:bg-[var(--hub-hover)] text-foreground px-2.5 py-1 min-h-[30px] text-xs font-semibold no-underline transition-colors"
            >
              <IconUserPlus className="w-4 h-4" /> Add a client
            </Link>
          </div>
        </div>

        <div>
          {visible.map((r) => (
            <Link
              key={r.id}
              href={`/hub/clients/${r.clientNumber}`}
              className={`flex items-center gap-3 py-2 px-4 border-t border-[var(--hub-border)] first:border-t-0 no-underline transition-colors hover:bg-[var(--hub-hover)] ${r.archived ? "opacity-60" : ""}`}
            >
              <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${DOT[r.dot]}`} />
              <span className="w-[190px] shrink-0 text-[13.5px] font-semibold text-[var(--color-ink)] truncate">
                {r.name}
                {r.archived && <span className="ml-1.5 text-[11px] font-normal text-[var(--color-muted)]">archived</span>}
              </span>
              <span className="flex-1 min-w-0 text-xs text-[var(--color-muted)] truncate">{facts(r)}</span>
              {r.reason && (
                <span
                  className={`shrink-0 text-xs ${r.hot ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-muted)]"}`}
                >
                  {r.reason}
                </span>
              )}
            </Link>
          ))}

          {visible.length === 0 && (
            <p className="m-0 py-8 text-center text-[13px] text-[var(--color-muted)]">
              {search.trim() ? "No client matches that name." : "No clients yet."}
            </p>
          )}
        </div>

        {archivedCount > 0 && (
          <div className="border-t border-[var(--hub-border)] px-4 py-2">
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="text-xs font-semibold text-[var(--color-rose)] bg-transparent border-0 p-0 cursor-pointer hover:underline underline-offset-2"
            >
              {showArchived
                ? `Hide the ${archivedCount} archived record${archivedCount === 1 ? "" : "s"}`
                : `Show the ${archivedCount} archived record${archivedCount === 1 ? "" : "s"}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
