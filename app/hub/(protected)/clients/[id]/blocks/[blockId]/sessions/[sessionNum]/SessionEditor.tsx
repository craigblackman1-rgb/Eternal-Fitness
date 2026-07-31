"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  IconGripVertical,
  IconChevronUp,
  IconChevronDown,
  IconEllipsis,
  IconTrash2,
  IconMove,
  IconPlus,
  IconSave,
  IconX,
  IconVideo,
  IconRefreshCw,
} from "@/components/icons";
import type { Exercise, SessionVersion } from "@/types";
import type { ExerciseEntry } from "@/app/hub/(protected)/exercises/page";
import { SwapExerciseDialog } from "../swap-exercise-dialog";
import { AddExerciseDialog, type InsertPositionOption } from "../add-exercise-dialog";
import { toast } from "sonner";
import { HubCard } from "@/components/hub/HubCard";

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

function withUids(exercises: Exercise[]): EditableExercise[] {
  return exercises.map((ex) => ({ ...ex, _uid: crypto.randomUUID() }));
}

function stripUids(exercises: EditableExercise[]): Exercise[] {
  return exercises.map(({ _uid, ...rest }) => rest);
}

interface Block {
  key: string;
  type: "single" | "group";
  label?: string;
  items: EditableExercise[];
}

function computeBlocks(list: EditableExercise[], allowGroups: boolean): Block[] {
  if (!allowGroups) return list.map((ex) => ({ key: ex._uid, type: "single", items: [ex] }));
  const blocks: Block[] = [];
  let i = 0;
  while (i < list.length) {
    const e = list[i];
    if (e.group_label) {
      const items = [e];
      let j = i + 1;
      while (j < list.length && list[j].group_label === e.group_label) {
        items.push(list[j]);
        j++;
      }
      if (items.length > 1) {
        blocks.push({ key: `grp:${e.group_label}:${e._uid}`, type: "group", label: e.group_label, items });
      } else {
        blocks.push({ key: e._uid, type: "single", items: [e] });
      }
      i = j;
    } else {
      blocks.push({ key: e._uid, type: "single", items: [e] });
      i++;
    }
  }
  return blocks;
}

function normalizeGroupsList(list: EditableExercise[]): { list: EditableExercise[]; changed: boolean } {
  const counts: Record<string, number> = {};
  list.forEach((e) => {
    if (e.group_label) counts[e.group_label] = (counts[e.group_label] || 0) + 1;
  });
  let changed = false;
  const next = list.map((e) => {
    if (e.group_label && counts[e.group_label] < 2) {
      changed = true;
      return { ...e, group_label: undefined };
    }
    return e;
  });
  return { list: next, changed };
}

/** Desk-planning editor for a single session prescription (one version — studio or home).
 *  Local-only state until "Save changes" — Discard just unmounts without persisting. */
