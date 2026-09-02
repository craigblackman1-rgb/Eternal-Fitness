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
import { sessionHasNoExercises } from "@/lib/session-display";
import { ensureUids } from "@/lib/exercise-ref";
import type { SessionVersion } from "@/types";

interface TemplateOption {
  id: string;
  name: string;
  data: SessionVersion;
  archetypes: string[];
}

/** Shape of a session from the block overview list. */
interface SiblingSession {
  id: string;
  session_number: number;
  archetype: string | null;
  data: {
    focus_label?: string;
    versions?: {
      studio?: { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
      home?: { warm_up?: unknown[]; main_block?: unknown[]; cooldown?: unknown[] };
    };
  };
  scheduled_at: string | null;
}

interface AssignWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  blockId: string;
  siblingSessions: SiblingSession[];
}

function formatDate(iso: string | null): string {
  if (!iso) return "Not booked";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

type Tab = "templates" | "block";

export function AssignWorkoutDialog({
  open,
  onOpenChange,
  sessionId,
  blockId,
  siblingSessions,
}: AssignWorkoutDialogProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("templates");

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setAssigning(null);

    // Default to "From this block" when there are cloneable workouts
    const cloneableCount = siblingSessions.filter(
      (s) => s.id !== sessionId && !sessionHasNoExercises(s.data),
    ).length;
    setActiveTab(cloneableCount > 0 ? "block" : "templates");

    setLoadingTemplates(true);
    fetch("/api/workout-templates")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: TemplateOption[]) => setTemplates(list))
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, [open, sessionId, siblingSessions]);

  const filtered = search
    ? templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : templates;

  const cloneableSessions = siblingSessions.filter(
    (s) => s.id !== sessionId && !sessionHasNoExercises(s.data),
  );
  const filteredCloneable = search
    ? cloneableSessions.filter((s) => {
        const label = s.data?.focus_label || `Session ${s.session_number}`;
        return label.toLowerCase().includes(search.toLowerCase());
      })
    : cloneableSessions;

  const assignTemplate = async (template: TemplateOption) => {
    setAssigning(template.id);
    try {
      const sessionRes = await fetch(`/api/sessions/${sessionId}`);
      if (!sessionRes.ok) throw new Error("Could not load session");
      const session = await sessionRes.json();
      const current = session.data || {};
      const currentLabel: string = current.focus_label || "";
      const isOutlookOrEmpty =
        currentLabel === "" || currentLabel.startsWith("Outlook booking");

      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            ...current,
            versions: template.data,
            focus_label: isOutlookOrEmpty ? template.name : currentLabel,
            archetype: current.archetype || template.archetypes?.[0] || null,
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
    setAssigning(null);
  };

  const cloneFromSession = async (source: SiblingSession) => {
    setAssigning(source.id);
    try {
      // Fetch the full source session to get complete version data
      const sourceRes = await fetch(`/api/blocks/${blockId}/sessions?id=${source.id}`);
      if (!sourceRes.ok) throw new Error("Could not load source session");
      const sourceData = await sourceRes.json();

      const sourceVersions = sourceData.data?.versions as { studio?: SessionVersion; home?: SessionVersion } | undefined;
      if (!sourceVersions || sessionHasNoExercises(sourceData.data)) {
        throw new Error("Source session has no exercises to copy");
      }

      // Deep-copy versions and regenerate all exercise uids (BUG-EF-111)
      const sectionKeys = ["warm_up", "main_block", "cooldown"] as const;
      const freshVersions: { studio?: { warm_up: unknown[]; main_block: unknown[]; cooldown: unknown[] }; home?: { warm_up: unknown[]; main_block: unknown[]; cooldown: unknown[] } } = {};
      for (const verKey of ["studio", "home"] as const) {
        const src = sourceVersions[verKey];
        if (!src) continue;
        freshVersions[verKey] = {
          warm_up: ensureUids((src.warm_up ?? []) as { uid?: string }[], { forceNew: true }),
          main_block: ensureUids((src.main_block ?? []) as { uid?: string }[], { forceNew: true }),
          cooldown: ensureUids((src.cooldown ?? []) as { uid?: string }[], { forceNew: true }),
        };
      }

      const sourceName = source.data?.focus_label || `Session ${source.session_number}`;
      const sourceDate = formatDate(source.scheduled_at);

      // Load current session to preserve its non-exercise fields
      const sessionRes = await fetch(`/api/sessions/${sessionId}`);
      if (!sessionRes.ok) throw new Error("Could not load target session");
      const session = await sessionRes.json();
      const current = session.data || {};

      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            ...current,
            versions: freshVersions,
            focus_label: sourceName,
            archetype: source.archetype || current.archetype || null,
            coaching_notes: `Copied from ${sourceName} (${sourceDate})`,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to copy workout");
      }
      toast.success(`Copied "${sourceName}" to session`);
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to copy workout");
    }
    setAssigning(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[12px] shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-ink)]">Assign Workout to Session</DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        {cloneableSessions.length > 0 && (
          <div className="flex gap-1 rounded-lg bg-[var(--hub-hover)] p-0.5 -mt-1">
            <button
              type="button"
              onClick={() => { setActiveTab("block"); setSearch(""); }}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "block"
                  ? "bg-[var(--hub-card)] text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              From this block
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("templates"); setSearch(""); }}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "templates"
                  ? "bg-[var(--hub-card)] text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Templates
            </button>
          </div>
        )}

        <p className="text-sm text-muted-foreground -mt-1">
          {activeTab === "block"
            ? "Clone exercises from a previous workout in this block."
            : "Choose a template — its exercises will be applied to this existing session."}
        </p>

        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={activeTab === "block" ? "Search workouts..." : "Search templates..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-[var(--hub-field-border)] hover:border-[var(--hub-field-border-hover)] focus:border-rose focus:ring-2 focus:ring-rose/20 bg-[var(--hub-card)]"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {activeTab === "block" ? (
            loadingTemplates ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : filteredCloneable.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {cloneableSessions.length === 0
                  ? "No previous workouts in this block to copy from."
                  : "No workouts match your search."}
              </p>
            ) : (
              filteredCloneable.map((s) => {
                const label = s.data?.focus_label || `Session ${s.session_number}`;
                const isAssigningThis = assigning === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => cloneFromSession(s)}
                    disabled={assigning !== null}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--hub-hover)] transition-colors flex items-center gap-3 disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-md bg-[var(--status-success-bg)] text-teal flex items-center justify-center shrink-0">
                      <IconDumbbell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.archetype ? `${s.archetype} · ` : ""}{formatDate(s.scheduled_at)}
                      </p>
                    </div>
                    {isAssigningThis && <span className="text-xs text-muted-foreground shrink-0">Copying...</span>}
                  </button>
                );
              })
            )
          ) : (
            loadingTemplates ? (
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
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
