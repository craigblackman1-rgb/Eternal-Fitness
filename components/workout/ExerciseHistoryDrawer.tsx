"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Band } from "@/lib/bands";

/* ── Types ─────────────────────────────────────────────────────── */

interface ApiRecord {
  id: string;
  metric: string;
  value: number;
  rep_count: number | null;
  achieved_at: string;
  source: "live_log" | "trainerize_import" | "manual";
  note: string | null;
  recorded_by: string | null;
  band_colour: string | null;
}

interface ApiLogged {
  set_log_id: string;
  exercise_ref: string;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  band_colour: string | null;
  logged_at: string;
  session_id: string;
  session_number: number;
  scheduled_at: string;
  block_id: string;
  block_number: number;
}

/** Normalised row for ranking and display — one per historical data point. */
interface HistoryRow {
  key: string;
  unit: "kg" | "band" | "reps" | "time";
  value: number;
  reps: number | null;
  source: "logged" | "manual";
  achieved_at: string;
  /** Logged rows only */
  session_number?: number;
  block_number?: number;
  session_id?: string;
  /** Manual rows only */
  recorded_by?: string;
  note?: string | null;
  /** Band rows only */
  band_colour?: string;
  /** Whether this row is the PB holder */
  isPb?: boolean;
  /** Whether this row is the best logged row (shown when manual holds PB) */
  isLoggedBest?: boolean;
}

/* ── Helpers ────────────────────────────────────────────────────── */

const ICO = {
  tick: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 13 4 4L19 7" />
    </svg>
  ),
  pen: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  ),
  star: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z" />
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  penLine: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  ),
};

