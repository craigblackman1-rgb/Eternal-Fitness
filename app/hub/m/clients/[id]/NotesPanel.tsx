"use client";

import { useCallback, useEffect, useState } from "react";
import { IconFileText, IconPlus } from "@/components/icons";
import type { ClientNote } from "@/types";

export function NotesPanel({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");

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

  async function handleAdd() {
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

  return (
    <div className="panel">
      <div className="panel-h">
        <span className="panel-h-ic teal">
          <IconFileText className="w-4 h-4" />
        </span>
        <span style={{ flex: 1 }}>
          <span className="panel-h-t">Notes</span>
          <span className="panel-h-s">Quick captures — timestamped</span>
        </span>
        <span className="panel-h-count">{notes.length}</span>
      </div>
      <div className="panel-b">
        <div className="n-addrow">
          <textarea
            placeholder="Spoke to… / note something"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
          />
          <button onClick={handleAdd} disabled={!draft.trim()}>
            <IconPlus className="w-4 h-4" />
            Add note
          </button>
        </div>
        {loading ? (
          <div className="t-empty">Loading notes…</div>
        ) : notes.length === 0 ? (
          <div className="t-empty">No notes yet.</div>
        ) : (
          <div className="n-list">
            {notes.map((n) => (
              <div key={n.id} className="n-row">
                <span className="n-text">{n.note}</span>
                <span className="n-meta">
                  {new Date(n.created_at).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <button className="n-del" onClick={() => handleDelete(n.id)} aria-label="Delete note">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
