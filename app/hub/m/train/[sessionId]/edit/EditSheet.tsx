"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Session, Exercise, SessionVersion, DeliveryMode } from "@/types";
import { computeGroups, nextGroupLabel, normalizeGroups } from "@/lib/exercise-groups";
import { formatPrescription } from "@/lib/prescription";
import type { ExerciseEntry } from "@/app/hub/(protected)/exercises/page";

// ── Types ─────────────────────────────────────────────────────────

interface CompletedSession {
  session_id: string;
  session_number: number;
  block_number: number;
  week: number;
  phase: string;
  archetype: string;
  completed_at: string | null;
  versions: Record<string, SessionVersion>;
}

interface TemplateEntry {
  id: string;
  name: string;
  data: SessionVersion;
  archetypes: string[];
  condition_tags: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// ── Icons ─────────────────────────────────────────────────────────

const ICO = {
  checkSm: (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>),
  plus: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>),
  check: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>),
  trash: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>),
  ungroup: (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6H5a2 2 0 0 0-2 2v3M16 6h3a2 2 0 0 1 2 2v3M8 18H5a2 2 0 0 1-2-2v-3M16 18h3a2 2 0 0 0 2-2v-3M2 2l20 20"/></svg>),
  img: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.7" cy="8.7" r="1.6"/><path d="m21 15-5-5L5 21"/></svg>),
  chev: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>),
  hist: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 8v4l3 2"/></svg>),
  tmpl: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>),
  search: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>),
  close: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>),
};

// ── Helpers ───────────────────────────────────────────────────────

const SECTION_KEYS = ["warm_up", "main_block", "cooldown"] as const;
const SECTION_LABELS: Record<string, string> = {
  warm_up: "Warm-up",
  main_block: "Main",
  cooldown: "Cooldown",
};

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function defaultExerciseFromEntry(entry: ExerciseEntry): Exercise {
  return {
    exercise_name: entry.name,
    sets: 3,
    reps: "10",
    tempo: "—",
    rest: "—",
    coaching_cue: entry.coaching_cue || "",
    modification: entry.default_mod || "",
    equipment: entry.equipment || [],
    media: {
      image_url: entry.image_url || undefined,
      video_url: entry.video_url || undefined,
    },
  };
}

function exercisePrescription(ex: Exercise): string {
  const sets = ex.sets ?? 0;
  const reps = ex.reps || "";
  if (sets && reps) return `${sets} × ${reps}`;
  if (reps) return reps;
  return `${sets} sets`;
}

// ── Main Component ────────────────────────────────────────────────

