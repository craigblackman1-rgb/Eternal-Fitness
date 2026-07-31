"use client";

import { useState } from "react";
import { HubCard, HubCardHeader } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    try {
      const res = await fetch(`/api/plan-agent-settings/${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save");
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <div className="space-y-6">
      {sortedSections.map((section) => (
        <div key={section} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            {section}
          </h2>
          <div className="space-y-4">
            {grouped[section].map((setting) => (
              <SettingEditor
                key={setting.key}
                setting={setting}
                onUpdate={(value) => updateLocal(setting.key, value)}
                onSave={(value) => saveSetting(setting.key, value)}
              />
            ))}
          </div>
        </div>
      ))}
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
  onSave: (value: unknown) => void;
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
  onSave: (value: unknown) => void;
}) {
  const modes = setting.value as PaceModesValue;
  const [draft, setDraft] = useState(modes);
  const [saving, setSaving] = useState(false);

  function updateField(key: keyof PaceMode, mode: string, val: string | boolean) {
    setDraft((prev) => {
      const next = { ...prev, [mode]: { ...prev[mode], [key]: typeof val === "boolean" ? val : (key === "finisher" ? Boolean(val) : Number(val)) } };
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    onUpdate(draft);
    await onSave(draft);
    setSaving(false);
  }

  const modeKeys = ["fast", "medium", "slow"] as const;

  return (
    <HubCard>
      <HubCardHeader icon={<IconClipboardList className="w-4 h-4" />} title={setting.label} subtitle={setting.description ?? undefined} color="teal" />
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--hub-border)] bg-[var(--hub-hover)]">
                <th className="text-left font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-4">Mode</th>
                <th className="text-center font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-3">Superset A</th>
                <th className="text-center font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-3">Superset B</th>
                <th className="text-center font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-3">Arms + core</th>
                <th className="text-center font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 px-3">Total</th>
                <th className="text-center font-semibold uppercase tracking-wide text-[11px] text-muted-foreground h-10 pl-3 pr-4">Finisher</th>
              </tr>
            </thead>
            <tbody>
              {modeKeys.map((mode) => (
                <tr key={mode} className="border-b border-[var(--hub-border)] last:border-0 hover:bg-[var(--hub-hover)] transition-colors">
                  <td className="py-2 pr-4 font-medium capitalize">{draft[mode].label}</td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      className="w-16 text-center h-8 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30"
                      value={draft[mode].superset_a}
                      onChange={(e) => updateField("superset_a", mode, e.target.value)}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      className="w-16 text-center h-8 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30"
                      value={draft[mode].superset_b}
                      onChange={(e) => updateField("superset_b", mode, e.target.value)}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      className="w-16 text-center h-8 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30"
                      value={draft[mode].arms_core}
                      onChange={(e) => updateField("arms_core", mode, e.target.value)}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Input
                      type="number"
                      className="w-16 text-center h-8 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30"
                      value={draft[mode].total}
                      onChange={(e) => updateField("total", mode, e.target.value)}
                    />
                  </td>
                  <td className="py-2 pl-3 flex justify-center">
                    <Switch
                      checked={draft[mode].finisher}
                      onCheckedChange={(checked) => updateField("finisher", mode, checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <Button size="sm" className="rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold" onClick={handleSave} disabled={saving}>
            Save
          </Button>
        </div>
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
  onSave: (value: unknown) => void;
}) {
  const [draft, setDraft] = useState(typeof setting.value === "string" ? setting.value : JSON.stringify(setting.value));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    onUpdate(draft);
    await onSave(draft);
    setSaving(false);
  }

  return (
    <HubCard>
      <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title={setting.label} subtitle={setting.description ?? undefined} color="navy" />
      <div className="space-y-3">
        <Textarea
          rows={10}
          className="font-mono text-sm rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" className="rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold" onClick={handleSave} disabled={saving}>
            Save
          </Button>
        </div>
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
  onSave: (value: unknown) => void;
}) {
  const arr = Array.isArray(setting.value) ? setting.value : [];
  const [draft, setDraft] = useState(arr.join("\n"));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const parsed = draft.split("\n").map((s) => s.trim()).filter(Boolean);
    setSaving(true);
    onUpdate(parsed);
    await onSave(parsed);
    setSaving(false);
  }

  return (
    <HubCard>
      <HubCardHeader icon={SECTION_ICONS[setting.section] ?? <IconBot className="w-4 h-4" />} title={setting.label} subtitle={setting.description ?? undefined} color={SECTION_COLORS[setting.section] ?? "slate"} />
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">One item per line</Label>
        <Textarea
          rows={10}
          className="font-mono text-sm rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" className="rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold" onClick={handleSave} disabled={saving}>
            Save
          </Button>
        </div>
      </div>
    </HubCard>
  );
}

/** Editor for a flat Record<string,string> — one labelled row per key, shared Save.
 *  Used for phase_guidance (foundation/build/develop/peak/deload) and
 *  archetype_labels (A/B/C). */
function KeyedTextEditor({
  setting,
  onUpdate,
  onSave,
}: {
  setting: PlanAgentSetting;
  onUpdate: (value: unknown) => void;
  onSave: (value: unknown) => void;
}) {
  const initial = (setting.value && typeof setting.value === "object" ? setting.value : {}) as Record<string, string>;
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);

  function updateField(k: string, v: string) {
    setDraft((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    setSaving(true);
    onUpdate(draft);
    await onSave(draft);
    setSaving(false);
  }

  return (
    <HubCard>
      <HubCardHeader icon={SECTION_ICONS[setting.section] ?? <IconBot className="w-4 h-4" />} title={setting.label} subtitle={setting.description ?? undefined} color={SECTION_COLORS[setting.section] ?? "slate"} />
      <div className="space-y-3">
        {Object.keys(draft).map((k) => (
          <div key={k} className="space-y-1">
            <Label className="text-xs text-muted-foreground capitalize">{k}</Label>
            <Input className="h-9 rounded-lg border-[var(--hub-field-border)] bg-[var(--hub-card)] focus:border-rose focus:ring-rose/30" value={draft[k]} onChange={(e) => updateField(k, e.target.value)} />
          </div>
        ))}
        <div className="flex justify-end">
          <Button size="sm" className="rounded-lg bg-rose hover:bg-rose/90 text-white font-semibold" onClick={handleSave} disabled={saving}>
            Save
          </Button>
        </div>
      </div>
    </HubCard>
  );
}
