"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconPlus, IconTrash2 } from "@/components/icons";
import type { MedicationEntry } from "@/types";

interface MedicationTableProps {
  value: MedicationEntry[];
  onChange: (value: MedicationEntry[]) => void;
}

function newEntry(): MedicationEntry {
  return {
    id: crypto.randomUUID(),
    name: "",
    form: "",
    frequency: "",
    treats: "",
    start_date: null,
    end_date: null,
    side_effects: "",
  };
}

const FORM_OPTIONS = ["Tablet", "Capsule", "Injection", "Inhaler", "Topical", "Liquid", "Patch", "Drops", "Other"];

export function MedicationTable({ value, onChange }: MedicationTableProps) {
  const update = (id: string, updates: Partial<MedicationEntry>) => {
    onChange(value.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)));
  };

  const remove = (id: string) => onChange(value.filter((entry) => entry.id !== id));

  const add = () => onChange([...value, newEntry()]);

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">No medications logged yet.</p>
      )}
      {value.map((entry) => (
        <div key={entry.id} className="grid grid-cols-1 gap-2 rounded-lg border border-[var(--hub-border)] p-3 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Medication name</label>
            <Input
              value={entry.name}
              onChange={(e) => update(entry.id, { name: e.target.value })}
              placeholder="e.g. Metformin"
              className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Form</label>
            <Select value={entry.form || undefined} onValueChange={(v) => update(entry.id, { form: v })}>
              <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30">
                <SelectValue placeholder="Select form..." />
              </SelectTrigger>
              <SelectContent>
                {FORM_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(entry.id)} className="text-muted-foreground hover:text-destructive">
              <IconTrash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Frequency</label>
            <Input
              value={entry.frequency}
              onChange={(e) => update(entry.id, { frequency: e.target.value })}
              placeholder="e.g. Once daily, Twice daily"
              className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Treats</label>
            <Input
              value={entry.treats}
              onChange={(e) => update(entry.id, { treats: e.target.value })}
              placeholder="e.g. Type 2 diabetes"
              className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Side effects</label>
            <Input
              value={entry.side_effects}
              onChange={(e) => update(entry.id, { side_effects: e.target.value })}
              placeholder="e.g. Dizziness, fatigue"
              className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Start date</label>
            <Input
              type="date"
              value={entry.start_date ?? ""}
              onChange={(e) => update(entry.id, { start_date: e.target.value || null })}
              className="md:w-36 border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">End date</label>
            <Input
              type="date"
              value={entry.end_date ?? ""}
              onChange={(e) => update(entry.id, { end_date: e.target.value || null })}
              className="md:w-36 border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="gap-1.5 rounded-pill border-border/60">
        <IconPlus className="h-4 w-4" />
        Add medication
      </Button>
    </div>
  );
}
