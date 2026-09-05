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
    title: string | null;
  };
  /** Current number of pot sessions in the block. */
  sessionCount: number;
  /** Number of completed or charged sessions (consumed slots). */
  completedSessions: number;
  /** ISO date of the block's scheduled start, or null. */
  scheduledStartIso: string | null;
}

export function EditBlockDrawer({ open, onOpenChange, block, sessionCount, completedSessions, scheduledStartIso }: EditBlockDrawerProps) {
  const router = useRouter();
  const [title, setTitle] = useState(block.title ?? "");
  const [blockNote, setBlockNote] = useState(block.block_note ?? "");
  const [summary, setSummary] = useState(block.summary ?? "");
  const [status, setStatus] = useState<BlockStatus>(block.status);
  const [newSessionCount, setNewSessionCount] = useState(sessionCount);
  const [scheduledStart, setScheduledStart] = useState(
    scheduledStartIso ? scheduledStartIso.split("T")[0] : "",
  );
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTitle(block.title ?? "");
      setBlockNote(block.block_note ?? "");
      setSummary(block.summary ?? "");
      setStatus(block.status);
      setNewSessionCount(sessionCount);
      setScheduledStart(scheduledStartIso ? scheduledStartIso.split("T")[0] : "");
    }
    onOpenChange(next);
  };

  const countChanged = newSessionCount !== sessionCount;
  const countValid = newSessionCount >= completedSessions;
  const countError = countChanged && !countValid
    ? `Cannot reduce below ${completedSessions} — ${completedSessions} session(s) already completed or charged.`
    : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save block metadata (title, note, summary, status, scheduled_start)
      const patchBody: Record<string, unknown> = { title: title.trim() || null, block_note: blockNote, summary, status };
      if (scheduledStart) {
        patchBody.scheduled_start = new Date(scheduledStart + "T00:00:00").toISOString();
      } else {
        patchBody.scheduled_start = null;
      }
      const res = await fetch(`/api/blocks/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save block");
      }

      // 2. Adjust session count if changed
      if (countChanged) {
        const adjRes = await fetch(`/api/blocks/${block.id}/adjust-sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_count: newSessionCount }),
        });
        if (!adjRes.ok) {
          const err = await adjRes.json();
          throw new Error(err.error || "Failed to adjust sessions");
        }
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
              <SheetDescription className="text-xs">Block properties, dates, and session count.</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Block name — CR-EF-153 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ebTitle" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Block name
            </label>
            <span className="text-[11.5px] font-medium text-muted-foreground normal-case tracking-normal">
              Shown everywhere instead of &ldquo;Block {block.block_number}&rdquo;. Leave blank to show the block&apos;s date span instead.
            </span>
            <input
              id="ebTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="e.g. Full-body strength"
              className="w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
            />
          </div>

          {/* Session count */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ebSessionCount" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Sessions in block
            </label>
            <span className="text-[11.5px] font-medium text-muted-foreground normal-case tracking-normal">
              {completedSessions > 0
                ? `${completedSessions} already completed or charged — minimum is ${completedSessions}.`
                : "No sessions consumed yet — all slots are free to adjust."}
            </span>
            <input
              id="ebSessionCount"
              type="number"
              min={completedSessions}
              max={18}
              value={newSessionCount}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) setNewSessionCount(v);
              }}
              className="w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30 tabular-nums"
            />
            {countError && (
              <p className="text-xs text-destructive mt-0.5">{countError}</p>
            )}
          </div>

          {/* Scheduled start */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ebScheduledStart" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Scheduled start date
            </label>
            <span className="text-[11.5px] font-medium text-muted-foreground normal-case tracking-normal">
              When this block begins. Sessions are booked against this timeline.
            </span>
            <input
              id="ebScheduledStart"
              type="date"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              className="w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
            />
          </div>

          {/* Block note */}
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

          {/* Summary */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ebSummary" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Summary
            </label>
            <span className="text-[11.5px] font-medium text-muted-foreground normal-case tracking-normal">
              One-line aim for the whole block.
            </span>
            <Textarea
              id="ebSummary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Build confident sit-to-stand and stairs tolerance ahead of the August holiday."
              className="min-h-[84px] resize-y rounded-lg text-sm"
            />
          </div>

          {/* Status */}
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
          <Button
            size="sm"
            className="rounded-lg bg-rose hover:bg-rose/90 text-white"
            onClick={handleSave}
            disabled={saving || (countChanged && !countValid)}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
