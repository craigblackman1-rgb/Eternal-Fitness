"use client";

import { useState } from "react";
import { HubCard, HubCardHeader } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconPlus, IconAlertCircle, IconPencil } from "@/components/icons";
import { toast } from "sonner";
import type { TrainingRuleBucket, TrainingRuleType } from "@/types";

const BUCKET_LABELS: Record<TrainingRuleBucket, string> = {
  exclusion: "Exclusion",
  restriction: "Restriction",
  emphasis: "Emphasis",
  structural: "Structural",
  coaching_style: "Coaching style",
  general: "General",
};

const BUCKET_OPTIONS = Object.keys(BUCKET_LABELS) as TrainingRuleBucket[];

const BUCKET_STATUS_MAP: Record<TrainingRuleBucket, string> = {
  exclusion: "danger",
  restriction: "warning",
  emphasis: "primary",
  structural: "neutral",
  coaching_style: "success",
  general: "neutral",
};

interface TrainingRuleTypesManagerProps {
  initialRuleTypes: TrainingRuleType[];
}

export function TrainingRuleTypesManager({ initialRuleTypes }: TrainingRuleTypesManagerProps) {
  const [ruleTypes, setRuleTypes] = useState(initialRuleTypes);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState("");
  const [bucket, setBucket] = useState<TrainingRuleBucket>("exclusion");
  const [description, setDescription] = useState("");

  async function addRuleType() {
    if (!label.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/rule-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), bucket, description: description.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add rule type");
      const created = await res.json();
      setRuleTypes((prev) => [...prev, created].sort((a, b) => a.bucket.localeCompare(b.bucket) || a.label.localeCompare(b.label)));
      setLabel("");
      setDescription("");
      setAdding(false);
      toast.success("Rule type added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add rule type");
    } finally {
      setSaving(false);
    }
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editBucket, setEditBucket] = useState<TrainingRuleBucket>("exclusion");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function startEdit(rt: TrainingRuleType) {
    setEditingId(rt.id);
    setEditLabel(rt.label);
    setEditBucket(rt.bucket as TrainingRuleBucket);
    setEditDescription(rt.description ?? "");
  }

  async function saveEdit() {
    if (!editLabel.trim() || !editingId) return;
    setEditSaving(true);
    const original = ruleTypes.find((rt) => rt.id === editingId);
    const updated = { label: editLabel.trim(), bucket: editBucket, description: editDescription.trim() || null };
    setRuleTypes((prev) =>
      prev
        .map((rt) => (rt.id === editingId ? { ...rt, ...updated } : rt))
        .sort((a, b) => a.bucket.localeCompare(b.bucket) || a.label.localeCompare(b.label))
    );
    try {
      const res = await fetch(`/api/rule-types/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update rule type");
      toast.success("Rule type updated");
      setEditingId(null);
    } catch (err) {
      setRuleTypes((prev) =>
        prev.map((rt) => (rt.id === editingId ? original! : rt)).sort((a, b) => a.bucket.localeCompare(b.bucket) || a.label.localeCompare(b.label))
      );
      toast.error(err instanceof Error ? err.message : "Failed to update rule type");
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleActive(ruleType: TrainingRuleType) {
    const next = !ruleType.active;
    setRuleTypes((prev) => prev.map((rt) => (rt.id === ruleType.id ? { ...rt, active: next } : rt)));
    const res = await fetch(`/api/rule-types/${ruleType.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    if (!res.ok) {
      setRuleTypes((prev) => prev.map((rt) => (rt.id === ruleType.id ? { ...rt, active: !next } : rt)));
      toast.error("Failed to update rule type");
    }
  }

  return (
    <HubCard padded={false}>
      <HubCardHeader
        icon={<IconAlertCircle className="w-4 h-4" />}
        title="Rule types"
        subtitle={`${ruleTypes.length} type${ruleTypes.length !== 1 ? 's' : ''} across ${new Set(ruleTypes.map((rt) => rt.bucket)).size} bucket${new Set(ruleTypes.map((rt) => rt.bucket)).size !== 1 ? 's' : ''}`}
        color="amber"
        action={
          <Button size="sm" className="gap-1.5 rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold h-auto py-1.5 px-3" onClick={() => setAdding((v) => !v)}>
            <IconPlus className="h-4 w-4" />
            Add rule type
          </Button>
        }
        className="px-5 pt-5"
        divider
      />
      <div className="px-5 py-4 space-y-4">
        {adding && (
          <div className="space-y-3 rounded-xl border border-[var(--hub-border)] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Label</Label>
                <Input className="h-9 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Breathing cue requirement" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Bucket</Label>
                <Select value={bucket} onValueChange={(v: TrainingRuleBucket) => setBucket(v)}>
                  <SelectTrigger className="h-9 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUCKET_OPTIONS.map((b) => (
                      <SelectItem key={b} value={b}>{BUCKET_LABELS[b]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Description (shown to trainers when picking this type)</Label>
              <Textarea className="rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="rounded-lg" onClick={() => setAdding(false)}>Cancel</Button>
              <Button className="rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold" onClick={addRuleType} disabled={saving || !label.trim()}>Save</Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                <th className="text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-5">Label</th>
                <th className="text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-5">Bucket</th>
                <th className="text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-5">Description</th>
                <th className="text-right font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-5">Active</th>
                <th className="text-center font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-3 w-[52px]">Edit</th>
              </tr>
            </thead>
            <tbody>
              {ruleTypes.map((rt) => {
                const isEditing = editingId === rt.id;
                return (
                  <tr key={rt.id} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)] transition-colors">
                    {isEditing ? (
                      <>
                        <td className="py-2 px-5">
                          <Input
                            className="h-8 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30 text-sm"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-5">
                          <Select value={editBucket} onValueChange={(v: TrainingRuleBucket) => setEditBucket(v)}>
                            <SelectTrigger className="h-8 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {BUCKET_OPTIONS.map((b) => (
                                <SelectItem key={b} value={b}>{BUCKET_LABELS[b]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 px-5">
                          <Textarea
                            className="rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30 text-sm"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={1}
                          />
                        </td>
                        <td className="py-2 px-5 text-right">
                          <Switch checked={rt.active} onCheckedChange={() => toggleActive(rt)} />
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button size="sm" className="h-7 rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold text-xs px-2.5" onClick={saveEdit} disabled={editSaving || !editLabel.trim()}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-5 font-semibold text-foreground">{rt.label}</td>
                        <td className="py-3 px-5">
                          <span
                            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                            style={{
                              borderColor: `var(--status-${BUCKET_STATUS_MAP[rt.bucket]}-border)`,
                              backgroundColor: `var(--status-${BUCKET_STATUS_MAP[rt.bucket]}-bg)`,
                              color: `var(--status-${BUCKET_STATUS_MAP[rt.bucket]})`,
                            }}
                          >{BUCKET_LABELS[rt.bucket]}</span>
                        </td>
                        <td className="py-3 px-5 text-sm text-muted-foreground max-w-md">{rt.description ?? "—"}</td>
                        <td className="py-3 px-5 text-right">
                          <Switch checked={rt.active} onCheckedChange={() => toggleActive(rt)} />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--hub-hover)]"
                            onClick={() => startEdit(rt)}
                            title="Edit rule type"
                          >
                            <IconPencil className="h-4 w-4" />
                          </Button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </HubCard>
  );
}
