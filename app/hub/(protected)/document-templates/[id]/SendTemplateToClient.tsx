"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconSend } from "@/components/icons";
import { toast } from "sonner";
import type { DocumentKind } from "@/lib/documents/types";

interface ClientOption { client_number: number; name: string }

/** Creates a draft document for the chosen client, then hands off to the real
 *  document page — the same Send/Resend/Copy-link UI as everywhere else in the
 *  hub, including the "Not delivered" indicator if the send doesn't actually
 *  go out. This used to fake its own "sent" status here (action: "send", no
 *  real email, just a clipboard copy) — that's what made a document show as
 *  "sent" when nothing had actually been emailed. Not duplicating that logic
 *  anymore; this is a shortcut to the real flow, not a second one. */
export function SendTemplateToClient({ kind, clients }: { kind: DocumentKind; clients: ClientOption[] }) {
  const router = useRouter();
  const [clientNumber, setClientNumber] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!clientNumber) { toast.error("Choose a client"); return; }
    setBusy(true);
    try {
      const createRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientNumber: Number(clientNumber), kind }),
      });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || "Failed to create document");

      router.push(`/hub/clients/${clientNumber}/documents/${created.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Create this document as a draft for a client, then send or copy the link from there — the same as
        doing it from their profile.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <Label>Client</Label>
          <Select value={clientNumber} onValueChange={setClientNumber}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Choose a client…" /></SelectTrigger>
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
      </div>
    </div>
  );
}
