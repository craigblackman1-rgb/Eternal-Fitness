"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClientNote } from "@/types";
import type { AggregatedExerciseNote } from "@/lib/exercise-notes";

interface ClientNotesPaneProps {
  clientId: string;
  exerciseNotes?: AggregatedExerciseNote[];
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

export function ClientNotesPane({ clientId, exerciseNotes = [] }: ClientNotesPaneProps) {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned" | "exercises">("all");
  const [savingPin, setSavingPin] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    const res = await fetch(`/api/client-notes?client_id=${encodeURIComponent(clientId)}`);
    if (res.ok) {
      const data = (await res.json()) as ClientNote[];
      if (Array.isArray(data)) setNotes(data);
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
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function handlePinToggle(note: ClientNote) {
    const next = !note.pinned;
    setSavingPin(note.id);
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned: next } : n)));
    try {
      const res = await fetch(`/api/client-notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: next }),
      });
      if (!res.ok) {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned: note.pinned } : n)));
      }
    } catch {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned: note.pinned } : n)));
    } finally {
      setSavingPin(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => !q || n.note.toLowerCase().includes(q));
  }, [notes, query]);

  const shown = useMemo(() => {
    if (filter === "pinned") return filtered.filter((n) => n.pinned);
    return [...filtered].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filtered, filter]);

  const filteredExercises = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exerciseNotes.filter(
      (en) => !q || en.note.toLowerCase().includes(q) || en.exerciseName.toLowerCase().includes(q),
    );
  }, [exerciseNotes, query]);

  const pinnedCount = notes.filter((n) => n.pinned).length;

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
          All
        </button>
        <button
          className={`npill${filter === "pinned" ? " on" : ""}`}
          onClick={() => setFilter("pinned")}
          aria-pressed={filter === "pinned"}
        >
          Pinned · {pinnedCount}
        </button>
        {exerciseNotes.length > 0 && (
          <button
            className={`npill${filter === "exercises" ? " on" : ""}`}
            onClick={() => setFilter("exercises")}
            aria-pressed={filter === "exercises"}
          >
            Exercises · {exerciseNotes.length}
          </button>
        )}
      </div>
      <div className="panel">
        {loading ? (
          <div className="t-empty">Loading notes…</div>
        ) : filter === "exercises" ? (
          filteredExercises.length === 0 ? (
            <div className="t-empty">
              {query.trim() ? "No exercise notes match your search." : "No exercise notes yet."}
            </div>
          ) : (
            filteredExercises.map((en, i) => (
              <div key={`${en.sessionId}-${en.exerciseUid}-${i}`} className="note-item" style={{ background: "var(--hub-hover, rgba(0,0,0,.02))" }}>
                <div className="note-body">
                  <span className="note-t">{en.exerciseName}</span>
                  <span className="note-when">
                    {en.sessionName} ·{" "}
                    {new Date(en.sessionDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <div className="note-txt">{en.note}</div>
                </div>
              </div>
            ))
          )
        ) : shown.length === 0 ? (
          <div className="t-empty">
            {filter === "pinned"
              ? "No pinned notes — pin one from the list."
              : notes.length === 0
                ? "No notes yet — add one above."
                : "No notes match your search."}
          </div>
        ) : (
          shown.map((n) => (
            <div key={n.id} className="note-item">
              <div className="note-body">
                {n.session_name ? (
                  <span className="note-t">{n.session_name}</span>
                ) : null}
                <span className="note-when" style={n.session_name ? undefined : { fontWeight: 600 }}>
                  {!n.session_name ? "Added on " : ""}
                  {new Date(n.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {n.author ? ` · ${n.author}` : ""}
                </span>
                <div className="note-txt">{n.note}</div>
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
              <button className="note-pin" onClick={() => handleDelete(n.id)} aria-label="Delete note">
                {ICO.trash}
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
