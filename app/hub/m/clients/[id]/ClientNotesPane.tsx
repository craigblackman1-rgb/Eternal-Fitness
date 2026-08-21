"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClientNote } from "@/types";

const ICO = {
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
};

/**
 * Client-mode Notes tab (hub-m-client-mode.html). Shares the same
 * `/api/client-notes` store as the desktop NotesPanel.
 *
 * STUBS (until the L5 `client_notes` migration lands `session_id`/`author`/`pinned`):
 *   - Notes have no session title or author — they render as "Added on {date}".
 *   - "Pinned" filter is UI-only: the `pinned` column doesn't exist yet, so the
 *     filter always shows the empty state and the count is 0. There is no pin
 *     toggle on each row yet.
 *   - Search is a real client-side filter over the already-fetched notes.
 */
export function ClientNotesPane({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned">("all");

  const fetchNotes = useCallback(async () => {
    const res = await fetch(`/api/client-notes?client_id=${encodeURIComponent(clientId)}`);
    if (res.ok) {
      const data = await res.json();
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => !q || n.note.toLowerCase().includes(q));
  }, [notes, query]);

  // `pinned` column doesn't exist yet — the pinned filter is a UI stub.
  const shown = filter === "pinned" ? [] : filtered;

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
          Pinned · 0
        </button>
      </div>
      <div className="panel">
        {loading ? (
          <div className="t-empty">Loading notes…</div>
        ) : shown.length === 0 ? (
          <div className="t-empty">
            {filter === "pinned"
              ? "No pinned notes — pinning lands with the notes upgrade."
              : notes.length === 0
                ? "No notes yet — add one above."
                : "No notes match your search."}
          </div>
        ) : (
          shown.map((n) => (
            <div key={n.id} className="note-item">
              <div className="note-body">
                <span className="note-when" style={{ fontWeight: 600 }}>
                  Added on{" "}
                  {new Date(n.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <div className="note-txt">{n.note}</div>
              </div>
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
