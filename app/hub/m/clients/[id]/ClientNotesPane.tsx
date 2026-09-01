"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClientNote, SessionNoteData, MergedNote, NoteOrigin, PinnedNoteRef } from "@/types";
import type { AggregatedExerciseNote } from "@/lib/exercise-notes";

interface ClientNotesPaneProps {
  clientId: string;
  clientName: string;
  exerciseNotes?: AggregatedExerciseNote[];
  sessionNotes?: SessionNoteData[];
  pinnedNoteRefs?: PinnedNoteRef[];
}

const ICO = {
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  pin: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" />
      <path d="M9 10.8V4h6v6.8l2.4 3.2a1 1 0 0 1-.8 1.6H7.4a1 1 0 0 1-.8-1.6z" />
    </svg>
  ),
};

type FilterKey = "all" | "profile" | "session" | "exercise" | "pinned";

const ORIGIN_LABEL: Record<NoteOrigin, string> = {
  profile: "Profile",
  session: "Session",
  exercise: "Exercise",
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ClientNotesPane({
  clientId,
  clientName,
  exerciseNotes = [],
  sessionNotes = [],
  pinnedNoteRefs = [],
}: ClientNotesPaneProps) {
  const [profileNotes, setProfileNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [savingPin, setSavingPin] = useState<string | null>(null);
  const [localPins, setLocalPins] = useState<PinnedNoteRef[]>(pinnedNoteRefs);

  const fetchNotes = useCallback(async () => {
    const res = await fetch(`/api/client-notes?client_id=${encodeURIComponent(clientId)}`);
    if (res.ok) {
      const data = (await res.json()) as ClientNote[];
      if (Array.isArray(data)) setProfileNotes(data);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function handleSave() {
    const t = draft.trim();
    if (!t) return;
    const res = await fetch("/api/client-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, note: t }),
    });
    if (res.ok) {
      setDraft("");
      fetchNotes();
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
            prev.map((n) => (n.id === note.id ? { ...n, pinned: !nextPinned } : n)),
          );
        }
      } catch {
        setProfileNotes((prev) =>
          prev.map((n) => (n.id === note.id ? { ...n, pinned: !nextPinned } : n)),
        );
      } finally {
        setSavingPin(null);
      }
    } else {
      const ref = {
        source: note.origin as "session" | "exercise",
        session_id: note.sessionId!,
        ...(note.origin === "exercise" && note.exerciseName
          ? { exercise_uid: note.id.split(":")[2] }
          : {}),
      };
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

  // Build merged note list
  const allNotes = useMemo<MergedNote[]>(() => {
    const isPinnedSession = (sid: string) =>
      localPins.some((p) => p.source === "session" && p.session_id === sid);
    const isPinnedExercise = (sid: string, uid: string) =>
      localPins.some(
        (p) => p.source === "exercise" && p.session_id === sid && p.exercise_uid === uid,
      );

    const result: MergedNote[] = [];

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

    result.sort((a, b) => {
      const da = new Date(a.iso).getTime();
      const db = new Date(b.iso).getTime();
      if (!isNaN(da) && !isNaN(db)) return db - da;
      return 0;
    });

    return result;
  }, [profileNotes, sessionNotes, exerciseNotes, localPins]);

  // Counts
  const counts = useMemo(() => {
    const c = { all: allNotes.length, profile: 0, session: 0, exercise: 0, pinned: 0 };
    for (const n of allNotes) {
      c[n.origin]++;
      if (n.pinned) c.pinned++;
    }
    return c;
  }, [allNotes]);

  // Filter + search
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allNotes.filter((n) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "pinned" && n.pinned) ||
        filter === n.origin;
      if (!matchesFilter) return false;
      if (!q) return true;
      const hay = `${n.text} ${n.exerciseName ?? ""} ${n.sessionName ?? ""} ${ORIGIN_LABEL[n.origin]}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allNotes, filter, query]);

  return (
    <>
      <div className="ncompose">
        <textarea
          placeholder="Add a note…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="ncompose-foot">
          <button className="btn btn-primary" onClick={handleSave} disabled={!draft.trim()}>
            Save note
          </button>
        </div>
      </div>
      <div className="notes-search">
        <input
          type="search"
          placeholder="Search notes…"
          aria-label="Search notes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="npills">
        <button
          className={`npill${filter === "all" ? " on" : ""}`}
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
        >
          All · {counts.all}
        </button>
        <button
          className={`npill${filter === "profile" ? " on" : ""}`}
          onClick={() => setFilter("profile")}
          aria-pressed={filter === "profile"}
        >
          Profile · {counts.profile}
        </button>
        <button
          className={`npill${filter === "session" ? " on" : ""}`}
          onClick={() => setFilter("session")}
          aria-pressed={filter === "session"}
        >
          Sessions · {counts.session}
        </button>
        <button
          className={`npill${filter === "exercise" ? " on" : ""}`}
          onClick={() => setFilter("exercise")}
          aria-pressed={filter === "exercise"}
        >
          Exercises · {counts.exercise}
        </button>
        <button
          className={`npill${filter === "pinned" ? " on" : ""}`}
          onClick={() => setFilter("pinned")}
          aria-pressed={filter === "pinned"}
        >
          Pinned · {counts.pinned}
        </button>
      </div>
      <div className="panel">
        {loading ? (
          <div className="t-empty">Loading notes…</div>
        ) : filtered.length === 0 ? (
          <div className="t-empty">
            {allNotes.length === 0
              ? `Nothing recorded for ${clientName} — no notes from any source.`
              : filter === "pinned"
                ? "No pinned notes — pin one from the list."
                : "No notes match your search."}
          </div>
        ) : (
          filtered.map((n) => (
            <div key={n.id} className="note-item">
              <div className="note-body">
                <span className="note-t" style={{ textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.09em", fontWeight: 800, color: "var(--color-muted)" }}>
                  {ORIGIN_LABEL[n.origin]}
                </span>
                {n.exerciseName && (
                  <span className="note-t" style={{ display: "block", marginTop: 2 }}>{n.exerciseName}</span>
                )}
                {n.sessionName && (
                  <span className="note-t" style={{ display: "block", marginTop: 2 }}>{n.sessionName}</span>
                )}
                <span className="note-when">
                  {n.when}
                  {n.author ? ` · ${n.author}` : ""}
                </span>
                <div className="note-txt">{n.text}</div>
                {n.sessionId && (
                  <a
                    href={`/hub/sessions/${n.sessionId}`}
                    className="note-src"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, padding: "2px 8px", borderRadius: 999, border: "1px solid var(--hub-border)", background: "var(--hub-card)", color: "var(--color-teal)", fontSize: 11, fontWeight: 700, textDecoration: "none" }}
                  >
                    {n.origin === "exercise" ? `Open ${n.exerciseName} in session` : "Open session"}
                  </a>
                )}
              </div>
              <button
                className="note-pin"
                onClick={() => handlePinToggle(n)}
                disabled={savingPin === n.id}
                aria-label={n.pinned ? "Unpin note" : "Pin note"}
                title={n.pinned ? "Pinned" : "Pin note"}
                style={n.pinned ? { color: "var(--rose)" } : undefined}
              >
                {ICO.pin}
              </button>
              {n.editable ? (
                <button className="note-pin" onClick={() => handleDelete(n.id)} aria-label="Delete note">
                  {ICO.trash}
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </>
  );
}
