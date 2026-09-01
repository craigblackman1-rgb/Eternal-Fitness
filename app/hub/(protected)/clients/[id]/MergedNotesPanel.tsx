"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconFileText,
  IconPlus,
  IconTrash2,
  IconSearch,
  IconAlertTriangle,
  IconCalendar,
  IconDumbbell,
  IconExternalLink,
  IconChevronRight,
} from "@/components/icons";
import type { ClientNote, SessionNoteData, MergedNote, NoteOrigin, PinnedNoteRef } from "@/types";
import type { AggregatedExerciseNote } from "@/lib/exercise-notes";

// ── Icons (inline SVGs not in the icon library) ────────────────────────

function IconPin({ className, pinned }: { className?: string; pinned?: boolean }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill={pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" />
      <path d="M9 10.8V4h6v6.8l2.4 3.2a1 1 0 0 1-.8 1.6H7.4a1 1 0 0 1-.8-1.6z" />
    </svg>
  );
}

function IconOpenExternal() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function IconNote() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function IconSession() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="m8.5 15.5 2 2 4.5-4.5" />
    </svg>
  );
}

function IconExercise() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5v11M17.5 6.5v11M3 10h1.5M3 14h1.5M19.5 10H21M19.5 14H21M9 10h6v4H9z" />
    </svg>
  );
}

function IconWarn() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4.5M12 17.2h.01" />
    </svg>
  );
}

// ── Constants ──────────────────────────────────────────────────────────

const ORIGIN_META: Record<
  NoteOrigin,
  { label: string; filter: string; noun: string; Icon: () => JSX.Element }
> = {
  profile: { label: "Typed on the profile", filter: "Profile", noun: "profile", Icon: IconProfile },
  session: { label: "Captured in a session", filter: "Sessions", noun: "session", Icon: IconSession },
  exercise: { label: "Captured against an exercise", filter: "Exercises", noun: "exercise", Icon: IconExercise },
};

