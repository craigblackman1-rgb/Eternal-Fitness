"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { IconDumbbell, IconCopy, IconTrash2, IconCheck } from "@/components/icons";
import { HubCard, HubCardHeader } from "@/components/hub";
import type { ClientEquipmentEntry, StudioEquipment } from "@/types";

interface ClientEquipmentCardProps {
  value: ClientEquipmentEntry[] | null;
  onChange: (next: ClientEquipmentEntry[] | null) => void;
  clientFirstName: string;
  showCopyStudio: boolean;
  /** Embedded mode: renders the card body inline without the HubCard wrapper (for the wizard). */
  embedded?: boolean;
}

export function ClientEquipmentCard({ value, onChange, clientFirstName, showCopyStudio, embedded }: ClientEquipmentCardProps) {
  const [catalogue, setCatalogue] = useState<StudioEquipment[]>([]);
  const [loading, setLoading] = useState(true);

  const [list, setList] = useState<ClientEquipmentEntry[] | null>(() => value === null ? null : value.map((e) => ({ name: e.name, detail: e.detail })));
  const [bw, setBw] = useState(() => Array.isArray(value) && value.length === 0);
  const [stash, setStash] = useState<ClientEquipmentEntry[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync from parent value
  useEffect(() => {
    setList(value === null ? null : value.map((e) => ({ name: e.name, detail: e.detail })));
    setBw(Array.isArray(value) && value.length === 0);
    setSelected(new Set());
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/equipment")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: StudioEquipment[] | null) => {
        if (!cancelled && data) setCatalogue(data.filter((e) => e.active));
        if (!cancelled) setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const emit = useCallback((nextList: ClientEquipmentEntry[] | null, nextBw: boolean) => {
    if (nextBw) { onChange([]); return; }
    onChange(nextList === null ? null : nextList.length === 0 ? null : nextList);
  }, [onChange]);

  const has = useCallback((name: string) => {
    if (!list) return false;
    return list.some((e) => e.name.toLowerCase() === name.toLowerCase());
  }, [list]);

  const countText = bw ? "Bodyweight only" : list === null ? "Not set" : list.length === 0 ? "0 items" : `${list.length} item${list.length === 1 ? "" : "s"}`;

  // ── Bodyweight toggle ──
  const toggleBw = useCallback(() => {
    if (!bw) {
      setStash(list);
      setList([]);
      setBw(true);
      setSelected(new Set());
      emit([], true);
    } else {
      const restored = stash === null ? [] : stash;
      setBw(false);
      setList(restored);
      setStash(null);
      emit(restored, false);
    }
  }, [bw, list, stash, emit]);

  // ── Copy studio list ──
  const copyStudio = useCallback(() => {
    const before = list === null ? null : list.map((e) => ({ ...e }));
    let current = list === null ? [] : [...list];
    let added = 0;
    for (const item of catalogue) {
      if (!has(item.name)) {
        current.push({ name: item.name, detail: "" });
        added++;
      }
    }
    if (added === 0) {
      toast("Everything on the studio list is already here.");
      return;
    }
    setList(current);
    setSelected(new Set());
    emit(current, false);
    toast(`${added} item${added === 1 ? "" : "s"} copied from the studio list \u2014 add detail where it matters.`, {
      action: { label: "Undo", onClick: () => { setList(before); emit(before, false); } },
    });
  }, [list, catalogue, has, emit]);

  // ── Remove single row ──
  const removeRow = useCallback((idx: number) => {
    if (!list) return;
    const gone = list[idx];
    const next = list.filter((_, i) => i !== idx);
    const nextList = next.length === 0 ? null : next;
    setList(nextList);
    setSelected(new Set());
    emit(nextList, false);
    toast(`${gone.name} removed.`, {
      action: { label: "Undo", onClick: () => {
        const restored = [...next.slice(0, idx), gone, ...next.slice(idx)];
        setList(restored);
        emit(restored, false);
      }},
    });
  }, [list, emit]);

  // ── Detail change ──
  const updateDetail = useCallback((idx: number, detail: string) => {
    if (!list) return;
    const next = [...list];
    next[idx] = { ...next[idx], detail };
    setList(next);
    emit(next, false);
  }, [list, emit]);

  // ── Selection ──
  const toggleSelect = useCallback((idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const removeSelected = useCallback(() => {
    if (!list || selected.size === 0) return;
    const indices = Array.from(selected).sort((a, b) => b - a);
    const removed = indices.map((i) => ({ index: i, entry: list[i] }));
    const next = list.filter((_, i) => !selected.has(i));
    const nextList = next.length === 0 ? null : next;
    setList(nextList);
    setSelected(new Set());
    emit(nextList, false);
    toast(`${removed.length} item${removed.length === 1 ? "" : "s"} removed.`, {
      action: { label: "Undo", onClick: () => {
        const restored = [...next];
        removed.reverse().forEach((r) => { restored.splice(r.index, 0, r.entry); });
        setList(restored);
        emit(restored, false);
      }},
    });
  }, [list, selected, emit]);

  // ── Add equipment ──
  const add = useCallback((name: string) => {
    if (!name) return;
    let current = list === null ? [] : [...list];
    if (has(name)) {
      toast(`${name} is already on the list.`);
      setQuery("");
      setOpen(false);
      return;
    }
    current.push({ name, detail: "" });
    setList(current);
    setSelected(new Set());
    setQuery("");
    setOpen(false);
    emit(current, false);
    // Focus the new row's detail input after render
    requestAnimationFrame(() => {
      const detailInput = listRef.current?.querySelector<HTMLInputElement>(`[data-detail="${current.length - 1}"]`);
      detailInput?.focus();
    });
  }, [list, has, emit]);

  // ── Popover options ──
  const options = useCallback(() => {
    const ql = query.toLowerCase();
    const hits = catalogue.filter((n) => !ql || n.name.toLowerCase().includes(ql));
    const exact = catalogue.some((n) => n.name.toLowerCase() === ql);
    const opts: { label: string; value: string; isNew?: boolean; already?: boolean; cat?: boolean }[] = hits.map((n) => ({ label: n.name, value: n.name, cat: true, already: has(n.name) }));
    if (query && !exact) opts.push({ label: `Add \u201c${query}\u201d as new`, value: query, isNew: true });
    return opts;
  }, [query, catalogue, has]);

  // ── Keyboard navigation ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const opts = options();
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((prev) => Math.min(opts.length - 1, prev + 1)); setOpen(true); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((prev) => Math.max(0, prev - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const idx = hi >= 0 ? hi : 0;
      const o = opts[idx] || null;
      if (o && !o.already) add(o.value);
      else if (o) toast(`${o.value} is already on the list.`);
    }
    else if (e.key === "Escape") { setOpen(false); setHi(-1); }
  }, [hi, options, add]);

  // ── Close popover on outside click ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement)?.closest?.(".eq-add-area")) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  // ── Foot text ──
  const footText = bw
    ? <><b>Saved as an empty list.</b> Every workout the plan agent builds for {clientFirstName} will use bodyweight only.</>
    : list === null
    ? <><b>Nothing saved yet.</b> Until this is set, the plan agent may pick any exercise in the library — including ones {clientFirstName} cannot do at home.</>
    : list.length === 0
    ? <><b>An empty list that is not marked bodyweight only</b> is saved as nothing decided. Tick Bodyweight only if that is what you mean.</>
    : <>The plan agent reads these <b>{list.length} items</b> and their detail when it builds {clientFirstName}&apos;s next block. Detail tells it how far a load can go.</>;

  const bodyContent = (
    <div className="flex flex-col min-w-0">
      {/* Bodyweight only checkbox */}
      <div className="flex items-start gap-3 pb-4 mb-4 border-b border-[var(--hub-border)]">
        <label htmlFor="bw-only" className="relative shrink-0 w-5 h-5 mt-0.5 cursor-pointer">
          <input type="checkbox" id="bw-only" checked={bw} onChange={toggleBw} className="sr-only peer" />
          <span className={`absolute inset-0 rounded-control-sm border cursor-pointer transition-colors grid place-items-center peer-checked:bg-rose peer-checked:border-rose bg-[var(--hub-card)] border-[var(--color-muted-text)]`}>
            {bw && <IconCheck className="w-3.5 h-3.5 text-white" />}
          </span>
        </label>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground cursor-pointer" onClick={toggleBw}>Bodyweight only</p>
          <p className="text-xs text-muted-foreground mt-0.5">No equipment at all. Saved as an empty list, so the plan agent knows it was decided rather than never filled in.</p>
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2.5 mb-3 px-3 py-2 rounded-nested bg-rose/10 border border-rose/20 text-[12.5px] text-foreground">
          <span><b>{selected.size}</b> selected</span>
          <button type="button" onClick={clearSelection} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-1">Clear</button>
          <button type="button" onClick={removeSelected} className="text-xs font-medium border border-[var(--color-muted-text)] rounded-lg px-2.5 py-1 hover:bg-[var(--hub-hover)] transition-colors">Remove selected</button>
        </div>
      )}

      {/* Equipment list */}
      <div ref={listRef} className="flex flex-col gap-2">
        {!bw && list && list.map((entry, idx) => {
          const fromCat = catalogue.some((c) => c.name.toLowerCase() === entry.name.toLowerCase());
          const isSel = selected.has(idx);
          return (
            <div key={`${entry.name}-${idx}`} className={`grid gap-3 items-center py-2.5 px-3 rounded-nested border transition-colors ${isSel ? "border-rose/20 bg-rose/10" : "border-[var(--hub-border)] bg-[var(--hub-hover)]"}`} style={{ gridTemplateColumns: "20px minmax(0,1.1fr) minmax(0,1.4fr) 34px" }}>
              <label className="relative shrink-0 w-5 h-5 cursor-pointer">
                <input type="checkbox" checked={isSel} onChange={() => toggleSelect(idx)} aria-label={`Select ${entry.name}`} className="sr-only peer" />
                <span className={`absolute inset-0 rounded-control-sm border cursor-pointer transition-colors grid place-items-center peer-checked:bg-rose peer-checked:border-rose bg-[var(--hub-card)] border-[var(--color-muted-text)]`}>
                  {isSel && <IconCheck className="w-3 h-3 text-white" />}
                </span>
              </label>
              <div className="min-w-0">
                <span className="text-[13.5px] font-semibold text-foreground block truncate">{entry.name}</span>
                <span className={`text-[10.5px] font-bold uppercase tracking-wider ${fromCat ? "text-muted-foreground" : "text-rose"}`}>{fromCat ? "Studio list" : "Added by hand"}</span>
              </div>
              <input data-detail={idx} type="text" value={entry.detail} placeholder="e.g. 2.5 kg steps, red → black, up to 20 kg" onChange={(e) => updateDetail(idx, e.target.value)} aria-label={`Detail for ${entry.name}`} className="min-h-[34px] px-2.5 py-1.5 text-[13px] bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-lg placeholder:italic focus:outline-none focus:border-rose focus:ring-[0_0_0_3px_rgba(193,131,159,.3)]" />
              <button type="button" onClick={() => removeRow(idx)} aria-label={`Remove ${entry.name}`} title="Remove" className="w-[34px] h-[34px] flex items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--s-danger-bg)] hover:text-[var(--s-danger)] transition-colors">
                <IconTrash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Empty state lines */}
      {!bw && list === null && (
        <p className="text-[13px] text-muted-foreground py-1.5 px-0.5">Equipment not set yet — the plan agent is not being constrained.</p>
      )}
      {!bw && list && list.length === 0 && (
        <p className="text-[13px] text-muted-foreground py-1.5 px-0.5">Nothing listed yet. Add what {clientFirstName} has, or tick Bodyweight only.</p>
      )}
      {bw && (
        <p className="text-[13px] text-muted-foreground py-1.5 px-0.5">No equipment — bodyweight only. The plan agent will only pick bodyweight exercises.</p>
      )}

      {/* Add equipment */}
      {!bw && (
        <div className="relative mt-3.5 eq-add-area">
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Add equipment</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Type to search the studio list, or add anything…"
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
              aria-controls="eq-listbox"
              onFocus={() => { setHi(-1); setOpen(true); }}
              onInput={(e) => { setHi(-1); setQuery((e.target as HTMLInputElement).value); setOpen(true); }}
              onKeyDown={handleKeyDown}
              className="w-full min-h-[38px] pl-9 pr-3 py-2 text-[13.5px] bg-[var(--hub-card)] border border-[var(--color-muted-text)] rounded-lg placeholder:text-muted-foreground focus:outline-none focus:border-rose focus:ring-[0_0_0_3px_rgba(193,131,159,.3)]"
            />
          </div>
          <p className="text-[11.5px] text-muted-foreground mt-1.5">↑ ↓ to move, Enter to add. Anything not in the studio list is added as your own words.</p>
          {open && (
            <div className="absolute z-30 left-0 right-0 top-[calc(100%+6px)] bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-nested shadow-[var(--shadow-pop)] overflow-hidden">
              <ul id="eq-listbox" className="list-none m-0 p-[5px] max-h-[232px] overflow-y-auto" role="listbox">
                {options().length === 0 ? (
                  <li className="py-2.5 px-3 text-[12.5px] text-muted-foreground">Type the name of anything {clientFirstName} has.</li>
                ) : (
                  options().map((o, i) => (
                    <li key={o.value} role="option" aria-selected={i === hi}>
                      <button
                        type="button"
                        className={`flex items-center gap-2.5 w-full px-2.5 py-2 border-0 bg-none rounded text-[13.5px] text-foreground text-left cursor-pointer transition-colors ${i === hi ? "bg-[var(--hub-hover)]" : "hover:bg-[var(--hub-hover)]"} ${o.isNew ? "text-rose font-semibold border-t border-[var(--hub-border)] rounded-none mt-1 pt-2.5" : ""} ${o.already ? "text-muted-foreground" : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { if (!o.already) add(o.value); else toast(`${o.value} is already on the list.`); }}
                      >
                        {o.isNew && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>}
                        <span>{o.label}</span>
                        {o.already ? <span className="ml-auto text-[11px] text-muted-foreground shrink-0"><span className="text-teal">Already listed</span></span>
                          : o.cat ? <span className="ml-auto text-[11px] text-muted-foreground shrink-0">Studio list</span>
                          : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Foot */}
      <div className="flex items-start gap-2 mt-4 pt-3 border-t border-[var(--hub-border)] bg-[var(--hub-hover)] rounded-b-surface px-5 py-3 -mx-5 -mb-5 text-[12px] text-muted-foreground leading-relaxed" style={{ margin: "24px -20px -20px", padding: "12px 20px" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 mt-0.5 text-rose"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8V4M8 4h8"/><circle cx="8.5" cy="14" r="1"/><circle cx="15.5" cy="14" r="1"/></svg>
        <span>{footText}</span>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold text-muted-foreground">{countText}</span>
          {showCopyStudio && (
            <button type="button" disabled={bw} onClick={copyStudio} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--color-muted-text)] text-foreground hover:bg-[var(--hub-hover)] disabled:opacity-45 disabled:cursor-not-allowed transition-colors">
              <IconCopy className="w-3.5 h-3.5" />
              Copy studio list
            </button>
          )}
        </div>
        {bodyContent}
      </div>
    );
  }

  return (
    <HubCard padded={false}>
      <div className="px-5 pt-4 pb-0">
        <HubCardHeader
          icon={<IconDumbbell className="w-4 h-4" />}
          title="Equipment"
          subtitle={<><span className="text-foreground">What {clientFirstName}</span> actually has to train with — the plan agent only picks exercises that use it</>}
          color="rose"
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground tabular-nums">{countText}</span>
              {showCopyStudio && (
                <button type="button" disabled={bw} onClick={copyStudio} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--color-muted-text)] text-foreground hover:bg-[var(--hub-hover)] disabled:opacity-45 disabled:cursor-not-allowed transition-colors">
                  <IconCopy className="w-3.5 h-3.5" />
                  Copy studio list
                </button>
              )}
            </div>
          }
        />
      </div>
      <div className="px-5 pb-5 pt-4">
        {bodyContent}
      </div>
    </HubCard>
  );
}

export { type ClientEquipmentCardProps };