export function EditSheet({
  sessionId,
  sessionNumber,
  data,
  clientName,
  clientNumber,
  deliveryMode,
  blockNumber,
}: {
  sessionId: string;
  sessionNumber: number;
  data: Session | null;
  clientName: string;
  clientNumber: number | null;
  deliveryMode: DeliveryMode;
  blockNumber: number | null;
}) {
  const router = useRouter();
  const version = deliveryMode === "home_training" ? "home" : "studio";
  const initialSections = data?.versions?.[version] ?? {
    warm_up: [] as Exercise[],
    main_block: [] as Exercise[],
    cooldown: [] as Exercise[],
  };

  const [mode, setMode] = useState<"library" | "past" | "templates" | "session">("library");
  const [sections, setSections] = useState<SessionVersion>(deepClone(initialSections));
  const savedSnapshot = useRef(JSON.stringify(initialSections));
  const [added, setAdded] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);

  // Library state
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [libQuery, setLibQuery] = useState("");
  const [libCategory, setLibCategory] = useState("All");

  // Past state
  const [pastData, setPastData] = useState<CompletedSession[]>([]);

  // Templates state
  const [templates, setTemplates] = useState<TemplateEntry[]>([]);
  const [tmplQuery, setTmplQuery] = useState("");
  const [tmplArch, setTmplArch] = useState("All");

  // Pack expand/pick
  const [openPack, setOpenPack] = useState<string | null>(null);
  const [packPicked, setPackPicked] = useState<Record<string, boolean>>({});

  // Group pick for "this session"
  const [grpPicked, setGrpPicked] = useState<Record<string, boolean>>({});

  // ── Data fetching ───────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((data: ExerciseEntry[]) => setExercises(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (clientNumber == null) return;
    fetch(`/api/clients/${clientNumber}/sessions/completed?exclude=${sessionId}`)
      .then((r) => r.json())
      .then((data: CompletedSession[]) => setPastData(data))
      .catch(() => {});
  }, [clientNumber, sessionId]);

  useEffect(() => {
    fetch("/api/workout-templates")
      .then((r) => r.json())
      .then((data: TemplateEntry[]) => setTemplates(data))
      .catch(() => {});
  }, []);

  // ── Derived data ────────────────────────────────────────────────

  const muscleCategories = useMemo(() => {
    const all = new Set<string>();
    for (const ex of exercises) {
      for (const mg of ex.muscle_groups) {
        all.add(mg);
      }
    }
    return ["All", ...Array.from(all).sort()];
  }, [exercises]);

  const templateArches = useMemo(() => {
    const all = new Set<string>();
    for (const t of templates) {
      for (const a of t.archetypes) {
        if (a) all.add(a);
      }
    }
    return ["All", ...Array.from(all).sort()];
  }, [templates]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(sections) !== savedSnapshot.current;
  }, [sections]);

  // ── Section helpers ─────────────────────────────────────────────

  const allSectionExercises = useMemo(() => {
    const all: Exercise[] = [];
    for (const sk of SECTION_KEYS) {
      for (const ex of sections[sk]) {
        all.push(ex);
      }
    }
    return all;
  }, [sections]);

  const isInSession = useCallback(
    (name: string): boolean => {
      return allSectionExercises.some((ex) => ex.exercise_name === name);
    },
    [allSectionExercises],
  );

  // ── Actions ─────────────────────────────────────────────────────

  const addExercise = useCallback(
    (ex: Exercise) => {
      setSections((prev) => {
        const next = deepClone(prev);
        next.main_block.push({ ...ex });
        return next;
      });
      setAdded((prev) => [...prev, ex.exercise_name]);
    },
    [],
  );

  const addExercises = useCallback(
    (exercises: Exercise[]) => {
      setSections((prev) => {
        const next = deepClone(prev);
        next.main_block.push(...exercises.map((e) => ({ ...e })));
        return next;
      });
      setAdded((prev) => [...prev, ...exercises.map((e) => e.exercise_name)]);
    },
    [],
  );

  const removeExercise = useCallback(
    (sectionKey: string, idx: number) => {
      setSections((prev) => {
        const next = deepClone(prev);
        const arr = next[sectionKey as keyof SessionVersion] as Exercise[];
        const [removedEx] = arr.splice(idx, 1);
        setRemoved((r) => [...r, removedEx.exercise_name]);
        // Dissolve orphaned groups
        const { list: normalized } = normalizeGroups(arr);
        next[sectionKey as keyof SessionVersion] = normalized;
        return next;
      });
    },
    [],
  );

  const handleGroup = useCallback(() => {
    const pickedUids = Object.keys(grpPicked);
    if (pickedUids.length < 2) return;

    // Verify all picked are in the same section
    let pickedSection: string | null = null;
    for (const sk of SECTION_KEYS) {
      const arr = sections[sk];
      for (const ex of arr) {
        if (ex.uid && grpPicked[ex.uid]) {
          if (pickedSection && pickedSection !== sk) {
            return; // Different sections — shouldn't happen since we guard
          }
          pickedSection = sk;
        }
      }
    }
    if (!pickedSection) return;

    const label = nextGroupLabel(sections[pickedSection as keyof SessionVersion]);

    setSections((prev) => {
      const next = deepClone(prev);
      const arr = next[pickedSection as keyof SessionVersion] as Exercise[];
      for (const ex of arr) {
        if (ex.uid && grpPicked[ex.uid]) {
          ex.group_label = label;
        }
      }
      return next;
    });

    setGrpPicked({});
    toast.success(`${pickedUids.length} exercises grouped as ${label}.`);
  }, [grpPicked, sections]);

  const handleUngroup = useCallback(
    (groupLabel: string) => {
      setSections((prev) => {
        const next = deepClone(prev);
        for (const sk of SECTION_KEYS) {
          const arr = next[sk] as Exercise[];
          for (const ex of arr) {
            if (ex.group_label === groupLabel) {
              ex.group_label = undefined;
            }
          }
        }
        return next;
      });
      toast.success(`Superset ${groupLabel} ungrouped.`);
    },
    [],
  );

  const handleClose = useCallback(async () => {
    if (hasChanges && data) {
      const updatedData = {
        ...data,
        versions: { ...data.versions, [version]: sections },
      };
      try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: updatedData }),
        });
        if (!res.ok) {
          toast.error("Couldn't save changes — check your connection and try again.");
          return;
        }
      } catch {
        toast.error("Couldn't save changes — check your connection and try again.");
        return;
      }
    }
    router.push(`/hub/m/train/${sessionId}`);
    router.refresh();
  }, [hasChanges, data, version, sections, sessionId, router]);

  // ── Rendering ───────────────────────────────────────────────────

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      if (libCategory !== "All" && !ex.muscle_groups.includes(libCategory)) return false;
      if (libQuery) {
        const q = libQuery.toLowerCase();
        const hay = `${ex.name} ${ex.equipment?.join(" ") || ""} ${ex.muscle_groups?.join(" ") || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [exercises, libCategory, libQuery]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (tmplArch !== "All" && !t.archetypes.includes(tmplArch)) return false;
      if (tmplQuery) {
        const q = tmplQuery.toLowerCase();
        if (!t.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [templates, tmplArch, tmplQuery]);

  const pastByBlock = useMemo(() => {
    const map: Record<number, CompletedSession[]> = {};
    for (const p of pastData) {
      (map[p.block_number] = map[p.block_number] || []).push(p);
    }
    return Object.keys(map)
      .map(Number)
      .sort((a, b) => b - a)
      .map((bn) => ({ block: bn, sessions: map[bn] }));
  }, [pastData]);

  const sessionCount = Object.values(sections).reduce((sum, arr) => sum + arr.length, 0);

  const formatDate = (d: string | null) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  };

  // ── Render: Library ─────────────────────────────────────────────

  const renderLibrary = () => (
    <>
      <div className="note">
        <span className="note-b">i</span>
        <div>
          <b>Add a single exercise.</b> Straight from the library, with its
          thumbnail so she can confirm the right movement at a glance. It lands
          in the Main block by default — move it in the desktop editor later if
          it belongs elsewhere.
        </div>
      </div>
      <div className="searchbar">
        <input
          type="search"
          value={libQuery}
          onChange={(e) => setLibQuery(e.target.value)}
          placeholder="Search movements…"
          aria-label="Search the exercise library"
        />
      </div>
      <div className="chips">
        {muscleCategories.map((c) => (
          <button
            key={c}
            className={`chip${libCategory === c ? " on" : ""}`}
            onClick={() => setLibCategory(c)}
            aria-pressed={libCategory === c}
          >
            {c}
          </button>
        ))}
      </div>
      {filteredExercises.length === 0 ? (
        <div className="empty">
          <div className="empty-ic">{ICO.search}</div>
          <p className="empty-t">
            No movements match &ldquo;{libQuery}&rdquo;
          </p>
          <p className="empty-d">
            Try a shorter search, clear the category filter, or add the exercise
            to the library from the desktop hub first.
          </p>
        </div>
      ) : (
        <div className="rows">
          {filteredExercises.map((ex) => {
            const already = isInSession(ex.name);
            const hasMedia = !!(ex.image_url || ex.video_url);
            return (
              <div key={ex.id} className="row">
                <div className={`thumb ${hasMedia ? "has-img" : "no-img"}`} aria-hidden="true">
                  {ICO.img}
                </div>
                <div className="row-b">
                  <div className="row-t">{ex.name}</div>
                  <div className="row-s">
                    {ex.muscle_groups?.[0] || ""}
                    {ex.equipment?.length ? ` · ${ex.equipment.join(", ")}` : ""}
                  </div>
                </div>
                {already ? (
                  <button className="mini added" disabled>
                    {ICO.check}In session
                  </button>
                ) : (
                  <button
                    className="mini add"
                    onClick={() => {
                      addExercise(defaultExerciseFromEntry(ex));
                      toast.success(`"${ex.name}" added to the Main block.`);
                    }}
                  >
                    {ICO.plus}Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  // ── Render: Past sessions ───────────────────────────────────────

  const renderPast = () => {
    if (pastByBlock.length === 0) {
      return (
        <>
          <div className="note">
            <span className="note-b">i</span>
            <div>
              <b>Pull from any past session, not just the last one.</b> Every
              completed session for this client, newest first, labelled with its
              block and date.
            </div>
          </div>
          <div className="empty">
            <div className="empty-ic">{ICO.search}</div>
            <p className="empty-t">No completed sessions yet</p>
            <p className="empty-d">
              Completed sessions for this client will appear here, grouped by
              block.
            </p>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="note">
          <span className="note-b">i</span>
          <div>
            <b>Pull from any past session, not just the last one.</b> Every
            completed session for this client, newest first, labelled with its
            block and date — broader than the desktop Roll over previous session
            button. Open one to take the whole thing or just the exercises you
            want.
          </div>
        </div>
        {pastByBlock.map(({ block, sessions: blkSessions }) => (
          <div key={block}>
            <div className="sec-label">
              <h2>Block {block}</h2>
              <span>{blkSessions.length} completed</span>
            </div>
            {blkSessions.map((ps) => (
              <PastPack
                key={ps.session_id}
                ps={ps}
                version={version}
                openPack={openPack}
                packPicked={packPicked}
                onToggle={() =>
                  setOpenPack((prev) =>
                    prev === ps.session_id ? null : ps.session_id,
                  )
                }
                onPick={(key) =>
                  setPackPicked((prev) => {
                    if (prev[key]) {
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    }
                    return { ...prev, [key]: true };
                  })
                }
                onAddPicked={() => {
                  const exs: Exercise[] = [];
                  const ver = ps.versions[version];
                  if (ver) {
                    const all = [
                      ...(ver.warm_up || []),
                      ...(ver.main_block || []),
                      ...(ver.cooldown || []),
                    ];
                    all.forEach((ex, i) => {
                      const key = `${ps.session_id}:${i}`;
                      if (packPicked[key]) {
                        exs.push(ex);
                        delete packPicked[key];
                      }
                    });
                  }
                  if (exs.length) {
                    addExercises(exs);
                    toast.success(
                      `${exs.length} exercises added from Session ${ps.session_number}.`,
                    );
                  }
                }}
                onAddAll={() => {
                  const ver = ps.versions[version];
                  if (!ver) return;
                  const all = [
                    ...(ver.warm_up || []),
                    ...(ver.main_block || []),
                    ...(ver.cooldown || []),
                  ];
                  addExercises(all);
                  // Clear picks for this session
                  setPackPicked((prev) => {
                    const next = { ...prev };
                    for (const k of Object.keys(next)) {
                      if (k.startsWith(`${ps.session_id}:`)) delete next[k];
                    }
                    return next;
                  });
                  toast.success(
                    `${all.length} exercises added from Session ${ps.session_number}.`,
                  );
                }}
              />
            ))}
          </div>
        ))}
      </>
    );
  };

  // ── Render: Templates ───────────────────────────────────────────

  const renderTemplates = () => (
    <>
      <div className="note">
        <span className="note-b">i</span>
        <div>
          <b>Workout templates.</b> The same library and the same archetype
          filters as the desktop template browser — no separate mobile-only set.
        </div>
      </div>
      <div className="searchbar">
        <input
          type="search"
          value={tmplQuery}
          onChange={(e) => setTmplQuery(e.target.value)}
          placeholder="Search templates…"
          aria-label="Search workout templates"
        />
      </div>
      <div className="chips">
        {templateArches.map((a) => (
          <button
            key={a}
            className={`chip${tmplArch === a ? " on" : ""}`}
            onClick={() => setTmplArch(a)}
            aria-pressed={tmplArch === a}
          >
            {a}
          </button>
        ))}
      </div>
      {filteredTemplates.length === 0 ? (
        <div className="empty">
          <div className="empty-ic">{ICO.search}</div>
          <p className="empty-t">No templates match that filter</p>
          <p className="empty-d">
            Clear the archetype filter, or build a new template in the desktop
            hub — templates are not created from the phone.
          </p>
        </div>
      ) : (
        filteredTemplates.map((t) => (
          <TemplatePack
            key={t.id}
            tmpl={t}
            openPack={openPack}
            packPicked={packPicked}
            onToggle={() =>
              setOpenPack((prev) => (prev === t.id ? null : t.id))
            }
            onPick={(key) =>
              setPackPicked((prev) => {
                if (prev[key]) {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                }
                return { ...prev, [key]: true };
              })
            }
            onAddPicked={() => {
              const all = [
                ...(t.data.warm_up || []),
                ...(t.data.main_block || []),
                ...(t.data.cooldown || []),
              ];
              const exs: Exercise[] = [];
              all.forEach((ex, i) => {
                const key = `${t.id}:${i}`;
                if (packPicked[key]) {
                  exs.push(ex);
                  delete packPicked[key];
                }
              });
              if (exs.length) {
                addExercises(exs);
                toast.success(
                  `${exs.length} exercises added from "${t.name}".`,
                );
                // Increment usage
                fetch(`/api/workout-templates/${t.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "increment_usage" }),
                }).catch(() => {});
              }
            }}
            onAddAll={() => {
              const all = [
                ...(t.data.warm_up || []),
                ...(t.data.main_block || []),
                ...(t.data.cooldown || []),
              ];
              addExercises(all);
              setPackPicked((prev) => {
                const next = { ...prev };
                for (const k of Object.keys(next)) {
                  if (k.startsWith(`${t.id}:`)) delete next[k];
                }
                return next;
              });
              toast.success(
                `${all.length} exercises added from "${t.name}".`,
              );
              // Increment usage
              fetch(`/api/workout-templates/${t.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "increment_usage" }),
              }).catch(() => {});
            }}
          />
        ))
      )}
    </>
  );

  // ── Render: This session ────────────────────────────────────────

  const sameSection = () => {
    const ids = Object.keys(grpPicked);
    if (!ids.length) return false;
    let foundSec: string | null = null;
    for (const sk of SECTION_KEYS) {
      for (const ex of sections[sk]) {
        if (ex.uid && grpPicked[ex.uid]) {
          if (foundSec && foundSec !== sk) return false;
          foundSec = sk;
        }
      }
    }
    return !!foundSec;
  };

  const pickedCount = Object.keys(grpPicked).length;

  const renderSession = () => (
    <>
      <div className="note">
        <span className="note-b">i</span>
        <div>
          <b>What is in the session right now.</b> Remove anything she is not
          going to do, ungroup a superset, or tick two or more exercises in the
          same section and group them — including three-way and larger, not just
          pairs.
        </div>
      </div>
      {SECTION_KEYS.map((sk) => {
        const list = sections[sk];
        if (!list.length) return null;
        const label = SECTION_LABELS[sk];
        return (
          <div key={sk}>
            <div className="sec-label">
              <h2>{label}</h2>
              <span>
                {list.length} {list.length === 1 ? "exercise" : "exercises"}
              </span>
            </div>
            <div className="rows">
              {list.map((ex, idx) => {
                const uid = ex.uid ?? `${sk}:${idx}:${ex.exercise_name}`;
                const picked = !!grpPicked[uid];
                const hasMedia = !!(ex.media?.image_url || ex.media?.video_url);
                return (
                  <div key={uid} className={`row${picked ? " picked" : ""}`}>
                    <button
                      className="pick-box"
                      onClick={() =>
                        setGrpPicked((prev) => {
                          if (prev[uid]) {
                            const next = { ...prev };
                            delete next[uid];
                            return next;
                          }
                          return { ...prev, [uid]: true };
                        })
                      }
                      aria-pressed={picked}
                      aria-label={`Select ${ex.exercise_name} for grouping`}
                    >
                      {ICO.checkSm}
                    </button>
                    <div
                      className={`thumb ${hasMedia ? "has-img" : "no-img"}`}
                      aria-hidden="true"
                    >
                      {ICO.img}
                    </div>
                    <div className="row-b">
                      <div className="row-t">{ex.exercise_name}</div>
                      <div className="row-s">
                        {exercisePrescription(ex)}
                      </div>
                      {ex.group_label && (
                        <div className="row-tags">
                          <span className="tag grp">
                            {ex.group_label}
                          </span>
                        </div>
                      )}
                    </div>
                    {ex.group_label && (
                      <button
                        className="mini"
                        onClick={() => handleUngroup(ex.group_label!)}
                      >
                        {ICO.ungroup}
                      </button>
                    )}
                    <button
                      className="mini danger"
                      onClick={() => removeExercise(sk, idx)}
                      aria-label={`Remove ${ex.exercise_name}`}
                    >
                      {ICO.trash}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );

  // ── Change summary ──────────────────────────────────────────────

  const changeSummary = useMemo(() => {
    const bits: string[] = [];
    if (added.length) bits.push(`${added.length} added`);
    if (removed.length) bits.push(`${removed.length} removed`);
    if (!bits.length) return "No changes yet";
    return `${bits.join(" · ")} — applied to this session only`;
  }, [added, removed]);

  const MODES: { key: "library" | "past" | "templates" | "session"; label: string }[] = [
    { key: "library", label: "Exercise library" },
    { key: "past", label: "Past sessions" },
    { key: "templates", label: "Templates" },
    { key: "session", label: "This session" },
  ];

  // ── Main render ─────────────────────────────────────────────────

  return (
    <>
      <div className="scrim" aria-hidden="true" />

      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editSheetTitle"
      >
        <div className="grab">
          <i />
        </div>

        <header className="sh-head">
          <div className="sh-title">
            <h1 id="editSheetTitle">Edit workout</h1>
            <p>
              Session {sessionNumber} · {clientName} · changes apply to this
              session only
            </p>
          </div>
          <button
            className="sh-close"
            onClick={handleClose}
            aria-label="Close and return to the session"
          >
            {ICO.close}
          </button>
        </header>

        <nav className="modes" aria-label="Edit source">
          {MODES.map((m) => (
            <button
              key={m.key}
              className={`mode-btn${mode === m.key ? " on" : ""}`}
              onClick={() => {
                setMode(m.key);
                setOpenPack(null);
                setPackPicked({});
                setGrpPicked({});
              }}
              aria-pressed={mode === m.key}
            >
              {m.label}
              {m.key === "session" && sessionCount > 0 && (
                <span className="m-count">{sessionCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sh-body">
          {mode === "library" && renderLibrary()}
          {mode === "past" && renderPast()}
          {mode === "templates" && renderTemplates()}
          {mode === "session" && renderSession()}
        </div>

        <div className={`pick-bar${mode === "session" && pickedCount > 0 ? " on" : ""}`}>
          <div className="pick-count">
            {pickedCount} selected
            <span>Two or more, from the same section</span>
          </div>
          <button onClick={() => setGrpPicked({})}>Cancel</button>
          <button
            className="go"
            onClick={handleGroup}
            disabled={pickedCount < 2 || !sameSection()}
          >
            Group as superset
          </button>
        </div>

        <footer className="sh-foot">
          <span className="foot-scope">
            {hasChanges ? <b>{changeSummary}</b> : "No changes yet"}
          </span>
          <button className="btn btn-primary" onClick={handleClose}>
            Back to session
          </button>
        </footer>
      </section>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function PastPack({
  ps,
  version,
  openPack,
  packPicked,
  onToggle,
  onPick,
  onAddPicked,
  onAddAll,
}: {
  ps: CompletedSession;
  version: string;
  openPack: string | null;
  packPicked: Record<string, boolean>;
  onToggle: () => void;
  onPick: (key: string) => void;
  onAddPicked: () => void;
  onAddAll: () => void;
}) {
  const isOpen = openPack === ps.session_id;
  const ver = ps.versions[version];
  const items: { name: string; presc: string }[] = [];
  if (ver) {
    for (const sk of SECTION_KEYS) {
      for (const ex of ver[sk] || []) {
        items.push({ name: ex.exercise_name, presc: exercisePrescription(ex) });
      }
    }
  }
  const dateStr = ps.completed_at ? new Date(ps.completed_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";
  const noteBits = [dateStr];
  if (ps.archetype) noteBits.push(ps.archetype);

  const nPicked = Object.keys(packPicked).filter((k) => k.startsWith(`${ps.session_id}:`)).length;

  return (
    <div className={`pack${isOpen ? " open" : ""}`}>
      <button
        className="pack-h"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="pack-ic">{ICO.hist}</span>
        <span className="pack-b">
          <span className="pack-t">Session {ps.session_number}</span>
          <span className="pack-s">
            Block {ps.block_number} · {noteBits.join(" · ")} · {items.length} exercises
          </span>
        </span>
        <span className="pack-chev">{ICO.chev}</span>
      </button>
      <div className="pack-body">
        <div className="pack-list">
          {items.map((it, i) => {
            const key = `${ps.session_id}:${i}`;
            const on = !!packPicked[key];
            return (
              <div key={key} className={`pack-ex${on ? " picked" : ""}`}>
                <button
                  className="pick-box"
                  onClick={() => onPick(key)}
                  aria-pressed={on}
                  aria-label={`Select ${it.name}`}
                >
                  {ICO.checkSm}
                </button>
                <span className="pack-ex-t">{it.name}</span>
                <span className="pack-ex-s">{it.presc}</span>
              </div>
            );
          })}
        </div>
        <div className="pack-foot">
          <button className="btn btn-outline" onClick={onAddPicked} disabled={nPicked === 0}>
            Add {nPicked || ""} selected
          </button>
          <button className="btn btn-primary" onClick={onAddAll}>
            Add all {items.length}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplatePack({
  tmpl,
  openPack,
  packPicked,
  onToggle,
  onPick,
  onAddPicked,
  onAddAll,
}: {
  tmpl: TemplateEntry;
  openPack: string | null;
  packPicked: Record<string, boolean>;
  onToggle: () => void;
  onPick: (key: string) => void;
  onAddPicked: () => void;
  onAddAll: () => void;
}) {
  const isOpen = openPack === tmpl.id;
  const items: { name: string; presc: string }[] = [];
  for (const sk of SECTION_KEYS) {
    for (const ex of tmpl.data[sk] || []) {
      items.push({ name: ex.exercise_name, presc: exercisePrescription(ex) });
    }
  }

  const nPicked = Object.keys(packPicked).filter((k) => k.startsWith(`${tmpl.id}:`)).length;

  return (
    <div className={`pack${isOpen ? " open" : ""}`}>
      <button
        className="pack-h"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="pack-ic tmpl">{ICO.tmpl}</span>
        <span className="pack-b">
          <span className="pack-t">{tmpl.name}</span>
          <span className="pack-s">
            {tmpl.archetypes.filter(Boolean).join(", ")}
            {!tmpl.archetypes.length ? ` · ${items.length} exercises` : ` · ${items.length} exercises`}
          </span>
        </span>
        <span className="pack-chev">{ICO.chev}</span>
      </button>
      <div className="pack-body">
        <div className="pack-list">
          {items.map((it, i) => {
            const key = `${tmpl.id}:${i}`;
            const on = !!packPicked[key];
            return (
              <div key={key} className={`pack-ex${on ? " picked" : ""}`}>
                <button
                  className="pick-box"
                  onClick={() => onPick(key)}
                  aria-pressed={on}
                  aria-label={`Select ${it.name}`}
                >
                  {ICO.checkSm}
                </button>
                <span className="pack-ex-t">{it.name}</span>
                <span className="pack-ex-s">{it.presc}</span>
              </div>
            );
          })}
        </div>
        <div className="pack-foot">
          <button className="btn btn-outline" onClick={onAddPicked} disabled={nPicked === 0}>
            Add {nPicked || ""} selected
          </button>
          <button className="btn btn-primary" onClick={onAddAll}>
            Add all {items.length}
          </button>
        </div>
      </div>
    </div>
  );
}
