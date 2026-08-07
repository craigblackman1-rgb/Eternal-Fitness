"use client";

import { useState } from "react";
import { HubCard, HubCardHeader, EmptyState } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconPlus,
  IconTrash2,
  IconPencil,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconChevronUp,
  IconCircle,
  IconShieldCheck,
  IconCheckCircle,
  IconCheck,
  IconX,
  IconCalendar,
  IconAlertTriangle,
} from "@/components/icons";
import { toast } from "sonner";
import type { Task, TaskBucket, TaskStatus } from "@/types";

interface TasksManagerProps {
  initialTasks: Task[];
  initialBuckets: TaskBucket[];
  currentUserName: string | null;
  clients: { id: string; name: string }[];
}

const STATUS_OPTIONS: TaskStatus[] = ["todo", "in_progress", "done"];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  todo: <IconCircle className="w-4 h-4" />,
  in_progress: <IconShieldCheck className="w-4 h-4" />,
  done: <IconCheckCircle className="w-4 h-4" />,
};

// DESIGN.md §2: neutral = not started, rose = primary/in-flight, teal =
// success/complete. Amber is reserved for warnings (see the due-soon card).
const STATUS_COLOR: Record<TaskStatus, "slate" | "rose" | "teal"> = {
  todo: "slate",
  in_progress: "rose",
  done: "teal",
};

const ASSIGNEE_OPTIONS = ["Unassigned", "Esther Fair", "Craig Blackman"];

// The .hub-shell field-border rule in globals.css covers input/textarea/combobox
// but not native <select>, so these were rendering a shade lighter than the
// <Input> sitting next to them in the same row. Set explicitly to match.
const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-3 text-sm text-foreground " +
  "hover:border-[var(--hub-field-border-hover)] focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30";

const DUE_FILTER_OPTIONS: { key: DueFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Due Today" },
  { key: "dueSoon", label: "Due This Week" },
  { key: "none", label: "No Due Date" },
];

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

type DueBucket = "overdue" | "today" | "week" | "later" | "none";
type DueFilter = "all" | "overdue" | "today" | "dueSoon" | "none";
type SortKey = "due_date" | "created_at" | "title";
type SortDir = "asc" | "desc";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntilDue(dueDate: string) {
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - startOfToday().getTime()) / 86_400_000);
}

function getDueBucket(task: Task): DueBucket {
  if (!task.due_date) return "none";
  const diff = daysUntilDue(task.due_date);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "week";
  return "later";
}

const DUE_SOON_BUCKETS: DueBucket[] = ["overdue", "today", "week"];

function matchesDueFilter(task: Task, filter: DueFilter) {
  if (filter === "all") return true;
  const bucket = getDueBucket(task);
  if (filter === "none") return bucket === "none";
  // Completed tasks aren't "overdue"/"due today"/"due this week" — a done
  // task with a past due date shouldn't inflate those counts.
  if (task.status === "done") return false;
  if (filter === "dueSoon") return DUE_SOON_BUCKETS.includes(bucket);
  return bucket === filter;
}

function sortTasks(tasks: Task[], key: SortKey, dir: SortDir) {
  const sign = dir === "asc" ? 1 : -1;
  return [...tasks].sort((a, b) => {
    if (key === "due_date") {
      // Tasks with no due date always sort last, regardless of direction.
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return sign * a.due_date.localeCompare(b.due_date);
    }
    if (key === "title") return sign * a.title.localeCompare(b.title);
    return sign * a.created_at.localeCompare(b.created_at);
  });
}

