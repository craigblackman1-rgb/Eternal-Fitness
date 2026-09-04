"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconZap, IconLoader2 } from "@/components/icons";
import { toast } from "sonner";

/** A client that can receive an assigned template. `client_number` is the Plan
 *  Agent's external handle (what `/api/claude/generate-block` takes as `clientId`);
 *  `conditions` drives the condition descriptor shown beside the name. */
export interface AssignableClient {
  id: string;
  name: string;
  client_number: number | null;
  conditions: string[];
}

interface RawClient {
  id: string;
  name: string;
  client_number: number | null;
  profile?: { health?: { conditions?: unknown } } | null;
}

/** Fetch clients and narrow to those the Plan Agent can ground a block against.
 *  Mirrors the `/api/clients` shape (full rows, not a trimmed list). */
export function useAssignableClients(): AssignableClient[] {
  const [clients, setClients] = useState<AssignableClient[]>([]);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((rows: RawClient[]) => {
        if (!Array.isArray(rows)) {
          setClients([]);
          return;
        }
        setClients(
          rows
            .filter((c) => typeof c.client_number === "number")
            .map((c) => {
              const raw = c.profile?.health?.conditions;
              const conditions = Array.isArray(raw)
                ? raw.filter((x): x is string => typeof x === "string")
                : [];
              return { id: c.id, name: c.name, client_number: c.client_number, conditions };
            }),
        );
      })
      .catch(() => {});
  }, []);

  return clients;
}

/** Shared assign-to-client dialog for the browser drawer and the paste review step.
 *  Renders nothing of its own when closed — the parent mounts it conditionally so
 *  its select state resets on each open. `onAssigned` is where callers add
 *  caller-specific follow-up (close the drawer, advance to a success pane). */
export function TemplateAssignDialog({
  templateId,
  templateName,
  clients,
  onClose,
  onAssigned,
}: {
  templateId: string;
  templateName: string;
  clients: AssignableClient[];
  onClose: () => void;
  onAssigned?: (clientName: string) => void;
}) {
  const [clientNumber, setClientNumber] = useState("");
  const [assigning, setAssigning] = useState(false);

  const assign = async () => {
    if (!templateId || !clientNumber) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/claude/generate-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientNumber, templateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assignment failed");
      const client = clients.find((c) => String(c.client_number) === clientNumber);
      const name = client?.name ?? "the client";
      toast.success(`Assigned to ${name} — block generated via the Plan Agent.`);
      onAssigned?.(name);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => !assigning && onClose()}
      />
      <div className="relative w-full max-w-md rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-6 shadow-xl">
        <h3 className="text-lg font-bold text-[var(--color-ink)]">Assign template to a client</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Grounds this template into the client&apos;s next block through the Plan Agent.
        </p>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Client
        </label>
        <select
          value={clientNumber}
          onChange={(e) => setClientNumber(e.target.value)}
          className="h-9 w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2 text-sm outline-none focus:border-rose"
        >
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={String(c.client_number)}>
              {c.name}
              {c.conditions.length ? ` — ${c.conditions.join(", ")}` : ""}
            </option>
          ))}
        </select>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={assigning}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={assign}
            disabled={assigning || !clientNumber || !templateId}
            className="gap-1.5 bg-rose hover:bg-rose/90 text-white"
          >
            {assigning ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconZap className="h-4 w-4" />}
            {assigning ? "Generating block…" : "Assign"}
          </Button>
        </div>
      </div>
    </div>
  );
}
