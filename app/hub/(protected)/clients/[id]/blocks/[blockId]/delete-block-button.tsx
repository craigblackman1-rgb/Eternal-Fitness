"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { IconTrash2 } from "@/components/icons";
import { toast } from "sonner";

export function DeleteBlockButton({
  clientId,
  blockId,
}: {
  clientId: string;
  blockId: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/blocks/${blockId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Block deleted");
      router.push(`/hub/clients/${clientId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon">
          <IconTrash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[12px] shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--color-ink)]">Delete this block?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this block and all sessions inside
            it. This action cannot be undone.
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
  );
}
