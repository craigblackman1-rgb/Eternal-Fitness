"use client";

import { useCallback, useEffect, useState } from "react";
import { IconCheckSquare, IconPlus } from "@/components/icons";
import type { Task } from "@/types";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  todo: { label: "To do", cls: "t-todo" },
  in_progress: { label: "In progress", cls: "t-prog" },
  done: { label: "Done", cls: "t-done" },
};

const NEXT_STATUS: Record<string, string | undefined> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

export function TasksPanel({ clientId }: { clientId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const fetchTasks = useCallback(async () => {
    const res = await fetch(`/api/tasks?client_id=${encodeURIComponent(clientId)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function handleAdd() {
    const t = title.trim();
    if (!t) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t, client_id: clientId }),
    });
    if (res.ok) {
      setTitle("");
      setAdding(false);
      fetchTasks();
    }
  }

  async function handleToggle(id: string, status: string) {
    const next = NEXT_STATUS[status];
    if (!next) return;
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: next as Task["status"] } : t)),
      );
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const openCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="panel">
      <div className="panel-h">
        <span className="panel-h-ic navy">
          <IconCheckSquare className="w-4 h-4" />
        </span>
        <span style={{ flex: 1 }}>
          <span className="panel-h-t">Tasks</span>
          <span className="panel-h-s">
            {openCount ? `${openCount} open` : "Nothing open"}
          </span>
        </span>
        <button className="m-add" onClick={() => setAdding((v) => !v)} aria-label="Add task">
          <IconPlus className="w-4 h-4" />
        </button>
      </div>
      <div className="panel-b">
        {adding && (
          <div className="t-addrow">
            <input
              autoFocus
              type="text"
              placeholder="Task title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setAdding(false);
                  setTitle("");
                }
              }}
            />
            <button onClick={handleAdd} disabled={!title.trim()}>
              Add
            </button>
          </div>
        )}
        {loading ? (
          <div className="t-empty">Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <div className="t-empty">No tasks yet — add one above.</div>
        ) : (
          <div className="t-list">
            {tasks.map((task) => {
              const meta = STATUS_META[task.status] ?? {
                label: task.status,
                cls: "t-todo",
              };
              const done = task.status === "done";
              const nextLabel =
                STATUS_META[NEXT_STATUS[task.status] ?? "todo"]?.label ?? "next status";
              return (
                <div key={task.id} className="t-row">
                  <button
                    className={`t-status ${meta.cls}`}
                    onClick={() => handleToggle(task.id, task.status)}
                    aria-label={`Set to ${nextLabel}`}
                    title={`Set to ${nextLabel}`}
                  >
                    {meta.label}
                  </button>
                  <span className={`t-title${done ? " done" : ""}`}>{task.title}</span>
                  <button
                    className="t-del"
                    onClick={() => handleDelete(task.id)}
                    aria-label="Delete task"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
