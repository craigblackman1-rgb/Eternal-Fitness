"use client";

import { useState } from "react";
import { HubCard, HubCardHeader } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconPlus, IconDumbbell, IconTrash2 } from "@/components/icons";
import { toast } from "sonner";
import type { StudioEquipment } from "@/types";

interface EquipmentManagerProps {
  initialEquipment: StudioEquipment[];
}

export function EquipmentManager({ initialEquipment }: EquipmentManagerProps) {
  const [equipment, setEquipment] = useState(initialEquipment);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [homeEquivalent, setHomeEquivalent] = useState("");

  const activeCount = equipment.filter((e) => e.active).length;

  async function addEquipment() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          detail: detail.trim() || null,
          home_equivalent: homeEquivalent.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add equipment");
      const created = await res.json();
      setEquipment((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setName("");
      setDetail("");
      setHomeEquivalent("");
      setAdding(false);
      toast.success("Equipment added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add equipment");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: StudioEquipment) {
    const next = !item.active;
    setEquipment((prev) => prev.map((e) => (e.id === item.id ? { ...e, active: next } : e)));
    const res = await fetch(`/api/equipment/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    if (!res.ok) {
      setEquipment((prev) => prev.map((e) => (e.id === item.id ? { ...e, active: !next } : e)));
      toast.error("Failed to update equipment");
    }
  }

  async function deleteEquipment(item: StudioEquipment) {
    setEquipment((prev) => prev.filter((e) => e.id !== item.id));
    const res = await fetch(`/api/equipment/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setEquipment((prev) =>
        [...prev, item].sort((a, b) => a.sort_order - b.sort_order),
      );
      toast.error("Failed to delete equipment");
    } else {
      toast.success("Equipment removed");
    }
  }

  return (
    <HubCard padded={false}>
      <HubCardHeader
        icon={<IconDumbbell className="w-4 h-4" />}
        title="Equipment"
        subtitle="Add, edit and toggle availability"
        color="teal"
        action={
          <Button size="sm" className="gap-1.5 rounded-lg bg-rose hover:bg-rose/90 text-white h-auto py-1.5 px-3 font-semibold" onClick={() => setAdding((v) => !v)}>
            <IconPlus className="h-4 w-4" />
            Add equipment
          </Button>
        }
        divider
        className="px-5 pt-5"
      />

      {adding && (
        <div className="px-5 py-4 border-b border-[var(--hub-border)] grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1.2fr_auto] md:items-end">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-foreground">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dumbbells"
              className="h-9 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-foreground">Detail</Label>
            <Input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="e.g. 2kg–40kg"
              className="h-9 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-foreground">Home equivalent</Label>
            <Input
              value={homeEquivalent}
              onChange={(e) => setHomeEquivalent(e.target.value)}
              placeholder="e.g. Resistance band"
              className="h-9 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30"
            />
          </div>
          <Button onClick={addEquipment} disabled={saving || !name.trim()} className="h-9 rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold shrink-0">
            Add equipment
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
              <th className="text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-5">Name</th>
              <th className="text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-5">Detail</th>
              <th className="text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-5">Home equivalent</th>
              <th className="text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-5 w-[110px]">Active</th>
              <th className="w-[56px] px-5" />
            </tr>
          </thead>
          <tbody>
            {equipment.map((item) => (
              <tr key={item.id} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)] transition-colors">
                <td className="py-3 px-5 font-semibold text-foreground">{item.name}</td>
                <td className="py-3 px-5 text-muted-foreground">{item.detail ?? "—"}</td>
                <td className="py-3 px-5 text-muted-foreground">{item.home_equivalent ?? "—"}</td>
                <td className="py-3 px-5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.active}
                    onClick={() => toggleActive(item)}
                    className={`relative inline-block w-10 h-[22px] shrink-0 rounded-full transition-colors duration-200 ${item.active ? "bg-[var(--status-success)]" : "bg-[var(--hub-field-border)]"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--status-success)]/40`}
                  >
                    <span
                      className={`absolute left-[3px] top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${item.active ? "translate-x-[18px]" : "translate-x-0"}`}
                    />
                  </button>
                </td>
                <td className="py-3 px-5 text-right">
                    <button
                      type="button"
                      title="Remove"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => deleteEquipment(item)}
                      className="w-[30px] h-[30px] rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground grid place-items-center hover:text-[var(--status-danger)] hover:border-[var(--status-danger-border)] transition-colors"
                  >
                    <IconTrash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HubCard>
  );
}
