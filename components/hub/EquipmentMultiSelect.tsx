"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { IconCheck, IconDumbbell, IconX } from "@/components/icons";
import type { StudioEquipment } from "@/types";

interface EquipmentMultiSelectProps {
  selected: string[] | null;
  onChange: (values: string[] | null) => void;
  hideControls?: boolean;
  showHomeEquivalent?: boolean;
}

/**
 * CR-EF-108 — Multi-select checklist against the active studio_equipment
 * catalog. Renders as a grid of labelled checkboxes. NULL = not configured
 * (unconstrained generation), empty array = bodyweight only.
 */
export function EquipmentMultiSelect({ selected, onChange, hideControls, showHomeEquivalent }: EquipmentMultiSelectProps) {
  const [catalog, setCatalog] = useState<StudioEquipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/equipment");
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) {
        setCatalog((data ?? []).filter((e: StudioEquipment) => e.active));
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const selectedSet = new Set(selected ?? []);

  const toggle = (name: string) => {
    const current = selected ?? [];
    if (current.includes(name)) {
      const next = current.filter((n) => n !== name);
      onChange(next.length > 0 ? next : []);
    } else {
      onChange([...current, name]);
    }
  };

  const clearAll = () => onChange([]);

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading equipment...</p>;
  }

  return (
    <div className="space-y-3">
      {selected && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 rounded-full pr-1.5 font-normal">
              {name}
              <button type="button" onClick={() => toggle(name)} className="rounded-full hover:bg-black/10 p-0.5">
                <IconX className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.map((item) => {
          const checked = selectedSet.has(item.name);
          return (
            <label
              key={item.id}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-[var(--hub-hover)] transition-colors"
            >
              <span
                className={`shrink-0 mt-px w-4 h-4 rounded-[4px] border grid place-items-center transition-colors ${
                  checked
                    ? "bg-teal border-teal"
                    : "bg-[var(--hub-card)] border-[var(--color-muted-text)]"
                }`}
              >
                {checked && <IconCheck className="h-3 w-3 text-white" />}
              </span>
              <span className="min-w-0">
                <span className="text-[13px] font-medium text-foreground leading-tight">{item.name}</span>
                {(item.detail || (showHomeEquivalent && item.home_equivalent)) && (
                  <span className="text-[11px] text-muted-foreground leading-tight block">
                    {item.detail}{item.detail && showHomeEquivalent && item.home_equivalent ? " · " : ""}{showHomeEquivalent && item.home_equivalent ? `home: ${item.home_equivalent}` : ""}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {!hideControls && (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => onChange(null)}
            className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${
              selected === null
                ? "bg-[var(--hub-card)] text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-[var(--hub-hover)]"
            }`}
          >
            Not configured
          </button>
          <button
            type="button"
            onClick={clearAll}
            className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${
              selected !== null && selected.length === 0
                ? "bg-[var(--hub-card)] text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-[var(--hub-hover)]"
            }`}
          >
            Bodyweight only
          </button>
        </div>
      )}
    </div>
  );
}
