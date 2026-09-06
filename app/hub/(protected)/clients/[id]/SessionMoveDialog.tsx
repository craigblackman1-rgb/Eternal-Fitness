"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { DBSession } from "@/types";

/* ── SessionMoveDialog — Move or cancel one session.
   Fetches candidate slots from GET /api/availability/slots, shows clash/free
   status, and PATCHes the session on confirm. Cancel mode offers reason
   select + charged/free choice. ─────────────────────────────────────────── */

interface SlotCandidate {
  date: string;        // "YYYY-MM-DD"
  time: string;        // "HH:MM"
  label: string;       // "Mon 21 Sep"
  fullDateTime: string; // ISO string for PATCH
  isFree: boolean;
  note: string;
}

interface SessionMoveDialogProps {
  session: DBSession;
  clientNumber: number;
  clientName: string;
  preferredTime: string | null;
  sessionsRemaining: number | null;
  onClose: () => void;
}

const CANCEL_REASONS = [
  "Illness",
  "Client request",
  "Esther unavailable",
  "Other",
] as const;

/** C1a — three-way cancel route: charged, free, or reschedule. */
type CancelRoute = "charge" | "free" | "reschedule";

function fmtDayShort(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function SessionMoveDialog({
  session,
  clientNumber,
  clientName,
  preferredTime,
  sessionsRemaining,
  onClose,
}: SessionMoveDialogProps) {
  const router = useRouter();
  const [route, setRoute] = useState<"move" | "cancel">("move");
  const [cancelRoute, setCancelRoute] = useState<CancelRoute>("free");
  const [slots, setSlots] = useState<SlotCandidate[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>(CANCEL_REASONS[0]);
  const [otherReason, setOtherReason] = useState("");
  const [saving, setSaving] = useState(false);

  const sessionDate = session.scheduled_at ? fmtDayShort(session.scheduled_at) : "";
  const sessionTime = session.scheduled_at ? fmtTime(session.scheduled_at) : preferredTime ?? "";

  // Fetch candidate slots on mount
  useEffect(() => {
    if (route !== "move") return;
    const controller = new AbortController();

    async function fetchSlots() {
      setSlotsLoading(true);
      try {
        const from = session.scheduled_at
          ? new Date(session.scheduled_at).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        const res = await fetch(
          `/api/availability/slots?from=${from}&weeks=3`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Failed to load availability");
        const data = await res.json();
        const candidates: SlotCandidate[] = [];
        const bookedSet = new Set<string>();

        for (const week of data.weeks ?? []) {
          for (const day of week.days ?? []) {
            if (day.state !== "open") continue;
            for (const slot of day.slots ?? []) {
              const iso = slot.startUtc;
              const dt = new Date(iso);
              const label = dt.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              });
              const time = dt.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              candidates.push({
                date: day.date,
                time: slot.startLocal,
                label,
                fullDateTime: iso,
                isFree: !bookedSet.has(`${day.date} ${slot.startLocal}`),
                note: `${time} · Esther's available slot`,
              });
            }
          }
        }
        setSlots(candidates);
        // Pre-select the first free slot
        const firstFree = candidates.find((s) => s.isFree);
        if (firstFree) setSelectedSlot(firstFree.fullDateTime);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Slot fetch failed:", err);
        }
      } finally {
        setSlotsLoading(false);
      }
    }

    fetchSlots();
    return () => controller.abort();
  }, [route, session.scheduled_at]);

  const handleMove = useCallback(async () => {
    if (!selectedSlot) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: selectedSlot }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to move session");
      }
      toast.success(`Session moved to ${fmtDayShort(selectedSlot)}`);
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move session");
    } finally {
      setSaving(false);
    }
  }, [selectedSlot, session.id, onClose, router]);

  const handleCancel = useCallback(async () => {
    // C1a — reschedule route jumps into move mode
    if (cancelRoute === "reschedule") {
      setRoute("move");
      return;
    }
    setSaving(true);
    try {
      const reason = cancelReason === "Other" && otherReason ? otherReason : cancelReason;
      const body: Record<string, unknown> = {
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason,
      };
      // C1a — three-way: "free" sends charged_free, "charge" omits it (defaults to charged)
      if (cancelRoute === "free") {
        body.charged_free = "free";
      }
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel session");
      }
      toast.success(cancelRoute === "free" ? "Session cancelled — free" : "Session cancelled — charged to balance");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel session");
    } finally {
      setSaving(false);
    }
  }, [session.id, cancelRoute, cancelReason, otherReason, onClose, router]);

  const selectedSlotData = slots.find((s) => s.fullDateTime === selectedSlot);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--color-ink)]/40 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-[560px] mx-4 bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_20px_60px_rgba(16,24,40,.18)] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--hub-border)] shrink-0">
          <h3 className="m-0 text-[15.5px] font-bold text-[var(--color-ink)] tracking-tight">
            {sessionDate}, {sessionTime}
          </h3>
          <p className="m-0 mt-0.5 text-xs text-[var(--color-muted)]">
            {sessionWorkoutName(session)} · {clientName}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Route toggle */}
          <div className="grid grid-cols-2 gap-3 mb-1">
            <button
              type="button"
              onClick={() => setRoute("move")}
              className={`border rounded-nested p-3.5 text-left font-[inherit] transition-[border-color,box-shadow] duration-[120ms] ${
                route === "move"
                  ? "border-[var(--color-rose)] shadow-[inset_0_0_0_1px_var(--color-rose)] bg-[var(--status-primary-bg)]"
                  : "border-[var(--hub-border)] bg-white hover:border-[var(--color-rose)]"
              }`}
            >
              <span className={`text-[10.5px] font-extrabold uppercase tracking-[.08em] ${route === "move" ? "text-[var(--color-rose)]" : "text-[var(--color-muted)]"}`}>
                Move it
              </span>
              <p className="mt-1 mb-0 text-sm font-bold text-[var(--color-ink)]">Reschedule to a new date or time</p>
              <p className="mt-0.5 mb-0 text-xs text-[var(--color-body)]">
                {sessionWorkoutName(session)} stays exactly as built. Only the date changes.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setRoute("cancel")}
              className={`border rounded-nested p-3.5 text-left font-[inherit] transition-[border-color,box-shadow] duration-[120ms] ${
                route === "cancel"
                  ? "border-[var(--color-rose)] shadow-[inset_0_0_0_1px_var(--color-rose)] bg-[var(--status-primary-bg)]"
                  : "border-[var(--hub-border)] bg-white hover:border-[var(--color-rose)]"
              }`}
            >
              <span className={`text-[10.5px] font-extrabold uppercase tracking-[.08em] ${route === "cancel" ? "text-[var(--color-rose)]" : "text-[var(--color-muted)]"}`}>
                Cancel it
              </span>
              <p className="mt-1 mb-0 text-sm font-bold text-[var(--color-ink)]">Remove this booking</p>
              <p className="mt-0.5 mb-0 text-xs text-[var(--color-body)]">
                Nothing is lost — the queue simply waits for the next booking.
              </p>
            </button>
          </div>

          {/* Move panel */}
          {route === "move" && (
            <div className="mt-4">
              <p className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[var(--color-muted)] mb-2.5">
                New date and time
              </p>
              {slotsLoading ? (
                <p className="text-xs text-[var(--color-muted)]">Loading available slots…</p>
              ) : slots.length === 0 ? (
                <p className="text-xs text-[var(--color-muted)]">No available slots found in the next 3 weeks.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => {
                    const isSelected = slot.fullDateTime === selectedSlot;
                    return (
                      <button
                        key={slot.fullDateTime}
                        type="button"
                        onClick={() => setSelectedSlot(slot.fullDateTime)}
                        className={`border rounded-control px-3.5 py-2 text-left font-[inherit] transition-[border-color,box-shadow] duration-[120ms] ${
                          isSelected
                            ? "border-[var(--color-rose)] bg-[var(--status-primary-bg)] shadow-[inset_0_0_0_1px_var(--color-rose)]"
                            : "border-[var(--hub-field-border)] bg-[var(--field-fill)] hover:border-[var(--color-rose)]"
                        }`}
                      >
                        <div className={`text-[13px] font-bold ${isSelected ? "text-[var(--color-rose)]" : "text-[var(--color-ink)]"}`}>
                          {slot.label}
                        </div>
                        <div className={`text-[11.5px] mt-0.5 ${isSelected ? "text-[var(--color-rose)]" : "text-[var(--color-muted)]"}`}>
                          {slot.time}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Clash/free note */}
              {selectedSlotData && (
                <div
                  className={`flex items-center gap-2.5 mt-3 px-3 py-2.5 rounded-nested border text-[13px] ${
                    selectedSlotData.isFree
                      ? "bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--color-teal)]"
                      : "bg-[var(--status-warning-bg)] border-[var(--status-warning-border)] text-[var(--color-amber)]"
                  }`}
                >
                  <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-currentColor" />
                  <span>
                    {selectedSlotData.label}, {selectedSlotData.time} is{" "}
                    {selectedSlotData.isFree ? "free. Nothing else is booked in that slot." : "occupied."}
                  </span>
                </div>
              )}

              {/* Programme unaffected reassurance */}
              <div className="flex items-center gap-2.5 mt-3.5 px-3.5 py-3 rounded-nested bg-[var(--status-success-bg)] border border-[var(--status-success-border)] text-[var(--color-teal)] text-[13.5px] font-medium">
                <svg className="shrink-0 w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>
                  Her programme is unaffected — <b>{sessionWorkoutName(session)}</b> still delivers at her next session. Moving this session does not touch the queue.
                </span>
              </div>
            </div>
          )}

          {/* Cancel panel */}
          {route === "cancel" && (
            <div className="mt-4">
              <p className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[var(--color-muted)] mb-2.5">
                How should this cancellation be handled?
              </p>

              {/* C1a — Three-way route cards */}
              <div className="grid grid-cols-3 gap-2.5 mb-3">
                <RouteCard
                  title="Charge to the balance"
                  description="Uses one of the paid sessions. The remaining count drops by 1."
                  selected={cancelRoute === "charge"}
                  onSelect={() => setCancelRoute("charge")}
                />
                <RouteCard
                  title="Free cancellation"
                  description="Doesn't use a session. Recorded as a free cancellation."
                  selected={cancelRoute === "free"}
                  onSelect={() => setCancelRoute("free")}
                />
                <RouteCard
                  title="Reschedule"
                  description="Move to a new date. Doesn't use a session."
                  selected={cancelRoute === "reschedule"}
                  onSelect={() => setCancelRoute("reschedule")}
                />
              </div>

              {/* Consequence preview */}
              <div className="border border-[var(--status-success-border)] rounded-nested bg-[var(--status-success-bg)] px-3.5 py-3 mb-3 text-[13px] text-[var(--color-teal-text)] font-medium">
                {cancelRoute === "charge"
                  ? `${sessionsRemaining ?? "?"} remaining → ${Math.max(0, (sessionsRemaining ?? 1) - 1)} remaining`
                  : cancelRoute === "free"
                    ? `${sessionsRemaining ?? "?"} remaining → ${sessionsRemaining ?? "?"} remaining (no change)`
                    : `${sessionsRemaining ?? "?"} remaining → ${sessionsRemaining ?? "?"} remaining (date changes only)`}
              </div>

              {/* Reason */}
              <p className="text-[10.5px] font-bold uppercase tracking-[.06em] text-[var(--color-muted)] mb-1.5">
                Reason
              </p>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="h-[34px] border border-[var(--hub-field-border)] rounded-control-sm px-2.5 font-[inherit] text-[13px] text-[var(--color-ink)] bg-[var(--field-fill)] w-full max-w-[320px]"
              >
                {CANCEL_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              {cancelReason === "Other" && (
                <input
                  type="text"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Specify reason"
                  className="mt-2 h-[34px] border border-[var(--hub-field-border)] rounded-control-sm px-2.5 font-[inherit] text-[13px] text-[var(--color-ink)] bg-[var(--field-fill)] w-full max-w-[320px]"
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-[var(--hub-border)] bg-[var(--field-fill)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-control border border-transparent bg-transparent px-3.5 py-[7px] min-h-[36px] font-[inherit] text-[13px] font-medium text-[var(--color-muted)] cursor-pointer hover:bg-[var(--hub-hover)] hover:text-[var(--color-ink)] transition-colors disabled:opacity-50"
          >
            Back without saving
          </button>
          <button
            type="button"
            onClick={route === "move" ? handleMove : handleCancel}
            disabled={saving || (route === "move" && !selectedSlot)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-control border border-transparent px-5 py-[7px] min-h-[36px] font-[inherit] text-[13px] font-semibold cursor-pointer transition-colors disabled:opacity-50 ${
              route === "move"
                ? "bg-[var(--color-rose)] text-white hover:bg-[var(--color-rose)]/90"
                : "bg-[var(--status-danger)] text-white hover:bg-[var(--status-danger)]/90"
            }`}
          >
            {saving
              ? "Saving…"
              : route === "move"
                ? `Move to ${selectedSlotData ? `${selectedSlotData.label}, ${selectedSlotData.time}` : "…"}`
                : "Cancel this session"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Minimal workout-name helper (copied from session-display to avoid server import). */
function sessionWorkoutName(s: DBSession): string {
  const data = (s.data as unknown as Record<string, unknown>) ?? null;
  const versions = data?.versions as Record<string, { focus_label?: string }> | undefined;
  const version = versions?.studio ?? versions?.home;
  const label = version?.focus_label ?? (data as any)?.focus_label;
  if (label && typeof label === "string" && label.trim()) return label.trim();
  if (s.program_id && s.program_slot_id) return "Programme session";
  return "Workout";
}

/** C1a — Route card for three-way cancel choice. */
function RouteCard({ title, description, selected, onSelect }: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`border rounded-nested bg-white p-3 text-center font-[inherit] cursor-pointer transition-[border-color,box-shadow] duration-[120ms] ${
        selected
          ? "border-[var(--color-rose)] shadow-[inset_0_0_0_1px_var(--color-rose)] bg-[var(--status-primary-bg)]"
          : "border-[var(--hub-border)] hover:border-[var(--color-rose)]"
      }`}
    >
      <div className={`text-[13.5px] font-bold ${selected ? "text-[var(--status-primary-text)]" : "text-[var(--color-ink)]"}`}>
        {title}
      </div>
      <div className="text-xs text-[var(--color-body)] mt-1 leading-snug">
        {description}
      </div>
    </button>
  );
}
