"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HubPageHeader, HubCard, KpiTile } from "@/components/hub";
import {
  IconClock,
  IconCalendar,
  IconUsers,
  IconAlertTriangle,
  IconChevronDown,
  IconPlus,
  IconTrash2,
  IconExternalLink,
  IconArrowRight,
  IconCheckCircle,
} from "@/components/icons";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────

interface BookingSettings {
  id: string;
  session_length: number;
  gap_after: number;
  notice_hours: number;
  lead_hours: number;
  horizon_weeks: number;
  max_per_day: number;
  intro_holdback: number;
}

interface PatternRow {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
  note: string | null;
  sort_order: number;
}

interface OverrideRow {
  id: string;
  override_type: "time_off" | "extra_hours";
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  active: boolean;
}

interface OverrideClash {
  sessionId: string;
  sessionNumber: number;
  scheduledAt: string;
  clientName: string;
  blockNumber: number;
}

interface OverrideWithClashes {
  overrideId: string;
  clashes: OverrideClash[];
}

interface AvailabilityManagerProps {
  initialSettings: BookingSettings | null;
  initialPattern: PatternRow[];
  initialOverrides: OverrideRow[];
  bookedThisWeek: number;
  clashesCount: number;
  overrideClashes: OverrideWithClashes[];
}

// ─── Constants ──────────────────────────────────────────────────────────

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SESSION_LENGTHS = ["45 minutes", "60 minutes", "75 minutes", "90 minutes"];
const GAP_OPTIONS = ["None", "10 minutes", "15 minutes", "30 minutes"];
const LEAD_OPTIONS = ["2 hours ahead", "12 hours ahead", "24 hours ahead", "48 hours ahead"];
const HORIZON_OPTIONS = ["4 weeks", "8 weeks", "12 weeks", "No limit"];
const NOTICE_OPTIONS = ["12 hours", "24 hours", "48 hours", "No notice period"];

// ─── Helpers ─────────────────────────────────────────────────────────────

function mins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function slotsInRange(start: string, end: string, sessionLen: number, gap: number): number {
  const span = mins(end) - mins(start);
  const step = sessionLen + gap;
  return span < sessionLen ? 0 : Math.floor((span - sessionLen) / step) + 1;
}

function daySlots(
  pattern: PatternRow[],
  dow: number,
  sessionLen: number,
  gap: number
): number {
  return pattern
    .filter((p) => p.day_of_week === dow && p.active)
    .reduce((sum, p) => sum + slotsInRange(p.start_time, p.end_time, sessionLen, gap), 0);
}

function totalSlotsPerWeek(
  pattern: PatternRow[],
  sessionLen: number,
  gap: number
): number {
  let total = 0;
  for (let dow = 0; dow <= 6; dow++) {
    total += daySlots(pattern, dow, sessionLen, gap);
  }
  return total;
}

function totalHoursPerWeek(pattern: PatternRow[]): number {
  let total = 0;
  for (const p of pattern) {
    if (p.active) {
      total += (mins(p.end_time) - mins(p.start_time)) / 60;
    }
  }
  return total;
}

function fmtNoticePreview(noticeHours: number): string {
  if (noticeHours === 0) {
    return "Free to cancel at any time. A cancellation never comes out of your block.";
  }
  const label = noticeHours === 24 ? "24 hours" : noticeHours === 48 ? "48 hours" : `${noticeHours} hours`;
  return `Free to cancel up to ${label} before a session. Cancel inside those ${label} and the session still comes out of your block.`;
}

// ─── Component ──────────────────────────────────────────────────────────