export function TasksManager({ initialTasks, initialBuckets, currentUserName, clients }: TasksManagerProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [buckets, setBuckets] = useState(initialBuckets);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [bucketFilter, setBucketFilter] = useState<string | null>(null);
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const [bucketNameDraft, setBucketNameDraft] = useState("");
  const [bucketBusy, setBucketBusy] = useState(false);
  // Default to "my tasks" whenever the logged-in user's name matches an assignee option
  // (e.g. Esther logging in as "Esther Fair") — otherwise show everything.
  const [showOnlyMine, setShowOnlyMine] = useState(
    () => !!currentUserName && ASSIGNEE_OPTIONS.includes(currentUserName),
  );

  const blankForm = {
    title: "",
    description: "",
    assignee: "Unassigned" as string,
    bucket_id: "" as string,
    due_date: "",
    client_id: "" as string,
    status: "todo" as TaskStatus,
  };
  const [form, setForm] = useState(blankForm);

  const [showNewBucketInput, setShowNewBucketInput] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");
  const [addingBucket, setAddingBucket] = useState(false);

  function startAdd() {
    setEditing(null);
    setForm(blankForm);
    setShowNewBucketInput(false);
    setNewBucketName("");
    setShowForm(true);
  }

  function startEdit(task: Task) {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      assignee: task.assignee ?? "Unassigned",
      bucket_id: task.bucket_id ?? "",
      due_date: task.due_date ?? "",
      client_id: task.client_id ?? "",
      status: task.status,
    });
    setShowNewBucketInput(false);
    setNewBucketName("");
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (showNewBucketInput && newBucketName.trim()) {
      await createBucketAndSelect();
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        assignee: form.assignee === "Unassigned" ? null : form.assignee,
        bucket_id: form.bucket_id || null,
        due_date: form.due_date || null,
        client_id: form.client_id || null,
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

  async function createBucketAndSelect() {
    setAddingBucket(true);
    try {
      const res = await fetch("/api/task-buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBucketName.trim() }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to create bucket");
      }
      const bucket = await res.json();
      setBuckets((prev) => [...prev, bucket].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, bucket_id: bucket.id }));
      setShowNewBucketInput(false);
      setNewBucketName("");
      toast.success(`Bucket "${bucket.name}" created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create bucket");
    } finally {
      setAddingBucket(false);
    }
  }

  function startEditBucket(bucket: TaskBucket) {
    setEditingBucketId(bucket.id);
    setBucketNameDraft(bucket.name);
  }

  function cancelEditBucket() {
    setEditingBucketId(null);
    setBucketNameDraft("");
  }

  async function saveBucketRename(bucket: TaskBucket) {
    const name = bucketNameDraft.trim();
    if (!name || name === bucket.name) {
      cancelEditBucket();
      return;
    }
    setBucketBusy(true);
    try {
      const res = await fetch(`/api/task-buckets/${bucket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to rename bucket");
      }
      const updated = await res.json();
      setBuckets((prev) =>
        prev.map((b) => (b.id === bucket.id ? updated : b)).sort((a, b) => a.name.localeCompare(b.name)),
      );
      toast.success(`Renamed to "${updated.name}"`);
      cancelEditBucket();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename bucket");
    } finally {
      setBucketBusy(false);
    }
  }

  async function deleteBucket(bucket: TaskBucket) {
    if (!confirm(`Delete bucket "${bucket.name}"? Tasks in it become unbucketed, not deleted.`)) return;
    setBucketBusy(true);
    try {
      const res = await fetch(`/api/task-buckets/${bucket.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to delete bucket");
      }
      setBuckets((prev) => prev.filter((b) => b.id !== bucket.id));
      setTasks((prev) =>
        prev.map((t) => (t.bucket_id === bucket.id ? { ...t, bucket_id: null } : t)),
      );
      if (bucketFilter === bucket.id) setBucketFilter(null);
      toast.success(`Bucket "${bucket.name}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete bucket");
    } finally {
      setBucketBusy(false);
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

  function getBucketName(bucketId: string | null) {
    if (!bucketId) return null;
    return buckets.find((b) => b.id === bucketId)?.name ?? null;
  }

  function getClientName(task: Task) {
    if (task.client_name) return task.client_name;
    if (task.client_id) return clients.find((c) => c.id === task.client_id)?.name ?? null;
    return null;
  }

  const assigneeScopedTasks = tasks.filter((t) =>
    showOnlyMine && currentUserName ? t.assignee === currentUserName : true,
  );
  const bucketScopedTasks = assigneeScopedTasks.filter((t) =>
    bucketFilter ? t.bucket_id === bucketFilter : true,
  );
  const filteredTasks = bucketScopedTasks.filter(
    (t) => matchesDueFilter(t, dueFilter) && (clientFilter ? t.client_id === clientFilter : true),
  );
  const sortedTasks = sortTasks(filteredTasks, sortKey, sortDir);

  const filterByStatus = (status: TaskStatus) =>
    sortedTasks.filter((t) => t.status === status);

  const dueSoonTasks = sortTasks(
    assigneeScopedTasks.filter(
      (t) => t.status !== "done" && DUE_SOON_BUCKETS.includes(getDueBucket(t)),
    ),
    "due_date",
    "asc",
  );
  const overdueCount = dueSoonTasks.filter((t) => getDueBucket(t) === "overdue").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button
          size="sm"
          className="gap-1.5 rounded-lg bg-rose text-white hover:bg-rose/90"
          onClick={startAdd}
        >
          <IconPlus className="h-4 w-4" /> New Task
        </Button>
        {currentUserName && ASSIGNEE_OPTIONS.includes(currentUserName) && (
          <div className="inline-flex gap-0.5 rounded-[10px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-[3px] shadow-sm">
            <button
              onClick={() => setShowOnlyMine(true)}
              className={`rounded-[7px] px-3.5 py-1.5 text-sm font-medium transition-colors ${
                showOnlyMine
                  ? "bg-[var(--hub-sidebar-active)] font-semibold text-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
              }`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setShowOnlyMine(false)}
              className={`rounded-[7px] px-3.5 py-1.5 text-sm font-medium transition-colors ${
                !showOnlyMine
                  ? "bg-[var(--hub-sidebar-active)] font-semibold text-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
              }`}
            >
              All Tasks
            </button>
          </div>
        )}
      </div>

      {dueSoonTasks.length > 0 && (
        <HubCard padded={false}>
          <HubCardHeader
            icon={
              overdueCount > 0 ? (
                <IconAlertTriangle className="w-4 h-4" />
              ) : (
                <IconCalendar className="w-4 h-4" />
              )
            }
            title="Due This Week"
            subtitle={
              overdueCount > 0
                ? `${dueSoonTasks.length} task${dueSoonTasks.length !== 1 ? "s" : ""} due soon — ${overdueCount} overdue`
                : `${dueSoonTasks.length} task${dueSoonTasks.length !== 1 ? "s" : ""} due in the next 7 days`
            }
            color={overdueCount > 0 ? "rose" : "amber"}
            className="px-5 pt-5"
          />
          <div className="px-5 pb-5 flex flex-wrap gap-2">
            {dueSoonTasks.slice(0, 6).map((task) => {
              const bucket = getDueBucket(task);
              return (
                <button
                  key={task.id}
                  onClick={() => startEdit(task)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    bucket === "overdue"
                      ? "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)] hover:border-[var(--status-danger)]"
                      : "border-[var(--hub-border)] bg-[var(--hub-canvas)] text-muted-foreground hover:border-[var(--hub-field-border-hover)] hover:text-foreground"
                  }`}
                >
                  <span className="max-w-[16rem] truncate">{task.title}</span>
                  <span className="opacity-70">{formatDate(task.due_date)}</span>
                </button>
              );
            })}
            {dueSoonTasks.length > 6 && (
              <button
                onClick={() => setDueFilter("dueSoon")}
                className="inline-flex items-center rounded-full border border-[var(--hub-border)] bg-[var(--hub-canvas)] px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                +{dueSoonTasks.length - 6} more
              </button>
            )}
          </div>
        </HubCard>
      )}

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
          </DialogHeader>
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
                  className={SELECT_CLASS}
                >
                  {ASSIGNEE_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Bucket</Label>
                <select
                  value={showNewBucketInput ? "__new__" : form.bucket_id}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setShowNewBucketInput(true);
                    } else {
                      setShowNewBucketInput(false);
                      setNewBucketName("");
                      setForm({ ...form, bucket_id: e.target.value });
                    }
                  }}
                  className={SELECT_CLASS}
                >
                  <option value="">No bucket</option>
                  {buckets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                  <option value="__new__">+ Add new bucket…</option>
                </select>
                {showNewBucketInput && (
                  <div className="mt-1.5 flex gap-1.5">
                    <Input
                      value={newBucketName}
                      onChange={(e) => setNewBucketName(e.target.value)}
                      placeholder="Bucket name"
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newBucketName.trim()) {
                          e.preventDefault();
                          createBucketAndSelect();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0"
                      onClick={createBucketAndSelect}
                      disabled={!newBucketName.trim() || addingBucket}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 shrink-0 px-2"
                      onClick={() => {
                        setShowNewBucketInput(false);
                        setNewBucketName("");
                      }}
                    >
                      <IconX className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
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
                <Label>Linked to client</Label>
                <select
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  className={SELECT_CLASS}
                >
                  <option value="">No client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as TaskStatus })
                  }
                  className={SELECT_CLASS}
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
              <Button
                onClick={save}
                disabled={saving || (showNewBucketInput && !newBucketName.trim())}
              >
                {editing ? "Save changes" : "Create task"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {buckets.length > 0 && (
        <div className="inline-flex w-full max-w-full justify-start gap-0.5 flex-wrap rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-1 shadow-sm sm:w-auto">
          <button
            onClick={() => setBucketFilter(null)}
            className={`inline-flex items-center gap-2 rounded-lg border-0 px-3.5 py-2 text-sm font-medium transition-colors ${
              bucketFilter === null
                ? "bg-[var(--hub-sidebar-active)] font-semibold text-foreground shadow-none"
                : "bg-transparent text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
            }`}
          >
            All
          </button>
          {buckets.map((b) => {
            const isActive = bucketFilter === b.id;
            const count = assigneeScopedTasks.filter((t) => t.bucket_id === b.id).length;

            if (editingBucketId === b.id) {
              return (
                <div key={b.id} className="inline-flex items-center gap-1 rounded-lg bg-[var(--hub-hover)] px-2 py-1">
                  <input
                    autoFocus
                    value={bucketNameDraft}
                    onChange={(e) => setBucketNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveBucketRename(b);
                      if (e.key === "Escape") cancelEditBucket();
                    }}
                    disabled={bucketBusy}
                    className="w-28 rounded-md border border-[var(--hub-border)] bg-[var(--hub-card)] px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose"
                  />
                  <button
                    onClick={() => saveBucketRename(b)}
                    disabled={bucketBusy}
                    title="Save"
                    className="rounded-md p-1 text-muted-foreground hover:bg-[var(--hub-card)] hover:text-foreground"
                  >
                    <IconCheck className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={cancelEditBucket}
                    disabled={bucketBusy}
                    title="Cancel"
                    className="rounded-md p-1 text-muted-foreground hover:bg-[var(--hub-card)] hover:text-foreground"
                  >
                    <IconX className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div key={b.id} className="group inline-flex items-center rounded-lg">
                <button
                  onClick={() => setBucketFilter(isActive ? null : b.id)}
                  className={`inline-flex items-center gap-2 rounded-lg border-0 px-3.5 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--hub-sidebar-active)] font-semibold text-foreground shadow-none"
                      : "bg-transparent text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
                  }`}
                >
                  {b.name}
                  <span
                    className={`inline-grid min-w-[18px] h-[18px] place-items-center rounded-full border px-1 text-[11px] font-bold leading-none tabular-nums ${
                      isActive
                        ? "border-[var(--status-primary-border)] bg-[var(--status-primary-bg)] text-[var(--status-primary)]"
                        : "border-[var(--hub-border)] bg-[var(--hub-canvas)] text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
                <button
                  onClick={() => startEditBucket(b)}
                  title={`Rename "${b.name}"`}
                  className="ml-0.5 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-[var(--hub-hover)] hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <IconPencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => deleteBucket(b)}
                  title={`Delete "${b.name}"`}
                  className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-[var(--hub-hover)] hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <IconTrash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-3 flex-wrap">
          <div className="inline-flex w-full max-w-full flex-wrap gap-0.5 rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-1 shadow-sm sm:w-auto">
            {DUE_FILTER_OPTIONS.map((opt) => {
              const isActive = dueFilter === opt.key;
              const count = bucketScopedTasks.filter((t) => matchesDueFilter(t, opt.key)).length;
              return (
                <button
                  key={opt.key}
                  onClick={() => setDueFilter(isActive && opt.key !== "all" ? "all" : opt.key)}
                  className={`inline-flex items-center gap-2 rounded-lg border-0 px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--hub-sidebar-active)] font-semibold text-foreground shadow-none"
                      : "bg-transparent text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
                  }`}
                >
                  {opt.label}
                  <span
                    className={`inline-grid min-w-[18px] h-[18px] place-items-center rounded-full border px-1 text-[11px] font-bold leading-none tabular-nums ${
                      isActive
                        ? "border-[var(--status-primary-border)] bg-[var(--status-primary-bg)] text-[var(--status-primary)]"
                        : "border-[var(--hub-border)] bg-[var(--hub-canvas)] text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          {clients.length > 0 && (
            <div className="inline-flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground shrink-0">Client</Label>
              <select
                value={clientFilter ?? ""}
                onChange={(e) => setClientFilter(e.target.value || null)}
                className="h-8 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2.5 text-sm text-foreground hover:border-[var(--hub-field-border-hover)] focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
              >
                <option value="">All clients</option>
                {clients.map((c) => {
                  const count = bucketScopedTasks.filter((t) => t.client_id === c.id).length;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        <div className="inline-flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground shrink-0">Sort by</Label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-8 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-2.5 text-sm text-foreground hover:border-[var(--hub-field-border-hover)] focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
          >
            <option value="due_date">Due date</option>
            <option value="created_at">Date created</option>
            <option value="title">Title</option>
          </select>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 shrink-0"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            aria-label={sortDir === "asc" ? "Sort ascending" : "Sort descending"}
            title={sortDir === "asc" ? "Ascending" : "Descending"}
          >
            {sortDir === "asc" ? (
              <IconChevronUp className="h-3.5 w-3.5" />
            ) : (
              <IconChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {STATUS_OPTIONS.map((status) => {
          const columnTasks = filterByStatus(status);
          return (
            <HubCard key={status} padded={false}>
              <HubCardHeader
                icon={STATUS_ICON[status]}
                title={STATUS_LABELS[status]}
                subtitle={`${columnTasks.length} task${columnTasks.length !== 1 ? "s" : ""}`}
                color={STATUS_COLOR[status]}
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
                      className="rounded-lg border border-[var(--hub-border)] bg-[var(--hub-card)] p-3.5 hover:border-[var(--hub-field-border-hover)] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-[13.5px] leading-snug text-foreground min-w-0 break-words">
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
                            aria-label={`Edit "${task.title}"`}
                          >
                            <IconPencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-[var(--status-danger)]"
                            onClick={() => remove(task)}
                            aria-label={`Delete "${task.title}"`}
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
                        {getClientName(task) && (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(8,126,139,.08)", borderColor: "rgba(8,126,139,.18)", color: "var(--color-teal, #087E8B)" }}>
                            {getClientName(task)}
                          </span>
                        )}
                        {task.bucket_id && getBucketName(task.bucket_id) && (
                          <span className="inline-flex items-center rounded-full border border-[var(--hub-border)] bg-[var(--hub-canvas)] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {getBucketName(task.bucket_id)}
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
