"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { GpLetterStatus } from "@/types";

interface GpLetterCardProps {
  clientId: string;
  gpLetterStatus: GpLetterStatus;
  requestedDate: string | null;
  receivedDate: string | null;
  /** The Health drawer's "Cleared to train" card already owns gp_letter_status
   *  editing (it sits alongside medical clearance and risk level, which this
   *  card knows nothing about). Defaults to true so this card never grows a
   *  second status editor for the same field — it only ever adds the
   *  requested/received dates that card can't edit. */
  hideStatusControl?: boolean;
}

export function GpLetterCard({ clientId, gpLetterStatus, requestedDate, receivedDate, hideStatusControl = true }: GpLetterCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<GpLetterStatus>(gpLetterStatus);
  const [requested, setRequested] = useState(requestedDate ?? "");
  const [received, setReceived] = useState(receivedDate ?? "");
  const [saving, setSaving] = useState(false);

  // The Health drawer keeps this mounted while closed, so its own props
  // change on every router.refresh() (including one triggered by
  // ClearedToTrainCard editing gp_letter_status) without this component
  // remounting. Keep local state in step rather than freezing at first mount.
  useEffect(() => setStatus(gpLetterStatus), [gpLetterStatus]);
  useEffect(() => setRequested(requestedDate ?? ""), [requestedDate]);
  useEffect(() => setReceived(receivedDate ?? ""), [receivedDate]);

  // Used for the "show date fields" conditionals below: when this card owns
  // the select, its own optimistic `status` is authoritative between save and
  // refresh; when it doesn't, always defer to the prop.
  const effectiveStatus = hideStatusControl ? gpLetterStatus : status;

  const save = async (updates: Partial<{ gp_letter_status: GpLetterStatus; gp_letter_requested_date: string | null; gp_letter_received_date: string | null }>) => {
    setSaving(true);
    const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to save" }));
      toast.error(`Failed to save: ${err.error}`);
      return;
    }
    router.refresh();
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {hideStatusControl ? (
        // Reads straight from the prop, not the local `status` state below —
        // this card can go a long time between re-mounts (Health drawer
        // content stays mounted while closed) and status here is owned by
        // ClearedToTrainCard's own save, so this must never show a stale
        // value cached from first mount.
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">GP Letter</Label>
          <p className="text-sm font-medium text-foreground h-9 flex items-center">
            {gpLetterStatus === "received" ? "Received" : gpLetterStatus === "requested" ? "Requested" : "Not required"}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">GP Letter</Label>
          <Select
            value={status}
            onValueChange={(v: GpLetterStatus) => {
              setStatus(v);
              save({ gp_letter_status: v });
            }}
            disabled={saving}
          >
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="not_required">Not Required</SelectItem>
              <SelectItem value="requested">Requested</SelectItem>
              <SelectItem value="received">Received</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {effectiveStatus !== "not_required" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Requested</Label>
          <Input
            type="date"
            className="h-9"
            value={requested}
            disabled={saving}
            onChange={(e) => {
              setRequested(e.target.value);
              save({ gp_letter_requested_date: e.target.value || null });
            }}
          />
        </div>
      )}
      {effectiveStatus === "received" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Received</Label>
          <Input
            type="date"
            className="h-9"
            value={received}
            disabled={saving}
            onChange={(e) => {
              setReceived(e.target.value);
              save({ gp_letter_received_date: e.target.value || null });
            }}
          />
        </div>
      )}
    </div>
  );
}
