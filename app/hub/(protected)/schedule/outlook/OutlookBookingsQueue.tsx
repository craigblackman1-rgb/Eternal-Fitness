"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HubCard, HubAlert } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { IconCalendar, IconSearch } from "@/components/icons";
import { cn } from "@/lib/utils";

interface ClientRef {
  id: string;
  name: string;
  client_number: number | null;
  email: string | null;
}

interface BookingRow {
  id: string;
  event_id: string;
  subject: string;
  start_at: string;
  parsed_name: string | null;
  client_id: string | null;
  status: "open" | "dismissed" | "confirmed" | "blocked";
  clients: ClientRef | null;
}

interface Block {
  id: string;
  block_number: number;
  status: string;
  block_note: string | null;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** CR-EF-050 — the Outlook Bookings reconciliation queue. */
export function OutlookBookingsQueue() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-row manual search state.
  const [searchText, setSearchText] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, ClientRef[]>>({});

  // Confirm dialog state.
  const [confirmRow, setConfirmRow] = useState<BookingRow | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [blocksLoading, setBlocksLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const status = showDismissed ? "all" : "open";
      const res = await fetch(`/api/outlook-bookings?status=${status}`);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data: BookingRow[] = await res.json();
      setRows(showDismissed ? data : data.filter((r) => r.status === "open"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDismissed]);

  async function runSearch(rowId: string, q: string) {
    setSearchText((s) => ({ ...s, [rowId]: q }));
    if (q.trim().length < 2) {
      setSearchResults((s) => ({ ...s, [rowId]: [] }));
      return;
    }
    const res = await fetch(`/api/clients?search=${encodeURIComponent(q.trim())}`);
    if (!res.ok) return;
    const clients: ClientRef[] = await res.json();
    setSearchResults((s) => ({ ...s, [rowId]: clients }));
  }

  async function linkClient(row: BookingRow, client: ClientRef) {
    const res = await fetch(`/api/outlook-bookings/${row.id}/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id }),
    });
    if (!res.ok) return;
    const updated: BookingRow = await res.json();
    setRows((rs) => rs.map((r) => (r.id === row.id ? updated : r)));
    setSearchText((s) => ({ ...s, [row.id]: "" }));
    setSearchResults((s) => ({ ...s, [row.id]: [] }));
  }

  async function dismiss(row: BookingRow) {
    const res = await fetch(`/api/outlook-bookings/${row.id}/dismiss`, { method: "POST" });
    if (!res.ok) return;
    if (showDismissed) {
      const updated: BookingRow = await res.json();
      setRows((rs) => rs.map((r) => (r.id === row.id ? updated : r)));
    } else {
      setRows((rs) => rs.filter((r) => r.id !== row.id));
    }
  }

  async function undismiss(row: BookingRow) {
    const res = await fetch(`/api/outlook-bookings/${row.id}/undismiss`, { method: "POST" });
    if (!res.ok) return;
    const updated: BookingRow = await res.json();
    setRows((rs) => rs.map((r) => (r.id === row.id ? updated : r)));
  }

  async function openConfirm(row: BookingRow) {
    if (!row.client_id) return;
    setConfirmRow(row);
    setSelectedBlockId(null);
    setBlocksLoading(true);
    try {
      const res = await fetch(`/api/clients/${row.client_id}/blocks`);
      const data: Block[] = res.ok ? await res.json() : [];
      setBlocks(data);
      if (data.length === 1) setSelectedBlockId(data[0].id);
    } finally {
      setBlocksLoading(false);
    }
  }

  async function doConfirm() {
    if (!confirmRow || !confirmRow.client_id || !selectedBlockId) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/outlook-bookings/${confirmRow.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: confirmRow.client_id, blockId: selectedBlockId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to confirm (${res.status})`);
      }
      setRows((rs) => rs.filter((r) => r.id !== confirmRow.id));
      setConfirmRow(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm");
    } finally {
      setConfirming(false);
    }
  }

  const openRows = rows.filter((r) => r.status === "open");
  const suggested = openRows.filter((r) => r.client_id);
  const manual = openRows.filter((r) => !r.client_id);
  const dismissedRows = rows.filter((r) => r.status === "dismissed");

