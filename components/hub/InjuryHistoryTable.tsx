"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconPlus, IconTrash2 } from "@/components/icons";
import type { InjuryHistoryEntry } from "@/types";

interface InjuryHistoryTableProps {
  value: InjuryHistoryEntry[];
  onChange: (value: InjuryHistoryEntry[]) => void;
}

function newEntry(): InjuryHistoryEntry {
  return {
    id: crypto.randomUUID(),
    date: null,
    description: "",
    body_area: "",
    status: "active",
  };
}

export function InjuryHistoryTable({ value, onChange }: InjuryHistoryTableProps) {
  const update = (id: string, updates: Partial<InjuryHistoryEntry>) => {
    onChange(value.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)));
  };

  const remove = (id: string) => onChange(value.filter((entry) => entry.id !== id));

  const add = () => onChange([...value, newEntry()]);

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">No injuries logged yet.</p>
      )}
      {value.map((entry) => (
        <div key={entry.id} className="grid grid-cols-1 gap-2 rounded-lg border border-[var(--hub-border)] p-3 md:grid-cols-[auto_1fr_1fr_auto_auto]">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Date</label>
            <Input
              type="date"
              value={entry.date ?? ""}
              onChange={(e) => update(entry.id, { date: e.target.value || null })}
              className="md:w-36 border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Description</label>
            <Input
              value={entry.description}
              onChange={(e) => update(entry.id, { description: e.target.value })}
              placeholder="e.g. Right shoulder impingement"
              className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Body area</label>
            <Input
              value={entry.body_area}
              onChange={(e) => update(entry.id, { body_area: e.target.value })}
              placeholder="e.g. Shoulder"
              className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={entry.status} onValueChange={(v: InjuryHistoryEntry["status"]) => update(entry.id, { status: v })}>
               <SelectTrigger className="md:w-32 border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="monitoring">Monitoring</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(entry.id)} className="text-muted-foreground hover:text-destructive">
              <IconTrash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="gap-1.5 rounded-pill border-border/60">
        <IconPlus className="h-4 w-4" />
        Add injury
      </Button>
    </div>
  );
}
