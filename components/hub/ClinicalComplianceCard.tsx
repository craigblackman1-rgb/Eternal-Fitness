"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconCheckCircle, IconPencil, IconX } from "@/components/icons";
import { toast } from "sonner";
import type { MedicalClearanceStatus, RiskLevel } from "@/types";

interface Fields {
  medical_clearance_status: MedicalClearanceStatus;
  risk_level: RiskLevel;
  exercise_modifications: string | null;
}

interface ClinicalComplianceCardProps {
  clientId: string;
  initial: Fields;
}

const clearanceLabel: Record<MedicalClearanceStatus, string> = {
  cleared: "Cleared",
  pending: "Pending",
  not_required: "Not required",
  not_yet_requested: "Not yet requested",
};

const clearanceTone: Record<MedicalClearanceStatus, string> = {
  cleared: "text-[var(--status-success-text)]",
  pending: "text-[var(--status-warning-text)]",
  not_required: "text-muted-foreground",
  not_yet_requested: "text-[var(--status-warning-text)]",
};

const riskTone: Record<RiskLevel, string> = {
  low: "text-[var(--status-success-text)]",
  medium: "text-[var(--status-warning-text)]",
  high: "text-[var(--status-danger)]",
};

export function ClinicalComplianceCard({ clientId, initial }: ClinicalComplianceCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Fields>(initial);

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to save" }));
      toast.error(`Failed to save: ${err.error}`);
      return;
    }
    toast.success("Clinical status updated");
    setEditing(false);
    router.refresh();
  };

  const cancel = () => {
    setForm(initial);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Medical clearance</Label>
            <Select value={form.medical_clearance_status} onValueChange={(v: MedicalClearanceStatus) => setForm((f) => ({ ...f, medical_clearance_status: v }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="not_required">Not required</SelectItem>
                <SelectItem value="not_yet_requested">Not yet requested</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Risk level</Label>
            <Select value={form.risk_level} onValueChange={(v: RiskLevel) => setForm((f) => ({ ...f, risk_level: v }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Exercise modifications</Label>
          <Textarea
            value={form.exercise_modifications ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, exercise_modifications: e.target.value || null }))}
            rows={2}
            placeholder="Specific modifications to apply across sessions…"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={cancel} disabled={saving} className="rounded-lg gap-1.5 border-border/60">
            <IconX className="h-3.5 w-3.5" /> Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving} className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white">
            <IconCheckCircle className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
        <div>
          <span className="text-xs text-muted-foreground block mb-0.5">Medical clearance</span>
          <span className={`font-semibold ${clearanceTone[initial.medical_clearance_status]}`}>{clearanceLabel[initial.medical_clearance_status]}</span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground block mb-0.5">Risk level</span>
          <span className={`font-semibold capitalize ${riskTone[initial.risk_level]}`}>{initial.risk_level}</span>
        </div>
        <div className="flex items-start justify-end sm:col-span-1 col-span-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-7 gap-1.5 text-xs text-muted-foreground">
            <IconPencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      </div>
      {initial.exercise_modifications && (
        <div>
          <span className="text-xs text-muted-foreground block mb-0.5">Exercise modifications</span>
          <p className="text-foreground text-sm">{initial.exercise_modifications}</p>
        </div>
      )}
    </div>
  );
}