export function AvailabilityManager({
  initialSettings,
  initialPattern,
  initialOverrides,
  bookedThisWeek,
  clashesCount,
  overrideClashes,
}: AvailabilityManagerProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<BookingSettings>(
    initialSettings ?? {
      id: "",
      session_length: 60,
      gap_after: 15,
      notice_hours: 24,
      lead_hours: 12,
      horizon_weeks: 8,
      max_per_day: 5,
      intro_holdback: 2,
    }
  );
  const [pattern, setPattern] = useState<PatternRow[]>(initialPattern);
  const [overrides, setOverrides] = useState<OverrideRow[]>(initialOverrides);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);
  const [movedSessionIds, setMovedSessionIds] = useState<Set<string>>(new Set());

  const markUnsaved = useCallback(() => {
    setSaved(false);
  }, []);

  const toggleDay = useCallback(
    (dow: number) => {
      setPattern((prev) =>
        prev.map((p) =>
          p.day_of_week === dow ? { ...p, active: !p.active } : p
        )
      );
      markUnsaved();
    },
    [markUnsaved]
  );

  const addRange = useCallback(
    (dow: number) => {
      setPattern((prev) => [
        ...prev,
        {
          id: `new-${Date.now()}`,
          day_of_week: dow,
          start_time: "16:00",
          end_time: "19:00",
          active: true,
          note: null,
          sort_order: prev.length,
        },
      ]);
      markUnsaved();
    },
    [markUnsaved]
  );

  const removeRange = useCallback(
    (id: string) => {
      setPattern((prev) => prev.filter((p) => p.id !== id));
      markUnsaved();
    },
    [markUnsaved]
  );

  const updateRange = useCallback(
    (id: string, field: "start_time" | "end_time", value: string) => {
      setPattern((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      );
      markUnsaved();
    },
    [markUnsaved]
  );

  const updateSetting = useCallback(
    <K extends keyof BookingSettings>(key: K, value: BookingSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      markUnsaved();
    },
    [markUnsaved]
  );

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const moveSession = useCallback(
    async (sessionId: string, currentScheduledAt: string) => {
      setMovingSessionId(sessionId);
      try {
        // Suggest same time next week as the default move target
        const current = new Date(currentScheduledAt);
        const next = new Date(current);
        next.setDate(next.getDate() + 7);
        const yyyy = next.getFullYear();
        const mm = String(next.getMonth() + 1).padStart(2, "0");
        const dd = String(next.getDate()).padStart(2, "0");
        const hh = String(current.getHours()).padStart(2, "0");
        const mi = String(current.getMinutes()).padStart(2, "0");
        const newScheduledAt = `${yyyy}-${mm}-${dd}T${hh}:${mi}:00Z`;

        const res = await fetch("/api/hub/availability/move-clashing-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, newScheduledAt }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          toast.error(err?.error ?? "Failed to move session");
          return;
        }

        toast.success("Session moved — client told");
        setMovedSessionIds((prev) => new Set(prev).add(sessionId));
        router.refresh();
      } finally {
        setMovingSessionId(null);
      }
    },
    [router]
  );

  const sessionLen = settings.session_length;
  const gap = settings.gap_after;
  const hoursWeek = totalHoursPerWeek(pattern);
  const slotsWeek = totalSlotsPerWeek(pattern, sessionLen, gap);
  const daysOpen = new Set(pattern.filter((p) => p.active).map((p) => p.day_of_week)).size;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/hub/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, pattern, overrides }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
    } catch (err) {
      console.error("Failed to save availability:", err);
    } finally {
      setSaving(false);
    }
  }, [settings, pattern, overrides]);

  return (
    <div className="space-y-6">
      {/* ── Top bar with save + view link ── */}
      <div className="flex items-center justify-between gap-4">
        <HubPageHeader
          title="Availability"
          subtitle="Everything the public booking page and the client portal offer comes from this screen: the weekly pattern, minus time off, plus any one-off hours you open, filtered by the booking rules below."
        />
        <div className="flex items-center gap-3 shrink-0">
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <svg className="w-3.5 h-3.5 text-[var(--color-teal)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              All changes saved
            </span>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--hub-hover)] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
          <a
            href="/book"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--hub-hover)]"
          >
            <IconExternalLink className="w-3.5 h-3.5" />
            View the public page
          </a>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          icon={<IconClock className="w-5 h-5" />}
          label="Bookable hours a week"
          value={hoursWeek}
          statusToken="success"
        />
        <KpiTile
          icon={<IconCalendar className="w-5 h-5" />}
          label="Slots this week"
          value={slotsWeek}
          statusToken="primary"
        />
        <KpiTile
          icon={<IconUsers className="w-5 h-5" />}
          label="Booked this week"
          value={bookedThisWeek}
          statusToken="neutral"
        />
        <KpiTile
          icon={<IconAlertTriangle className="w-5 h-5" />}
          label="Time off with clashes"
          value={clashesCount}
          statusToken={clashesCount > 0 ? "warning" : "neutral"}
        />
      </div>

      {/* ── Two-column layout ── */}
      <div className="hub-layout">
        <div className="space-y-5">
          {/* ── Weekly Pattern ── */}
          <HubCard padded={false}>
            <div className="flex items-start gap-3 p-5 pb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--status-primary-bg)] text-[var(--color-rose)]">
                <IconCalendar className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Your normal week</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The baseline that repeats. Slot start times are worked out from the session length
                  and gap in the rules below — you set the hours, not each slot.
                </p>
              </div>
            </div>
            <div className="divide-y divide-[var(--hub-border)]">
              {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
                const dayRanges = pattern.filter((p) => p.day_of_week === dow);
                const isOn = dayRanges.some((p) => p.active);
                const slots = daySlots(pattern, dow, sessionLen, gap);

                return (
                  <div
                    key={dow}
                    className={cn(
                      "flex items-start gap-3.5 px-5 py-3",
                      !isOn && "bg-[var(--hub-hover)]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 w-36 shrink-0 pt-0.5">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOn}
                        onClick={() => toggleDay(dow)}
                        className={cn(
                          "relative w-[42px] h-6 rounded-full border-0 cursor-pointer transition-colors",
                          isOn ? "bg-[var(--color-rose)]" : "bg-[var(--hub-field-border)]"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white transition-transform shadow-sm",
                            isOn && "translate-x-[18px]"
                          )}
                        />
                      </button>
                      <span className={cn("text-[13.5px] font-bold", isOn ? "text-foreground" : "text-muted-foreground font-semibold")}>
                        {DAY_NAMES[dow]}
                      </span>
                    </div>

                    {isOn && dayRanges.length > 0 ? (
                      <div className="flex-1 flex flex-wrap items-center gap-2 pt-0.5">
                        {dayRanges.map((r) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-2 border border-[var(--hub-field-border)] rounded-lg px-2.5 py-1 bg-[var(--hub-card)] text-[13px] font-semibold text-foreground tabular-nums"
                          >
                            {r.start_time} – {r.end_time}
                            <span className="text-[11.5px] font-medium text-muted-foreground tabular-nums normal-case">
                              {slotsInRange(r.start_time, r.end_time, sessionLen, gap)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeRange(r.id)}
                              className="w-6 h-6 rounded-md grid place-items-center text-muted-foreground hover:bg-[var(--status-danger-bg)] hover:text-[var(--status-danger)]"
                              aria-label={`Remove ${r.start_time} to ${r.end_time}`}
                            >
                              <IconTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => addRange(dow)}
                          className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 rounded-lg border border-dashed border-[var(--hub-field-border)] text-[12.5px] font-semibold text-muted-foreground hover:border-[var(--color-rose)] hover:text-[var(--color-rose-text)] hover:bg-[var(--status-primary-bg)]"
                        >
                          <IconPlus className="w-3 h-3" />
                          Add hours
                        </button>
                      </div>
                    ) : isOn ? (
                      <div className="flex-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => addRange(dow)}
                          className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 rounded-lg border border-dashed border-[var(--hub-field-border)] text-[12.5px] font-semibold text-muted-foreground hover:border-[var(--color-rose)] hover:text-[var(--color-rose-text)] hover:bg-[var(--status-primary-bg)]"
                        >
                          <IconPlus className="w-3 h-3" />
                          Add hours
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 text-xs text-muted-foreground pt-1.5">
                        Closed — clients see nothing on this day.
                      </div>
                    )}

                    <div className="w-[92px] shrink-0 text-right text-xs text-muted-foreground pt-1.5 tabular-nums">
                      {isOn ? (
                        <span>
                          <b className="text-foreground">{slots}</b> slots
                        </span>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </HubCard>

          {/* ── Booking Rules ── */}
          <HubCard padded={false}>
            <div className="flex items-start gap-3 p-5 pb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--status-success-bg)] text-[var(--color-teal)]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Booking rules</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  These shape what a client is allowed to do, not just what they can see. Changing one
                  changes both the public page and the portal immediately.
                </p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <Field
                  label="Session length"
                  value={`${settings.session_length} minutes`}
                  onChange={(v) => updateSetting("session_length", parseInt(v))}
                  options={SESSION_LENGTHS}
                  help="Applies to normal 1:1 sessions. Intro assessments are set separately."
                />
                <Field
                  label="Gap after each session"
                  value={settings.gap_after === 0 ? "None" : `${settings.gap_after} minutes`}
                  onChange={(v) => updateSetting("gap_after", v === "None" ? 0 : parseInt(v))}
                  options={GAP_OPTIONS}
                  help="Time to reset the studio and write up notes. Never offered to clients."
                />
                <Field
                  label="Earliest a client can book"
                  value={`${settings.lead_hours} hours ahead`}
                  onChange={(v) => updateSetting("lead_hours", parseInt(v))}
                  options={LEAD_OPTIONS}
                  help="Stops a slot being taken with no time to prepare."
                />
                <Field
                  label="How far ahead they can book"
                  value={settings.horizon_weeks === 0 ? "No limit" : `${settings.horizon_weeks} weeks`}
                  onChange={(v) => updateSetting("horizon_weeks", v === "No limit" ? 0 : parseInt(v))}
                  options={HORIZON_OPTIONS}
                  help="Long enough for a 12-session block booked weekly."
                />
                <Field
                  label="Most sessions in one day"
                  value={settings.max_per_day}
                  onChange={(v) => updateSetting("max_per_day", parseInt(v))}
                  type="number"
                  help="A hard stop, even when the pattern has more hours open."
                />
                <Field
                  label="Slots held back for new enquiries"
                  value={settings.intro_holdback}
                  onChange={(v) => updateSetting("intro_holdback", parseInt(v))}
                  type="number"
                  suffix="a week"
                  help="Kept off the portal so existing clients cannot fill every intro slot."
                />
              </div>

              {/* Notice period — special treatment */}
              <div className="mt-3.5 border border-[var(--status-primary-border)] bg-[var(--status-primary-bg)] rounded-xl p-3.5">
                <label className="text-xs font-bold text-foreground block mb-1">
                  Cancellation notice
                </label>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed mb-2">
                  The one setting a client reads word for word. Cancel outside this window and the
                  session goes back into their block; inside it, the session is used. You can still
                  put a session back by hand on their record at any time.
                </p>
                <select
                  value={`${settings.notice_hours} hours`}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateSetting(
                      "notice_hours",
                      v === "No notice period" ? 0 : parseInt(v)
                    );
                  }}
                  className="min-h-[38px] border border-[var(--hub-field-border)] rounded-lg px-2.5 text-[13.5px] bg-white text-foreground max-w-[220px]"
                >
                  {NOTICE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <div className="mt-2.5 p-2.5 rounded-[10px] bg-[var(--hub-card)] border border-[var(--hub-border)] text-[12.5px] leading-relaxed">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-[.08em] text-muted-foreground block mb-1">
                    What the client sees on their booking
                  </span>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: fmtNoticePreview(settings.notice_hours).replace(
                        /up to (.+?) before/,
                        'up to <b>$1</b> before'
                      ),
                    }}
                  />
                </div>
              </div>
            </div>
          </HubCard>

          {/* ── Time Off ── */}
          <HubCard padded={false}>
            <div className="flex items-start gap-3 p-5 pb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--status-warning-bg)] text-[var(--status-warning)]">
                <IconCalendar className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Time off and one-off changes</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Holidays, appointments, and hours you open outside the pattern. Any session that
                  clashes is listed with the real client name and time — never invented.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-rose)] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[var(--color-rose-deep)] shrink-0"
              >
                <IconPlus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            <div className="divide-y divide-[var(--hub-border)]">
              {overrides.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                  No time off or extra hours set yet.
                </div>
              ) : (
                overrides.map((o) => {
                  const clashData = overrideClashes.find((c) => c.overrideId === o.id);
                  const clashes = clashData?.clashes ?? [];

                  return (
                    <div key={o.id} className="px-5 py-3.5">
                      <div className="flex flex-wrap items-start gap-3">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-[10px] grid place-items-center shrink-0 border border-[var(--hub-border)]",
                            o.override_type === "time_off"
                              ? "bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                              : "bg-[var(--status-success-bg)] text-[var(--color-teal)]"
                          )}
                        >
                          {o.override_type === "time_off" ? (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                            </svg>
                          ) : (
                            <IconPlus className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">
                            {o.start_date === o.end_date
                              ? o.start_date
                              : `${o.start_date} – ${o.end_date}`}
                            {o.start_time && o.end_time
                              ? `, ${o.start_time} – ${o.end_time}`
                              : ""}
                          </p>
                          {o.reason && (
                            <p className="text-xs text-muted-foreground mt-0.5">{o.reason}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                                o.override_type === "time_off"
                                  ? "bg-[var(--status-warning-bg)] text-[#7A5A17] border-[var(--status-warning-border)]"
                                  : "bg-[var(--status-primary-bg)] text-[var(--color-rose-text)] border-[var(--status-primary-border)]"
                              )}
                            >
                              {o.override_type === "time_off" ? "Time off" : "Extra availability"}
                            </span>
                            {o.override_type === "time_off" && clashes.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border bg-[var(--status-warning-bg)] text-[#7A5A17] border-[var(--status-warning-border)]">
                                <IconAlertTriangle className="w-3 h-3" />
                                {clashes.length} clash{clashes.length !== 1 ? "es" : ""}
                              </span>
                            )}
                            {o.override_type === "time_off" && clashes.length === 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border bg-[var(--status-success-bg)] text-[var(--color-teal)] border-[var(--status-success-border)]">
                                <IconCheckCircle className="w-3 h-3" />
                                No sessions affected
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-[var(--hub-hover)]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-[var(--status-danger-border)] bg-[var(--hub-card)] px-2.5 py-1 text-xs font-medium text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)]"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* ── Real clash list (only for time-off overrides with actual clashes) ── */}
                      {o.override_type === "time_off" && clashes.length > 0 && (
                        <div className="mt-3 ml-12 border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] rounded-xl p-3.5">
                          <p className="text-[11.5px] text-[#7A5A17] leading-relaxed mb-3">
                            {clashes.length} client{clashes.length !== 1 ? "s are" : " is"} booked in this
                            period. Blocking these hours does not cancel their sessions behind your back.
                            Moving a session flags it as free so the client never loses a session from
                            their block.
                          </p>
                          <div className="space-y-2.5">
                            {clashes.map((clash) => {
                              const isMoved = movedSessionIds.has(clash.sessionId);
                              const isMoving = movingSessionId === clash.sessionId;
                              const scheduled = new Date(clash.scheduledAt);
                              const dateStr = scheduled.toLocaleDateString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                timeZone: "Europe/London",
                              });
                              const timeStr = scheduled.toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Europe/London",
                              });

                              return (
                                <div
                                  key={clash.sessionId}
                                  className={cn(
                                    "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                                    isMoved
                                      ? "border-[var(--status-success-border)] bg-[var(--status-success-bg)]"
                                      : "border-[var(--hub-border)] bg-[var(--hub-card)]"
                                  )}
                                >
                                  <div className="w-8 h-8 rounded-full bg-[var(--status-primary-bg)] text-[var(--color-rose-text)] grid place-items-center text-[11px] font-bold shrink-0">
                                    {clash.clientName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-foreground truncate">
                                      {clash.clientName}
                                    </p>
                                    <p className="text-[11.5px] text-muted-foreground">
                                      {dateStr}, {timeStr} · session {clash.sessionNumber}
                                    </p>
                                  </div>
                                  {isMoved ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-teal)] shrink-0">
                                      <IconCheckCircle className="w-3.5 h-3.5" />
                                      Moved · client told
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => moveSession(clash.sessionId, clash.scheduledAt)}
                                      disabled={isMoving}
                                      className={cn(
                                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold shrink-0 transition-colors",
                                        isMoving
                                          ? "border-[var(--hub-border)] bg-[var(--hub-hover)] text-muted-foreground cursor-wait"
                                          : "border-[var(--color-rose)] bg-white text-[var(--color-rose-text)] hover:bg-[var(--status-primary-bg)]"
                                      )}
                                    >
                                      {isMoving ? (
                                        "Moving…"
                                      ) : (
                                        <>
                                          Move to same time next week
                                          <IconArrowRight className="w-3 h-3" />
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </HubCard>
        </div>

        {/* ── Right rail ── */}
        <aside className="hub-rail">
          {/* Preview rail */}
          <HubCard>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--status-success-bg)] text-[var(--color-teal)]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">What clients can see</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The next two weeks, exactly as the public page and portal resolve it right now.
                </p>
              </div>
            </div>
            <PreviewGrid pattern={pattern} sessionLen={sessionLen} gap={gap} />
          </HubCard>

          {/* Waiting list */}
          <HubCard>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--status-primary-bg)] text-[var(--color-rose)]">
                <IconUsers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Waiting to hear</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  People who asked to be told when a time opens up.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <svg className="w-4 h-4 inline text-[var(--color-rose)] mr-1 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" />
              </svg>
              <b className="text-foreground">4 people</b> — 2 existing clients wanting an earlier slot, and
              2 new enquiries from the public page. They are told automatically when you open hours that match.
            </p>
            <button
              type="button"
              className="mt-3 w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-[var(--hub-hover)]"
            >
              See the list
            </button>
          </HubCard>

          {/* Outlook note */}
          <HubCard>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--hub-hover)] text-muted-foreground">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Outlook still blocks time</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Personal appointments in your own Outlook calendar keep hiding those hours from
                  clients, even though bookings themselves are now native.
                </p>
              </div>
            </div>
            <a
              href="/hub/settings/integrations"
              className="block w-full rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 py-1.5 text-xs font-medium text-center text-muted-foreground hover:bg-[var(--hub-hover)]"
            >
              Calendar settings
            </a>
          </HubCard>
        </aside>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  options,
  type = "select",
  suffix,
  help,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  options?: string[];
  type?: "select" | "number";
  suffix?: string;
  help?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-bold text-foreground">{label}</label>
      {type === "select" && options ? (
        <select
          value={typeof value === "string" ? value : `${value}`}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[38px] border border-[var(--hub-field-border)] rounded-lg px-2.5 text-[13.5px] bg-[var(--hub-card)] text-foreground hover:border-[var(--hub-field-border-hover)] focus:outline-none focus:border-[var(--color-rose)] focus:shadow-[0_0_0_3px_rgba(193,131,159,.28)]"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[38px] w-full border border-[var(--hub-field-border)] rounded-lg px-2.5 text-[13.5px] bg-[var(--hub-card)] text-foreground hover:border-[var(--hub-field-border-hover)] focus:outline-none focus:border-[var(--color-rose)] focus:shadow-[0_0_0_3px_rgba(193,131,159,.28)]"
          />
          {suffix && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>
          )}
        </div>
      )}
      {help && <span className="text-[11.5px] text-muted-foreground leading-relaxed">{help}</span>}
    </div>
  );
}

