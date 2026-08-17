"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { IconCopy, IconTrash2 } from "@/components/icons";
import { toast } from "sonner";

export function SessionRowActions({
  sessionId,
  sessionNumber,
}: {
  sessionId: string;
  sessionNumber: number;
}) {
  const router = useRouter();
  const [cloning, setCloning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleClone = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCloning(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/clone`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to clone session");
      }
      toast.success("Session cloned");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clone session");
    }
    setCloning(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete session");
      }
      toast.success("Session deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete session");
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleClone}
        disabled={cloning}
        title="Clone session"
        className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:text-foreground hover:bg-[var(--hub-hover)] transition-colors disabled:opacity-50"
      >
        <IconCopy className="h-3.5 w-3.5" />
      </button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            title="Delete session"
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:text-[var(--status-danger-solid)] hover:bg-[var(--hub-hover)] transition-colors"
          >
            <IconTrash2 className="h-3.5 w-3.5" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent
          className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-2xl shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--color-ink)]">Delete session {sessionNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes this session and any logged sets against it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-[var(--status-danger-solid)] text-[var(--status-danger-solid-fg)] hover:opacity-90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
