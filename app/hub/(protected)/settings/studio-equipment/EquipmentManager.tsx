"use client";

import { useState, useRef } from "react";
import { HubCard, HubCardHeader } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconDumbbell, IconTrash2 } from "@/components/icons";
import { toast } from "sonner";
import type { StudioEquipment } from "@/types";

interface EquipmentManagerProps {
  initialEquipment: StudioEquipment[];
}

export function EquipmentManager({ initialEquipment }: EquipmentManagerProps) {
  const [equipment, setEquipment] = useState(initialEquipment);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [homeEquivalent, setHomeEquivalent] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

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
        divider
        className="px-5 pt-[14px]"
      />

      <form
        className="px-5 py-4 border-b border-[var(--hub-border)] grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1.2fr_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          addEquipment();
        }}
      >
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs font-semibold text-foreground" htmlFor="eqName">Name</Label>
          <Input
            ref={nameRef}
            id="eqName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dumbbells"
            className="h-9 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30 font-[inherit]"
          />
        </div>
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs font-semibold text-foreground" htmlFor="eqDetail">Detail</Label>
          <Input
            id="eqDetail"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="e.g. 2kg–40kg"
            className="h-9 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30 font-[inherit]"
          />
        </div>
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs font-semibold text-foreground" htmlFor="eqHome">Home equivalent</Label>
          <Input
            id="eqHome"
            value={homeEquivalent}
            onChange={(e) => setHomeEquivalent(e.target.value)}
            placeholder="e.g. Resistance band"
            className="h-9 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30 font-[inherit]"
          />
        </div>
        <Button
          type="submit"
          disabled={saving || !name.trim()}
          className="h-8 rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold shrink-0 px-3 text-[12.5px] leading-none inline-flex items-center gap-[6px]"
        >
          Add equipment
        </Button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] h-10 px-4 border-b border-[var(--hub-border)]">Name</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] h-10 px-4 border-b border-[var(--hub-border)]">Detail</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] h-10 px-4 border-b border-[var(--hub-border)]">Home equivalent</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] h-10 px-4 border-b border-[var(--hub-border)] w-[110px]">Active</th>
              <th className="w-[56px] px-4 border-b border-[var(--hub-border)]" />
            </tr>
          </thead>
          <tbody>
            {equipment.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No equipment added yet.
                </td>
              </tr>
            ) : (
              equipment.map((item) => (
                <tr key={item.id} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)] transition-colors">
                  <td className="py-3 px-4 font-semibold text-foreground align-middle">{item.name}</td>
                  <td className="py-3 px-4 text-[var(--color-body)] align-middle">{item.detail ?? "—"}</td>
                  <td className="py-3 px-4 text-[var(--color-body)] align-middle">{item.home_equivalent ?? "—"}</td>
                  <td className="py-3 px-4 align-middle">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.active}
                      onClick={() => toggleActive(item)}
                      className={`relative inline-block w-10 h-[22px] shrink-0 rounded-full transition-[background-color] duration-200 ${item.active ? "bg-[var(--status-success)]" : "bg-[var(--hub-field-border)]"} focus-visible:outline-none`}
                      style={item.active ? { boxShadow: "none" } : {}}
                    >
                      <span
                        className={`absolute left-[3px] top-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.2)] ${item.active ? "translate-x-[18px]" : "translate-x-0"}`}
                      />
                    </button>
                  </td>
                  <td className="py-3 px-4 align-middle">
                    <button
                      type="button"
                      title="Remove"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => deleteEquipment(item)}
                      className="w-[30px] h-[30px] rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground grid place-items-center hover:text-[var(--status-danger)] hover:border-[var(--status-danger-border)] transition-colors"
                    >
                      <IconTrash2 className="w-[15px] h-[15px]" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </HubCard>
  );
}
