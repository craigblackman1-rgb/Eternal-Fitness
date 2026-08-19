"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconEdit3, IconTrash2, IconSend, IconEye } from "@/components/icons";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { toast } from "sonner";

interface UpdateRowActionsProps {
  clientNumber: number;
  updateId: string;
  status: string;
  hasEmail: boolean;
  subject: string;
  body_html: string;
}

/** Edit / Send-now / Resend / Delete controls for an update row, plus a read-only Preview dialog.
 *  Edit + Send-now show only for draft/scheduled/failed; Resend shows only once sent;
 *  Delete is available on any update; Preview is available on every update regardless of status. */
export function UpdateRowActions({ clientNumber, updateId, status, hasEmail, subject, body_html }: UpdateRowActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const editable = status === "draft" || status === "scheduled" || status === "failed";
  const resendable = status === "sent";

  const handleSendNow = async (isResend: boolean) => {
    if (!hasEmail) return toast.error("This update has no recipient — open it to add one");
    if (!confirm(isResend ? "Resend this update to the client?" : "Send this update to the client now?")) return;
    setBusy(isResend ? "resend" : "send");
    try {
      const res = await fetch(`/api/updates/${updateId}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to send");
      toast.success(data.emailed ? (isResend ? "Update resent" : "Update sent") : "Email sending isn't configured — logged without sending");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete this ${status} update? This can't be undone.`)) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/updates/${updateId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete");
      toast.success("Update deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg gap-1.5 h-8"
          onClick={() => setPreviewOpen(true)}
          disabled={busy !== null}
        >
          <IconEye className="h-3.5 w-3.5" />
          Preview
        </Button>
        {editable && (
          <>
            <Link href={`/hub/clients/${clientNumber}/updates/${updateId}/edit`}>
              <Button variant="outline" size="sm" className="rounded-lg gap-1.5 h-8" disabled={busy !== null}>
                <IconEdit3 className="h-3.5 w-3.5" />
                Edit
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="rounded-lg gap-1.5 h-8" onClick={() => handleSendNow(false)} disabled={busy !== null}>
              <IconSend className="h-3.5 w-3.5" />
              {busy === "send" ? "Sending…" : "Send now"}
            </Button>
          </>
        )}
        {resendable && (
          <Button variant="outline" size="sm" className="rounded-lg gap-1.5 h-8" onClick={() => handleSendNow(true)} disabled={busy !== null}>
            <IconSend className="h-3.5 w-3.5" />
            {busy === "resend" ? "Resending…" : "Resend"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="rounded-lg h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={busy !== null}
          title="Delete"
        >
          <IconTrash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="truncate">{subject}</DialogTitle>
              <StatusBadge status={status} />
            </div>
          </DialogHeader>
          <div className="border border-border/60 rounded-[12px] overflow-hidden bg-[#F5F5F5]">
            <iframe
              srcDoc={body_html || "<p>No content</p>"}
              title="Update preview"
              className="w-full"
              style={{ height: "75vh", border: "none" }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
