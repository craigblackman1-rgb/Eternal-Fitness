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
import type { SessionVersion } from "@/types";

interface TemplateOption {
  id: string;
  name: string;
  data: SessionVersion;
  archetypes: string[];
}

interface AssignWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

export function AssignWorkoutDialog({ open, onOpenChange, sessionId }: AssignWorkoutDialogProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [search, setSearch] = useState("");
  const [assigning, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setLoadingTemplates(true);
    fetch("/api/workout-templates")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: TemplateOption[]) => setTemplates(list))
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, [open]);

  const filtered = search
    ? templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : templates;

  const assignTemplate = async (template: TemplateOption) => {
    setAssigningId(template.id);
    try {
      const sessionRes = await fetch(`/api/sessions/${sessionId}`);
      if (!sessionRes.ok) throw new Error("Could not load session");
      const session = await sessionRes.json();
      const current = session.data || {};

      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            ...current,
            versions: template.data,
            focus_label: current.focus_label || template.name,
            coaching_notes: `Assigned from template: ${template.name}`,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to assign workout");
      }
      toast.success(`Assigned "${template.name}" to session`);
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign workout");
    }
    setAssigningId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[12px] shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-ink)]">Assign Workout to Session</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Choose a template — its exercises will be applied to this existing session.
        </p>

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
                onClick={() => assignTemplate(t)}
                disabled={assigning !== null}
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
                {assigning === t.id && <span className="text-xs text-muted-foreground shrink-0">Assigning...</span>}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
