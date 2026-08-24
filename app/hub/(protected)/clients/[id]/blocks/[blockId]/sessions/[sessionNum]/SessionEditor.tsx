"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu as SkeletonMenu,
  DropdownMenuContent as SkeletonMenuContent,
  DropdownMenuItem as SkeletonMenuItem,
  DropdownMenuTrigger as SkeletonMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconGripVertical,
  IconChevronUp,
  IconChevronDown,
  IconCheck,
  IconEllipsis,
  IconTrash2,
  IconMove,
  IconPlus,
  IconSave,
  IconX,
  IconVideo,
  IconRefreshCw,
  IconCopy,
  IconSearch,
  IconDumbbell,
  IconClock,
} from "@/components/icons";
import type { Exercise, SessionVersion } from "@/types";
import type { ExerciseEntry } from "@/app/hub/(protected)/exercises/page";
import { SwapExerciseDialog } from "../swap-exercise-dialog";
import { AddExerciseDialog, type InsertPositionOption } from "../add-exercise-dialog";
import { toast } from "sonner";
import { HubCard } from "@/components/hub/HubCard";
import { computeGroups, nextGroupLabel, normalizeGroups, type ExerciseGroup } from "@/lib/exercise-groups";
import { ensureUids } from "@/lib/exercise-ref";

type SectionKey = "warm_up" | "main_block" | "cooldown";

const SECTION_DEFS: { key: SectionKey; label: string }[] = [
  { key: "warm_up", label: "Warm-up" },
  { key: "main_block", label: "Main Block" },
  { key: "cooldown", label: "Cooldown" },
];
const SECTION_LABEL: Record<SectionKey, string> = {
  warm_up: "Warm-up",
  main_block: "Main Block",
  cooldown: "Cooldown",
};

type EditableExercise = Exercise & { _uid: string };
type SectionsState = Record<SectionKey, EditableExercise[]>;

function withUids(exercises: Exercise[], opts?: { forceNew?: boolean }): EditableExercise[] {
  return ensureUids(exercises, opts).map((ex) => ({ ...ex, _uid: ex.uid }));
}

function stripUids(exercises: EditableExercise[]): Exercise[] {
  return exercises.map(({ _uid, ...rest }) => ({ ...rest, uid: _uid }));
}

function computeBlocks(list: EditableExercise[], allowGroups: boolean) {
  return computeGroups(list, { allowGroups }).map((g) => ({
    ...g,
    key: g.type === "group" && g.label ? `grp:${g.label}:${g.items[0]._uid}` : g.items[0]._uid,
  }));
}

/** Preset set/rep/tempo/rest structures — "Volume Skeletons". Selecting one when
 *  adding an exercise pre-fills the numeric prescription, leaving only the exercise
 *  name to pick. Hardcoded for now (per WO decide-yourself: add a table only if
 *  Esther asks to customise these herself). */
const VOLUME_SKELETONS = [
  { key: "elite_strength", label: "Elite Strength", sub: "4 × 6", sets: 4, reps: "6", tempo: "3-1-1", rest: "120s" },
  { key: "hypertrophy", label: "Hypertrophy", sub: "3 × 10", sets: 3, reps: "10", tempo: "2-0-2", rest: "60s" },
  { key: "endurance_flow", label: "Endurance / Flow", sub: "3 × 15", sets: 3, reps: "15", tempo: "Controlled", rest: "30s" },
  { key: "power", label: "Power", sub: "3 × 5", sets: 3, reps: "5", tempo: "Explosive", rest: "120s" },
] as const;
type VolumeSkeleton = (typeof VOLUME_SKELETONS)[number];

interface LatestCompletedSession {
  session_id: string;
  session_number: number;
  block_number: number;
  week: number;
  completed_at: string | null;
  versions: { studio?: SessionVersion; home?: SessionVersion };
}

/** Desk-planning editor for a single session prescription (one version — studio or home).
 *  Local-only state until "Save changes" — Discard just unmounts without persisting. */
