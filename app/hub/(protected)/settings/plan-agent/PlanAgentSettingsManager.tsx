"use client";

import { useState, useRef, useCallback } from "react";
import { HubCard, HubCardHeader } from "@/components/hub";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { IconBot, IconFileText, IconClipboardCheck, IconClipboardList } from "@/components/icons";
import { toast } from "sonner";

interface PlanAgentSetting {
  key: string;
  label: string;
  section: string;
  value_type: string;
  value: unknown;
  sort_order: number;
  description: string | null;
}

interface PlanAgentSettingsManagerProps {
  initialSettings: PlanAgentSetting[];
}

interface PaceMode {
  label: string;
  superset_a: number;
  superset_b: number;
  arms_core: number;
  finisher: boolean;
  total: number;
}

interface PaceModesValue {
  fast: PaceMode;
  medium: PaceMode;
  slow: PaceMode;
}

const SECTION_COLORS: Record<string, "rose" | "teal" | "navy" | "slate" | "amber"> = {
  "Pace Modes": "teal",
  "Block Planning": "navy",
  "Archetypes": "amber",
  "General": "slate",
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  "Pace Modes": <IconClipboardList className="w-4 h-4" />,
  "Block Planning": <IconFileText className="w-4 h-4" />,
  "Archetypes": <IconClipboardCheck className="w-4 h-4" />,
  "General": <IconBot className="w-4 h-4" />,
};

/** Reusable inline "Saved" flash that fades out after ~2s. */
function SavedFlash({ visible }: { visible: boolean }) {
  return (
    <span
      className="text-[12px] font-semibold transition-opacity duration-200"
      style={{ color: "var(--status-success, #087E8B)", opacity: visible ? 1 : 0 }}
    >
      Saved
    </span>
  );
}

/** Reusable save-button row: inline flash + rose CTA. */
function CardActions({
  saved,
  onSave,
  saving,
}: {
  saved: boolean;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-[10px]">
      <SavedFlash visible={saved} />
      <button
        type="button"
        className="inline-flex items-center gap-1.5 h-[34px] px-[14px] rounded-lg bg-[var(--color-rose)] text-white text-[12.5px] font-semibold border-0 cursor-pointer transition-opacity hover:opacity-[.88] disabled:opacity-60"
        onClick={onSave}
        disabled={saving}
      >
        Save
      </button>
    </div>
  );
}