const FILTER_KEYS = ["all", "profile", "session", "exercise", "pinned"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

/** Two most recent months render flat; older months collapse. */
const OPEN_MONTHS = 2;

// ── Props ──────────────────────────────────────────────────────────────

interface MergedNotesPanelProps {
  clientId: string;
  clientName: string;
  sessionNotes: SessionNoteData[];
  exerciseNotes: AggregatedExerciseNote[];
  pinnedNoteRefs: PinnedNoteRef[];
}

// ── Helpers ────────────────────────────────────────────────────────────

function esc(t: unknown): string {
  return String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function monthLabel(iso: string): string {
  const p = iso.split("-");
  return new Date(+p[0], +p[1] - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateOnly(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Component ──────────────────────────────────────────────────────────

export function MergedNotesPanel({
  clientId,
  clientName,
  sessionNotes,
  exerciseNotes,
  pinnedNoteRefs,
}: MergedNotesPanelProps) {
  const [profileNotes, setProfileNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [localPins, setLocalPins] = useState<PinnedNoteRef[]>(pinnedNoteRefs);
  const [savingPin, setSavingPin] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Fetch profile notes ────────────────────────────────────────────

  const fetchNotes = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch(
        `/api/client-notes?client_id=${encodeURIComponent(clientId)}`,
      );
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      if (Array.isArray(data)) setProfileNotes(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // ── Build merged note list ─────────────────────────────────────────

  const allNotes = useMemo<MergedNote[]>(() => {
    const pinnedSessionKey = (sid: string) => `session:${sid}:`;
    const pinnedExerciseKey = (sid: string, uid: string) => `exercise:${sid}:${uid}`;
    const isPinnedSession = (sid: string) =>
      localPins.some(
        (p) => p.source === "session" && p.session_id === sid,
      );
    const isPinnedExercise = (sid: string, uid: string) =>
      localPins.some(
        (p) =>
          p.source === "exercise" &&
          p.session_id === sid &&
          p.exercise_uid === uid,
      );

    const result: MergedNote[] = [];

    // Profile notes from client_notes table
    for (const n of profileNotes) {
      result.push({
        id: n.id,
        origin: "profile",
        text: n.note,
        iso: n.created_at,
        when: formatWhen(n.created_at),
        author: n.author || "Esther Fair",
        pinned: !!n.pinned,
        sessionId: n.session_id ?? undefined,
        editable: true,
      });
    }

    // Session-level notes from session_log.notes
    for (const sn of sessionNotes) {
      if (!sn.note?.trim()) continue;
      result.push({
        id: `session:${sn.sessionId}`,
        origin: "session",
        text: sn.note,
        iso: sn.sessionDate,
        when: formatWhen(sn.sessionDate),
        author: sn.author,
        pinned: isPinnedSession(sn.sessionId),
        sessionName: sn.sessionName,
        sessionPos: sn.sessionPos,
        sessionId: sn.sessionId,
        editable: false,
      });
    }

    // Exercise notes from sessions.data.exercise_notes
    for (const en of exerciseNotes) {
      if (!en.note?.trim()) continue;
      result.push({
        id: `exercise:${en.sessionId}:${en.exerciseUid}`,
        origin: "exercise",
        text: en.note,
        iso: en.sessionDate,
        when: formatWhen(en.sessionDate),
        author: "Esther Fair",
        pinned: isPinnedExercise(en.sessionId, en.exerciseUid),
        sessionName: en.sessionName,
        exerciseName: en.exerciseName,
        sessionId: en.sessionId,
        editable: false,
      });
    }

    // Sort newest-first
    result.sort((a, b) => {
      const da = new Date(a.iso).getTime();
      const db = new Date(b.iso).getTime();
      if (!isNaN(da) && !isNaN(db)) return db - da;
      return 0;
    });

    return result;
  }, [profileNotes, sessionNotes, exerciseNotes, localPins]);

  // ── Counts ─────────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const c = { all: allNotes.length, profile: 0, session: 0, exercise: 0, pinned: 0 };
    for (const n of allNotes) {
      c[n.origin]++;
      if (n.pinned) c.pinned++;
    }
    return c;
  }, [allNotes]);

  // ── Filter + search ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allNotes.filter((n) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "pinned" && n.pinned) ||
        filter === n.origin;
      if (!matchesFilter) return false;
      if (!q) return true;
      const hay = `${n.text} ${n.exerciseName ?? ""} ${n.sessionName ?? ""} ${ORIGIN_META[n.origin].label}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allNotes, filter, query]);

  // ── Actions ────────────────────────────────────────────────────────

  async function handleAdd() {
    const t = draft.trim();
    if (!t || saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      const res = await fetch("/api/client-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, note: t }),
      });
      if (!res.ok) throw new Error("Save failed");
      setDraft("");
      fetchNotes();
      // Switch to profile filter if on a different one so the new note is visible
      if (filter !== "all" && filter !== "profile") setFilter("profile");
    } catch {
      setSaveError(true);
      // Text stays in the box — clinical capture is never thrown away
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/client-notes/${id}`, { method: "DELETE" });
    if (res.ok) setProfileNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function handlePinToggle(note: MergedNote) {
    const nextPinned = !note.pinned;
    setSavingPin(note.id);

    if (note.origin === "profile") {
      // Optimistic update on profile notes
      setProfileNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, pinned: nextPinned } : n)),
      );
      try {
        const res = await fetch(`/api/client-notes/${note.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinned: nextPinned }),
        });
        if (!res.ok) {
          setProfileNotes((prev) =>
            prev.map((n) =>
              n.id === note.id ? { ...n, pinned: !nextPinned } : n,
            ),
          );
        }
      } catch {
        setProfileNotes((prev) =>
          prev.map((n) =>
            n.id === note.id ? { ...n, pinned: !nextPinned } : n,
          ),
        );
      } finally {
        setSavingPin(null);
      }
    } else {
      // Session or exercise note — use pinned_note_refs
      const ref = {
        source: note.origin as "session" | "exercise",
        session_id: note.sessionId!,
        ...(note.origin === "exercise" && note.exerciseName
          ? { exercise_uid: note.id.split(":")[2] }
          : {}),
      };
      // Optimistic update
      setLocalPins((prev) => {
        if (nextPinned) return [...prev, ref];
        return prev.filter(
          (p) =>
            !(
              p.source === ref.source &&
              p.session_id === ref.session_id &&
              (p.exercise_uid ?? "") === (ref.exercise_uid ?? "")
            ),
        );
      });
      try {
        const res = await fetch(`/api/clients/${clientId}/note-pin`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...ref, pinned: nextPinned }),
        });
        if (!res.ok) {
          // Revert
          setLocalPins((prev) => {
            if (nextPinned)
              return prev.filter(
                (p) =>
                  !(
                    p.source === ref.source &&
                    p.session_id === ref.session_id &&
                    (p.exercise_uid ?? "") === (ref.exercise_uid ?? "")
                  ),
              );
            return [...prev, ref];
          });
        }
      } catch {
        setLocalPins((prev) => {
          if (nextPinned)
            return prev.filter(
              (p) =>
                !(
                  p.source === ref.source &&
                  p.session_id === ref.session_id &&
                  (p.exercise_uid ?? "") === (ref.exercise_uid ?? "")
                ),
            );
          return [...prev, ref];
        });
      } finally {
        setSavingPin(null);
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)]">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-0">
        <span className="inline-flex items-center justify-center w-[28px] h-[28px] rounded-lg bg-[var(--hub-hover)] text-muted-foreground shrink-0">
          <IconFileText className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-foreground">Notes</span>
          <span className="block text-xs text-muted-foreground">
            Everything written about {esc(clientName)} — profile, sessions and exercises, in one list
          </span>
        </div>
        {!loading && !loadError && (
          <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0">
            {allNotes.length === 1 ? "1 note" : `${allNotes.length} notes`}
          </span>
        )}
      </div>

      <div className="px-5 pb-5 pt-3">
        {/* 1 · Composer — always visible, never filtered or collapsed */}
        <div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Spoke to… / note something"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (saveError) setSaveError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || ((e.metaKey || e.ctrlKey) && e.key === "Enter")) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              aria-label={`Write a note about ${esc(clientName)}`}
              className="flex-1 min-w-0 h-[36px] px-3 text-[13px] rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--color-teal)] focus:ring-[0_0_0_3px_rgba(34,176,190,0.18)]"
            />
            <button
              onClick={handleAdd}
              disabled={!draft.trim() || saving}
              className="inline-flex items-center gap-1.5 h-[36px] px-3.5 rounded-lg bg-rose text-xs font-semibold text-white hover:bg-rose/90 disabled:opacity-50 transition-colors shrink-0"
            >
              <IconPlus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <p className="text-[11.5px] text-muted-foreground mt-[7px] leading-[1.5]">
            Saves as a <b className="text-foreground font-bold">profile note</b>, timestamped, and appears at the top of the list below. To note something against an exercise, write it while logging that session.{" "}
            <kbd className="font-mono text-[10.5px] border border-[var(--hub-border)] rounded px-[5px] py-px bg-[var(--hub-hover)] text-foreground">Ctrl</kbd>{" "}
            +{" "}
            <kbd className="font-mono text-[10.5px] border border-[var(--hub-border)] rounded px-[5px] py-px bg-[var(--hub-hover)] text-foreground">Enter</kbd>{" "}
            to save.
          </p>
        </div>

        {/* Save failure — text is never cleared */}
        {saveError && (
          <div className="flex items-start gap-2.5 mt-2.5 p-3 rounded-[12px] bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.15)] text-[12.5px] leading-[1.55] text-foreground">
            <IconAlertTriangle className="w-[15px] h-[15px] shrink-0 text-[var(--status-danger)] mt-0.5" />
            <span>
              <b className="block text-foreground">Note not saved.</b>
              Your text is still in the box — nothing has been lost. Try again.
            </span>
          </div>
        )}

        {/* 2 · Filters + search */}
        {!loading && !loadError && allNotes.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-[var(--hub-border)]">
            <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter notes by source">
              {FILTER_KEYS.map((fk) => {
                const label = fk === "all" ? "All" : fk === "pinned" ? "Pinned" : ORIGIN_META[fk as NoteOrigin]?.filter ?? fk;
                const count = counts[fk] ?? 0;
                const on = filter === fk;
                return (
                  <button
                    key={fk}
                    type="button"
                    onClick={() => setFilter(fk)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full border text-[12.5px] font-semibold transition-colors ${
                      on
                        ? "bg-[rgba(193,131,159,0.12)] border-[rgba(193,131,159,0.26)] text-[var(--rose-text)] font-bold"
                        : "border-[var(--hub-border)] bg-[var(--hub-card)] text-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
                    }`}
                  >
                    {label}
                    <span className={`tabular-nums font-bold ${on ? "text-[var(--rose-text)]" : "text-muted-foreground"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="relative ml-auto shrink-0">
              <IconSearch className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                placeholder="Search all notes…"
                aria-label="Search notes"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-[210px] h-[30px] pl-[30px] pr-2.5 text-[12.5px] rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--color-teal)] focus:ring-[0_0_0_3px_rgba(34,176,190,0.18)]"
              />
            </div>
          </div>
        )}

        {/* 3 · Timeline */}
        <div className="mt-4" aria-live="polite" aria-busy={loading}>
          {loading ? (
            /* Loading: skeleton rows, never a spinner */
            <>
              <SkeletonRow widths={["22%", "74%", "48%"]} />
              <SkeletonRow widths={["30%", "86%", "39%"]} />
            </>
          ) : loadError ? (
            /* Load failure — must never look like an empty record */
            <div className="text-center py-[34px] px-5 rounded-[12px] bg-[rgba(239,68,68,0.07)] border border-[rgba(239,68,68,0.22)]">
              <div className="w-[46px] h-[46px] rounded-full mx-auto mb-3.5 flex items-center justify-center bg-white text-[var(--status-danger)]">
                <IconWarn />
              </div>
              <div className="text-[15px] font-bold text-foreground">Notes could not be loaded</div>
              <div className="text-[13px] leading-[1.6] text-foreground mt-1.5 max-w-[460px] mx-auto">
                This is a loading failure, not an empty record. {esc(clientName)} may well have notes — they are not being shown. Do not read anything into the blank list. The composer above stays usable: a note written now is queued and saved when the connection returns.
              </div>
              <div className="mt-3.5 flex justify-center">
                <button
                  onClick={() => {
                    setLoading(true);
                    fetchNotes();
                  }}
                  className="inline-flex items-center h-[32px] px-3.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-[13px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            /* Empty state */
            <EmptyNoteState
              allEmpty={allNotes.length === 0}
              filter={filter}
              query={query}
              clientName={clientName}
              onClear={() => {
                setFilter("all");
                setQuery("");
              }}
              onFocusComposer={() => inputRef.current?.focus()}
            />
          ) : (
            /* Render month-banded timeline */
            <NoteTimeline
              notes={filtered}
              onPin={handlePinToggle}
              onDelete={handleDelete}
              savingPin={savingPin}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function SkeletonRow({ widths }: { widths: string[] }) {
  return (
    <div className="py-3.5 px-1 border-t border-[var(--hub-border)] first:border-t-0">
      {widths.map((w, i) => (
        <div
          key={i}
          className="sk sk-line"
          style={{ width: w, marginBottom: i < widths.length - 1 ? 9 : 0 }}
        />
      ))}
    </div>
  );
}

function NoteTimeline({
  notes,
  onPin,
  onDelete,
  savingPin,
}: {
  notes: MergedNote[];
  onPin: (note: MergedNote) => void;
  onDelete: (id: string) => void;
  savingPin: string | null;
}) {
  const [openDetails, setOpenDetails] = useState<Set<string>>(new Set());
  const query = ""; // Not needed here — search is handled upstream

  // Bucket by month
  const order: string[] = [];
  const bucket: Record<string, MergedNote[]> = {};
  for (const n of notes) {
    const k = monthKey(n.iso);
    if (!bucket[k]) {
      bucket[k] = [];
      order.push(k);
    }
    bucket[k].push(n);
  }

  return (
    <>
      {order.map((k, i) => {
        const rows = bucket[k];
        const label = monthLabel(rows[0].iso);
        const isOpen = i < OPEN_MONTHS || openDetails.has(k);
        const noteCount = rows.length;

        if (isOpen) {
          return (
            <div key={k}>
              {i === 0 ? (
                <div className="flex items-center gap-2.5 mt-1 mb-2">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-muted-foreground whitespace-nowrap">
                    {label}
                  </span>
                  <span className="flex-1 h-px bg-[var(--hub-border)]" />
                </div>
              ) : (
                <div className="flex items-center gap-2.5 mt-[18px] mb-[9px]">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-muted-foreground whitespace-nowrap">
                    {label}
                  </span>
                  <span className="flex-1 h-px bg-[var(--hub-border)]" />
                </div>
              )}
              <div className="flex flex-col">
                {rows.map((n) => (
                  <NoteRow
                    key={n.id}
                    note={n}
                    onPin={onPin}
                    onDelete={onDelete}
                    savingPin={savingPin}
                  />
                ))}
              </div>
            </div>
          );
        }

        // Collapsed older month
        return (
          <details
            key={k}
            className="border border-[var(--hub-border)] rounded-[12px] mt-2.5 overflow-hidden bg-[var(--hub-card)]"
            open={openDetails.has(k)}
            onToggle={(e) => {
              setOpenDetails((prev) => {
                const next = new Set(prev);
                if ((e.target as HTMLDetailsElement).open) {
                  next.add(k);
                } else {
                  next.delete(k);
                }
                return next;
              });
            }}
          >
            <summary className="flex items-center gap-2.5 h-12 px-3.5 cursor-pointer list-none text-[13px] font-bold text-foreground hover:bg-[var(--hub-hover)] focus-visible:outline-2 focus-visible:outline-[var(--color-rose)] focus-visible:outline-offset-[-2px] [&::-webkit-details-marker]:hidden marker:content-none">
              <IconChevronRight
                className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 [&[open]]:rotate-90`}
              />
              {label}
              <span className="ml-auto text-xs font-bold text-muted-foreground tabular-nums">
                {noteCount} {noteCount === 1 ? "note" : "notes"}
              </span>
            </summary>
            <div className="border-t border-[var(--hub-border)] px-2.5">
              <div className="flex flex-col">
                {rows.map((n) => (
                  <NoteRow
                    key={n.id}
                    note={n}
                    onPin={onPin}
                    onDelete={onDelete}
                    savingPin={savingPin}
                  />
                ))}
              </div>
            </div>
          </details>
        );
      })}
    </>
  );
}