  return (
    <div className="space-y-6">
      <HubAlert severity="info" title="How this queue works">
        A name parsed from the event subject that matches exactly one client can be confirmed with
        one click; anything ambiguous or missing needs a manual client search-and-link. Nothing
        saves silently — every row resolves to a confirm, a link, or a dismiss.
      </HubAlert>

      {error && <HubAlert severity="warning" title="Something went wrong">{error}</HubAlert>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Awaiting action", value: openRows.length },
          { label: "Ready to confirm", value: suggested.length },
          { label: "Need a client linked", value: manual.length },
          { label: "Dismissed", value: dismissedRows.length },
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
            <IconCalendar className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Unmatched Outlook appointments</p>
            <span className="inline-flex items-center rounded-full bg-[var(--status-primary-bg)] text-[var(--status-primary)] px-2 py-0.5 text-xs font-semibold">
              {openRows.length} open
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowDismissed((v) => !v)}>
            {showDismissed ? "Hide dismissed" : "Show dismissed"}
          </Button>
        </div>

        {loading ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            Nothing to reconcile — every recent Outlook booking is accounted for.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--hub-border)]">
            {rows.map((row) => (
              <li key={row.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{formatWhen(row.start_at)}</p>
                    <code className="text-xs text-muted-foreground break-words">{row.subject || "(no subject)"}</code>
                  </div>

                  {row.status === "dismissed" ? (
                    <Button variant="outline" size="sm" onClick={() => undismiss(row)}>
                      Undo dismiss
                    </Button>
                  ) : row.client_id && row.clients ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)] px-2.5 py-1 text-xs font-semibold">
                        {row.clients.name}
                      </span>
                      <Button size="sm" onClick={() => openConfirm(row)}>
                        Confirm & create session
                      </Button>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline underline-offset-2"
                        onClick={() => setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, client_id: null, clients: null } : r)))}
                      >
                        Not this client?
                      </button>
                      <Button variant="ghost" size="sm" onClick={() => dismiss(row)}>
                        Dismiss
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 w-full sm:w-72">
                      <div className="relative">
                        <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search clients…"
                          className="pl-8 h-8 text-sm"
                          value={searchText[row.id] ?? ""}
                          onChange={(e) => runSearch(row.id, e.target.value)}
                        />
                      </div>
                      {(searchResults[row.id] ?? []).length > 0 && (
                        <ul className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] overflow-hidden">
                          {(searchResults[row.id] ?? []).map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--hub-hover)]"
                                onClick={() => linkClient(row, c)}
                              >
                                {c.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button variant="ghost" size="sm" className="self-start" onClick={() => dismiss(row)}>
                        Not a client booking
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </HubCard>

      <p className="text-xs text-muted-foreground">
        Synced with Outlook every 15 minutes. <Link href="/hub/schedule" className="underline underline-offset-2">Back to schedule</Link>
      </p>

      <Dialog open={!!confirmRow} onOpenChange={(open) => !open && setConfirmRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Which block is this session part of?</DialogTitle>
          </DialogHeader>
          {blocksLoading ? (
            <p className="text-sm text-muted-foreground">Loading blocks…</p>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {confirmRow?.clients?.name ?? "This client"} has no blocks yet — create one first.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {blocks.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedBlockId(b.id)}
                    className={cn(
                      "w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors",
                      selectedBlockId === b.id
                        ? "border-[var(--status-primary-border)] bg-[var(--status-primary-bg)]"
                        : "border-[var(--hub-border)] hover:bg-[var(--hub-hover)]"
                    )}
                  >
                    <span className="font-semibold">Block {b.block_number}</span>
                    <span className="text-muted-foreground"> · {b.status}</span>
                    {b.block_note && <span className="block text-xs text-muted-foreground mt-0.5">{b.block_note}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRow(null)}>
              Cancel
            </Button>
            <Button onClick={doConfirm} disabled={!selectedBlockId || confirming || blocks.length === 0}>
              {confirming ? "Confirming…" : "Confirm & create session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
