"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { HubCard, HubCardHeader } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  IconDumbbell,
  IconTrash2,
  IconChevronUp,
  IconChevronDown,
} from "@/components/icons";
import { toast } from "sonner";
import type { Band, BandSet } from "@/lib/bands";

interface BandManagerProps {
  initialBandSets: BandSet[];
  initialBands: Band[];
  initialSelectedSetId: string;
}

export function BandManager({ initialBandSets, initialBands, initialSelectedSetId }: BandManagerProps) {
  const [bandSets, setBandSets] = useState(initialBandSets);
  const [selectedSetId, setSelectedSetId] = useState(initialSelectedSetId);
  const [bands, setBands] = useState(initialBands);
  const [saving, setSaving] = useState(false);
  const [colour, setColour] = useState("");
  const [colourHex, setColourHex] = useState("#");
  const [tensionLabel, setTensionLabel] = useState("");
  const [tensionKg, setTensionKg] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editColour, setEditColour] = useState("");
  const [editHex, setEditHex] = useState("");
  const [editTensionLabel, setEditTensionLabel] = useState("");
  const [editTensionKg, setEditTensionKg] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("");
  const colourRef = useRef<HTMLInputElement>(null);

  // When the selected set changes, fetch bands for that set
  const loadBandsForSet = useCallback(async (setId: string) => {
    setSelectedSetId(setId);
    const res = await fetch(`/api/bands?band_set_id=${setId}`);
    if (res.ok) {
      const data = await res.json();
      setBands(data);
    }
  }, []);

  useEffect(() => {
    loadBandsForSet(selectedSetId);
  }, [selectedSetId, loadBandsForSet]);

  async function addBand() {
    if (!colour.trim() || !colourHex.trim() || !tensionLabel.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/bands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colour: colour.trim(),
          colour_hex: colourHex.trim(),
          tension_label: tensionLabel.trim(),
          tension_kg: tensionKg ? Number(tensionKg) : null,
          sort_order: sortOrder ? Number(sortOrder) : null,
          band_set_id: selectedSetId,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add band");
      const created = await res.json();
      setBands((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setColour("");
      setColourHex("#");
      setTensionLabel("");
      setTensionKg("");
      setSortOrder("");
      colourRef.current?.focus();
      toast.success("Band added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add band");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: Band) {
    const next = !item.active;
    setBands((prev) => prev.map((b) => (b.id === item.id ? { ...b, active: next } : b)));
    const res = await fetch(`/api/bands/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    if (!res.ok) {
      setBands((prev) => prev.map((b) => (b.id === item.id ? { ...b, active: !next } : b)));
      toast.error("Failed to update band");
    }
  }

  async function deleteBand(item: Band) {
    setBands((prev) => prev.filter((b) => b.id !== item.id));
    const res = await fetch(`/api/bands/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setBands((prev) =>
        [...prev, item].sort((a, b) => a.sort_order - b.sort_order),
      );
      toast.error("Failed to delete band");
    } else {
      toast.success("Band removed");
    }
  }

  function startEdit(item: Band) {
    setEditingId(item.id);
    setEditColour(item.colour);
    setEditHex(item.colour_hex);
    setEditTensionLabel(item.tension_label);
    setEditTensionKg(item.tension_kg?.toString() ?? "");
    setEditSortOrder(item.sort_order.toString());
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(item: Band) {
    const payload: Record<string, unknown> = {};
    if (editColour.trim() !== item.colour) payload.colour = editColour.trim();
    if (editHex.trim() !== item.colour_hex) payload.colour_hex = editHex.trim();
    if (editTensionLabel.trim() !== item.tension_label) payload.tension_label = editTensionLabel.trim();
    const newKg = editTensionKg ? Number(editTensionKg) : null;
    if (newKg !== item.tension_kg) payload.tension_kg = newKg;
    const newOrder = Number(editSortOrder);
    if (newOrder !== item.sort_order) payload.sort_order = newOrder;

    if (Object.keys(payload).length === 0) {
      cancelEdit();
      return;
    }

    // Optimistic update
    setBands((prev) =>
      prev.map((b) =>
        b.id === item.id
          ? {
              ...b,
              colour: editColour.trim() || b.colour,
              colour_hex: editHex.trim() || b.colour_hex,
              tension_label: editTensionLabel.trim() || b.tension_label,
              tension_kg: editTensionKg ? Number(editTensionKg) : null,
              sort_order: newOrder,
            }
          : b,
      ).sort((a, b) => a.sort_order - b.sort_order),
    );
    cancelEdit();

    const res = await fetch(`/api/bands/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast.error("Failed to save band");
      setBands((prev) =>
        prev.map((b) => (b.id === item.id ? item : b))
          .sort((a, b) => a.sort_order - b.sort_order),
      );
    } else {
      const updated = await res.json();
      setBands((prev) =>
        prev.map((b) => (b.id === item.id ? updated : b))
          .sort((a, b) => a.sort_order - b.sort_order),
      );
    }
  }

  async function moveBand(item: Band, direction: "up" | "down") {
    const idx = bands.findIndex((b) => b.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= bands.length) return;

    const swapItem = bands[swapIdx];
    const newOrderA = swapItem.sort_order;
    const newOrderB = item.sort_order;

    // Optimistic swap
    setBands((prev) =>
      prev.map((b) => {
        if (b.id === item.id) return { ...b, sort_order: newOrderA };
        if (b.id === swapItem.id) return { ...b, sort_order: newOrderB };
        return b;
      }).sort((a, b) => a.sort_order - b.sort_order),
    );

    // Persist both
    await Promise.all([
      fetch(`/api/bands/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: newOrderA }),
      }),
      fetch(`/api/bands/${swapItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: newOrderB }),
      }),
    ]);
  }

  const activeSet = bandSets.find((s) => s.id === selectedSetId);
  const inputClass =
    "h-9 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30 font-[inherit]";

  return (
    <HubCard padded={false}>
      <HubCardHeader
        icon={<IconDumbbell className="w-4 h-4" />}
        title="Bands"
        subtitle={activeSet ? `${activeSet.name} — lightest to heaviest` : "Band set management"}
        color="teal"
        divider
        className="px-5 pt-[14px]"
      />

      {/* Set selector */}
      <div className="px-5 py-3 border-b border-[var(--hub-border)] flex items-center gap-3">
        <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Band set</Label>
        <Select value={selectedSetId} onValueChange={setSelectedSetId}>
          <SelectTrigger className="h-8 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] font-[inherit] text-sm min-w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bandSets.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.owner_type === "studio" ? " (studio)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeSet?.owner_type === "client" && (
          <span className="text-xs text-muted-foreground">Client-owned set</span>
        )}
      </div>

      <div className="px-5 py-3 border-b border-[var(--hub-border)]">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-amber-600">Provisional values.</span>{" "}
          Confirm against Esther&apos;s actual studio bands before go-live.
        </p>
      </div>

      <form
        className="px-5 py-4 border-b border-[var(--hub-border)] grid grid-cols-1 gap-3 md:grid-cols-[1fr_0.8fr_1fr_0.6fr_0.5fr_auto] md:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          addBand();
        }}
      >
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs font-semibold text-foreground" htmlFor="bandColour">Colour name</Label>
          <Input
            ref={colourRef}
            id="bandColour"
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            placeholder="e.g. Yellow"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs font-semibold text-foreground" htmlFor="bandHex">Hex</Label>
          <Input
            id="bandHex"
            value={colourHex}
            onChange={(e) => setColourHex(e.target.value)}
            placeholder="#FFFF00"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs font-semibold text-foreground" htmlFor="bandTension">Tension label</Label>
          <Input
            id="bandTension"
            value={tensionLabel}
            onChange={(e) => setTensionLabel(e.target.value)}
            placeholder="e.g. Light"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs font-semibold text-foreground" htmlFor="bandKg">Tension (kg)</Label>
          <Input
            id="bandKg"
            type="number"
            step="0.1"
            value={tensionKg}
            onChange={(e) => setTensionKg(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs font-semibold text-foreground" htmlFor="bandOrder">Order</Label>
          <Input
            id="bandOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="Auto"
            className={inputClass}
          />
        </div>
        <Button
          type="submit"
          disabled={saving || !colour.trim() || !colourHex.trim() || !tensionLabel.trim()}
          className="h-8 rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold shrink-0 px-3 text-[12.5px] leading-none inline-flex items-center gap-[6px]"
        >
          Add band
        </Button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr>
              <th className="w-[40px]" />
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] h-10 px-4 border-b border-[var(--hub-border)]">Colour</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] h-10 px-4 border-b border-[var(--hub-border)]">Hex</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] h-10 px-4 border-b border-[var(--hub-border)]">Tension</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] h-10 px-4 border-b border-[var(--hub-border)]">Order</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground bg-[var(--hub-hover)] h-10 px-4 border-b border-[var(--hub-border)] w-[110px]">Active</th>
              <th className="w-[56px] px-4 border-b border-[var(--hub-border)]" />
            </tr>
          </thead>
          <tbody>
            {bands.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No bands in this set yet.
                </td>
              </tr>
            ) : (
              bands.map((item, idx) => {
                const isEditing = editingId === item.id;
                return (
                  <tr
                    key={item.id}
                    className={`border-b border-[var(--hub-border)] last:border-0 transition-colors ${isEditing ? "bg-[var(--hub-hover)]" : "hover:bg-[var(--hub-hover)]"}`}
                  >
                    <td className="py-3 px-2 align-middle">
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          type="button"
                          title="Move up"
                          aria-label={`Move ${item.colour} up`}
                          disabled={idx === 0}
                          onClick={() => moveBand(item, "up")}
                          className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <IconChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Move down"
                          aria-label={`Move ${item.colour} down`}
                          disabled={idx === bands.length - 1}
                          onClick={() => moveBand(item, "down")}
                          className="w-6 h-6 rounded grid place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <IconChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    {isEditing ? (
                      <>
                        <td className="py-2 px-4 align-middle">
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editHex}
                              onChange={(e) => setEditHex(e.target.value)}
                              className="w-6 h-6 rounded border border-[var(--hub-field-border)] cursor-pointer"
                            />
                            <Input
                              value={editColour}
                              onChange={(e) => setEditColour(e.target.value)}
                              className="h-8 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30 font-[inherit] text-xs"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-4 align-middle">
                          <Input
                            value={editHex}
                            onChange={(e) => setEditHex(e.target.value)}
                            className="h-8 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30 font-[inherit] text-xs font-mono"
                          />
                        </td>
                        <td className="py-2 px-4 align-middle">
                          <div className="flex flex-col gap-1">
                            <Input
                              value={editTensionLabel}
                              onChange={(e) => setEditTensionLabel(e.target.value)}
                              className="h-8 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30 font-[inherit] text-xs"
                            />
                            <Input
                              type="number"
                              step="0.1"
                              value={editTensionKg}
                              onChange={(e) => setEditTensionKg(e.target.value)}
                              placeholder="kg"
                              className="h-7 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30 font-[inherit] text-xs"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-4 align-middle">
                          <Input
                            type="number"
                            value={editSortOrder}
                            onChange={(e) => setEditSortOrder(e.target.value)}
                            className="h-8 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30 font-[inherit] text-xs w-16"
                          />
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.active}
                            onClick={() => toggleActive(item)}
                            className={`relative inline-block w-10 h-[22px] shrink-0 rounded-full transition-[background-color] duration-200 ${item.active ? "bg-[var(--status-success)]" : "bg-[var(--hub-field-border)]"} focus-visible:outline-none`}
                          >
                            <span
                              className={`absolute left-[3px] top-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.2)] ${item.active ? "translate-x-[18px]" : "translate-x-0"}`}
                            />
                          </button>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              title="Save"
                              onClick={() => saveEdit(item)}
                              className="h-7 px-2 rounded-lg bg-[var(--status-success)] text-white text-[11px] font-semibold hover:opacity-90 transition-opacity"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              title="Cancel"
                              onClick={cancelEdit}
                              className="h-7 px-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground text-[11px] font-semibold hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-semibold text-foreground align-middle cursor-pointer" onClick={() => startEdit(item)}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full shrink-0 border border-black/10"
                              style={{ backgroundColor: item.colour_hex }}
                            />
                            <span>{item.colour}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[var(--color-body)] font-mono text-xs align-middle cursor-pointer" onClick={() => startEdit(item)}>
                          {item.colour_hex}
                        </td>
                        <td className="py-3 px-4 align-middle cursor-pointer" onClick={() => startEdit(item)}>
                          <div className="flex flex-col">
                            <span className="text-[var(--color-body)]">{item.tension_label}</span>
                            {item.tension_kg != null && (
                              <span className="text-xs text-muted-foreground">{item.tension_kg} kg</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[var(--color-body)] tabular-nums align-middle cursor-pointer" onClick={() => startEdit(item)}>
                          {item.sort_order}
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.active}
                            onClick={() => toggleActive(item)}
                            className={`relative inline-block w-10 h-[22px] shrink-0 rounded-full transition-[background-color] duration-200 ${item.active ? "bg-[var(--status-success)]" : "bg-[var(--hub-field-border)]"} focus-visible:outline-none`}
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
                            aria-label={`Delete ${item.colour}`}
                            onClick={() => deleteBand(item)}
                            className="w-[30px] h-[30px] rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground grid place-items-center hover:text-[var(--status-danger)] hover:border-[var(--status-danger-border)] transition-colors"
                          >
                            <IconTrash2 className="w-[15px] h-[15px]" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </HubCard>
  );
}
