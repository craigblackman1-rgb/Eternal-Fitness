"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IconPencil } from "@/components/icons";
import { toast } from "sonner";
import type { BlockStatus } from "@/types";

interface EditBlockDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: {
    id: string;
    block_number: number;
    block_note: string | null;
    summary: string | null;
    status: BlockStatus;
  };
}

export function EditBlockDrawer({ open, onOpenChange, block }: EditBlockDrawerProps) {
  const router = useRouter();
  const [blockNote, setBlockNote] = useState(block.block_note ?? "");
  const [summary, setSummary] = useState(block.summary ?? "");
  const [status, setStatus] = useState<BlockStatus>(block.status);
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setBlockNote(block.block_note ?? "");
      setSummary(block.summary ?? "");
      setStatus(block.status);
    }
    onOpenChange(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/blocks/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block_note: blockNote, summary, status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Block saved");
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-4 space-y-1.5 border-b border-[var(--hub-border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-rose/10 text-rose flex items-center justify-center shrink-0">
              <IconPencil className="w-4.5 h-4.5" />
            </div>
            <div>
              <SheetTitle className="text-[15px] font-bold leading-tight">Edit Block {block.block_number}</SheetTitle>
              <SheetDescription className="text-xs">Block properties only — sessions are edited separately.</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ebNote" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Block note
            </label>
            <span className="text-[11.5px] font-medium text-muted-foreground normal-case tracking-normal">
              Free text — visible on the overview &ldquo;Block Note&rdquo; card.
            </span>
            <Textarea
              id="ebNote"
              value={blockNote}
              onChange={(e) => setBlockNote(e.target.value)}
              className="min-h-[84px] resize-y rounded-lg text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ebSummary" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Summary
            </label>
            <span className="text-[11.5px] font-medium text-muted-foreground normal-case tracking-normal">
              One-line aim for the whole block. New to the hub UI.
            </span>
            <Textarea
              id="ebSummary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Build confident sit-to-stand and stairs tolerance ahead of the August holiday."
              className="min-h-[84px] resize-y rounded-lg text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ebStatus" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Block status
            </label>
            <span className="text-[11.5px] font-medium text-muted-foreground normal-case tracking-normal">
              Normally set by the Approve action on /review. Manual override is included here <strong>only to correct a status set in error</strong> — it is not a routine control.
            </span>
            <select
              id="ebStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value as BlockStatus)}
              className="w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
            >
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="complete">Complete</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5 border-t border-[var(--hub-border)] bg-[var(--hub-card)]">
          <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <div className="flex-1" />
          <Button size="sm" className="rounded-lg bg-rose hover:bg-rose/90 text-white" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
