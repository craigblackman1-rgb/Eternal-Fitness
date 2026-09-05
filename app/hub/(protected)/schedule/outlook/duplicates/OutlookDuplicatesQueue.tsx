"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HubCard, HubAlert } from "@/components/hub";
import { Button } from "@/components/ui/button";

interface DuplicateRow {
  id: string;
  existing_subject: string;
  existing_start_at: string | null;
  flag: "same" | "off";
  status: "open" | "linked" | "kept_separate";
  client_name: string;
  block_number: number | null;
  session_number: number | null;
  scheduled_at: string | null;
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** CR-EF-028 — the Outlook duplicate-event reconciliation queue. Mirror of
 *  OutlookBookingsQueue.tsx: two decisions per row instead of three, since
 *  the client is always already known (a session exists). */
export function OutlookDuplicatesQueue() {
  const [rows, setRows] = useState<DuplicateRow[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const status = showResolved ? "all" : "open";
      const res = await fetch(`/api/outlook-duplicates?status=${status}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data: DuplicateRow[] = await res.json();
      setRows(showResolved ? data : data.filter((r) => r.status === "open"));
    } catch (e) {
      setError(e instanceof Error ? (e.name === "TimeoutError" ? "The server took too long to respond — try refreshing." : e.message) : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResolved]);

  async function act(row: DuplicateRow, action: "link" | "keep-separate" | "unresolve") {
    setBusy(row.id);
    try {
      const res = await fetch(`/api/outlook-duplicates/${row.id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      if (action !== "unresolve" && !showResolved) {
        setRows((rs) => rs.filter((r) => r.id !== row.id));
      } else {
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const openRows = rows.filter((r) => r.status === "open");
  const linkedRows = rows.filter((r) => r.status === "linked");
  const separateRows = rows.filter((r) => r.status === "kept_separate");

  return (
    <div className="space-y-6">
      <HubAlert severity="info" title="How this queue works">
        A session already exists here, so the only question is whether the event already in your
        calendar is the same appointment. Link &amp; adopt takes the existing event over instead of
        creating a second one; Keep separate confirms it&rsquo;s a false positive and lets the normal
        sync proceed. Sync stays paused on a row until you decide.
      </HubAlert>

      {error && (
        <HubAlert severity="warning" title="Something went wrong">
          <div className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={load}>Try again</Button>
          </div>
        </HubAlert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Awaiting decision", value: openRows.length },
          { label: "Linked & adopted", value: linkedRows.length },
          { label: "Kept separate", value: separateRows.length },
        ].map((s) => (
          <HubCard key={s.label} className="p-4">
            <p className="text-2xl font-semibold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </HubCard>
        ))}
      </div>

      <HubCard padded={false}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Sessions that might collide with your own events</p>
            <span className="inline-flex items-center rounded-pill bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] px-2 py-0.5 text-xs font-semibold">
              {openRows.length} pending
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowResolved((v) => !v)}>
            {showResolved ? "Hide resolved" : "Show resolved"}
          </Button>
        </div>

        {loading ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            No possible duplicates — your calendar and the app agree. Sessions will push their own
            events without any extra step.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--hub-border)]">
            {rows.map((row) => (
              <li key={row.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {row.client_name} · {formatWhen(row.scheduled_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Session {row.session_number} · Block {row.block_number}
                    </p>
                  </div>
                  {row.status === "open" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" disabled={busy === row.id} onClick={() => act(row, "link")}>
                        Link &amp; adopt
                      </Button>
                      <Button variant="outline" size="sm" disabled={busy === row.id} onClick={() => act(row, "keep-separate")}>
                        Keep separate
                      </Button>
                    </div>
                  )}
                  {row.status !== "open" && (
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          "inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-semibold " +
                          (row.status === "linked"
                            ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                            : "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)]")
                        }
                      >
                        {row.status === "linked" ? "Linked & adopted" : "Kept separate"}
                      </span>
                      <Button variant="ghost" size="sm" disabled={busy === row.id} onClick={() => act(row, "unresolve")}>
                        Undo
                      </Button>
                    </div>
                  )}
                </div>

                {row.status === "open" && (
                  <div className="mt-3 rounded-surface border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3.5 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--status-warning-text)] mb-1">
                      Your existing event
                    </p>
                    <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 text-sm">
                      <span className="font-semibold text-foreground">&ldquo;{row.existing_subject}&rdquo;</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{formatWhen(row.existing_start_at)}</span>
                      <span className="text-[11.5px] font-semibold" style={{ color: row.flag === "same" ? "#8A6212" : "var(--color-muted-text, #7E8088)" }}>
                        {row.flag === "same" ? "Same time in your calendar" : "Different time — likely a coincidence"}
                      </span>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </HubCard>

      <p className="text-xs text-muted-foreground">
        Sync paused on open rows · check +15 min. <Link href="/hub/schedule" className="underline underline-offset-2">Back to schedule</Link>
      </p>
    </div>
  );
}