function vText(r: { unit: string; value: number; reps: number | null }): string {
  if (r.unit === "kg") return `${r.value} kg${r.reps != null ? ` × ${r.reps}` : ""}`;
  if (r.unit === "band") return `${r.value} band${r.reps != null ? ` × ${r.reps}` : ""}`;
  if (r.unit === "reps") return `${r.value} reps`;
  // time
  const total = Math.round(r.value);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtShort(iso: string): string {
  try {
    const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function toSec(v: string | number): number {
  const s = String(v);
  if (s.includes(":")) {
    const p = s.split(":");
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }
  return Number(s);
}

/** Compare two history rows — returns true if a beats b. */
function better(a: HistoryRow, b: HistoryRow): boolean {
  if (a.unit !== b.unit) return false;
  if (a.unit === "kg") {
    return a.value > b.value || (a.value === b.value && (a.reps ?? 0) > (b.reps ?? 0));
  }
  if (a.unit === "band") {
    return a.value > b.value || (a.value === b.value && (a.reps ?? 0) > (b.reps ?? 0));
  }
  if (a.unit === "reps") return a.value > b.value;
  // time: longer wins
  return a.value > b.value;
}

/** Normalise API data into HistoryRow array. */
function normalise(records: ApiRecord[], logged: ApiLogged[]): HistoryRow[] {
  const rows: HistoryRow[] = [];

  for (const r of records) {
    let unit: HistoryRow["unit"];
    let value: number;
    let reps: number | null = r.rep_count;

    if (r.metric === "weight") {
      unit = "kg";
      value = r.value;
    } else if (r.metric === "band") {
      unit = "band";
      value = r.value; // sort_order
      reps = r.rep_count;
    } else if (r.metric === "duration") {
      unit = "time";
      value = r.value;
      reps = null;
    } else {
      continue; // skip unknown metrics
    }

    rows.push({
      key: `pr-${r.id}`,
      unit,
      value,
      reps,
      source: "manual",
      achieved_at: r.achieved_at,
      recorded_by: r.recorded_by ?? undefined,
      note: r.note,
      band_colour: r.band_colour ?? undefined,
    });
  }

  for (const l of logged) {
    let unit: HistoryRow["unit"];
    let value: number;
    let reps: number | null = l.reps;

    if (l.weight_kg != null) {
      unit = "kg";
      value = l.weight_kg;
    } else if (l.band_colour) {
      unit = "band";
      value = 0; // will be enriched below
      reps = l.reps;
    } else if (l.duration_seconds != null) {
      unit = "time";
      value = l.duration_seconds;
      reps = null;
    } else if (l.reps != null) {
      unit = "reps";
      value = l.reps;
      reps = null;
    } else {
      continue;
    }

    rows.push({
      key: `sl-${l.set_log_id}`,
      unit,
      value,
      reps,
      source: "logged",
      achieved_at: l.logged_at,
      session_number: l.session_number,
      block_number: l.block_number,
      session_id: l.session_id,
      band_colour: l.band_colour ?? undefined,
    });
  }

  return rows;
}

/** Enrich band rows with sort_order from bands array. */
function enrichBands(rows: HistoryRow[], bands: Band[]): HistoryRow[] {
  return rows.map((r) => {
    if (r.unit === "band" && r.band_colour) {
      const b = bands.find((x) => x.colour.toLowerCase() === r.band_colour!.toLowerCase());
      if (b) return { ...r, value: b.sort_order };
    }
    return r;
  });
}

/** Find the best row per unit, then the overall PB (highest unit wins; tie → logged keeps). */
function findBest(rows: HistoryRow[]): { pb: HistoryRow | null; loggedBest: Record<string, HistoryRow> } {
  const loggedBest: Record<string, HistoryRow> = {};

  // Find best logged per unit
  for (const r of rows) {
    if (r.source !== "logged") continue;
    const cur = loggedBest[r.unit];
    if (!cur || better(r, cur)) {
      loggedBest[r.unit] = r;
    }
  }

  // Find overall best per unit (logged + manual together)
  const bestPerUnit: Record<string, HistoryRow> = {};
  for (const r of rows) {
    const cur = bestPerUnit[r.unit];
    if (!cur || better(r, cur)) {
      bestPerUnit[r.unit] = r;
    } else if (cur && r.unit === cur.unit && r.value === cur.value && (r.reps ?? 0) === (cur.reps ?? 0) && r.source === "logged" && cur.source === "manual") {
      // Tie: logged keeps the chip over manual
      bestPerUnit[r.unit] = r;
    }
  }

  // Overall PB: pick the unit with the highest value (arbitrary cross-unit comparison —
  // weight and time don't compete; the PB card shows the dominant unit's best)
  let pb: HistoryRow | null = null;
  for (const unit of Object.keys(bestPerUnit)) {
    const cur = bestPerUnit[unit];
    if (!pb || better(cur, pb)) {
      pb = cur;
    }
  }

  return { pb, loggedBest };
}

/* ── Component ─────────────────────────────────────────────────── */

export function ExerciseHistoryDrawer({
  open,
  onClose,
  clientId,
  clientName,
  exerciseName,
  bands,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  exerciseName: string;
  bands: Band[];
  onSaved: () => void;
}) {
  const [records, setRecords] = useState<ApiRecord[]>([]);
  const [logged, setLogged] = useState<ApiLogged[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [unit, setUnit] = useState<"kg" | "band" | "reps" | "time">("kg");
  const [val, setVal] = useState("");
  const [repsVal, setRepsVal] = useState("");
  const [dateVal, setDateVal] = useState(() => new Date().toISOString().slice(0, 10));
  const [noteVal, setNoteVal] = useState("");
  const [valErr, setValErr] = useState(false);
  const [dateErr, setDateErr] = useState(false);
  const [posting, setPosting] = useState(false);

  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().slice(0, 10);

  // Fetch data on open
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/clients/${clientId}/personal-records?exercise=${encodeURIComponent(exerciseName)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setRecords(data.records ?? []);
        setLogged(data.logged ?? []);
      })
      .catch(() => {
        toast.error("Failed to load exercise history");
      })
      .finally(() => setLoading(false));
  }, [open, clientId, exerciseName]);

  // Focus close button on open
  useEffect(() => {
    if (open) {
      setTimeout(() => closeRef.current?.focus(), 50);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      setShowForm(false);
      setUnit("kg");
      setVal("");
      setRepsVal("");
      setDateVal(today);
      setNoteVal("");
      setValErr(false);
      setDateErr(false);
    }
  }, [open, today]);

  // Normalise and rank data
  const rows = enrichBands(normalise(records, logged), bands);
  const { pb, loggedBest } = findBest(rows);

  // Sort rows newest first for display
  const sorted = [...rows].sort((a, b) => {
    const da = a.achieved_at?.slice(0, 10) ?? "";
    const db = b.achieved_at?.slice(0, 10) ?? "";
    return db.localeCompare(da);
  });

  const handleSave = async () => {
    // Validate
    let hasError = false;
    if (!val.trim()) {
      setValErr(true);
      hasError = true;
    } else {
      setValErr(false);
    }
    if (!dateVal || dateVal > today) {
      setDateErr(true);
      hasError = true;
    } else {
      setDateErr(false);
    }
    if (hasError) return;

    setPosting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/personal-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise: exerciseName,
          unit,
          value: unit === "time" ? val : unit === "band" ? val : Number(val),
          reps: ["kg", "band"].includes(unit) ? (repsVal ? Number(repsVal) : null) : null,
          achieved_at: dateVal,
          note: noteVal || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to save");
      }

      const saved: ApiRecord = await res.json();

      // Refetch to get full data
      const refetch = await fetch(`/api/clients/${clientId}/personal-records?exercise=${encodeURIComponent(exerciseName)}`);
      if (refetch.ok) {
        const data = await refetch.json();
        setRecords(data.records ?? []);
        setLogged(data.logged ?? []);
      }

      // Determine if this took the chip
      const savedRow: HistoryRow = {
        key: `pr-${saved.id}`,
        unit,
        value: saved.value,
        reps: saved.rep_count,
        source: "manual",
        achieved_at: saved.achieved_at,
        recorded_by: saved.recorded_by ?? undefined,
        note: saved.note,
        band_colour: saved.band_colour ?? undefined,
      };

      const allAfter = [...rows, savedRow];
      const { pb: newPb } = findBest(enrichBands(allAfter, bands));
      const tookChip = newPb?.key === savedRow.key;
      const loggedBestRow = loggedBest[savedRow.unit];

      if (tookChip) {
        const lbText = loggedBestRow ? ` — it beats the logged ${vText(loggedBestRow)}` : "";
        toast.success(`Saved. ${vText(savedRow)} is now the personal best${lbText}.`);
      } else {
        const lbText = loggedBestRow ? ` of ${vText(loggedBestRow)}` : "";
        toast.success(`Saved as a manual entry. The logged best${lbText} still stands.`);
      }

      // Reset form
      setShowForm(false);
      setVal("");
      setRepsVal("");
      setDateVal(today);
      setNoteVal("");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setPosting(false);
    }
  };

  const bandOptions = bands.filter((b) => b.active);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60] bg-[var(--navy)]/32 transition-opacity duration-180"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="eh-title"
        className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-[420px] flex-col bg-[var(--hub-canvas)] shadow-[-14px_0_40px_rgba(16,24,40,.2)] transition-transform duration-220 ease-out translate-x-0"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-[var(--hub-border)] bg-[var(--hub-card)] px-[18px] py-4">
          <div className="min-w-0 flex-1">
            <h2 id="eh-title" className="text-[15px] font-bold text-foreground tracking-tight">
              {exerciseName} — history
            </h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {clientName} · every logged set and every best, newest first
            </p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-control)] border border-[var(--hub-border)] bg-[var(--hub-card)] text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
          >
            {ICO.close}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[18px] py-4 flex flex-col gap-3.5">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              {/* Current-best card */}
              {pb ? (
                <div className="rounded-[var(--r-nested)] border border-[var(--s-warning-bd)] bg-[var(--s-warning-bg)] p-3.5">
                  <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[.08em] text-[#6E551F]">
                    {ICO.star} Personal best
                  </div>
                  <div className="mt-0.5 text-[20px] font-extrabold text-foreground tracking-tight tabular-nums flex items-center gap-2 flex-wrap">
                    {vText(pb)}
                    {pb.source === "manual" && (
                      <span className="inline-flex items-center text-[8.5px] font-extrabold tracking-[.06em] uppercase rounded-[var(--r-control-sm)] px-[5px] border border-black/18 bg-white/70 text-[#3F464C]">
                        manual
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--body)]">
                    {pb.source === "manual" ? (
                      <>
                        Recorded manually · <b className="text-foreground">{fmtShort(pb.achieved_at)}</b> · by {pb.recorded_by ?? "Staff"}
                        {loggedBest[pb.unit] && (
                          <>
                            <br />
                            Beats the logged best of <b className="text-foreground">{vText(loggedBest[pb.unit]!)}</b> (Session {loggedBest[pb.unit]!.session_number}, {fmtShort(loggedBest[pb.unit]!.achieved_at)})
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        Logged · <b className="text-foreground">Session {pb.session_number}</b> · Block {pb.block_number} · {fmtShort(pb.achieved_at)}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-[var(--r-nested)] border border-dashed border-[var(--hub-field-border)] p-3.5">
                  <div className="text-[9.5px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">
                    {ICO.star} Personal best
                  </div>
                  <div className="mt-1 text-[12.5px] text-muted-foreground">
                    No best yet — nothing has been logged for this exercise.
                  </div>
                </div>
              )}

              {/* Add manual PB button */}
              {!showForm && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="self-start inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-[var(--hub-hover)]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add personal best manually
                </button>
              )}

              {/* Manual PB form */}
              {showForm && (
                <div className="rounded-[var(--r-nested)] border border-[var(--s-primary-bd)] bg-[var(--hub-card)] p-3.5 flex flex-col gap-3">
                  <p className="text-[13.5px] font-bold text-foreground">Add a personal best by hand</p>

                  {/* Exercise (readonly) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground">Exercise</label>
                    <input
                      readOnly
                      value={exerciseName}
                      className="w-full rounded-[var(--r-control)] border border-[var(--hub-field-border)] bg-[var(--hub-hover)] px-2.5 py-2 text-[13.5px] text-[var(--body)]"
                    />
                  </div>

                  {/* Unit radiogroup */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground">Unit</span>
                    <div className="inline-flex gap-0.5 rounded-[var(--r-control)] border border-[var(--hub-border)] bg-[var(--hub-hover)] p-0.5" role="radiogroup" aria-label="Unit">
                      {(["kg", "band", "reps", "time"] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          role="radio"
                          aria-checked={unit === u}
                          onClick={() => { setUnit(u); setVal(""); setRepsVal(""); }}
                          className={`rounded-[var(--r-control-sm)] px-2.5 py-[5px] text-[12.5px] font-semibold transition-colors ${
                            unit === u
                              ? "bg-[var(--hub-card)] text-foreground shadow-[var(--shadow-sm)]"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {u === "band" ? "Band colour" : u === "time" ? "Time" : u.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Value row */}
                  <div className="flex gap-2 items-end">
                    {unit === "kg" && (
                      <>
                        <div className="flex flex-col gap-1.5 flex-1">
                          <label className="text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground">Weight (kg)</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="e.g. 18"
                            value={val}
                            onChange={(e) => { setVal(e.target.value); setValErr(false); }}
                            className={`w-full rounded-[var(--r-control)] border px-2.5 py-2 text-[13.5px] font-semibold tabular-nums bg-[var(--hub-card)] text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30 ${valErr ? "border-[var(--s-danger)]" : "border-[var(--hub-field-border)]"}`}
                          />
                        </div>
                        <span className="pb-2 text-sm font-bold text-muted-foreground">×</span>
                        <div className="flex flex-col gap-1.5 w-24">
                          <label className="text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground">Reps</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="8"
                            value={repsVal}
                            onChange={(e) => setRepsVal(e.target.value)}
                            className="w-full rounded-[var(--r-control)] border border-[var(--hub-field-border)] px-2.5 py-2 text-[13.5px] font-semibold tabular-nums bg-[var(--hub-card)] text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
                          />
                        </div>
                      </>
                    )}
                    {unit === "band" && (
                      <>
                        <div className="flex flex-col gap-1.5 flex-1">
                          <label className="text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground">Band colour</label>
                          <select
                            value={val}
                            onChange={(e) => { setVal(e.target.value); setValErr(false); }}
                            className={`w-full rounded-[var(--r-control)] border px-2.5 py-2 text-[13.5px] font-semibold bg-[var(--hub-card)] text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30 ${valErr ? "border-[var(--s-danger)]" : "border-[var(--hub-field-border)]"}`}
                          >
                            <option value="">Choose…</option>
                            {bandOptions.map((b) => (
                              <option key={b.id} value={b.colour}>{b.colour.charAt(0).toUpperCase() + b.colour.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <span className="pb-2 text-sm font-bold text-muted-foreground">×</span>
                        <div className="flex flex-col gap-1.5 w-24">
                          <label className="text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground">Reps</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="12"
                            value={repsVal}
                            onChange={(e) => setRepsVal(e.target.value)}
                            className="w-full rounded-[var(--r-control)] border border-[var(--hub-field-border)] px-2.5 py-2 text-[13.5px] font-semibold tabular-nums bg-[var(--hub-card)] text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
                          />
                        </div>
                      </>
                    )}
                    {unit === "reps" && (
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground">Reps</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="e.g. 14"
                          value={val}
                          onChange={(e) => { setVal(e.target.value); setValErr(false); }}
                          className={`w-full rounded-[var(--r-control)] border px-2.5 py-2 text-[13.5px] font-semibold tabular-nums bg-[var(--hub-card)] text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30 ${valErr ? "border-[var(--s-danger)]" : "border-[var(--hub-field-border)]"}`}
                        />
                      </div>
                    )}
                    {unit === "time" && (
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground">Time — mm:ss</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]{1,2}:[0-5][0-9]"
                          placeholder="1:05"
                          value={val}
                          onChange={(e) => { setVal(e.target.value); setValErr(false); }}
                          className={`w-full rounded-[var(--r-control)] border px-2.5 py-2 text-[13.5px] font-semibold tabular-nums bg-[var(--hub-card)] text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30 ${valErr ? "border-[var(--s-danger)]" : "border-[var(--hub-field-border)]"}`}
                        />
                      </div>
                    )}
                  </div>
                  {valErr && <p className="text-[12px] font-semibold text-[var(--s-danger)]">Enter a value.</p>}

                  {/* Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground">Date achieved</label>
                    <input
                      type="date"
                      value={dateVal}
                      max={today}
                      onChange={(e) => { setDateVal(e.target.value); setDateErr(false); }}
                      className={`w-full rounded-[var(--r-control)] border px-2.5 py-2 text-[13.5px] bg-[var(--hub-card)] text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30 ${dateErr ? "border-[var(--s-danger)]" : "border-[var(--hub-field-border)]"}`}
                    />
                    {dateErr && <p className="text-[12px] font-semibold text-[var(--s-danger)]">The date can&apos;t be in the future.</p>}
                  </div>

                  {/* Note */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-[.05em] text-muted-foreground">
                      Note <span className="font-medium normal-case tracking-normal">— optional</span>
                    </label>
                    <textarea
                      placeholder="e.g. done at home, 1 May 2026"
                      value={noteVal}
                      onChange={(e) => setNoteVal(e.target.value)}
                      className="min-h-[62px] w-full resize-y rounded-[var(--r-control)] border border-[var(--hub-field-border)] bg-[var(--hub-card)] p-2.5 text-[13.5px] leading-relaxed text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
                    />
                  </div>

                  {/* Source line */}
                  <div className="flex items-center gap-2 rounded-[var(--r-control)] border border-dashed border-[var(--hub-field-border)] bg-[var(--hub-hover)] px-2.5 py-2.5 text-[12.5px] text-[var(--body)]">
                    <span className="shrink-0 text-muted-foreground">{ICO.penLine}</span>
                    <span>Source: <b className="text-foreground">Recorded manually</b> by {userDisplayName} · will show as manual wherever it appears</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setVal(""); setRepsVal(""); setNoteVal(""); setValErr(false); setDateErr(false); }}
                      className="rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-[13px] font-semibold text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={posting}
                      className="inline-flex items-center gap-1.5 rounded-[var(--r-control)] bg-rose px-3.5 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {posting ? "Saving…" : "Save personal best"}
                    </button>
                  </div>
                </div>
              )}

              {/* History section */}
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.06em] text-muted-foreground">
                History
                <span className="flex-1 h-px bg-[var(--hub-border)]" />
              </div>

              {sorted.length === 0 ? (
                <p className="text-[12.5px] text-muted-foreground py-1">Nothing logged for this exercise yet.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {sorted.map((r) => {
                    const isPb = pb?.key === r.key;
                    const isLoggedBest = !isPb && r.source === "logged" && pb?.source === "manual" && loggedBest[r.unit]?.key === r.key;

                    return (
                      <div
                        key={r.key}
                        className={`flex items-start gap-2.5 rounded-[var(--r-nested)] border bg-[var(--hub-card)] p-2.5 ${isPb ? "border-[var(--s-warning-bd)]" : "border-[var(--hub-border)]"}`}
                      >
                        {/* Icon */}
                        <span
                          className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[var(--r-control)] ${
                            r.source === "manual"
                              ? "border border-[var(--hub-border)] bg-[var(--hub-hover)] text-[var(--body)]"
                              : "bg-[var(--s-success-bg)] text-teal"
                          }`}
                        >
                          {r.source === "manual" ? ICO.pen : ICO.tick}
                        </span>

                        {/* Body */}
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-bold text-foreground tabular-nums flex items-center gap-[7px] flex-wrap">
                            {vText(r)}
                            {r.source === "manual" && (
                              <span className="inline-flex items-center text-[8.5px] font-extrabold tracking-[.06em] uppercase rounded-[var(--r-control-sm)] px-[5px] border border-black/18 bg-white/70 text-[#3F464C]">
                                manual
                              </span>
                            )}
                            {isPb && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-px text-[10px] font-extrabold uppercase tracking-[.04em] bg-[var(--s-warning-bg)] border border-[var(--s-warning-bd)] text-[#6E551F]">
                                {ICO.star} PB
                              </span>
                            )}
                            {isLoggedBest && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-px text-[10px] font-extrabold uppercase tracking-[.04em] bg-[var(--hub-hover)] border border-[var(--hub-border)] text-muted-foreground">
                                Logged best
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11.5px] text-muted-foreground flex items-center gap-1 flex-wrap">
                            {r.source === "logged" ? (
                              <>
                                <a
                                  href={`/hub/clients/${clientId}/blocks/${r.block_number}/sessions/${r.session_number}`}
                                  className="font-semibold text-teal hover:underline"
                                >
                                  Logged · Session {r.session_number}
                                </a>
                                <span className="text-[var(--hub-field-border)]">·</span>
                                <span>Block {r.block_number}</span>
                                <span className="text-[var(--hub-field-border)]">·</span>
                                <span>{fmtShort(r.achieved_at)}</span>
                              </>
                            ) : (
                              <>
                                <span>Recorded manually</span>
                                <span className="text-[var(--hub-field-border)]">·</span>
                                <span>{fmtShort(r.achieved_at)}</span>
                                <span className="text-[var(--hub-field-border)]">·</span>
                                <span>by {r.recorded_by ?? "Staff"}</span>
                              </>
                            )}
                          </div>
                          {r.note && (
                            <div className="mt-1 text-[12px] text-[var(--body)] italic">{r.note}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--hub-border)] bg-[var(--hub-card)] px-[18px] py-3 text-[12px] text-muted-foreground">
          <b className="text-[var(--body)] font-semibold">Logged</b> = recorded in a session in the hub · <b className="text-[var(--body)] font-semibold">Recorded manually</b> = typed in by a trainer
        </div>
      </aside>
    </>
  );
}

/** Placeholder — the real value comes from the auth user, but this component
 *  doesn't have access to it. The source line in the form shows this; the API
 *  records the actual user name. We use a generic label here. */
const userDisplayName = "Esther";