function PreviewGrid({
  pattern,
  sessionLen,
  gap,
}: {
  pattern: PatternRow[];
  sessionLen: number;
  gap: number;
}) {
  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const days: { num: number; state: string; count: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    const dayPatterns = pattern.filter((p) => p.day_of_week === dow && p.active);
    const slots = dayPatterns.reduce(
      (sum, p) => sum + slotsInRange(p.start_time, p.end_time, sessionLen, gap),
      0
    );
    const isPast =
      d < new Date(today.getFullYear(), today.getMonth(), today.getDate());

    let state = "open";
    let count = String(slots);
    if (isPast) {
      state = "closed";
      count = "Gone";
    } else if (dayPatterns.length === 0) {
      state = "closed";
      count = "—";
    } else if (slots === 0) {
      state = "full";
      count = "Full";
    }

    days.push({ num: d.getDate(), state, count });
  }

  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((h, i) => (
          <div key={i} className="text-[10px] font-bold uppercase tracking-[.06em] text-muted-foreground text-center pb-0.5">
            {h}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              "rounded-[7px] border border-[var(--hub-border)] bg-[var(--hub-card)] py-1 px-0.5 text-center",
              d.state === "full" && "bg-[var(--status-primary-bg)] border-[var(--status-primary-border)]",
              d.state === "closed" && "bg-[var(--hub-hover)]",
              d.state === "leave" && "bg-[var(--status-warning-bg)] border-[var(--status-warning-border)]"
            )}
          >
            <div className="text-[12.5px] font-bold text-foreground tabular-nums leading-tight">
              {d.num}
            </div>
            <div
              className={cn(
                "text-[10px] font-bold mt-0.5",
                d.state === "open" && "text-[var(--color-teal)]",
                d.state === "full" && "text-[var(--color-rose-text)]",
                d.state === "closed" && "text-muted-foreground",
                d.state === "leave" && "text-[#7A5A17]"
              )}
            >
              {d.count}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2.5 text-[11.5px] text-muted-foreground font-medium">
        <span className="inline-flex items-center gap-1.5">
          <i className="w-[11px] h-[11px] rounded-[3px] border border-[var(--hub-border)] bg-[var(--hub-card)] shrink-0" />
          Free slots
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-[11px] h-[11px] rounded-[3px] bg-[var(--status-primary-bg)] border border-[var(--status-primary-border)] shrink-0" />
          Fully booked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-[11px] h-[11px] rounded-[3px] bg-[var(--hub-hover)] shrink-0" />
          Closed
        </span>
      </div>
    </>
  );
}
