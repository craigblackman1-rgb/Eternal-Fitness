"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { IconCalendar } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface BlockPickerBooking {
  subject: string;
  start_at: string;
}

export interface BlockPickerBlock {
  id: string;
  block_number: number;
  status: string;
  block_note: string | null;
}

interface BlockPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BlockPickerBooking | null;
  blocks: BlockPickerBlock[];
  /** All blocks (including completed) for the "all complete" empty state. */
  allBlocks?: BlockPickerBlock[];
  blocksLoading: boolean;
  clientName: string;
  onConfirm: (blockId: string) => void | Promise<void>;
}

function formatWhenShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Shared confirm dialog for attaching an Outlook booking to a training block.
 * Extracted from ClientBookingPanel and OutlookBookingsQueue to prevent
 * wording drift (CR-EF-137).
 */
export function BlockPickerDialog({
  open,
  onOpenChange,
  booking,
  blocks,
  allBlocks,
  blocksLoading,
  clientName,
  onConfirm,
}: BlockPickerDialogProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedBlockId(null);
      setConfirming(false);
    }
  }, [open]);

  async function handleConfirm() {
    if (!selectedBlockId) return;
    setConfirming(true);
    try {
      await onConfirm(selectedBlockId);
    } finally {
      setConfirming(false);
    }
  }

  const allActive = blocks.length > 0 && blocks.every((b) => b.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-[var(--status-success-bg)] text-[var(--status-success-text)] flex items-center justify-center shrink-0">
              <IconCalendar className="w-[17px] h-[17px]" />
            </div>
            <div>
              <DialogTitle>Attach to session</DialogTitle>
              {booking && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {booking.subject} · {formatWhenShort(booking.start_at)} {formatTime(booking.start_at)}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>
        <p className="text-[12.5px] text-muted-foreground">
          {blocks.length > 0 && allActive
            ? "Pick which active block this Outlook booking belongs to."
            : blocks.length > 0
              ? "Pick which block this Outlook booking belongs to."
              : ""}
        </p>
        {blocksLoading ? (
          <p className="text-sm text-muted-foreground">Loading blocks…</p>
        ) : blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {allBlocks && allBlocks.length > 0
              ? `${clientName} has no open block — all ${allBlocks.length} block${allBlocks.length === 1 ? "" : "s"} ${allBlocks.length === 1 ? "is" : "are"} complete. Create a new block first.`
              : `${clientName} has no blocks yet — create one first.`}
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
                    {b.status !== "active" && (
                      <span className="font-normal text-muted-foreground"> · {b.status}</span>
                    )}
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedBlockId || confirming || blocks.length === 0}>
            {confirming ? "Confirming…" : "Confirm & attach"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