export function SessionEditor({
  version,
  data,
  onSaved,
  onCancel,
}: {
  version: "studio" | "home";
  data: SessionVersion;
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
  const [dragBlockKey, setDragBlockKey] = useState<string | null>(null);
  const [dragSection, setDragSection] = useState<SectionKey | null>(null);
  const [overBlockKey, setOverBlockKey] = useState<string | null>(null);

  const updateField = (sectionKey: SectionKey, uid: string, field: "sets" | "reps" | "tempo" | "rest", value: string) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((e) =>
        e._uid === uid ? { ...e, [field]: field === "sets" ? Number(value) || 0 : value } : e
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
      const norm = normalizeGroupsList(next.main_block);
      next = { ...next, main_block: norm.list };
      if (wasGrouped || norm.changed) {
        toast.message(`Moved "${moved.exercise_name}" to ${SECTION_LABEL[toSection]} — the superset was resolved, the remaining exercise now stands alone.`);
      } else {
        toast.message(`Moved "${moved.exercise_name}" to ${SECTION_LABEL[toSection]}.`);
      }
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
      const norm = normalizeGroupsList(next.main_block);
      next = { ...next, main_block: norm.list };
      toast.message(
        `Removed "${removed.exercise_name}" from the session.` +
          (wasGrouped || norm.changed ? " The superset was resolved — the remaining exercise now stands alone." : "")
      );
      return next;
    });
  };

  const addExercise = (entry: ExerciseEntry, insertIndex: number) => {
    if (!addTarget) return;
    const newEx: EditableExercise = {
      _uid: crypto.randomUUID(),
      exercise_name: entry.name,
      sets: 2,
      reps: "10",
      tempo: "Controlled",
      rest: "45s",
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
    toast.message(`Added "${entry.name}" to ${SECTION_LABEL[addTarget]}.`);
    setAddTarget(null);
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

  return (
    <div className="space-y-4">
      <HubCard padded={false} className="flex items-center justify-between px-4 py-3">
        <p className="text-sm text-muted-foreground">Editing the {version === "studio" ? "Studio" : "Home"} prescription — saves to this session only.</p>
        <div className="flex gap-2">
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
            <div className="space-y-2 p-3">
              {blocks.length === 0 && (
                <p className="rounded-xl border border-dashed border-[var(--hub-border)] py-4 text-center text-sm text-muted-foreground">
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
                      if (dragSection !== sec.key) return;
                      e.preventDefault();
                      setOverBlockKey(block.key);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragBlockKey && dragSection === sec.key) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
                        reorderSection(sec.key, dragBlockKey, block.key, pos);
                      }
                      setDragBlockKey(null);
                      setDragSection(null);
                      setOverBlockKey(null);
                    }}
                    className={`rounded-xl border-[1.5px] border-[var(--status-primary-border)] bg-[var(--status-primary-bg)] p-2.5 ${
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
                          onMoveWithin={moveWithinSection}
                          onMoveTo={moveToSection}
                          onRemove={removeExercise}
                          onSwap={(section, uid) => setSwapTarget({ section, uid })}
                          videoOpenUid={videoOpenUid}
                          videoDraft={videoDraft}
                          setVideoOpenUid={setVideoOpenUid}
                          setVideoDraft={setVideoDraft}
                          onSaveVideo={saveVideo}
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
                      if (dragSection !== sec.key) return;
                      e.preventDefault();
                      setOverBlockKey(block.key);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragBlockKey && dragSection === sec.key) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
                        reorderSection(sec.key, dragBlockKey, block.key, pos);
                      }
                      setDragBlockKey(null);
                      setDragSection(null);
                      setOverBlockKey(null);
                    }}
                    className={`${dragBlockKey === block.key ? "opacity-40" : ""} ${
                      overBlockKey === block.key && dragBlockKey !== block.key ? "ring-2 ring-rose/40 rounded-xl" : ""
                    }`}
                  >
                    <ExerciseRow
                      ex={block.items[0]}
                      sectionKey={sec.key}
                      draggableHandle
                      isFirst={list.findIndex((e) => e._uid === block.items[0]._uid) === 0}
                      isLast={list.findIndex((e) => e._uid === block.items[0]._uid) === list.length - 1}
                      onField={updateField}
                      onMoveWithin={moveWithinSection}
                      onMoveTo={moveToSection}
                      onRemove={removeExercise}
                      onSwap={(section, uid) => setSwapTarget({ section, uid })}
                      videoOpenUid={videoOpenUid}
                      videoDraft={videoDraft}
                      setVideoOpenUid={setVideoOpenUid}
                      setVideoDraft={setVideoDraft}
                      onSaveVideo={saveVideo}
                    />
                  </div>
                )
              )}
              <button
                onClick={() => setAddTarget(sec.key)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-[var(--hub-field-border)] py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-rose hover:bg-rose/5 hover:text-rose"
              >
                <IconPlus className="h-4 w-4" />
                Add exercise to {sec.label}
              </button>
            </div>
          </HubCard>
        );
      })}

      {addTarget && (
        <AddExerciseDialog
          open={Boolean(addTarget)}
          onOpenChange={(open) => !open && setAddTarget(null)}
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
    </div>
  );
}

function ExerciseRow({
  ex,
  sectionKey,
  inGroup,
  draggableHandle,
  isFirst,
  isLast,
  onField,
  onMoveWithin,
  onMoveTo,
  onRemove,
  onSwap,
  videoOpenUid,
  videoDraft,
  setVideoOpenUid,
  setVideoDraft,
  onSaveVideo,
}: {
  ex: EditableExercise;
  sectionKey: SectionKey;
  inGroup?: boolean;
  draggableHandle?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onField: (sectionKey: SectionKey, uid: string, field: "sets" | "reps" | "tempo" | "rest", value: string) => void;
  onMoveWithin: (sectionKey: SectionKey, uid: string, dir: 1 | -1) => void;
  onMoveTo: (fromSection: SectionKey, uid: string, toSection: SectionKey) => void;
  onRemove: (sectionKey: SectionKey, uid: string) => void;
  onSwap: (sectionKey: SectionKey, uid: string) => void;
  videoOpenUid: string | null;
  videoDraft: string;
  setVideoOpenUid: (uid: string | null) => void;
  setVideoDraft: (v: string) => void;
  onSaveVideo: (sectionKey: SectionKey, uid: string) => void;
}) {
  const otherSections = SECTION_DEFS.filter((s) => s.key !== sectionKey);
  const videoOpen = videoOpenUid === ex._uid;
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[var(--hub-border)] bg-[var(--hub-card)] p-2.5">
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
        <p className="text-sm font-semibold text-foreground">{ex.exercise_name}</p>
        {ex.coaching_cue && <p className="mt-0.5 text-xs text-muted-foreground">{ex.coaching_cue}</p>}
        {ex.modification && (
          <span className="mt-1 inline-flex rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--status-warning-text)]">
            {ex.modification}
          </span>
        )}
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
      </div>

      <div className="flex shrink-0 gap-2.5">
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
