"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconSend } from "@/components/icons";
import { toast } from "sonner";
import type { DocumentKind } from "@/lib/documents/types";

export interface ClientOption { client_number: number; name: string }

/** CR-EF-075: the same assign route as SendTemplateToClient, lifted to the
 *  library grid so it doesn't cost a hop through the template detail page.
 *  Deliberately identical behaviour: POST /api/documents to create a DRAFT for
 *  the chosen client, then hand off to that client's real document page. It
 *  does not send, and it does not mark anything sent — an earlier version of
 *  this route faked its own "sent" status with no email behind it, which is
 *  how documents showed as sent when nothing had gone out. Send / resend /
 *  copy-link all stay on the document page. */
export function AssignTemplateDialog({
  open,
  onOpenChange,
  kind,
  templateName,
  clients,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: DocumentKind;
  templateName: string;
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [clientNumber, setClientNumber] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!clientNumber) { toast.error("Choose a client"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientNumber: Number(clientNumber), kind }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error || "Failed to create document");
      router.push(`/hub/clients/${clientNumber}/documents/${created.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[12px] shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-ink)]">Assign to a client</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Create this document as a draft for a client, then send or copy the link from there — the
          same as doing it from their profile.
        </p>
        <p className="text-xs text-muted-foreground -mt-1">
          Template: <span className="font-semibold text-foreground">{templateName}</span>
        </p>
        <div className="space-y-1.5">
          <Label>Client</Label>
          <Select value={clientNumber} onValueChange={setClientNumber}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Choose a client…" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.client_number} value={String(c.client_number)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={create} disabled={busy} className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white">
          <IconSend className="h-4 w-4" />
          {busy ? "Creating…" : "Create document"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