function NoteRow({
  note,
  onPin,
  onDelete,
  savingPin,
}: {
  note: MergedNote;
  onPin: (note: MergedNote) => void;
  onDelete: (id: string) => void;
  savingPin: string | null;
}) {
  const o = ORIGIN_META[note.origin];
  const IconComp = o.Icon;

  const title =
    note.origin === "exercise"
      ? note.exerciseName
      : note.origin === "session"
        ? note.sessionName
        : "";

  const meta =
    note.origin === "exercise"
      ? `${note.sessionName ?? ""}${note.sessionPos ? ` · ${note.sessionPos}` : ""} · ${note.when}`
      : note.origin === "session"
        ? `${note.sessionPos ?? ""}${note.sessionPos ? " · " : ""}${note.when}`
        : note.when;

  const sessionLink = note.sessionId
    ? `/hub/sessions/${note.sessionId}`
    : null;

  return (
    <div className="flex items-start gap-3 py-[13px] px-1 border-t border-[var(--hub-border)] first:border-t-0 hover:bg-[var(--hub-hover)] transition-colors group">
      {/* Origin marker */}
      <span
        className={`shrink-0 w-[30px] h-[30px] rounded-lg flex items-center justify-center mt-px border ${
          note.origin === "session" || note.origin === "exercise"
            ? "bg-[rgba(193,131,159,0.11)] border-[rgba(193,131,159,0.24)] text-[var(--rose-text)]"
            : "bg-[var(--hub-hover)] border-[var(--hub-border)] text-muted-foreground"
        }`}
      >
        <IconComp />
      </span>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-muted-foreground">
          {o.label}
        </div>
        {title && (
          <div className="text-[13px] font-bold text-foreground mt-0.5">{esc(title)}</div>
        )}
        <div className="text-[11.5px] text-muted-foreground mt-0.5">{esc(meta)}</div>
        <div className="text-[13px] leading-[1.6] text-foreground mt-1.5 whitespace-pre-wrap break-words">
          {note.text}
        </div>

        {/* Deep link back to source */}
        {sessionLink && (
          <a
            href={sessionLink}
            className="inline-flex items-center gap-1.5 mt-2 h-[26px] px-2.5 rounded-full border border-[var(--hub-border)] bg-[var(--hub-card)] text-[var(--color-teal)] text-xs font-bold no-underline max-w-full hover:bg-[var(--hub-hover)] hover:text-[#066A75] hover:border-[rgba(34,176,190,0.3)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-rose)] focus-visible:outline-offset-2"
          >
            <IconOpenExternal />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {note.origin === "exercise"
                ? `Open ${esc(note.exerciseName)} in this session`
                : "Open this session"}
            </span>
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-0.5">
        {note.editable ? (
          <button
            onClick={() => onDelete(note.id)}
            className="w-7 h-7 flex items-center justify-center rounded border-none bg-transparent text-muted-foreground cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[rgba(239,68,68,0.12)] hover:text-[var(--status-danger)] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--color-rose)] focus-visible:outline-offset-1"
            aria-label="Delete note"
            title="Delete note"
          >
            <IconTrash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="text-[10.5px] font-bold text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Edit in session
          </span>
        )}
        <button
          onClick={() => onPin(note)}
          disabled={savingPin === note.id}
          className={`w-7 h-7 flex items-center justify-center rounded border-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--color-rose)] focus-visible:outline-offset-1 ${
            note.pinned
              ? "text-[var(--rose-text)] bg-[rgba(193,131,159,0.12)] opacity-100"
              : "text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
          }`}
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
          aria-pressed={note.pinned}
          title={note.pinned ? "Pinned" : "Pin note"}
        >
          <IconPin pinned={note.pinned} />
        </button>
      </div>
    </div>
  );
}

function EmptyNoteState({
  allEmpty,
  filter,
  query,
  clientName,
  onClear,
  onFocusComposer,
}: {
  allEmpty: boolean;
  filter: FilterKey;
  query: string;
  clientName: string;
  onClear: () => void;
  onFocusComposer: () => void;
}) {
  let title: string;
  let desc: string;

  if (allEmpty) {
    title = `Nothing recorded for ${clientName}`;
    desc =
      "No notes have been written on this record and none were captured in a session. That is not a sign that nothing happened — it means nothing was written down.";
  } else if (filter === "pinned" && !query) {
    title = "No notes are pinned";
    desc =
      "Pinning a note surfaces it at the top of this record and in the trainer app. Nothing is pinned yet.";
  } else if (filter !== "all" && filter !== "pinned" && !query) {
    const noun = ORIGIN_META[filter]?.noun ?? "note";
    title = `No ${noun} notes recorded`;
    if (filter === "exercise") {
      desc = `Exercise notes are written while logging a session, on the exercise they belong to. None have been written for ${clientName} yet.`;
    } else if (filter === "session") {
      desc = `Session notes are captured with a session open. None have been written for ${clientName} yet.`;
    } else {
      desc = `Profile notes are the ones typed here on the record. None have been written for ${clientName} yet.`;
    }
  } else {
    title = "No notes match";
    desc = `Nothing in ${clientName}'s history matches${query ? ` \u201c${esc(query)}\u201d` : " this filter"}. The history itself is not empty — the filter is hiding it.`;
  }

  return (
    <div className="text-center py-[34px] px-5">
      <div className="w-[46px] h-[46px] rounded-full mx-auto mb-3.5 flex items-center justify-center bg-[var(--hub-hover)] text-muted-foreground">
        {allEmpty ? <IconNote /> : <IconWarn />}
      </div>
      <div className="text-[15px] font-bold text-foreground">{title}</div>
      <div className="text-[13px] leading-[1.6] text-foreground mt-1.5 max-w-[460px] mx-auto">
        {desc}
      </div>
      <div className="mt-3.5 flex justify-center">
        {allEmpty ? (
          <button
            onClick={onFocusComposer}
            className="inline-flex items-center h-[32px] px-3.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-[13px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
          >
            Write the first note
          </button>
        ) : (
          <button
            onClick={onClear}
            className="inline-flex items-center h-[32px] px-3.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] text-[13px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
          >
            Clear search and filters
          </button>
        )}
      </div>
    </div>
  );
}
