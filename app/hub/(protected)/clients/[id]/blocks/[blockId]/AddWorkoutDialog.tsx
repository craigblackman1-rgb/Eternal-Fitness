"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { IconSearch, IconDumbbell } from "@/components/icons";
import { toast } from "sonner";
import { MAX_BLOCK_WEEKS, type SessionVersion } from "@/types";

interface TemplateOption {
  id: string;
  name: string;
  data: SessionVersion;
  archetypes: string[];
}

interface AddWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockId: string;
  weeks: number[];
  /** CR-EF-122 — when set, the new session is created as a sub-session
   *  attached to this parent. The sub-session inherits the parent's
   *  scheduled_at and is excluded from the pot count. */
  parentSessionId?: string;
}

export function AddWorkoutDialog({ open, onOpenChange, blockId, weeks, parentSessionId }: AddWorkoutDialogProps) {
  const router = useRouter();
  const [week, setWeek] = useState<number>(weeks[weeks.length - 1] ?? 1);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [search, setSearch] = useState("");
  const [adding, setAddingId] = useState<string | null>(null);

  const weekOptions = Array.from(new Set([...weeks, ...(weeks.length && weeks[weeks.length - 1] < MAX_BLOCK_WEEKS ? [weeks[weeks.length - 1] + 1] : weeks.length === 0 ? [1] : [])])).sort(
    (a, b) => a - b
  );

  useEffect(() => {
    if (!open) return;
    setWeek(weeks[weeks.length - 1] ?? 1);
    setSearch("");
    setLoadingTemplates(true);
    fetch("/api/workout-templates")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: TemplateOption[]) => setTemplates(list))
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = search
    ? templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : templates;

  const addFromTemplate = async (template: TemplateOption) => {
    setAddingId(template.id);
    try {
      const body: Record<string, unknown> = { template_id: template.id, week };
      // CR-EF-122 — attach as a sub-session when targeting an existing slot
      if (parentSessionId) body.parent_session_id = parentSessionId;
      const res = await fetch(`/api/blocks/${blockId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add workout");
      }
      toast.success(parentSessionId ? `Added "${template.name}" as supplementary work` : `Added "${template.name}" to Week ${week}`);
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add workout");
    }
    setAddingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[12px] shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-ink)]">
            {parentSessionId ? "Add supplementary work" : "Add Workout from Template"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          {parentSessionId
            ? "Choose a template — it will be attached as supplementary work to the existing session."
            : "Choose a template — it's appended as a new session in this block."}
        </p>

        {!parentSessionId && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="awWeek" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Week
            </label>
            <select
              id="awWeek"
              value={week}
              onChange={(e) => setWeek(parseInt(e.target.value))}
              className="w-full rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:border-rose focus:ring-[3px] focus:ring-rose/30"
            >
              {weekOptions.map((w) => (
                <option key={w} value={w}>
                  Week {w}
                  {!weeks.includes(w) ? " (new)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-[var(--hub-field-border)] hover:border-[var(--hub-field-border-hover)] focus:border-rose focus:ring-2 focus:ring-rose/20 bg-[var(--hub-card)]"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {loadingTemplates ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading templates...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {templates.length === 0 ? "No templates saved yet. Save one from a session first." : "No templates match your search."}
            </p>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => addFromTemplate(t)}
                disabled={adding !== null}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--hub-hover)] transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-md bg-[var(--status-success-bg)] text-teal flex items-center justify-center shrink-0">
                  <IconDumbbell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                  {t.archetypes?.length > 0 && (
                    <p className="text-xs text-muted-foreground">{t.archetypes.join(", ")}</p>
                  )}
                </div>
                {adding === t.id && <span className="text-xs text-muted-foreground shrink-0">Adding...</span>}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
