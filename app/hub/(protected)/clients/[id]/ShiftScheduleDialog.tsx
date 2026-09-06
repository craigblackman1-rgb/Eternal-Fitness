"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/* ── ShiftScheduleDialog — bulk push-back of a client's future sessions.
   Two modes: next_slot (detect gaps, push each to the next regular slot)
   and shift_n (push all forward by N occurrences of the weekly pattern).
   Preview mode shows before→after pairs; confirm applies. ──────────────── */

interface ShiftPreview {
  session_id: string;
  was: string;       // ISO
  now: string;       // ISO
  workoutName: string;
  missed: boolean;
  cancel_reason: string | null;
}

interface ShiftScheduleDialogProps {
  clientNumber: number;
  clientId: string;
  onClose: () => void;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function ShiftScheduleDialog({
  clientNumber,
  clientId,
  onClose,
}: ShiftScheduleDialogProps) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [mode, setMode] = useState<"next_slot" | "shift_n">("next_slot");
  const [nValue, setNValue] = useState(2);
  const [preview, setPreview] = useState<ShiftPreview[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        from_date: fromDate,
        mode,
        preview: true,
      };
      if (mode === "shift_n") body.n = nValue;

      const res = await fetch(`/api/clients/${clientNumber}/shift-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to preview shift");
      }
      const data = await res.json();
      setPreview(data.preview ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview");
    } finally {
      setLoading(false);
    }
  }, [fromDate, mode, nValue, clientNumber]);

  const applyShift = useCallback(async () => {
    setApplying(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        from_date: fromDate,
        mode,
        preview: false,
      };
      if (mode === "shift_n") body.n = nValue;

      const res = await fetch(`/api/clients/${clientNumber}/shift-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to shift schedule");
      }
      toast.success(`Shifted ${preview?.length ?? 0} sessions`);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to shift schedule");
    } finally {
      setApplying(false);
    }
  }, [fromDate, mode, nValue, clientNumber, preview, onClose, router]);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--color-ink)]/40 backdrop-blur-sm"
        onClick={() => !applying && onClose()}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-[680px] mx-4 bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_20px_60px_rgba(16,24,40,.18)] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--hub-border)] shrink-0">
          <h3 className="m-0 text-[15.5px] font-bold text-[var(--color-ink)] tracking-tight">
            Shift the schedule
          </h3>
          <p className="m-0 mt-0.5 text-xs text-[var(--color-muted)]">
            Move a run of bookings without touching the programme&rsquo;s content or queue position.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Date range */}
          <div className="mb-4">
            <label className="block text-[10.5px] font-bold uppercase tracking-[.06em] text-[var(--color-muted)] mb-1.5">
              From
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPreview(null); }}
                className="h-[34px] border border-[var(--hub-field-border)] rounded-control-sm px-2.5 font-[inherit] text-[13px] text-[var(--color-ink)] bg-[var(--field-fill)]"
              />
              {preview && (
                <span className="text-xs text-[var(--color-body)]">
                  <b className="text-[var(--color-ink)]">{preview.length}</b> sessions selected
                </span>
              )}
            </div>
          </div>

          {/* Mode cards */}
          <div className="mb-4">
            <p className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[var(--color-muted)] mb-2.5">
              How should they move?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setMode("next_slot"); setPreview(null); }}
                className={`border rounded-nested p-3.5 text-left font-[inherit] transition-[border-color,box-shadow] duration-[120ms] ${
                  mode === "next_slot"
                    ? "border-[var(--color-rose)] shadow-[inset_0_0_0_1px_var(--color-rose)] bg-[var(--status-primary-bg)]"
                    : "border-[var(--hub-border)] bg-white hover:border-[var(--color-rose)]"
                }`}
              >
                <span className={`text-[10.5px] font-extrabold uppercase tracking-[.08em] ${mode === "next_slot" ? "text-[var(--color-rose)]" : "text-[var(--color-muted)]"}`}>
                  Recommended
                </span>
                <p className="mt-1 mb-0 text-sm font-bold text-[var(--color-ink)]">Move each to the client&rsquo;s next regular slot</p>
                <p className="mt-0.5 mb-0 text-xs text-[var(--color-body)]">
                  Detects missed sessions and slides every booking forward to the next slot in the weekly pattern.
                </p>
              </button>
              <button
                type="button"
                onClick={() => { setMode("shift_n"); setPreview(null); }}
                className={`border rounded-nested p-3.5 text-left font-[inherit] transition-[border-color,box-shadow] duration-[120ms] ${
                  mode === "shift_n"
                    ? "border-[var(--color-rose)] shadow-[inset_0_0_0_1px_var(--color-rose)] bg-[var(--status-primary-bg)]"
                    : "border-[var(--hub-border)] bg-white hover:border-[var(--color-rose)]"
                }`}
              >
                <span className={`text-[10.5px] font-extrabold uppercase tracking-[.08em] ${mode === "shift_n" ? "text-[var(--color-rose)]" : "text-[var(--color-muted)]"}`}>
                  Manual
                </span>
                <p className="mt-1 mb-0 text-sm font-bold text-[var(--color-ink)]">Shift all by N sessions</p>
                <p className="mt-0.5 mb-0 text-xs text-[var(--color-body)]">
                  Choose exactly how many slots to push every booking forward by.
                </p>
                {mode === "shift_n" && (
                  <div className="flex items-center gap-2 mt-2.5">
                    <input
                      type="number"
                      min={1}
                      value={nValue}
                      onChange={(e) => { setNValue(Math.max(1, parseInt(e.target.value) || 1)); setPreview(null); }}
                      className="w-[60px] h-[34px] border border-[var(--hub-field-border)] rounded-control-sm px-2.5 font-[inherit] text-[13px] text-[var(--color-ink)] bg-[var(--field-fill)]"
                    />
                    <span className="text-xs text-[var(--color-body)]">sessions forward</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Preview button */}
          {!preview && (
            <button
              type="button"
              onClick={fetchPreview}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-control border border-[var(--color-rose)] bg-[var(--status-primary-bg)] px-5 py-[7px] min-h-[36px] font-[inherit] text-[13px] font-semibold text-[var(--color-rose)] cursor-pointer hover:bg-[var(--color-rose)]/15 transition-colors disabled:opacity-50"
            >
              {loading ? "Loading…" : "Preview changes"}
            </button>
          )}

          {error && (
            <p className="mt-2 text-xs text-[var(--status-danger)]">{error}</p>
          )}

          {/* Preview table */}
          {preview && preview.length > 0 && (
            <div className="mt-2">
              <p className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[var(--color-muted)] mb-2.5">
                Before → after
              </p>
              <div className="border border-[var(--hub-border)] rounded-nested overflow-hidden">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="text-left px-2.5 py-2 text-[10.5px] font-bold uppercase tracking-[.07em] text-[var(--color-muted)] border-b border-[var(--hub-border)]">
                        Was
                      </th>
                      <th className="px-1 py-2 border-b border-[var(--hub-border)]" />
                      <th className="text-left px-2.5 py-2 text-[10.5px] font-bold uppercase tracking-[.07em] text-[var(--color-muted)] border-b border-[var(--hub-border)]">
                        Now
                      </th>
                      <th className="text-left px-2.5 py-2 text-[10.5px] font-bold uppercase tracking-[.07em] text-[var(--color-muted)] border-b border-[var(--hub-border)]">
                        Content
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => (
                      <tr key={row.session_id} className={row.missed ? "bg-[var(--status-warning-bg)]" : ""}>
                        <td className={`px-2.5 py-2 border-b border-[var(--hub-border)] ${row.missed ? "line-through text-[var(--status-danger)]" : "text-[var(--color-muted)]"}`}>
                          {fmtDate(row.was)}
                        </td>
                        <td className="px-1 py-2 border-b border-[var(--hub-border)] text-[var(--color-muted)]">→</td>
                        <td className="px-2.5 py-2 border-b border-[var(--hub-border)] font-semibold text-[var(--color-ink)]">
                          {fmtDate(row.now)}
                        </td>
                        <td className="px-2.5 py-2 border-b border-[var(--hub-border)] text-[var(--color-ink)]">
                          {row.workoutName}
                          {row.missed && (
                            <span className="ml-1.5 inline-flex items-center rounded-pill border px-2 py-0.5 text-[11.5px] font-semibold bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]">
                              Missed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Reassurance */}
              <div className="flex items-center gap-2.5 mt-3.5 px-3.5 py-3 rounded-nested bg-[var(--status-success-bg)] border border-[var(--status-success-border)] text-[var(--color-teal)] text-[13.5px] font-medium">
                <svg className="shrink-0 w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>
                  The programme is unaffected — workouts still deliver in the same order, just on new dates. The queue only advances when a session is completed.
                </span>
              </div>
            </div>
          )}

          {preview && preview.length === 0 && (
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              No sessions found from {fmtDate(fromDate)} onward.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-[var(--hub-border)] bg-[var(--field-fill)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="inline-flex items-center justify-center gap-1.5 rounded-control border border-transparent bg-transparent px-3.5 py-[7px] min-h-[36px] font-[inherit] text-[13px] font-medium text-[var(--color-muted)] cursor-pointer hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {preview && preview.length > 0 && (
            <button
              type="button"
              onClick={applyShift}
              disabled={applying}
              className="inline-flex items-center justify-center gap-1.5 rounded-control border border-transparent bg-[var(--color-rose)] text-white px-5 py-[7px] min-h-[36px] font-[inherit] text-[13px] font-semibold cursor-pointer hover:bg-[var(--color-rose)]/90 transition-colors disabled:opacity-50"
            >
              {applying ? "Shifting…" : `Shift ${preview.length} sessions`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
