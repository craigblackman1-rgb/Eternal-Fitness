"use client";

import { useState } from "react";
import { HubCard, HubCardHeader, EmptyState } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  IconPlus,
  IconTrash2,
  IconPencil,
  IconChevronLeft,
  IconChevronRight,
  IconCheckSquare,
} from "@/components/icons";
import { toast } from "sonner";
import type { Task, TaskStatus } from "@/types";

interface TasksManagerProps {
  initialTasks: Task[];
}

const STATUS_OPTIONS: TaskStatus[] = ["todo", "in_progress", "done"];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const ASSIGNEE_OPTIONS = ["Unassigned", "Esther Fair", "Craig Blackman"];

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getNextStatus(current: TaskStatus): TaskStatus | null {
  if (current === "todo") return "in_progress";
  if (current === "in_progress") return "done";
  return null;
}

function getPrevStatus(current: TaskStatus): TaskStatus | null {
  if (current === "done") return "in_progress";
  if (current === "in_progress") return "todo";
  return null;
}

export function TasksManager({ initialTasks }: TasksManagerProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const blankForm = {
    title: "",
    description: "",
    assignee: "Unassigned" as string,
    due_date: "",
    status: "todo" as TaskStatus,
  };
  const [form, setForm] = useState(blankForm);

  function startAdd() {
    setEditing(null);
    setForm(blankForm);
    setShowForm(true);
  }

  function startEdit(task: Task) {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      assignee: task.assignee ?? "Unassigned",
      due_date: task.due_date ?? "",
      status: task.status,
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        assignee: form.assignee === "Unassigned" ? null : form.assignee,
        due_date: form.due_date || null,
        status: form.status,
      };

      if (editing) {
        const res = await fetch(`/api/tasks/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update");
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === editing.id ? updated : t)));
        toast.success("Task updated");
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create");
        const created = await res.json();
        setTasks((prev) => [created, ...prev]);
        toast.success("Task created");
      }
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(task: Task) {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (!res.ok) {
      setTasks(initialTasks);
      toast.error("Failed to delete");
    } else {
      toast.success("Task deleted");
    }
  }

  async function changeStatus(task: Task, newStatus: TaskStatus) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)),
    );
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to move");
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)),
      );
      toast.error(err instanceof Error ? err.message : "Failed to move");
    }
  }

  const filterByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={startAdd}>
          <IconPlus className="h-4 w-4" /> New Task
        </Button>
      </div>

      {showForm && (
        <HubCard>
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="What needs doing?"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <select
                  value={form.assignee}
                  onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                  className="w-full rounded-md border border-[var(--hub-border)] bg-background px-3 py-2 text-sm"
                >
                  {ASSIGNEE_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Brief description (optional)"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as TaskStatus })
                  }
                  className="w-full rounded-md border border-[var(--hub-border)] bg-background px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {editing ? "Save changes" : "Create task"}
              </Button>
            </div>
          </div>
        </HubCard>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {STATUS_OPTIONS.map((status) => {
          const columnTasks = filterByStatus(status);
          return (
            <HubCard key={status} padded={false}>
              <HubCardHeader
                icon={<IconCheckSquare className="w-4 h-4" />}
                title={STATUS_LABELS[status]}
                subtitle={`${columnTasks.length} task${columnTasks.length !== 1 ? "s" : ""}`}
                color={
                  status === "todo"
                    ? "amber"
                    : status === "in_progress"
                      ? "teal"
                      : "rose"
                }
                className="px-5 pt-5"
              />
              <div className="px-5 pb-5 space-y-3">
                {columnTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No tasks
                  </p>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-card)] p-3.5 hover:border-[var(--hub-field-border-hover)] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-foreground min-w-0 break-words">
                          {task.title}
                        </p>
                        <div className="flex gap-0.5 shrink-0">
                          {getPrevStatus(task.status) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() =>
                                changeStatus(task, getPrevStatus(task.status)!)
                              }
                              aria-label="Move left"
                            >
                              <IconChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {getNextStatus(task.status) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() =>
                                changeStatus(task, getNextStatus(task.status)!)
                              }
                              aria-label="Move right"
                            >
                              <IconChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => startEdit(task)}
                          >
                            <IconPencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => remove(task)}
                          >
                            <IconTrash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {task.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {task.assignee ? (
                          <span className="inline-flex items-center rounded-full border border-[var(--status-primary-border)] bg-[var(--status-primary-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-primary-text)]">
                            {task.assignee}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-neutral)]">
                            Unassigned
                          </span>
                        )}
                        {task.due_date && (
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </HubCard>
          );
        })}
      </div>
    </div>
  );
}
