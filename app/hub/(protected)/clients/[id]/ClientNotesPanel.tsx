"use client";

import { useCallback, useEffect, useState } from "react";
import { IconFileText, IconPlus, IconTrash2 } from "@/components/icons";
import type { ClientNote } from "@/types";

export function ClientNotesPanel({ clientId }: { clientId: string }) {
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
    <div className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-card)]">
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center w-[28px] h-[28px] rounded-lg bg-[var(--hub-hover)] text-muted-foreground">
            <IconFileText className="w-4 h-4" />
          </span>
          <div>
            <span className="text-sm font-semibold text-foreground">Notes</span>
            <span className="block text-xs text-muted-foreground">
              Quick captures — timestamped
            </span>
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 pt-3">
        <div className="flex items-start gap-2 mb-3">
          <input
            type="text"
            placeholder="Spoke to… / note something"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="flex-1 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--color-teal)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)]"
          />
          <button
            onClick={handleAdd}
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose/90 disabled:opacity-50 transition-colors"
          >
            <IconPlus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {loading ? (
          <div className="text-center py-6 text-sm text-muted-foreground">Loading notes…</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">No notes yet.</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {notes.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 p-[13px] rounded-xl border border-[var(--hub-border)] group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground whitespace-pre-wrap overflow-wrap-anywhere">{n.note}</p>
                  <p className="text-xs text-muted-foreground mt-[3px]">
                    {new Date(n.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--status-danger-bg)] text-muted-foreground hover:text-[var(--status-danger)]"
                  title="Delete note"
                >
                  <IconTrash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
