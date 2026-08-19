"use client";

import { useState, useEffect, useCallback } from "react";
import {
  IconPlus,
  IconCheckSquare,
  IconMail,
  IconAlertCircle,
  IconClipboardList,
  IconTrash2,
} from "@/components/icons";
import {
  UPDATE_INTERVAL_LABELS,
  type UpdateInterval,
  type UpdateDueInfo,
} from "@/lib/updates-due";
import { TokenPill } from "@/components/hub/StatusBadge";
import type { StatusToken } from "@/lib/hubStatus";
import type { Task } from "@/types";

function dueStatusToken(status: string | null): StatusToken {
  switch (status) {
    case "overdue":
      return "danger";
    case "due_soon":
      return "warning";
    case "upcoming":
      return "primary";
    default:
      return "neutral";
  }
}

function dueStatusLabel(status: string | null): string {
  switch (status) {
    case "overdue":
      return "Overdue";
    case "due_soon":
      return "Due Soon";
    case "upcoming":
      return "Upcoming";
    default:
      return "—";
  }
}

const TASK_STATUS_LABELS: Record<string, { label: string; token: StatusToken }> =
  {
    todo: { label: "To do", token: "neutral" },
    in_progress: { label: "In progress", token: "warning" },
    done: { label: "Done", token: "success" },
  };

const NEXT_STATUS: Record<string, string | undefined> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

interface Props {
  clientId: string;
  clientNumber: number;
  updateInterval: UpdateInterval | null;
  dueInfo: UpdateDueInfo;
  lastSentAt: string | null;
}

export function ClientTasksPanel({
  clientId,
  clientNumber,
  updateInterval,
  dueInfo,
  lastSentAt,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

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
    const title = newTitle.trim();
    if (!title) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, client_id: clientId }),
    });
    if (res.ok) {
      setNewTitle("");
      setAdding(false);
      fetchTasks();
    }
  }

  async function handleStatusToggle(taskId: string, currentStatus: string) {
    const nextStatus = NEXT_STATUS[currentStatus];
    if (!nextStatus) return;
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: nextStatus as Task["status"] } : t,
        ),
      );
    }
  }

  async function handleDelete(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  }

  const showDerived =
    dueInfo.nextDueDate && updateInterval && dueInfo.status;

  return (
        <div className="rounded-[16px] border border-[var(--hub-border)] bg-[var(--hub-card)]">
          <div className="px-5 pt-5 pb-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-[28px] h-[28px] rounded-lg bg-[var(--hub-hover)] text-muted-foreground">
                <IconCheckSquare className="w-4 h-4" />
              </span>
              <div>
                <span className="text-sm font-semibold text-foreground">
                  Tasks
                </span>
                <span className="block text-xs text-muted-foreground">
                  Action items — manual tasks and scheduled reminders
                </span>
              </div>
              <button
                onClick={() => setAdding(true)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--hub-border)] px-3 py-1.5 text-xs font-medium text-foreground hover:bg-[var(--hub-hover)] transition-colors"
              >
                <IconPlus className="w-3.5 h-3.5" /> Add task
              </button>
            </div>
          </div>

          <div className="px-5 pb-5 pt-3">
            {adding && (
              <div className="flex items-center gap-2 mb-3 p-3 rounded-[12px] border border-dashed border-[var(--hub-border)] bg-[var(--hub-canvas)]">
                <input
                  autoFocus
                  type="text"
                  placeholder="Task title…"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                    if (e.key === "Escape") {
                      setAdding(false);
                      setNewTitle("");
                    }
                  }}
                  className="flex-1 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--color-teal)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)]"
                />
                <button
                  onClick={handleAdd}
                  disabled={!newTitle.trim()}
                  className="rounded-lg bg-rose px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose/90 disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setAdding(false);
                    setNewTitle("");
                  }}
                  className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {showDerived && (
                <div
                  className="flex items-start gap-3 p-[13px] rounded-[12px] border border-[var(--hub-border)]"
                  style={{ background: "rgba(var(--color-amber-rgb, 176, 138, 62), 0.04)" }}
                >
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0"
                    style={{
                      background: "rgba(var(--color-amber-rgb, 176, 138, 62), 0.12)",
                      color: "var(--status-warning)",
                    }}
                  >
                    <IconMail className="w-[13px] h-[13px] stroke-[2.5]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground mb-[3px]">
                      Send{" "}
                      {updateInterval
                        ? UPDATE_INTERVAL_LABELS[updateInterval].toLowerCase()
                        : "periodic"}{" "}
                      check-in update
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Derived from interval schedule
                      {lastSentAt
                        ? ` · last sent ${new Date(lastSentAt).toLocaleDateString(
                            "en-GB",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}`
                        : " · no send yet"}
                      {" · "}
                      <span
                        className="font-semibold"
                        style={{
                          color:
                            dueInfo.status === "overdue"
                              ? "var(--status-danger)"
                              : dueInfo.status === "due_soon"
                                ? "var(--status-warning)"
                                : "inherit",
                        }}
                      >
                        {dueInfo.status === "overdue"
                          ? "Overdue"
                          : `Due ${new Date(dueInfo.nextDueDate!).toLocaleDateString(
                              "en-GB",
                              { day: "numeric", month: "short", year: "numeric" },
                            )}`}
                      </span>
                    </p>
                  </div>
                  <TokenPill
                    token={dueStatusToken(dueInfo.status)}
                    label={dueStatusLabel(dueInfo.status)}
                  />
                </div>
              )}

              {loading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Loading tasks…
                </div>
              ) : tasks.length === 0 && !showDerived ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No tasks yet. Click &ldquo;Add task&rdquo; to create one.
                </div>
              ) : tasks.length === 0 ? null : (
                tasks.map((task) => {
                  const statusInfo = TASK_STATUS_LABELS[task.status] ?? {
                    label: task.status,
                    token: "neutral" as StatusToken,
                  };
                  const isDone = task.status === "done";
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-[13px] rounded-[12px] border border-[var(--hub-border)] group"
                    >
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0 bg-[var(--hub-hover)] text-muted-foreground">
                        <IconClipboardList className="w-[13px] h-[13px] stroke-[2.5]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm mb-[3px] ${
                            isDone
                              ? "line-through text-muted-foreground font-normal"
                              : "font-medium text-foreground"
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Added by Esther
                          {task.due_date
                            ? ` · due ${new Date(
                                task.due_date,
                              ).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}`
                            : ""}
                          {" · "}created{" "}
                          {new Date(task.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleStatusToggle(task.id, task.status)}
                          className="focus:outline-none"
                          title={`Set to ${TASK_STATUS_LABELS[NEXT_STATUS[task.status] ?? "todo"]?.label ?? "next status"}`}
                        >
                          <TokenPill
                            token={statusInfo.token}
                            label={statusInfo.label}
                          />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--status-danger-bg)] text-muted-foreground hover:text-[var(--status-danger)]"
                          title="Delete task"
                        >
                          <IconTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
  );
}
