"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { IconTriangleAlert, IconCalendar } from "@/components/icons";
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

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatWhenShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

interface ClientBookingPanelProps {
  clientId: string;
  clientName: string;
  /** When true, renders mobile-optimised layout (stacked rows, full-width buttons). */
  mobile?: boolean;
}

/**
 * Per-client Outlook booking reconciliation panel (CR-EF-095).
 * Sits at the top of the client Overview tab. Renders nothing when the
 * client has zero open bookings — no empty state, no "0 bookings" card.
 */
export function ClientBookingPanel({ clientId, clientName, mobile = false }: ClientBookingPanelProps) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Block picker dialog state.
  const [confirmBooking, setConfirmBooking] = useState<BookingRow | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/outlook-bookings?status=open&client_id=${encodeURIComponent(clientId)}`);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data: BookingRow[] = await res.json();
      setBookings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function dismiss(row: BookingRow) {
    const res = await fetch(`/api/outlook-bookings/${row.id}/dismiss`, { method: "POST" });
    if (!res.ok) return;
    setBookings((rs) => rs.filter((r) => r.id !== row.id));
  }

  async function openConfirm(row: BookingRow) {
    setConfirmBooking(row);
    setSelectedBlockId(null);
    setBlocksLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/blocks`);
      const all: Block[] = res.ok ? await res.json() : [];
      const active = all.filter((b) => b.status !== "complete" && b.status !== "completed");
      setBlocks(active);
      if (active.length === 1) setSelectedBlockId(active[0].id);
    } finally {
      setBlocksLoading(false);
    }
  }

  async function doConfirm() {
    if (!confirmBooking || !selectedBlockId) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/outlook-bookings/${confirmBooking.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, blockId: selectedBlockId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to confirm (${res.status})`);
      }
      setBookings((rs) => rs.filter((r) => r.id !== confirmBooking.id));
      setConfirmBooking(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm");
    } finally {
      setConfirming(false);
    }
  }

  // Render nothing when loading, when there's an error, or when there are no open bookings.
  if (loading || error || bookings.length === 0) return null;

  const firstName = clientName.split(" ")[0];

  return (
    <>
      <div className="mb-4">
        {/* Warning alert banner */}
        <div className="rounded-xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4">
          <div className="flex gap-3">
            <IconTriangleAlert className="w-[18px] h-[18px] shrink-0 text-[var(--status-warning)] mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground">
                {bookings.length} Outlook booking{bookings.length === 1 ? "" : "s"} waiting for {firstName}
              </p>
              <p className="text-[13px] text-foreground/75 mt-0.5">
                Booked through Microsoft Bookings. Confirm to attach each to a session, or dismiss if it is not a client booking.
              </p>

              {/* Booking row list */}
              <div className="flex flex-col gap-2 mt-3">
                {bookings.map((row) => (
                  <BookingRowItem
                    key={row.id}
                    row={row}
                    mobile={mobile}
                    onConfirm={() => openConfirm(row)}
                    onDismiss={() => dismiss(row)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Block picker dialog */}
      <Dialog open={!!confirmBooking} onOpenChange={(open) => !open && setConfirmBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-[var(--status-success-bg)] text-[var(--status-success)] flex items-center justify-center shrink-0">
                <IconCalendar className="w-[17px] h-[17px]" />
              </div>
              <div>
                <DialogTitle>Attach to session</DialogTitle>
                {confirmBooking && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {confirmBooking.subject} · {formatWhenShort(confirmBooking.start_at)} {formatTime(confirmBooking.start_at)}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>
          <p className="text-[12.5px] text-muted-foreground">
            Pick which active block this Outlook booking belongs to.
          </p>
          {blocksLoading ? (
            <p className="text-sm text-muted-foreground">Loading blocks…</p>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {clientName} has no blocks yet — create one first.
            </p>
          ) : (
            <ul className="space-y-2 mt-1">
              {blocks.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedBlockId(b.id)}
                    className={cn(
                      "w-full text-left rounded-xl border px-3.5 py-3 transition-colors",
                      selectedBlockId === b.id
                        ? "border-[var(--status-primary-border)] bg-[var(--status-primary-bg)] shadow-[inset_0_0_0_1px_var(--color-rose)]"
                        : "border-[var(--hub-border)] hover:border-[var(--color-rose)] hover:bg-[var(--status-primary-bg)]"
                    )}
                  >
                    <span className="font-bold text-sm text-foreground">
                      Block {b.block_number}
                    </span>
                    {b.block_note && (
                      <span className="block text-xs text-muted-foreground mt-0.5">{b.block_note}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmBooking(null)}>
              Cancel
            </Button>
            <Button onClick={doConfirm} disabled={!selectedBlockId || confirming || blocks.length === 0}>
              {confirming ? "Confirming…" : "Confirm & attach"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Individual booking row ── */

function BookingRowItem({
  row,
  mobile,
  onConfirm,
  onDismiss,
}: {
  row: BookingRow;
  mobile: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-card)] p-3">
      <div className={cn("flex flex-wrap items-start gap-3", mobile && "gap-2.5")}>
        {/* Time/date icon */}
        <div className="flex gap-2.5 min-w-0 shrink-0">
          <div className={cn(
            "rounded-[10px] grid place-items-center shrink-0 border",
            mobile ? "w-8 h-8 rounded-lg" : "w-9 h-9",
            "bg-[var(--status-primary-bg)] border-[var(--status-primary-border)] text-[var(--color-rose)]"
          )}>
            <IconCalendar className={cn(mobile ? "w-3.5 h-3.5" : "w-4 h-4")} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground tabular-nums leading-tight">{formatTime(row.start_at)}</p>
            <p className={cn("text-muted-foreground mt-0.5", mobile ? "text-[11.5px]" : "text-xs")}>{formatDate(row.start_at)}</p>
          </div>
        </div>

        {/* Subject */}
        {!mobile && (
          <div className="border-l-2 border-[var(--hub-border)] pl-2.5 ml-0.5 self-center min-w-0 flex-1">
            <code className="text-xs text-foreground/75 break-words font-[ui-monospace,'SF_Mono',Menlo,monospace] bg-[var(--hub-hover)] border border-[var(--hub-border)] rounded-md px-1.5 py-px inline-block max-w-full">
              {row.subject || "(no subject)"}
            </code>
          </div>
        )}

        {/* Actions — every row here is already matched to this client (the
            fetch is client_id-scoped), so there's no ambiguous/pick-block
            state to branch on the way the generic cross-client queue does. */}
        <div className={cn("flex gap-1.5 flex-wrap items-center shrink-0", mobile ? "w-full mt-2" : "ml-auto")}>
          <Button
            size="sm"
            className={cn(mobile && "flex-1 min-h-[44px]")}
            onClick={onConfirm}
          >
            Confirm
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(mobile && "min-h-[44px]")}
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
