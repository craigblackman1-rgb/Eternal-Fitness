"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconPlus } from "@/components/icons";
import { toast } from "sonner";
import { DOCUMENT_KIND_LABEL, type DocumentKind } from "@/lib/documents/types";

// Kinds that have a template seeded. Exported so other document-creation
// entry points (e.g. the cross-client Documents screen's "New document"
// drawer) offer exactly the same real, creatable set — never a hand-kept
// second copy that can drift from this one.
export const AVAILABLE_KINDS: DocumentKind[] = ["parq", "terms", "remote_coaching", "intake_form", "fortnightly_checkin", "endurance_block", "risk_assessment", "annual_review", "consent", "feedback", "leg_pain_questionnaire"];

export function NewDocumentButton({ clientNumber }: { clientNumber: number }) {
  const router = useRouter();
  const [kind, setKind] = useState<DocumentKind>(AVAILABLE_KINDS[0]);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientNumber, kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create document");
      router.push(`/hub/clients/${clientNumber}/documents/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={kind} onValueChange={(v: DocumentKind) => setKind(v)}>
        <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
        <SelectContent>
          {AVAILABLE_KINDS.map((k) => (
            <SelectItem key={k} value={k}>{DOCUMENT_KIND_LABEL[k]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={create} disabled={creating} className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white">
        <IconPlus className="h-4 w-4" />
        {creating ? "Creating…" : "Create document"}
      </Button>
    </div>
  );
}