export function SessionEditor({
  version,
  data,
  clientId,
  sessionId,
  onSaved,
  onCancel,
}: {
  version: "studio" | "home";
  data: SessionVersion;
  /** Needed to look up this client's most recent completed session for "Roll Over
   *  Previous Session" — excludes the session currently being edited. */
  clientId: string;
  sessionId: string;
  /** Parent owns the actual PATCH (it merges this version's sections back into
   *  session.data.versions and updates the session state) — returns whether it succeeded. */
  onSaved: (updated: SessionVersion) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [sections, setSections] = useState<SectionsState>(() => ({
    warm_up: withUids(data.warm_up || []),
    main_block: withUids(data.main_block || []),
    cooldown: withUids(data.cooldown || []),
  }));
  const [saving, setSaving] = useState(false);
  const [addTarget, setAddTarget] = useState<SectionKey | null>(null);
  const [swapTarget, setSwapTarget] = useState<{ section: SectionKey; uid: string } | null>(null);
  const [videoOpenUid, setVideoOpenUid] = useState<string | null>(null);
  const [videoDraft, setVideoDraft] = useState("");
  const [imageOpenUid, setImageOpenUid] = useState<string | null>(null);
  const [imageDraft, setImageDraft] = useState("");
  const [dragBlockKey, setDragBlockKey] = useState<string | null>(null);
  const [dragSection, setDragSection] = useState<SectionKey | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateList, setTemplateList] = useState<{ id: string; name: string; data: SessionVersion }[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [overBlockKey, setOverBlockKey] = useState<string | null>(null);
  const [rollingOver, setRollingOver] = useState(false);
  const [addSkeleton, setAddSkeleton] = useState<VolumeSkeleton | null>(null);
  const [grpPicked, setGrpPicked] = useState<Record<string, boolean>>({});

  // Resolve exercise thumbnails/video links by name from the exercises library.
  // AI-generated / rolled-over prescriptions never embed media, so fetch the
  // library once on mount and backfill only the exercises still missing an
  // image or video — manually attached media is left untouched.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/exercises")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load exercises");
        const library = (await res.json()) as ExerciseEntry[];
        if (cancelled) return;
        const imageByName = new Map<string, string>();
        const videoByName = new Map<string, string>();
        for (const entry of library) {
          const key = entry.name.toLowerCase();
          if (entry.image_url && !imageByName.has(key)) imageByName.set(key, entry.image_url);
          if (entry.video_url && !videoByName.has(key)) videoByName.set(key, entry.video_url);
        }
        setSections((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const key of SECTION_DEFS.map((s) => s.key)) {
            next[key] = prev[key].map((ex) => {
              const name = (ex.exercise_name ?? "").toLowerCase();
              const existing = ex.media ?? {};
              const image_url = existing.image_url || imageByName.get(name);
              const video_url = existing.video_url || videoByName.get(name);
              if (image_url === existing.image_url && video_url === existing.video_url) return ex;
              changed = true;
              return {
                ...ex,
                media: {
                  ...existing,
                  ...(image_url ? { image_url } : {}),
                  ...(video_url ? { video_url } : {}),
                },
              };
            });
          }
          return changed ? next : prev;
        });
      })
      .catch(() => {
        // Library fetch failed — the editor still works, just without thumbnails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (sectionKey: SectionKey, uid: string, field: "sets" | "reps" | "tempo" | "rest", value: string) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((e) =>
        e._uid === uid ? { ...e, [field]: field === "sets" ? Number(value) || 0 : value } : e
      ),
    }));
  };

  const setLogType = (sectionKey: SectionKey, uid: string, logType: "reps" | "time") => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((e) =>
        e._uid === uid ? { ...e, log_type: logType } : e
      ),
    }));
  };

  const updateEquipment = (sectionKey: SectionKey, uid: string, equipment: string[]) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((e) =>
        e._uid === uid ? { ...e, equipment } : e
      ),
    }));
  };

  const moveWithinSection = (sectionKey: SectionKey, uid: string, dir: 1 | -1) => {
    setSections((prev) => {
      const list = [...prev[sectionKey]];
      const i = list.findIndex((e) => e._uid === uid);
      if (i < 0) return prev;
      const e = list[i];
      const allowGroups = sectionKey === "main_block";
      if (allowGroups && e.group_label) {
        const j = i + dir;
        if (j < 0 || j >= list.length || list[j].group_label !== e.group_label) return prev;
        [list[i], list[j]] = [list[j], list[i]];
      } else {
        let j = i + dir;
        if (j < 0 || j >= list.length) return prev;
        if (allowGroups && list[j].group_label) {
          const g = list[j].group_label;
          let k = j;
          while (k >= 0 && k < list.length && list[k].group_label === g) k += dir;
          j = k;
          if (j < 0 || j >= list.length) return prev;
        }
        list.splice(i, 1);
        list.splice(j, 0, e);
      }
      return { ...prev, [sectionKey]: list };
    });
  };

  const reorderSection = (sectionKey: SectionKey, draggedKey: string, targetKey: string, pos: "before" | "after") => {
    if (draggedKey === targetKey) return;
    setSections((prev) => {
      const allowGroups = sectionKey === "main_block";
      const blocks = computeBlocks(prev[sectionKey], allowGroups);
      const fromIdx = blocks.findIndex((b) => b.key === draggedKey);
      let toIdx = blocks.findIndex((b) => b.key === targetKey);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return prev;
      const [moved] = blocks.splice(fromIdx, 1);
      if (fromIdx < toIdx) toIdx -= 1;
      const insertAt = pos === "before" ? toIdx : toIdx + 1;
      blocks.splice(insertAt, 0, moved);
      const newList = blocks.flatMap((b) => b.items);
      return { ...prev, [sectionKey]: newList };
    });
  };

  const moveToSection = (fromSection: SectionKey, uid: string, toSection: SectionKey) => {
    setSections((prev) => {
      const fromList = [...prev[fromSection]];
      const idx = fromList.findIndex((e) => e._uid === uid);
      if (idx < 0) return prev;
      const [moved] = fromList.splice(idx, 1);
      const wasGrouped = Boolean(moved.group_label);
      const movedClean: EditableExercise = { ...moved, group_label: undefined };
      const toList = [...prev[toSection], movedClean];
      let next: SectionsState = { ...prev, [fromSection]: fromList, [toSection]: toList };
      const norm = normalizeGroups(next.main_block);
      next = { ...next, main_block: norm.list };
      if (wasGrouped || norm.dissolved.length > 0) {
        toast.message(`Moved "${moved.exercise_name}" to ${SECTION_LABEL[toSection]} — the superset was resolved, the remaining exercise now stands alone.`);
      } else {
        toast.message(`Moved "${moved.exercise_name}" to ${SECTION_LABEL[toSection]}.`);
      }
      return next;
    });
  };

  const moveBlockAcrossSections = (fromSection: SectionKey, draggedKey: string, toSection: SectionKey, targetKey: string, pos: "before" | "after") => {
    setSections((prev) => {
      const fromAllow = fromSection === "main_block";
      const fromBlocks = computeBlocks(prev[fromSection], fromAllow);
      const fromIdx = fromBlocks.findIndex((b) => b.key === draggedKey);
      if (fromIdx < 0) return prev;

      const toAllow = toSection === "main_block";
      const toBlocks = computeBlocks(prev[toSection], toAllow);
      const toIdx = toBlocks.findIndex((b) => b.key === targetKey);
      if (toIdx < 0) return prev;

      const block = fromBlocks[fromIdx];
      const wasGroup = block.type === "group";
      const movedItems = block.items.map((e) => ({ ...e, group_label: undefined as string | undefined }));

      const uidSet = new Set(block.items.map((e) => e._uid));
      const fromList = prev[fromSection].filter((e) => !uidSet.has(e._uid));

      const targetBlock = toBlocks[toIdx];
      const lastUid = targetBlock.items[targetBlock.items.length - 1]._uid;
      const toList = [...prev[toSection]];
      const afterIdx = toList.findIndex((e) => e._uid === lastUid);
      const insertIdx = pos === "before" ? afterIdx - (targetBlock.items.length - 1) : afterIdx + 1;
      toList.splice(insertIdx, 0, ...movedItems);

      let next: SectionsState = { ...prev, [fromSection]: fromList, [toSection]: toList };
      const norm = normalizeGroups(next.main_block);
      next = { ...next, main_block: norm.list };

      const label = wasGroup ? `${block.items.length} exercises` : `"${block.items[0].exercise_name}"`;
      toast.message(`Moved ${label} to ${SECTION_LABEL[toSection]}.${wasGroup ? " The superset was resolved." : ""}`);
      return next;
    });
  };

  const removeExercise = (sectionKey: SectionKey, uid: string) => {
    setSections((prev) => {
      const list = [...prev[sectionKey]];
      const idx = list.findIndex((e) => e._uid === uid);
      if (idx < 0) return prev;
      const [removed] = list.splice(idx, 1);
      const wasGrouped = Boolean(removed.group_label);
      let next: SectionsState = { ...prev, [sectionKey]: list };
      const norm = normalizeGroups(next.main_block);
      next = { ...next, main_block: norm.list };
      toast.message(
        `Removed "${removed.exercise_name}" from the session.` +
          (wasGrouped || norm.dissolved.length > 0 ? " The superset was resolved — the remaining exercise now stands alone." : "")
      );
      return next;
    });
  };

  const togglePick = (uid: string) => {
    setGrpPicked((prev) => {
      if (prev[uid]) {
        const next = { ...prev };
        delete next[uid];
        return next;
      }
      return { ...prev, [uid]: true };
    });
  };

  const handleGroup = () => {
    const pickedUids = Object.keys(grpPicked).filter((uid) => grpPicked[uid]);
    if (pickedUids.length < 2) return;
    const pickedSet = new Set(pickedUids);
    const targets = sections.main_block.filter((e) => pickedSet.has(e._uid));
    if (targets.length < 2) return;
    const label = nextGroupLabel(sections.main_block);
    setSections((prev) => ({
      ...prev,
      main_block: prev.main_block.map((e) =>
        pickedSet.has(e._uid) ? { ...e, group_label: label } : e
      ),
    }));
    setGrpPicked({});
    toast.success(`${targets.length} exercises grouped as ${label}.`);
  };

  const handleUngroup = (groupLabel: string) => {
    setSections((prev) => {
      const next = {} as SectionsState;
      for (const key of SECTION_DEFS.map((s) => s.key)) {
        next[key] = prev[key].map((e) =>
          e.group_label === groupLabel ? { ...e, group_label: undefined } : e
        );
      }
      return next;
    });
    toast.success(`Superset ${groupLabel} ungrouped.`);
  };

  const addExercise = (entry: ExerciseEntry, insertIndex: number) => {
    if (!addTarget) return;
    const newEx: EditableExercise = {
      _uid: crypto.randomUUID(),
      exercise_name: entry.name,
      sets: addSkeleton?.sets ?? 2,
      reps: addSkeleton?.reps ?? "10",
      tempo: addSkeleton?.tempo ?? "Controlled",
      rest: addSkeleton?.rest ?? "45s",
      coaching_cue: entry.coaching_cue || "",
      modification: entry.default_mod || "",
      equipment: entry.equipment || [],
      media:
        entry.video_url || entry.image_url
          ? { video_url: entry.video_url || undefined, image_url: entry.image_url || undefined }
          : undefined,
    };
    setSections((prev) => {
      const list = [...prev[addTarget]];
      list.splice(insertIndex, 0, newEx);
      return { ...prev, [addTarget]: list };
    });
    toast.message(
      addSkeleton
        ? `Added "${entry.name}" to ${SECTION_LABEL[addTarget]} — ${addSkeleton.label} (${addSkeleton.sub}).`
        : `Added "${entry.name}" to ${SECTION_LABEL[addTarget]}.`
    );
    setAddTarget(null);
    setAddSkeleton(null);
  };

  const rollOverPreviousSession = async () => {
    setRollingOver(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/sessions/latest-completed?exclude=${sessionId}`);
      if (!res.ok) {
        toast.error("Failed to look up the previous session");
        return;
      }
      const prev: LatestCompletedSession | null = await res.json();
      if (!prev) {
        toast.message("No previous completed session found for this client yet.");
        return;
      }
      const rolled = prev.versions[version];
      if (!rolled || (rolled.warm_up.length === 0 && rolled.main_block.length === 0 && rolled.cooldown.length === 0)) {
        toast.message(`The most recent completed session has no ${version} prescription to roll forward.`);
        return;
      }
      setSections({
        warm_up: withUids(rolled.warm_up || [], { forceNew: true }),
        main_block: withUids(rolled.main_block || [], { forceNew: true }),
        cooldown: withUids(rolled.cooldown || [], { forceNew: true }),
      });
      const when = prev.completed_at
        ? new Date(prev.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : "an earlier date";
      toast.success(`Rolled forward from Week ${prev.week}, Session ${prev.session_number} (completed ${when}) — sets/reps/tempo/cues carried over, edit as needed.`);
    } catch {
      toast.error("Failed to roll over the previous session");
    } finally {
      setRollingOver(false);
    }
  };

  const swapExercise = (entry: ExerciseEntry) => {
    if (!swapTarget) return;
    setSections((prev) => ({
      ...prev,
      [swapTarget.section]: prev[swapTarget.section].map((e) =>
        e._uid === swapTarget.uid
          ? {
              ...e,
              exercise_name: entry.name,
              coaching_cue: entry.coaching_cue || "",
              modification: entry.default_mod || "",
              equipment: entry.equipment || [],
              media:
                entry.video_url || entry.image_url
                  ? { ...e.media, ...(entry.image_url ? { image_url: entry.image_url } : {}), ...(entry.video_url ? { video_url: entry.video_url } : {}) }
                  : e.media,
            }
          : e
      ),
    }));
    toast.message(`Swapped to "${entry.name}".`);
    setSwapTarget(null);
  };

  const saveVideo = (sectionKey: SectionKey, uid: string) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((e) =>
        e._uid === uid ? { ...e, media: { ...e.media, video_url: videoDraft.trim() || undefined } } : e
      ),
    }));
    setVideoOpenUid(null);
    setVideoDraft("");
  };

  const saveImage = (sectionKey: SectionKey, uid: string) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((e) =>
        e._uid === uid ? { ...e, media: { ...e.media, image_url: imageDraft.trim() || undefined } } : e
      ),
    }));
    setImageOpenUid(null);
    setImageDraft("");
  };

  const handleSave = async () => {
    setSaving(true);
    const updated: SessionVersion = {
      warm_up: stripUids(sections.warm_up),
      main_block: stripUids(sections.main_block),
      cooldown: stripUids(sections.cooldown),
    };
    const ok = await onSaved(updated);
    setSaving(false);
    if (!ok) toast.error("Failed to save session");
  };

  const openTemplatePicker = async () => {
    setLoadingTemplates(true);
    setShowTemplatePicker(true);
    setTemplateSearch("");
    try {
      const res = await fetch("/api/workout-templates");
      if (res.ok) {
        const list = await res.json();
        setTemplateList(list.map((t: { id: string; name: string; data: SessionVersion }) => ({ id: t.id, name: t.name, data: t.data })));
      }
    } catch { /* ignore */ }
    setLoadingTemplates(false);
  };

  const applyTemplate = (tmpl: { id: string; name: string; data: SessionVersion }) => {
    setSections({
      warm_up: withUids(tmpl.data.warm_up || [], { forceNew: true }),
      main_block: withUids(tmpl.data.main_block || [], { forceNew: true }),
      cooldown: withUids(tmpl.data.cooldown || [], { forceNew: true }),
    });
    setShowTemplatePicker(false);
    toast.success(`Applied template "${tmpl.name}"`);
    fetch(`/api/workout-templates/${tmpl.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "increment_usage" }),
    });
  };

  const filteredTemplates = templateSearch
    ? templateList.filter((t) => t.name.toLowerCase().includes(templateSearch.toLowerCase()))
    : templateList;

  const pickedCount = Object.keys(grpPicked).length;

  return (
    <div className="space-y-4">
      <HubCard padded={false} className="flex items-center justify-between px-4 py-3">
        <p className="text-sm text-muted-foreground">Editing the {version === "studio" ? "Studio" : "Home"} prescription — saves to this session only.</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={rollOverPreviousSession}
            disabled={saving || rollingOver}
            className="rounded-lg gap-1.5"
            title="Pull this client's most recently completed session forward into this one — sets, reps, tempo, and cues carried over, ready for micro-progression edits."
          >
            <IconClock className="h-4 w-4" />
            {rollingOver ? "Rolling over…" : "Roll Over Previous Session"}
          </Button>
          <Button variant="outline" size="sm" onClick={openTemplatePicker} disabled={saving} className="rounded-lg gap-1.5">
            <IconCopy className="h-4 w-4" />
            Apply template
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving} className="rounded-lg gap-1.5">
            <IconX className="h-4 w-4" />
            Discard
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-lg gap-1.5 bg-rose hover:bg-rose/90 text-white">
            <IconSave className="h-4 w-4" />
            Save changes
          </Button>
        </div>
      </HubCard>

      {SECTION_DEFS.map((sec) => {
        const list = sections[sec.key];
        const allowGroups = sec.key === "main_block";
        const blocks = computeBlocks(list, allowGroups);

        const positionOptions: InsertPositionOption[] = [
          { index: 0, label: "At the beginning" },
          ...blocks.map((b, i) => {
            const lastUid = b.items[b.items.length - 1]._uid;
            const insertIndex = list.findIndex((e) => e._uid === lastUid) + 1;
            const label = b.type === "group" ? `After Superset ${b.label}` : `After ${b.items[0].exercise_name}`;
            return { index: insertIndex, label };
          }),
        ];

        return (
          <HubCard key={sec.key} padded={false}>
            <div className="flex items-center justify-between border-b border-[var(--hub-border)] px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{sec.label}</p>
              <span className="text-xs text-muted-foreground">
                {list.length} exercise{list.length === 1 ? "" : "s"}
              </span>
            </div>
            {sec.key === "main_block" && pickedCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hub-border)] bg-rose/5 px-4 py-2">
                <span className="text-xs font-semibold text-rose">
                  {pickedCount} exercise{pickedCount === 1 ? "" : "s"} selected — combine into a superset
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGrpPicked({})}
                    className="h-7 rounded-lg px-2 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleGroup}
                    disabled={pickedCount < 2}
                    className="h-7 rounded-lg bg-rose px-2 text-xs text-white hover:bg-rose/90"
                  >
                    Group as superset
                  </Button>
                </div>
              </div>
            )}
            <div
              className={`space-y-2 p-3 rounded-[12px] transition-colors ${dragSection && dragSection !== sec.key ? "bg-[var(--hub-sidebar-active)] outline outline-2 outline-dashed outline-rose/20" : ""}`}
              onDragOver={(e) => {
                if (dragSection && dragSection !== sec.key) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragBlockKey && dragSection && dragSection !== sec.key && blocks.length === 0) {
                  setSections((prev) => {
                    const fromAllow = dragSection === "main_block";
                    const fromBlocks = computeBlocks(prev[dragSection], fromAllow);
                    const fromIdx = fromBlocks.findIndex((b) => b.key === dragBlockKey);
                    if (fromIdx < 0) return prev;
                    const block = fromBlocks[fromIdx];
                    const wasGroup = block.type === "group";
                    const movedItems = block.items.map((e) => ({ ...e, group_label: undefined as string | undefined }));
                    const uidSet = new Set(block.items.map((e) => e._uid));
                    const fromList = prev[dragSection].filter((e) => !uidSet.has(e._uid));
                    const toList = [...prev[sec.key], ...movedItems];
                    let next: SectionsState = { ...prev, [dragSection]: fromList, [sec.key]: toList };
                    const norm = normalizeGroups(next.main_block);
                    next = { ...next, main_block: norm.list };
                    const label = wasGroup ? `${block.items.length} exercises` : `"${block.items[0].exercise_name}"`;
                    toast.message(`Moved ${label} to ${SECTION_LABEL[sec.key]}.${wasGroup ? " The superset was resolved." : ""}`);
                    return next;
                  });
                  setDragBlockKey(null);
                  setDragSection(null);
                  setOverBlockKey(null);
                }
              }}
            >
              {blocks.length === 0 && (
                <p className="rounded-[12px] border border-dashed border-[var(--hub-border)] py-4 text-center text-sm text-muted-foreground">
                  No exercises in {sec.label.toLowerCase()} yet.
                </p>
              )}
              {blocks.map((block) =>
                block.type === "group" ? (
                  <div
                    key={block.key}
                    draggable
                    onDragStart={() => {
                      setDragBlockKey(block.key);
                      setDragSection(sec.key);
                    }}
                    onDragEnd={() => {
                      setDragBlockKey(null);
                      setDragSection(null);
                      setOverBlockKey(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOverBlockKey(block.key);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragBlockKey) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
                        if (dragSection && dragSection !== sec.key) {
                          moveBlockAcrossSections(dragSection, dragBlockKey, sec.key, block.key, pos);
                        } else {
                          reorderSection(sec.key, dragBlockKey, block.key, pos);
                        }
                      }
                      setDragBlockKey(null);
                      setDragSection(null);
                      setOverBlockKey(null);
                    }}
                    className={`rounded-[12px] border-[1.5px] border-[var(--status-primary-border)] bg-[var(--status-primary-bg)] p-2.5 ${
                      dragBlockKey === block.key ? "opacity-40" : ""
                    } ${overBlockKey === block.key && dragBlockKey !== block.key ? "ring-2 ring-rose/40" : ""}`}
                  >
                    <div className="mb-2 flex items-center gap-2 px-0.5">
                      <span className="cursor-grab text-[var(--hub-field-border)]" title="Drag the whole superset to reorder">
                        <IconGripVertical className="h-4 w-4" />
                      </span>
                      <span className="inline-flex items-center rounded-full border border-rose/20 bg-white/60 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose">
                        Superset {block.label}
                      </span>
                      <span className="text-[11.5px] text-rose">{block.items.length} exercises performed together</span>
                      <button
                        type="button"
                        onClick={() => handleUngroup(block.label!)}
                        aria-label={`Ungroup ${block.label}`}
                        title="Ungroup this superset — the exercises stay in the session as standalone rows"
                        className="ml-auto inline-flex h-6 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-rose transition-colors hover:bg-rose/10"
                      >
                        <svg
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        Ungroup
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {block.items.map((ex, i) => (
                        <ExerciseRow
                          key={ex._uid}
                          ex={ex}
                          sectionKey={sec.key}
                          inGroup
                          isFirst={i === 0}
                          isLast={i === block.items.length - 1}
                          onField={updateField}
                          onSetLogType={setLogType}
                          onMoveWithin={moveWithinSection}
                          onMoveTo={moveToSection}
                          onRemove={removeExercise}
                          onSwap={(section, uid) => setSwapTarget({ section, uid })}
                          onUpdateEquipment={updateEquipment}
                          videoOpenUid={videoOpenUid}
                          videoDraft={videoDraft}
                          setVideoOpenUid={setVideoOpenUid}
                          setVideoDraft={setVideoDraft}
                          onSaveVideo={saveVideo}
                          imageOpenUid={imageOpenUid}
                          imageDraft={imageDraft}
                          setImageOpenUid={setImageOpenUid}
                          setImageDraft={setImageDraft}
                          onSaveImage={saveImage}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    key={block.key}
                    draggable
                    onDragStart={() => {
                      setDragBlockKey(block.key);
                      setDragSection(sec.key);
                    }}
                    onDragEnd={() => {
                      setDragBlockKey(null);
                      setDragSection(null);
                      setOverBlockKey(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOverBlockKey(block.key);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragBlockKey) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
                        if (dragSection && dragSection !== sec.key) {
                          moveBlockAcrossSections(dragSection, dragBlockKey, sec.key, block.key, pos);
                        } else {
                          reorderSection(sec.key, dragBlockKey, block.key, pos);
                        }
                      }
                      setDragBlockKey(null);
                      setDragSection(null);
                      setOverBlockKey(null);
                    }}
                    className={`${dragBlockKey === block.key ? "opacity-40" : ""} ${
                      overBlockKey === block.key && dragBlockKey !== block.key ? "ring-2 ring-rose/40 rounded-[12px]" : ""
                    }`}
                  >
                    <ExerciseRow
                      ex={block.items[0]}
                      sectionKey={sec.key}
                      draggableHandle
                      pickable={allowGroups}
                      picked={!!grpPicked[block.items[0]._uid]}
                      onPickToggle={() => togglePick(block.items[0]._uid)}
                      isFirst={list.findIndex((e) => e._uid === block.items[0]._uid) === 0}
                      isLast={list.findIndex((e) => e._uid === block.items[0]._uid) === list.length - 1}
                      onField={updateField}
                      onSetLogType={setLogType}
                      onMoveWithin={moveWithinSection}
                      onMoveTo={moveToSection}
                      onRemove={removeExercise}
                      onSwap={(section, uid) => setSwapTarget({ section, uid })}
                      onUpdateEquipment={updateEquipment}
                      videoOpenUid={videoOpenUid}
                      videoDraft={videoDraft}
                      setVideoOpenUid={setVideoOpenUid}
                      setVideoDraft={setVideoDraft}
                      onSaveVideo={saveVideo}
                      imageOpenUid={imageOpenUid}
                      imageDraft={imageDraft}
                      setImageOpenUid={setImageOpenUid}
                      setImageDraft={setImageDraft}
                      onSaveImage={saveImage}
                    />
                  </div>
                )
              )}
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setAddSkeleton(null);
                    setAddTarget(sec.key);
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] border-dashed border-[var(--hub-field-border)] py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-rose hover:bg-rose/5 hover:text-rose"
                >
                  <IconPlus className="h-4 w-4" />
                  Add exercise to {sec.label}
                </button>
                <SkeletonMenu>
                  <SkeletonMenuTrigger asChild>
                    <button
                      title="Add exercise using a preset volume skeleton (sets/reps/tempo/rest pre-filled)"
                      className="flex shrink-0 items-center justify-center gap-1 rounded-[12px] border-[1.5px] border-dashed border-[var(--hub-field-border)] px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-rose hover:bg-rose/5 hover:text-rose"
                    >
                      <IconDumbbell className="h-4 w-4" />
                      Skeleton
                    </button>
                  </SkeletonMenuTrigger>
                  <SkeletonMenuContent align="end" className="w-48">
                    {VOLUME_SKELETONS.map((sk) => (
                      <SkeletonMenuItem
                        key={sk.key}
                        onClick={() => {
                          setAddSkeleton(sk);
                          setAddTarget(sec.key);
                        }}
                      >
                        <span className="flex-1">{sk.label}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{sk.sub}</span>
                      </SkeletonMenuItem>
                    ))}
                  </SkeletonMenuContent>
                </SkeletonMenu>
              </div>
            </div>
          </HubCard>
        );
      })}

      {addTarget && (
        <AddExerciseDialog
          open={Boolean(addTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setAddTarget(null);
              setAddSkeleton(null);
            }
          }}
          sectionLabel={SECTION_LABEL[addTarget]}
          positionOptions={(() => {
            const list = sections[addTarget];
            const allowGroups = addTarget === "main_block";
            const blocks = computeBlocks(list, allowGroups);
            return [
              { index: 0, label: "At the beginning" },
              ...blocks.map((b) => {
                const lastUid = b.items[b.items.length - 1]._uid;
                const insertIndex = list.findIndex((e) => e._uid === lastUid) + 1;
                const label = b.type === "group" ? `After Superset ${b.label}` : `After ${b.items[0].exercise_name}`;
                return { index: insertIndex, label };
              }),
            ];
          })()}
          onAdd={addExercise}
        />
      )}

      {swapTarget && (
        <SwapExerciseDialog
          open={Boolean(swapTarget)}
          onOpenChange={(open) => !open && setSwapTarget(null)}
          onSelect={swapExercise}
        />
      )}

      <Dialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
        <DialogContent className="max-w-lg bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-[12px] shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-[var(--color-ink)]">Apply Workout Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Choose a template to load into the {version === "studio" ? "Studio" : "Home"} version.
            This replaces the entire prescription — your unsaved edits will be lost.
          </p>
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="pl-9 border-[var(--hub-field-border)] hover:border-[var(--hub-field-border-hover)] focus:border-rose focus:ring-2 focus:ring-rose/20 bg-[var(--hub-card)]"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {loadingTemplates ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading templates...</p>
            ) : filteredTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {templateList.length === 0 ? "No templates saved yet. Save one from a session first." : "No templates match your search."}
              </p>
            ) : (
              filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--hub-hover)] transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-md bg-[var(--status-success-bg)] text-teal flex items-center justify-center shrink-0">
                    <IconDumbbell className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-ink)] truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(t.data.warm_up?.length ?? 0) + (t.data.main_block?.length ?? 0) + (t.data.cooldown?.length ?? 0)} exercises
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExerciseRow({
  ex,
  sectionKey,
  inGroup,
  draggableHandle,
  pickable,
  picked,
  onPickToggle,
  isFirst,
  isLast,
  onField,
  onSetLogType,
  onMoveWithin,
  onMoveTo,
  onRemove,
  onSwap,
  onUpdateEquipment,
  videoOpenUid,
  videoDraft,
  setVideoOpenUid,
  setVideoDraft,
  onSaveVideo,
  imageOpenUid,
  imageDraft,
  setImageOpenUid,
  setImageDraft,
  onSaveImage,
}: {
  ex: EditableExercise;
  sectionKey: SectionKey;
  inGroup?: boolean;
  draggableHandle?: boolean;
  pickable?: boolean;
  picked?: boolean;
  onPickToggle?: () => void;
  isFirst: boolean;
  isLast: boolean;
  onField: (sectionKey: SectionKey, uid: string, field: "sets" | "reps" | "tempo" | "rest", value: string) => void;
  onSetLogType: (sectionKey: SectionKey, uid: string, logType: "reps" | "time") => void;
  onMoveWithin: (sectionKey: SectionKey, uid: string, dir: 1 | -1) => void;
  onMoveTo: (fromSection: SectionKey, uid: string, toSection: SectionKey) => void;
  onRemove: (sectionKey: SectionKey, uid: string) => void;
  onSwap: (sectionKey: SectionKey, uid: string) => void;
  onUpdateEquipment: (sectionKey: SectionKey, uid: string, equipment: string[]) => void;
  videoOpenUid: string | null;
  videoDraft: string;
  setVideoOpenUid: (uid: string | null) => void;
  setVideoDraft: (v: string) => void;
  onSaveVideo: (sectionKey: SectionKey, uid: string) => void;
  imageOpenUid: string | null;
  imageDraft: string;
  setImageOpenUid: (uid: string | null) => void;
  setImageDraft: (v: string) => void;
  onSaveImage: (sectionKey: SectionKey, uid: string) => void;
}) {
  const logType = (ex as Exercise & { log_type?: "reps" | "time" }).log_type || "reps";
  const otherSections = SECTION_DEFS.filter((s) => s.key !== sectionKey);
  const videoOpen = videoOpenUid === ex._uid;
  const imageOpen = imageOpenUid === ex._uid;
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [equipmentInput, setEquipmentInput] = useState("");

  return (
    <div className="flex items-start gap-2.5 flex-wrap sm:flex-nowrap rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-2.5">
      {pickable && (
        <button
          type="button"
          onClick={onPickToggle}
          aria-pressed={picked}
          aria-label={picked ? `Deselect ${ex.exercise_name} for grouping` : `Select ${ex.exercise_name} for grouping`}
          title={picked ? "Deselect for grouping" : "Select to group into a superset"}
          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
            picked
              ? "border-rose bg-rose text-white"
              : "border-[var(--hub-field-border)] text-transparent hover:border-rose hover:text-rose/40"
          }`}
        >
          <IconCheck className="h-3 w-3" />
        </button>
      )}
      {draggableHandle && (
        <span className="mt-1.5 cursor-grab text-[var(--hub-field-border)]" title="Drag to reorder">
          <IconGripVertical className="h-4 w-4" />
        </span>
      )}
      <div className="mt-0.5 flex flex-col gap-0.5">
        <button
          disabled={isFirst}
          onClick={() => onMoveWithin(sectionKey, ex._uid, -1)}
          className="grid h-4 w-5 place-items-center rounded-t border border-[var(--hub-border)] text-muted-foreground hover:bg-[var(--hub-hover)] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Move up"
        >
          <IconChevronUp className="h-3 w-3" />
        </button>
        <button
          disabled={isLast}
          onClick={() => onMoveWithin(sectionKey, ex._uid, 1)}
          className="grid h-4 w-5 place-items-center rounded-b border border-t-0 border-[var(--hub-border)] text-muted-foreground hover:bg-[var(--hub-hover)] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Move down"
        >
          <IconChevronDown className="h-3 w-3" />
        </button>
      </div>

      <div className="min-w-[160px] flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {ex.media?.image_url && (
            <img
              src={ex.media.image_url}
              alt={ex.exercise_name}
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
            />
          )}
          <p className="text-sm font-semibold text-foreground">{ex.exercise_name}</p>
          <div className="inline-flex gap-0.5 rounded-lg border border-[var(--hub-border)] bg-[var(--hub-hover)] p-0.5">
            <button
              type="button"
              onClick={() => onSetLogType(sectionKey, ex._uid, "reps")}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide transition-colors ${
                logType !== "time" ? "bg-[var(--hub-card)] text-rose shadow-sm" : "text-muted-foreground"
              }`}
            >
              Reps &amp; wt
            </button>
            <button
              type="button"
              onClick={() => onSetLogType(sectionKey, ex._uid, "time")}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide transition-colors ${
                logType === "time" ? "bg-[var(--hub-card)] text-teal shadow-sm" : "text-muted-foreground"
              }`}
            >
              Time
            </button>
          </div>
        </div>
        {ex.coaching_cue && <p className="mt-0.5 text-xs text-muted-foreground">{ex.coaching_cue}</p>}
        {ex.modification && (
          <span className="mt-1 inline-flex rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--status-warning-text)]">
            {ex.modification}
          </span>
        )}
        {(ex.equipment?.length ?? 0) > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-[5px]">
            {ex.equipment.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center text-[11px] font-semibold text-muted-foreground bg-[var(--hub-hover)] border border-[var(--hub-border)] rounded-full px-[9px] py-[2px]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => onUpdateEquipment(sectionKey, ex._uid, (ex.equipment || []).filter((t) => t !== tag))}
                  className="ml-1 -mr-1 inline-flex p-0 text-muted-foreground hover:text-[var(--color-rose)]"
                  aria-label={`Remove tag ${tag}`}
                >
                  <IconX className="h-2 w-2" />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          value={equipmentInput}
          onChange={(e) => setEquipmentInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && equipmentInput.trim()) {
              const trimmed = equipmentInput.trim();
              const exists = (ex.equipment || []).includes(trimmed);
              if (!exists) {
                onUpdateEquipment(sectionKey, ex._uid, [...(ex.equipment || []), trimmed]);
              }
              setEquipmentInput("");
            }
          }}
          placeholder="+ Add equipment tag, press Enter"
          className="mt-1.5 h-7 w-full max-w-[260px] rounded-md border border-dashed border-[var(--hub-field-border)] bg-transparent px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-rose focus:border-solid focus:outline-none focus:ring-2 focus:ring-rose/30"
        />
        {videoOpen && (
          <div className="mt-2 flex gap-2 border-t border-dashed border-[var(--hub-border)] pt-2">
            <input
              type="url"
              value={videoDraft}
              onChange={(e) => setVideoDraft(e.target.value)}
              placeholder="Paste video URL..."
              className="min-w-0 flex-1 rounded-md border px-2 py-1 text-xs"
              onKeyDown={(e) => e.key === "Enter" && onSaveVideo(sectionKey, ex._uid)}
              autoFocus
            />
            <button onClick={() => onSaveVideo(sectionKey, ex._uid)} className="rounded-md bg-rose px-2 py-1 text-xs text-white">
              Save
            </button>
          </div>
        )}
        {imageOpen && (
          <div className="mt-2 flex gap-2 border-t border-dashed border-[var(--hub-border)] pt-2">
            <input
              type="url"
              value={imageDraft}
              onChange={(e) => setImageDraft(e.target.value)}
              placeholder="Paste image URL..."
              className="min-w-0 flex-1 rounded-md border px-2 py-1 text-xs"
              onKeyDown={(e) => e.key === "Enter" && onSaveImage(sectionKey, ex._uid)}
              autoFocus
            />
            <button onClick={() => onSaveImage(sectionKey, ex._uid)} className="rounded-md bg-rose px-2 py-1 text-xs text-white">
              Save
            </button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-2.5 basis-full sm:basis-auto">
        <EditField label="Sets" value={String(ex.sets ?? "")} onChange={(v) => onField(sectionKey, ex._uid, "sets", v)} width={56} type="number" />
        <EditField label="Reps" value={ex.reps || ""} onChange={(v) => onField(sectionKey, ex._uid, "reps", v)} width={64} />
        <EditField label="Tempo" value={ex.tempo || ""} onChange={(v) => onField(sectionKey, ex._uid, "tempo", v)} width={80} />
        <EditField label="Rest" value={ex.rest || ""} onChange={(v) => onField(sectionKey, ex._uid, "rest", v)} width={56} />
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          title={ex.media?.video_url ? "Video link attached" : "Add video link"}
          aria-label={ex.media?.video_url ? "Video link attached" : "Add video link"}
          onClick={() => {
            setVideoDraft(ex.media?.video_url || "");
            setVideoOpenUid(videoOpen ? null : ex._uid);
          }}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[var(--hub-hover)] ${ex.media?.video_url ? "text-teal" : "text-muted-foreground"}`}
        >
          <IconVideo className="h-3.5 w-3.5" />
        </button>
        <button
          title={ex.media?.image_url ? "Image attached" : "Add image"}
          aria-label={ex.media?.image_url ? "Image attached" : "Add image"}
          onClick={() => {
            setImageDraft(ex.media?.image_url || "");
            setImageOpenUid(imageOpen ? null : ex._uid);
          }}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[var(--hub-hover)] ${ex.media?.image_url ? "text-teal" : "text-muted-foreground"}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-5-5L5 21"/>
          </svg>
        </button>
        <button
          title="Swap exercise"
          onClick={() => onSwap(sectionKey, ex._uid)}
          className="inline-flex h-7 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium text-rose hover:bg-[var(--hub-hover)]"
        >
          <IconRefreshCw className="h-3 w-3" />
          Swap
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--hub-hover)] hover:text-foreground" aria-label="More actions">
              <IconEllipsis className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {otherSections.map((s) => (
              <DropdownMenuItem key={s.key} onClick={() => onMoveTo(sectionKey, ex._uid, s.key)}>
                <IconMove className="mr-2 h-3.5 w-3.5" />
                Move to {s.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setConfirmRemove(true);
              }}
              className="text-red-600 focus:text-red-600"
            >
              <IconTrash2 className="mr-2 h-3.5 w-3.5" />
              Remove from session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &ldquo;{ex.exercise_name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the session. It&rsquo;s only saved once you hit &ldquo;Save changes&rdquo; —
              Discard will undo this too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onRemove(sectionKey, ex._uid)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditField({ label, value, onChange, width, type = "text" }: { label: string; value: string; onChange: (v: string) => void; width: number; type?: string }) {
  return (
    <div className="flex flex-col gap-0.5" style={{ width }}>
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[30px] w-full rounded-md border border-[var(--hub-field-border)] bg-[var(--hub-card)] px-1.5 text-center text-[13px] text-foreground focus:border-rose focus:outline-none focus:ring-2 focus:ring-rose/30"
      />
    </div>
  );
}
