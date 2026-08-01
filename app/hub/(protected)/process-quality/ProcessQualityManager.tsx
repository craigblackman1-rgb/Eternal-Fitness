"use client";

import { useState } from "react";
import { HubCard, HubCardHeader, KpiTile, StatusBadge, EmptyState } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  IconPlus,
  IconClipboardList,
  IconFileText,
  IconSparkles,
  IconTrash2,
  IconPencil,
  IconClipboardCheck,
  IconTriangleAlert,
  IconClock,
  IconEye,
  IconX,
  IconShieldCheck,
  IconCheckCircle,
  IconCheck,
  IconUsers,
  IconCopy,
} from "@/components/icons";
import { toast } from "sonner";
import type {
  ProcessEntry,
  ProcessStatus,
  Sop,
  ImprovementEntry,
} from "@/types";

type TabId = "overview" | "register" | "sops" | "log";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "register", label: "Process Register" },
  { id: "sops", label: "SOPs" },
  { id: "log", label: "Improvement Log" },
];

const STATUS_OPTIONS: ProcessStatus[] = ["active", "draft", "review", "archived"];

export interface OverviewData {
  totalClients: number;
  clearClients: number;
  medicalClearanceValid: number;
  clearanceAtRiskClients: { name: string; reason: string; status: string }[];
  overdueReviewClients: { name: string; dueDate: string }[];
  activeEquipment: number;
  totalEquipment: number;
  reviewsDue: number;
  sopCount: number;
}

interface ProcessQualityManagerProps {
  initialProcessEntries: ProcessEntry[];
  initialSops: Sop[];
  initialImprovementLog: ImprovementEntry[];
  overviewData?: OverviewData;
}

/** Map a register status to a hub status token for the shared badge tokens. */
function registerStatusBadge(status: ProcessStatus) {
  switch (status) {
    case "active":
      return <StatusBadge status="active" />;
    case "review":
      return (
        <span className="inline-flex items-center rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--status-warning)]">
          Review
        </span>
      );
    case "archived":
      return (
        <span className="inline-flex items-center rounded-full border border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--status-neutral)]">
          Archived
        </span>
      );
    case "draft":
    default:
      return (
        <span className="inline-flex items-center rounded-full border border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--status-neutral)]">
          Draft
        </span>
      );
  }
}