export function PlanAgentSettingsManager({ initialSettings }: PlanAgentSettingsManagerProps) {
  const [settings, setSettings] = useState(initialSettings);

  const grouped = settings.reduce<Record<string, PlanAgentSetting[]>>((acc, s) => {
    if (!acc[s.section]) acc[s.section] = [];
    acc[s.section].push(s);
    return acc;
  }, {});

  const sortedSections = Object.keys(grouped).sort((a, b) => {
    const orderA = grouped[a][0]?.sort_order ?? 0;
    const orderB = grouped[b][0]?.sort_order ?? 0;
    return orderA - orderB;
  });

  function updateLocal(key: string, value: unknown) {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  }

  async function saveSetting(key: string, value: unknown) {
    const res = await fetch(`/api/plan-agent-settings/${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save");
  }

  return (
    <div>
      <div className="space-y-8">
        {sortedSections.map((section) => (
          <div key={section}>
            <h2 className="text-xs font-bold uppercase tracking-[.08em] text-muted-foreground mb-3">
              {section}
            </h2>
            <div className="flex flex-col gap-4">
              {grouped[section].map((setting) => (
                <SettingEditor
                  key={setting.key}
                  setting={setting}
                  onUpdate={(value) => updateLocal(setting.key, value)}
                  onSave={async (value) => { await saveSetting(setting.key, value); }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingEditor({
  setting,
  onUpdate,
  onSave,
}: {
  setting: PlanAgentSetting;
  onUpdate: (value: unknown) => void;
  onSave: (value: unknown) => Promise<void>;
}) {
  if (setting.value_type === "pace_modes") {
    return <PaceModesEditor setting={setting} onUpdate={onUpdate} onSave={onSave} />;
  }
  if (setting.value_type === "text") {
    return <TextEditor setting={setting} onUpdate={onUpdate} onSave={onSave} />;
  }
  if (setting.value_type === "list") {
    return <ListEditor setting={setting} onUpdate={onUpdate} onSave={onSave} />;
  }
  if (setting.value_type === "phase_guidance" || setting.value_type === "archetype_labels") {
    return <KeyedTextEditor setting={setting} onUpdate={onUpdate} onSave={onSave} />;
  }
  return null;
}

function PaceModesEditor({
  setting,
  onUpdate,
  onSave,
}: {
  setting: PlanAgentSetting;
  onUpdate: (value: unknown) => void;
  onSave: (value: unknown) => Promise<void>;
}) {
  const modes = setting.value as PaceModesValue;
  const [draft, setDraft] = useState(modes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(() => {
    setSaved(true);
    if (flashRef.current) clearTimeout(flashRef.current);
    flashRef.current = setTimeout(() => setSaved(false), 2000);
  }, []);

  function updateField(key: keyof PaceMode, mode: string, val: string | boolean) {
    setDraft((prev) => {
      const next = { ...prev, [mode]: { ...prev[mode], [key]: typeof val === "boolean" ? val : (key === "finisher" ? Boolean(val) : Number(val)) } };
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    onUpdate(draft);
    try {
      await onSave(draft);
      flash();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  }

  const modeKeys = ["fast", "medium", "slow"] as const;

  return (
    <HubCard>
      <HubCardHeader
        icon={<IconClipboardList className="w-4 h-4" />}
        title={setting.label}
        subtitle={setting.description ?? undefined}
        color="teal"
      />
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--hub-border)]">
                <th className="text-left font-semibold uppercase tracking-[.04em] text-[11px] text-muted-foreground py-2 px-1.5">Mode</th>
                <th className="text-center font-semibold uppercase tracking-[.04em] text-[11px] text-muted-foreground py-2 px-1.5">Superset A</th>
                <th className="text-center font-semibold uppercase tracking-[.04em] text-[11px] text-muted-foreground py-2 px-1.5">Superset B</th>
                <th className="text-center font-semibold uppercase tracking-[.04em] text-[11px] text-muted-foreground py-2 px-1.5">Arms + core</th>
                <th className="text-center font-semibold uppercase tracking-[.04em] text-[11px] text-muted-foreground py-2 px-1.5">Total</th>
                <th className="text-center font-semibold uppercase tracking-[.04em] text-[11px] text-muted-foreground py-2 pl-1.5 pr-1.5">
                  Finisher
                </th>
              </tr>
            </thead>
            <tbody>
              {modeKeys.map((mode) => (
                <tr key={mode} className="border-b border-[var(--hub-hover)] last:border-0">
                  <td className="py-2 px-1.5 font-semibold text-foreground capitalize">{draft[mode].label}</td>
                  <td className="py-2 px-1.5 text-center">
                    <Input
                      type="number"
                      className="w-14 h-8 text-center text-[13px] rounded-[7px] border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-[var(--color-rose)] [&:focus]:shadow-[0_0_0_3px_rgba(193,131,159,.3)]"
                      value={draft[mode].superset_a}
                      onChange={(e) => updateField("superset_a", mode, e.target.value)}
                    />
                  </td>
                  <td className="py-2 px-1.5 text-center">
                    <Input
                      type="number"
                      className="w-14 h-8 text-center text-[13px] rounded-[7px] border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-[var(--color-rose)] [&:focus]:shadow-[0_0_0_3px_rgba(193,131,159,.3)]"
                      value={draft[mode].superset_b}
                      onChange={(e) => updateField("superset_b", mode, e.target.value)}
                    />
                  </td>
                  <td className="py-2 px-1.5 text-center">
                    <Input
                      type="number"
                      className="w-14 h-8 text-center text-[13px] rounded-[7px] border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-[var(--color-rose)] [&:focus]:shadow-[0_0_0_3px_rgba(193,131,159,.3)]"
                      value={draft[mode].arms_core}
                      onChange={(e) => updateField("arms_core", mode, e.target.value)}
                    />
                  </td>
                  <td className="py-2 px-1.5 text-center">
                    <Input
                      type="number"
                      className="w-14 h-8 text-center text-[13px] rounded-[7px] border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-[var(--color-rose)] [&:focus]:shadow-[0_0_0_3px_rgba(193,131,159,.3)]"
                      value={draft[mode].total}
                      onChange={(e) => updateField("total", mode, e.target.value)}
                    />
                  </td>
                  <td className="py-2 px-1.5">
                    <div className="flex justify-center">
                      <Switch
                        className="data-[state=checked]:bg-[var(--status-success,#087E8B)]"
                        checked={draft[mode].finisher}
                        onCheckedChange={(checked) => updateField("finisher", mode, checked)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CardActions saved={saved} onSave={handleSave} saving={saving} />
      </div>
    </HubCard>
  );
}

function TextEditor({
  setting,
  onUpdate,
  onSave,
}: {
  setting: PlanAgentSetting;
  onUpdate: (value: unknown) => void;
  onSave: (value: unknown) => Promise<void>;
}) {
  const [draft, setDraft] = useState(typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(() => {
    setSaved(true);
    if (flashRef.current) clearTimeout(flashRef.current);
    flashRef.current = setTimeout(() => setSaved(false), 2000);
  }, []);

  async function handleSave() {
    setSaving(true);
    onUpdate(draft);
    try {
      await onSave(draft);
      flash();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  }

  return (
    <HubCard>
      <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title={setting.label} subtitle={setting.description ?? undefined} color="navy" />
      <div className="flex flex-col gap-3">
        <Textarea
          rows={6}
          className="font-mono text-[12.5px] rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-[var(--color-rose)] [&:focus]:shadow-[0_0_0_3px_rgba(193,131,159,.3)] resize-y"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <CardActions saved={saved} onSave={handleSave} saving={saving} />
      </div>
    </HubCard>
  );
}

function ListEditor({
  setting,
  onUpdate,
  onSave,
}: {
  setting: PlanAgentSetting;
  onUpdate: (value: unknown) => void;
  onSave: (value: unknown) => Promise<void>;
}) {
  const arr = Array.isArray(setting.value) ? setting.value : [];
  const [draft, setDraft] = useState(arr.join("\n"));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(() => {
    setSaved(true);
    if (flashRef.current) clearTimeout(flashRef.current);
    flashRef.current = setTimeout(() => setSaved(false), 2000);
  }, []);

  async function handleSave() {
    const parsed = draft.split("\n").map((s) => s.trim()).filter(Boolean);
    setSaving(true);
    onUpdate(parsed);
    try {
      await onSave(parsed);
      flash();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  }

  return (
    <HubCard>
      <HubCardHeader icon={SECTION_ICONS[setting.section] ?? <IconBot className="w-4 h-4" />} title={setting.label} subtitle={setting.description ?? undefined} color={SECTION_COLORS[setting.section] ?? "slate"} />
      <div className="flex flex-col gap-3">
        <p className="text-[11px] text-muted-foreground">One item per line</p>
        <Textarea
          rows={6}
          className="font-mono text-[12.5px] rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-[var(--color-rose)] [&:focus]:shadow-[0_0_0_3px_rgba(193,131,159,.3)] resize-y"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <CardActions saved={saved} onSave={handleSave} saving={saving} />
      </div>
    </HubCard>
  );
}

function KeyedTextEditor({
  setting,
  onUpdate,
  onSave,
}: {
  setting: PlanAgentSetting;
  onUpdate: (value: unknown) => void;
  onSave: (value: unknown) => Promise<void>;
}) {
  const initial = (setting.value && typeof setting.value === "object" ? setting.value : {}) as Record<string, string>;
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(() => {
    setSaved(true);
    if (flashRef.current) clearTimeout(flashRef.current);
    flashRef.current = setTimeout(() => setSaved(false), 2000);
  }, []);

  function updateField(k: string, v: string) {
    setDraft((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    setSaving(true);
    onUpdate(draft);
    try {
      await onSave(draft);
      flash();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  }

  return (
    <HubCard>
      <HubCardHeader icon={SECTION_ICONS[setting.section] ?? <IconBot className="w-4 h-4" />} title={setting.label} subtitle={setting.description ?? undefined} color={SECTION_COLORS[setting.section] ?? "slate"} />
      <div className="flex flex-col gap-2.5">
        {Object.keys(draft).map((k) => (
          <div key={k} className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-[.04em] text-muted-foreground">
              {k}
            </label>
            <Input
              className="h-9 text-[13px] rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-[var(--color-rose)] [&:focus]:shadow-[0_0_0_3px_rgba(193,131,159,.3)]"
              value={draft[k]}
              onChange={(e) => updateField(k, e.target.value)}
            />
          </div>
        ))}
        <CardActions saved={saved} onSave={handleSave} saving={saving} />
      </div>
    </HubCard>
  );
}
