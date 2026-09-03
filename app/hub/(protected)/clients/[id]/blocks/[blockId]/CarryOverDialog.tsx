"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CarryOverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockId: string;
  blockNumber: number;
  clientId: string;
  remainingCount: number;
}

interface BlockOption {
  id: string;
  block_number: number;
  status: string;
  block_note: string | null;
}

/**
 * CR-EF-146 — dialog to carry remaining sessions from the current block
 * into an existing later block or a new one.
 *
 * "Remaining" = sessions that consumed no pot slot (not completed, not
 * charged-cancelled). After carry-over the source block shows correct
 * remaining (zero phantom sessions) and the target block has free-to-book
 * sessions available through the existing assignment flow.
 */
export function CarryOverDialog({
  open,
  onOpenChange,
  blockId,
  blockNumber,
  clientId,
  remainingCount,
}: CarryOverDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState<BlockOption[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>("new");

  // Fetch client's other blocks when the dialog opens
  useEffect(() => {
    if (!open) return;
    const fetchBlocks = async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/blocks`);
        if (res.ok) {
          const data = await res.json();
          // Filter out the current block and only show non-complete blocks
          setBlocks(
            (data as BlockOption[]).filter(
              (b) => b.id !== blockId && b.status !== "complete",
            ),
          );
        }
      } catch {
        // Silent — blocks list is best-effort
      }
    };
    fetchBlocks();
  }, [open, clientId, blockId]);

  const handleCarryOver = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (selectedBlockId !== "new") {
        body.target_block_id = selectedBlockId;
      }
      const res = await fetch(`/api/blocks/${blockId}/carry-over`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to carry over");
      }
      const result = await res.json();
      toast.success(result.message || "Sessions carried over");
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to carry over");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Carry over remaining sessions</DialogTitle>
          <DialogDescription className="text-sm">
            Move {remainingCount} remaining session{remainingCount === 1 ? "" : "s"} from Block {blockNumber} into another block. These sessions are unassigned and free to book through the existing scheduling flow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Target block
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] cursor-pointer hover:bg-[var(--hub-hover)] transition-colors">
              <input
                type="radio"
                name="carry-target"
                value="new"
                checked={selectedBlockId === "new"}
                onChange={() => setSelectedBlockId("new")}
                className="accent-rose"
              />
              <div>
                <span className="text-sm font-medium text-foreground">Create new block</span>
                <span className="text-xs text-muted-foreground ml-1.5">(Block {blocks.length > 0 ? Math.max(...blocks.map((b) => b.block_number)) + 1 : blockNumber + 1})</span>
              </div>
            </label>
            {blocks.map((b) => (
              <label
                key={b.id}
                className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] cursor-pointer hover:bg-[var(--hub-hover)] transition-colors"
              >
                <input
                  type="radio"
                  name="carry-target"
                  value={b.id}
                  checked={selectedBlockId === b.id}
                  onChange={() => setSelectedBlockId(b.id)}
                  className="accent-rose"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Block {b.block_number}</span>
                  <span className="text-xs text-muted-foreground ml-1.5 capitalize">{b.status}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="rounded-lg bg-rose hover:bg-rose/90 text-white"
            onClick={handleCarryOver}
            disabled={saving}
          >
            {saving ? "Carrying over..." : `Carry over ${remainingCount} session${remainingCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