export function ProcessQualityManager({
  initialProcessEntries,
  initialSops,
  initialImprovementLog,
  overviewData,
}: ProcessQualityManagerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const processCount = initialProcessEntries.length;
  const sopCount = initialSops.length;
  const reviewDue = initialProcessEntries.filter((p) => p.status === "review").length;
  const improvementCount = initialImprovementLog.length;

  return (
    <div className="space-y-6">
      {/* ── KPI band ── */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiTile
          statusToken="primary"
          icon={<IconClipboardList className="w-5 h-5" />}
          label="Processes"
          value={processCount}
        />
        <KpiTile
          statusToken="neutral"
          icon={<IconFileText className="w-5 h-5" />}
          label="SOPs"
          value={sopCount}
        />
        <KpiTile
          statusToken="warning"
          icon={<IconClock className="w-5 h-5" />}
          label="Reviews due"
          value={reviewDue}
        />
        <KpiTile
          statusToken="neutral"
          icon={<IconSparkles className="w-5 h-5" />}
          label="Improvements logged"
          value={improvementCount}
        />
      </div>

      {/* ── Tab strip ── */}
      <div className="inline-flex w-full max-w-full justify-start gap-0.5 flex-wrap rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-1 shadow-sm sm:w-auto">
        {TABS.map((tab) => {
          const count =
            tab.id === "register"
              ? processCount
              : tab.id === "sops"
                ? sopCount
                : improvementCount;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-lg border-0 px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--hub-sidebar-active)] font-semibold text-foreground shadow-none"
                  : "bg-transparent text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`inline-grid min-w-[18px] h-[18px] place-items-center rounded-full border px-[5px] text-[11px] font-bold leading-none tabular-nums ${
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

      {activeTab === "overview" && overviewData && (
        <OverviewSection data={overviewData} />
      )}
      {activeTab === "register" && (
        <RegisterSection initial={initialProcessEntries} />
      )}
      {activeTab === "sops" && <SopsSection initial={initialSops} />}
      {activeTab === "log" && <LogSection initial={initialImprovementLog} />}
    </div>
  );
}

// ─── Process Register ────────────────────────────────────────────────────────

function RegisterSection({ initial }: { initial: ProcessEntry[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<ProcessEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const blank: Omit<ProcessEntry, "id" | "created_at"> = {
    ref: "",
    name: "",
    owner: "Esther Fair",
    area: "General",
    status: "draft",
    reviewed: null,
    category: "General",
    sop_ref: null,
  };
  const [form, setForm] = useState(blank);

  function startAdd() {
    setEditing(null);
    setForm(blank);
    setShowForm(true);
  }
  function startEdit(item: ProcessEntry) {
    setEditing(item);
    setForm({
      ref: item.ref,
      name: item.name,
      owner: item.owner,
      area: item.area,
      status: item.status,
      reviewed: item.reviewed,
      category: item.category,
      sop_ref: item.sop_ref,
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.ref.trim() || !form.name.trim()) {
      toast.error("Ref and name are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/process-entries/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update");
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === editing.id ? updated : i)));
        toast.success("Process updated");
      } else {
        const res = await fetch("/api/process-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add");
        const created = await res.json();
        setItems((prev) => [...prev, created].sort((a, b) => a.ref.localeCompare(b.ref)));
        toast.success("Process added");
      }
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: ProcessEntry) {
    if (!confirm(`Delete process ${item.ref} — ${item.name}?`)) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const res = await fetch(`/api/process-entries/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setItems(initial);
      toast.error("Failed to delete");
    } else {
      toast.success("Process deleted");
    }
  }

  return (
    <HubCard padded={false}>
      <HubCardHeader
        icon={<IconClipboardList className="w-4 h-4" />}
        title="Process Register"
        subtitle="Every core process, owned and dated. Plain English, one page per process."
        color="rose"
        action={
          <Button
            size="sm"
            className="gap-1.5 rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold"
            onClick={startAdd}
          >
            <IconPlus className="h-4 w-4" /> Add process
          </Button>
        }
        className="px-5 pt-5"
      />

      {showForm && (
        <div className="px-5 pb-5">
          <div className="mb-5 space-y-3 rounded-xl border border-[var(--hub-border)] p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Ref</Label>
                <Input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} placeholder="PR-001" />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Client onboarding" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Admin" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Owner</Label>
                <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="General" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ProcessStatus })}
                  className="h-9 w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-3 text-sm text-foreground hover:border-[var(--hub-field-border-hover)] focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Reviewed</Label>
                <Input value={form.reviewed ?? ""} onChange={(e) => setForm({ ...form, reviewed: e.target.value || null })} placeholder="Jul 2026" />
              </div>
              <div className="space-y-2">
                <Label>Linked SOP ref</Label>
                <Input value={form.sop_ref ?? ""} onChange={(e) => setForm({ ...form, sop_ref: e.target.value || null })} placeholder="SOP-001 (optional)" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button className="rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold" onClick={save} disabled={saving}>{editing ? "Save changes" : "Add process"}</Button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            icon={<IconClipboardList className="w-7 h-7" />}
            title="No processes yet"
            description="Add Eternal Fitness's own processes here — client onboarding, plan building, PAR-Q handling, update-email sending."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)] text-left">
                <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ref</th>
                <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reviewed</th>
                <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">SOP</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)] transition-colors">
                  <td className="px-5 py-2.5 font-mono text-xs text-rose">{item.ref}</td>
                  <td className="px-5 py-2.5 font-medium text-foreground">{item.name}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{item.category}</td>
                  <td className="px-5 py-2.5">{registerStatusBadge(item.status)}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{item.reviewed ?? "—"}</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{item.sop_ref ?? "—"}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(item)} aria-label={`Edit ${item.ref}`}><IconPencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-[var(--status-danger)]" onClick={() => remove(item)} aria-label={`Delete ${item.ref}`}><IconTrash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HubCard>
  );
}

// ─── SOPs ────────────────────────────────────────────────────────────────────

function SopsSection({ initial }: { initial: Sop[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Sop | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<Sop | null>(null);

  const blank: Omit<Sop, "id" | "created_at"> = {
    ref: "",
    title: "",
    area: "General",
    trigger: "",
    owner: "Esther Fair",
    last_updated: null,
    what: "",
    good_looks_like: "",
    steps: [],
    prompt_template: null,
    applies_to: null,
    review_date: null,
    linked_client: null,
    source: null,
    status: "active",
  };
  const [form, setForm] = useState(blank);

  function startAdd() {
    setEditing(null);
    setForm(blank);
    setShowForm(true);
  }
  function startEdit(item: Sop) {
    setEditing(item);
    setForm({
      ref: item.ref,
      title: item.title,
      area: item.area,
      trigger: item.trigger,
      owner: item.owner,
      last_updated: item.last_updated,
      what: item.what,
      good_looks_like: item.good_looks_like,
      steps: item.steps,
      prompt_template: item.prompt_template,
      applies_to: item.applies_to,
      review_date: item.review_date,
      linked_client: item.linked_client,
      source: item.source,
      status: item.status,
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.ref.trim() || !form.title.trim() || !form.trigger.trim() || !form.what.trim() || !form.good_looks_like.trim()) {
      toast.error("Ref, title, trigger, what and what-good-looks-like are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/sops/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update");
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === editing.id ? updated : i)));
        toast.success("SOP updated");
      } else {
        const res = await fetch("/api/sops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add");
        const created = await res.json();
        setItems((prev) => [...prev, created].sort((a, b) => a.ref.localeCompare(b.ref)));
        toast.success("SOP added");
      }
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Sop) {
    if (!confirm(`Delete SOP ${item.ref} — ${item.title}?`)) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const res = await fetch(`/api/sops/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setItems(initial);
      toast.error("Failed to delete");
    } else {
      toast.success("SOP deleted");
    }
  }

  async function handleDuplicate(original: Sop) {
    const nextRef = (() => {
      const nums = items
        .map((i) => i.ref)
        .filter((r) => /^SOP-\d+$/.test(r))
        .map((r) => parseInt(r.replace("SOP-", ""), 10))
        .filter((n) => !isNaN(n));
      const max = nums.length ? Math.max(...nums) : 0;
      return `SOP-${String(max + 1).padStart(3, "0")}`;
    })();

    const payload = {
      ref: nextRef,
      title: `${original.title} (copy)`,
      area: original.area,
      trigger: original.trigger,
      owner: original.owner,
      last_updated: null,
      what: original.what,
      good_looks_like: original.good_looks_like,
      steps: original.steps,
      prompt_template: original.prompt_template,
      applies_to: original.applies_to,
      review_date: null,
      linked_client: original.linked_client,
      source: original.source,
      status: "draft",
    };

    try {
      const res = await fetch("/api/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to duplicate");
      const created = await res.json();
      setItems((prev) => [...prev, created].sort((a, b) => a.ref.localeCompare(b.ref)));
      toast.success(`Duplicated as ${created.ref}`);
      setViewing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate");
    }
  }

  return (
    <HubCard padded={false}>
      <HubCardHeader
        icon={<IconFileText className="w-4 h-4" />}
        title="Standard Operating Procedures"
        subtitle="What it does · Trigger · Steps · Owner · What good looks like — one page per process."
        color="teal"
        action={
          <Button
            size="sm"
            className="gap-1.5 rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold"
            onClick={startAdd}
          >
            <IconPlus className="h-4 w-4" /> Add SOP
          </Button>
        }
        className="px-5 pt-5"
      />

      {showForm && (
        <div className="px-5 pb-5">
          <div className="mb-5 space-y-3 rounded-xl border border-[var(--hub-border)] p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Ref</Label>
                <Input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} placeholder="SOP-001" />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Client onboarding" />
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="General" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Owner</Label>
                <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Last updated</Label>
                <Input value={form.last_updated ?? ""} onChange={(e) => setForm({ ...form, last_updated: e.target.value || null })} placeholder="Jul 2026" />
              </div>
              <div className="space-y-2">
                <Label>Trigger</Label>
                <Input value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} placeholder="What starts this process" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Applies to</Label>
                <Input value={form.applies_to ?? ""} onChange={(e) => setForm({ ...form, applies_to: e.target.value || null })} placeholder="All active clients" />
              </div>
              <div className="space-y-2">
                <Label>Review date</Label>
                <Input value={form.review_date ?? ""} onChange={(e) => setForm({ ...form, review_date: e.target.value || null })} placeholder="01 Sep 2026" />
              </div>
              <div className="space-y-2">
                <Label>Linked client</Label>
                <Input value={form.linked_client ?? ""} onChange={(e) => setForm({ ...form, linked_client: e.target.value || null })} placeholder="Optional" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Source</Label>
                <Input value={form.source ?? ""} onChange={(e) => setForm({ ...form, source: e.target.value || null })} placeholder="e.g. Medical tracker" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="h-9 w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-3 text-sm text-foreground hover:border-[var(--hub-field-border-hover)] focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div />
            </div>
            <div className="space-y-2">
              <Label>What this process does</Label>
              <Textarea value={form.what} onChange={(e) => setForm({ ...form, what: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Steps (one per line)</Label>
              <Textarea
                value={form.steps.join("\n")}
                onChange={(e) => setForm({ ...form, steps: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                rows={5}
                placeholder={"1. Step one\n2. Step two"}
              />
            </div>
            <div className="space-y-2">
              <Label>What good looks like</Label>
              <Textarea value={form.good_looks_like} onChange={(e) => setForm({ ...form, good_looks_like: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Prompt template (optional)</Label>
              <Textarea value={form.prompt_template ?? ""} onChange={(e) => setForm({ ...form, prompt_template: e.target.value || null })} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button className="rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold" onClick={save} disabled={saving}>{editing ? "Save changes" : "Add SOP"}</Button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            icon={<IconFileText className="w-7 h-7" />}
            title="No SOPs yet"
            description="Write the three required SOPs: migrate a client, onboard a new client, build a plan in the hub."
          />
        </div>
      ) : (
        <div className="px-5 pb-5">
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-card)] p-4 hover:border-[var(--hub-field-border-hover)] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-teal">{item.ref}</span>
                    <p className="font-semibold text-foreground truncate">{item.title}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => setViewing(item)} aria-label={`View ${item.ref}`}><IconEye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(item)} aria-label={`Edit ${item.ref}`}><IconPencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-[var(--status-danger)]" onClick={() => remove(item)} aria-label={`Delete ${item.ref}`}><IconTrash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.what}</p>
                <p className="mt-2 text-xs text-muted-foreground">{item.steps.length} steps · Trigger: {item.trigger.length > 60 ? item.trigger.slice(0, 60) + "…" : item.trigger}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewing && (
        <SopDetailModal
          sop={viewing}
          onClose={() => setViewing(null)}
          onDuplicate={handleDuplicate}
        />
      )}
    </HubCard>
  );
}

// ─── SOP detail (read-only) ──────────────────────────────────────────────────

function SopDetailModal({ sop, onClose, onDuplicate }: { sop: Sop; onClose: () => void; onDuplicate: (sop: Sop) => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(16,24,40,.45)] p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`SOP detail ${sop.ref}`}
    >
      <div
        className="my-4 w-full max-w-[680px] overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--hub-border)] px-5 py-4">
          <div className="min-w-0">
            <span className="font-mono text-xs text-teal">{sop.ref}</span>
            <h2 className="truncate text-lg font-bold tracking-tight text-foreground">{sop.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => onDuplicate(sop)}>
              <IconCopy className="h-3.5 w-3.5" /> Duplicate
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
              <IconX className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-px bg-[var(--hub-border)] sm:grid-cols-3">
          <div className="bg-[var(--hub-card)] px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Owner</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{sop.owner}</p>
          </div>
          <div className="bg-[var(--hub-card)] px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Applies to</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{sop.applies_to ?? "—"}</p>
          </div>
          <div className="bg-[var(--hub-card)] px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Review date</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{sop.review_date ?? "—"}</p>
          </div>
          <div className="bg-[var(--hub-card)] px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Linked client</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{sop.linked_client ?? "—"}</p>
          </div>
          <div className="bg-[var(--hub-card)] px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Source</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{sop.source ?? "—"}</p>
          </div>
          <div className="bg-[var(--hub-card)] px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
            <p className="mt-1"><StatusBadge status={sop.status} /></p>
          </div>
        </div>

        <div className="divide-y divide-[var(--hub-border)]">
          <Section n={1} title="Purpose">
            <p className="m-0 text-sm text-muted-foreground">{sop.what}</p>
          </Section>

          <Section n={2} title="Scope">
            <p className="m-0 text-sm text-muted-foreground">{sop.trigger}</p>
          </Section>

          <Section n={3} title="Procedure">
            {sop.steps.length === 0 ? (
              <p className="m-0 text-sm text-muted-foreground">No steps recorded.</p>
            ) : (
              <ol className="m-0 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {sop.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}
          </Section>

          <Section n={4} title="What good looks like">
            <p className="m-0 text-sm text-muted-foreground">{sop.good_looks_like}</p>
          </Section>

          <Section n={5} title="Prompt template">
            {sop.prompt_template ? (
              <pre className="m-0 whitespace-pre-wrap rounded-lg border border-[var(--hub-border)] bg-[var(--hub-hover)] p-3 text-xs text-foreground">{sop.prompt_template}</pre>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">No prompt template.</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="grid h-[26px] w-[26px] place-items-center rounded-lg bg-[var(--status-primary-bg)] text-xs font-bold text-[var(--status-primary)]">
          {n}
        </span>
        <h3 className="m-0 text-[15px] font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Improvement Log ─────────────────────────────────────────────────────────

function LogSection({ initial }: { initial: ImprovementEntry[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<ImprovementEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const blank: Omit<ImprovementEntry, "id" | "created_at"> = {
    ref: "",
    title: "",
    entry_date: null,
    process_ref: null,
    broke: "",
    changed: "",
    result: "",
  };
  const [form, setForm] = useState(blank);

  function startAdd() {
    setEditing(null);
    setForm(blank);
    setShowForm(true);
  }
  function startEdit(item: ImprovementEntry) {
    setEditing(item);
    setForm({
      ref: item.ref,
      title: item.title,
      entry_date: item.entry_date,
      process_ref: item.process_ref,
      broke: item.broke,
      changed: item.changed,
      result: item.result,
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.ref.trim() || !form.title.trim() || !form.broke.trim() || !form.changed.trim() || !form.result.trim()) {
      toast.error("Ref, title, broke, changed and result are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/improvement-log/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update");
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === editing.id ? updated : i)));
        toast.success("Entry updated");
      } else {
        const res = await fetch("/api/improvement-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add");
        const created = await res.json();
        setItems((prev) => [...prev, created].sort((a, b) => a.ref.localeCompare(b.ref)));
        toast.success("Entry added");
      }
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: ImprovementEntry) {
    if (!confirm(`Delete entry ${item.ref} — ${item.title}?`)) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const res = await fetch(`/api/improvement-log/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setItems(initial);
      toast.error("Failed to delete");
    } else {
      toast.success("Entry deleted");
    }
  }

  return (
    <HubCard padded={false}>
      <HubCardHeader
        icon={<IconSparkles className="w-4 h-4" />}
        title="Improvement Log"
        subtitle="What broke · What changed · What the result was — the Kaizen loop without the ceremony."
        color="amber"
        action={
          <Button
            size="sm"
            className="gap-1.5 rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold"
            onClick={startAdd}
          >
            <IconPlus className="h-4 w-4" /> Log improvement
          </Button>
        }
        className="px-5 pt-5"
      />

      {showForm && (
        <div className="px-5 pb-5">
          <div className="mb-5 space-y-3 rounded-xl border border-[var(--hub-border)] p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Ref</Label>
                <Input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} placeholder="IL-001" />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Process ref</Label>
                <Input value={form.process_ref ?? ""} onChange={(e) => setForm({ ...form, process_ref: e.target.value || null })} placeholder="SOP-001 (optional)" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>What broke</Label>
                <Textarea value={form.broke} onChange={(e) => setForm({ ...form, broke: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>What changed</Label>
                <Textarea value={form.changed} onChange={(e) => setForm({ ...form, changed: e.target.value })} rows={3} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Result</Label>
              <Textarea value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button className="rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold" onClick={save} disabled={saving}>{editing ? "Save changes" : "Log improvement"}</Button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            icon={<IconSparkles className="w-7 h-7" />}
            title="No improvements logged yet"
            description="When something breaks and you fix it, log it here: what broke, what changed, what the result was."
          />
        </div>
      ) : (
        <div className="px-5 pb-5 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-[var(--hub-border)] bg-[var(--hub-card)] p-4 hover:border-[var(--hub-field-border-hover)] transition-colors">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-amber">{item.ref}</span>
                <span className="font-semibold text-foreground flex-1 truncate">{item.title}</span>
                {item.process_ref && <span className="font-mono text-xs text-muted-foreground">→ {item.process_ref}</span>}
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(item)} aria-label={`Edit ${item.ref}`}><IconPencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-[var(--status-danger)]" onClick={() => remove(item)} aria-label={`Delete ${item.ref}`}><IconTrash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--status-danger)]">What broke</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.broke}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-teal">What changed</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.changed}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-rose">Result</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.result}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </HubCard>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function OverviewSection({ data }: { data: OverviewData }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiTile
          statusToken="primary"
          icon={<IconUsers className="w-5 h-5" />}
          label="Onboarding complete"
          value={`${data.clearClients} / ${data.totalClients}`}
          trend={data.totalClients > 0 && data.clearClients === data.totalClients ? "100%" : undefined}
        />
        <KpiTile
          statusToken="success"
          icon={<IconCheckCircle className="w-5 h-5" />}
          label="Medical clearance valid"
          value={`${data.medicalClearanceValid} / ${data.totalClients}`}
        />
        <KpiTile
          statusToken={data.reviewsDue > 0 ? "warning" : "success"}
          icon={<IconClock className="w-5 h-5" />}
          label="Reviews due"
          value={data.reviewsDue}
        />
        <KpiTile
          statusToken="neutral"
          icon={<IconFileText className="w-5 h-5" />}
          label="SOPs current"
          value={data.sopCount}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <HubCard padded={false}>
          <HubCardHeader
            icon={<IconClipboardCheck className="w-4 h-4" />}
            title="Client onboarding process"
            subtitle="How every new client is set up"
            color="rose"
            divider
            className="px-5 pt-5"
          />
          <div className="divide-y divide-[var(--hub-border)]">
            <ProcessStep n={1} title="Consultation &amp; goals" desc="Initial call to capture medical history, goals and any referral letters." meta="Owner: Esther · forms: intake, PAR-Q" />
            <ProcessStep n={2} title="Medical screening" desc="Review GP referral or clearance; flag any red-flag conditions before programming." meta="Owner: Esther · source: Medical tracker" />
            <ProcessStep n={3} title="Baseline &amp; plan" desc="First session: movement screen, then the Plan Agent builds week 1." meta="Owner: Plan Agent (rules) → Esther sign-off" />
            <ProcessStep n={4} title="Weekly check-ins" desc="Client logs fatigue/pain; Esther reviews and adapts before the next session." meta="Owner: Client + Esther" />
            <ProcessStep n={5} title="Review every 6 weeks" desc="Progress review, programme refresh, and re-collect any expiring clearance." meta="Owner: Esther" isLast />
          </div>
        </HubCard>

        <HubCard padded={false}>
          <HubCardHeader
            icon={<IconShieldCheck className="w-4 h-4" />}
            title="Pre-session quality checks"
            subtitle="Safeguarding &amp; readiness"
            color="teal"
            divider
            className="px-5 pt-5"
          />
          <div className="divide-y divide-[var(--hub-border)]">
            <ChecklistRow
              checked={data.medicalClearanceValid === data.totalClients && data.totalClients > 0}
              title="Medical clearance valid"
              desc="GP letter on file and in date for cardiac / GP-referral clients."
              count={`${data.medicalClearanceValid} of ${data.totalClients}`}
            />
            <ChecklistRow
              checked={data.activeEquipment === data.totalEquipment && data.totalEquipment > 0}
              title="Equipment available"
              desc="Items are active and not flagged for maintenance."
              count={data.totalEquipment > 0 ? `${data.activeEquipment} of ${data.totalEquipment}` : "—"}
            />
            {data.clearanceAtRiskClients.map((c, i) => (
              <ChecklistRow
                key={`clearance-${i}`}
                checked={false}
                title={`${c.name} — clearance renewal`}
                desc={c.reason}
                count="Open"
                urgent={c.status === "do_not_train"}
              />
            ))}
            {data.overdueReviewClients.map((c, i) => (
              <ChecklistRow
                key={`overdue-${i}`}
                checked={false}
                title={`${c.name} — overdue review`}
                desc={`Annual review was due ${new Date(c.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`}
                count="Open"
                urgent
              />
            ))}
            {data.totalClients === 0 && data.totalEquipment === 0 && data.clearanceAtRiskClients.length === 0 && data.overdueReviewClients.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No client or equipment data loaded.
              </div>
            )}
          </div>
        </HubCard>
      </div>
    </div>
  );
}

function ProcessStep({ n, title, desc, meta, isLast }: { n: number; title: string; desc: string; meta: string; isLast?: boolean }) {
  return (
    <div className="flex gap-3.5 px-5 py-3.5 relative">
      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold bg-[var(--status-primary-bg)] text-[var(--status-primary)] z-[1]">
        {n}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-[13px] text-muted-foreground">{desc}</p>
        <p className="text-xs text-muted-foreground mt-1">{meta}</p>
      </div>
      {!isLast && <div className="absolute left-[20px] top-[42px] bottom-0 w-px bg-[var(--hub-section-border)]" />}
    </div>
  );
}

function ChecklistRow({ checked, title, desc, count, urgent }: { checked: boolean; title: string; desc: string; count: string; urgent?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div className={`w-5 h-5 rounded-md border shrink-0 flex items-center justify-center mt-px ${checked ? "bg-[var(--status-success)] border-[var(--status-success)] text-white" : "border-[var(--hub-field-border)]"}`}>
        {checked && <IconCheck className="w-3 h-3" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-foreground">{title}</p>
        <p className="text-[13px] text-muted-foreground">{desc}</p>
      </div>
      <span className={`shrink-0 text-xs font-semibold ml-auto ${urgent ? "text-[var(--status-danger)]" : "text-muted-foreground"}`}>{count}</span>
    </div>
  );
}
