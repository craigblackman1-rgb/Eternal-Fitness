"use client";

import { useState, useEffect } from "react";

/* ── PotLedger — content for the pot ledger drawer.
 *  All data derived server-side from sessions + block_expiry_extensions.
 *  Rendered inside a DrawerShell by the parent component. */

interface LedgerEntry {
  date: string;
  event: string;
  delta: number | null;
  remaining: number;
  tags: string[];
}

interface Consumption {
  completed: number;
  cancelled_free: number;
  cancelled_charged: number;
  rescheduled: number;
  no_show: number;
  remaining: number;
  purchased: number;
}

interface PotLedgerData {
  consumption: Consumption;
  ledger: LedgerEntry[];
}

interface PotLedgerProps {
  clientNumber: number;
  clientName: string;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PotLedger({ clientNumber, clientName }: PotLedgerProps) {
  const [data, setData] = useState<PotLedgerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clients/${clientNumber}/pot-ledger`)
      .then((r) => r.json())
      .then((d: PotLedgerData) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [clientNumber]);

  const c = data?.consumption;
  const usedPct = c ? Math.round(((c.purchased - c.remaining) / c.purchased) * 100) : 0;

  return (
    <>
      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading pot data…</p>
      ) : !data ? (
        <p className="text-sm text-[var(--color-muted)]">Could not load pot data.</p>
      ) : (
        <>
          {/* Consumption bar */}
          <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[var(--color-muted)] mb-2.5">
            Consumption
          </p>
          <div className="border border-[var(--status-success-border)] rounded-nested overflow-hidden mb-3.5">
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--status-success-bg)] border-t-[3px] border-[var(--color-teal)] border-b border-[var(--status-success-border)] text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[var(--color-teal-text)]">
              Pot status
            </div>
            <div className="p-3">
              <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">
                {c!.purchased - c!.remaining} of {c!.purchased} sessions used
              </p>
              {/* Progress bar */}
              <div className="h-[10px] rounded-pill bg-neutral-100 overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-pill bg-[var(--color-teal)] transition-[width] duration-300"
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--color-muted)]">
                <span>{c!.purchased - c!.remaining} used</span>
                <span>{c!.remaining} remaining</span>
              </div>

              {/* Counters */}
              <div className="mt-3 space-y-1.5">
                <CounterRow count={c!.completed} label="completed" tone="teal" />
                <CounterRow count={c!.cancelled_free} label="cancelled — didn't touch the pot" chip="Free" />
                <CounterRow count={c!.rescheduled} label="rescheduled — didn't touch the pot" chip="Free" />
                <CounterRow count={c!.no_show} label="no-show" tone="warn" />
                <CounterRow count={c!.remaining} label="remaining" />
              </div>

              <p className="mt-3 mb-0 text-xs text-[var(--color-muted)]">
                Queue advances on completed sessions only. Cancelled and rescheduled sessions don&apos;t consume the pot.
              </p>
            </div>
          </div>

          {/* Ledger table */}
          <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[var(--color-muted)] mb-2.5">
            What moved the pot
          </p>
          <div className="border border-[var(--hub-border)] rounded-nested overflow-hidden mb-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border-t-[3px] border-[var(--color-muted)] border-b border-[var(--hub-border)] text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[var(--color-ink)]">
              Pot ledger
            </div>
            <div className="p-0">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    <th className="text-left px-2.5 py-2 text-[10.5px] font-bold uppercase tracking-[.06em] text-[var(--color-muted)] bg-[var(--hub-hover)] border-b border-[var(--hub-border)] w-[90px]">
                      Date
                    </th>
                    <th className="text-left px-2.5 py-2 text-[10.5px] font-bold uppercase tracking-[.06em] text-[var(--color-muted)] bg-[var(--hub-hover)] border-b border-[var(--hub-border)]">
                      Event
                    </th>
                    <th className="text-right px-2.5 py-2 text-[10.5px] font-bold uppercase tracking-[.06em] text-[var(--color-muted)] bg-[var(--hub-hover)] border-b border-[var(--hub-border)] w-[60px]">
                      Delta
                    </th>
                    <th className="text-right px-2.5 py-2 text-[10.5px] font-bold uppercase tracking-[.06em] text-[var(--color-muted)] bg-[var(--hub-hover)] border-b border-[var(--hub-border)] w-[100px]">
                      Remaining
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.map((entry, i) => (
                    <tr key={i}>
                      <td className="px-2.5 py-2 border-b border-[var(--hub-border)] font-semibold text-[var(--color-ink)] whitespace-nowrap">
                        {fmtDate(entry.date)}
                      </td>
                      <td className="px-2.5 py-2 border-b border-[var(--hub-border)] text-[var(--color-body)]">
                        {entry.event}
                        {entry.tags.includes("Free") && (
                          <span className="ml-1.5 inline-flex items-center h-[18px] px-[7px] rounded-pill text-[10.5px] font-semibold bg-[var(--status-success-bg)] text-[var(--color-teal-text)] border border-[var(--status-success-border)]">
                            Free
                          </span>
                        )}
                      </td>
                      <td className={`px-2.5 py-2 border-b border-[var(--hub-border)] font-semibold text-right whitespace-nowrap ${entry.delta === null ? "text-[var(--color-muted)]" : entry.delta > 0 ? "text-[var(--color-teal-text)]" : "text-[var(--color-ink)]"}`}>
                        {entry.delta === null ? "—" : entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                      </td>
                      <td className="px-2.5 py-2 border-b border-[var(--hub-border)] font-semibold text-[var(--color-ink)] text-right whitespace-nowrap">
                        {entry.remaining} remaining
                      </td>
                    </tr>
                  ))}
                  {data.ledger.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-2.5 py-4 text-center text-sm text-[var(--color-muted)]">
                        No pot movements yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function CounterRow({ count, label, tone, chip }: { count: number; label: string; tone?: "teal" | "warn"; chip?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 text-[13px] text-[var(--color-body)]">
      <span className={`font-bold min-w-[24px] ${tone === "teal" ? "text-[var(--color-teal-text)]" : tone === "warn" ? "text-[var(--color-amber)]" : "text-[var(--color-ink)]"}`}>
        {count}
      </span>
      <span>{label}</span>
      {chip && (
        <span className="inline-flex items-center h-[18px] px-[7px] rounded-pill text-[10.5px] font-semibold bg-[var(--status-success-bg)] text-[var(--color-teal-text)] border border-[var(--status-success-border)] ml-1">
          {chip}
        </span>
      )}
    </div>
  );
}
