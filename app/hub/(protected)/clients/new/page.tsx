"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { IconChevronLeft, IconUsers, IconMapPin, IconHeart, IconTarget, IconClipboardList, IconEdit3, IconCheck, IconPlus } from "@/components/icons";
import Link from "next/link";
import { HubCard, HubCardHeader, HubPageHeader } from "@/components/hub";
import { TagMultiSelect } from "@/components/hub/TagMultiSelect";
import { InjuryHistoryTable } from "@/components/hub/InjuryHistoryTable";
import { TrainingRulesEditor } from "@/components/hub/TrainingRulesEditor";
import type { ClientProfile, Gender, Package } from "@/types";

function calculateAge(dob: string | null): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Segmented control — used for the short exclusive sets (training location,
 * sessions/week, time tier, fitness level, pace mode) so every option is
 * visible at once. Mirrors the reference edit mockup's .seg component.
 */
function SegmentedControl<T extends string | number>({
  legend,
  name,
  value,
  onChange,
  options,
}: {
  legend: string;
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; sub?: string }[];
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-foreground">{legend}</legend>
      <div className="flex rounded-lg border border-[var(--color-muted-text)] bg-[var(--hub-canvas)] p-0.5 gap-0.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <label key={String(opt.value)} className="flex-1">
              <input
                type="radio"
                name={name}
                value={String(opt.value)}
                checked={active}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <span
                className={
                  "flex min-h-[30px] cursor-pointer items-center justify-center rounded-md px-2.5 text-center text-sm font-semibold transition-colors " +
                  (active
                    ? "bg-[var(--hub-card)] text-foreground shadow-sm"
                    : "text-[var(--color-body)] hover:text-foreground")
                }
              >
                {opt.label}
                {opt.sub && <span className="ml-1 text-[11px] font-medium text-muted-foreground">{opt.sub}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const emptyProfile: ClientProfile = {
  client: { id: "", name: "", age: 0, date_of_birth: null, gender: "" },
  logistics: { training_location: "studio", sessions_per_week: 2, time_tier: "standard", block_number: 1 },
  health: { gp_clearance: false, gp_clearance_required: false, conditions: [], contraindications: [], medications_relevant: [], injury_history: [], pain_points: [], parq_trainer_override: false, parq_trainer_override_note: "" },
  physical_baseline: { fitness_level: 3, movement_quality_flags: [], strength_baseline: { lower_body: "beginner", upper_body: "beginner", core: "beginner" } },
  programming_adaptations: [],
  goals: { primary: "general_fitness", secondary: [], milestones: [] },
  notes: { client_intro: "", esther_observations: "", motivation_notes: "", watch_for: "" },
};

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState<ClientProfile>(emptyProfile);
  const [packageType, setPackageType] = useState<Package | null>("12-week");

  const updateProfile = <K extends keyof ClientProfile>(section: K, updates: Partial<ClientProfile[K]>) => {
    setProfile((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Client name is required");
      return;
    }

    setSaving(true);
    const fullProfile: ClientProfile = {
      ...profile,
      client: { ...profile.client, name: name.trim(), age: calculateAge(profile.client.date_of_birth) },
    };

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        profile: fullProfile,
        package_type: packageType,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to save client" }));
      toast.error(`Failed to save client: ${err.error}`);
      setSaving(false);
      return;
    }

    const data = await res.json();
    toast.success("Client created");
    router.push(`/hub/clients/${data.client_number}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/hub/clients"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md px-2 py-1 -ml-2 mb-3 transition-colors"
        >
          <IconChevronLeft className="h-3.5 w-3.5" />
          Back to Clients
        </Link>
        <HubPageHeader
          title="New client"
          subtitle="Create a new client profile — the Plan Agent reads everything here when it builds a block."
        />
      </div>

      <div className="space-y-6">
        <HubCard>
          <HubCardHeader icon={<IconUsers className="w-4 h-4" />} title="Basic info" subtitle="Who the client is, and how to reach them" color="navy" noBottomPadding />
          <div className="px-5 pb-5 pt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={profile.client.date_of_birth ?? ""}
                  onChange={(e) => updateProfile("client", { date_of_birth: e.target.value || null })}
                  className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                />
                <p className="text-xs text-muted-foreground">
                  {profile.client.date_of_birth ? `Age: ${calculateAge(profile.client.date_of_birth)}` : "Age will be calculated from date of birth"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={profile.client.gender || undefined} onValueChange={(v: Gender) => updateProfile("client", { gender: v })}>
                  <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                />
                <p className="text-xs text-muted-foreground">Used to send 6-week updates.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07…"
                  className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                />
              </div>
            </div>
          </div>
        </HubCard>

        <HubCard>
          <HubCardHeader icon={<IconMapPin className="w-4 h-4" />} title="Logistics" subtitle="Where, how often and how long" color="slate" noBottomPadding />
          <div className="px-5 pb-5 pt-4 space-y-4">
            <SegmentedControl
              legend="Training location"
              name="training_location"
              value={profile.logistics.training_location}
              onChange={(v) => updateProfile("logistics", { training_location: v })}
              options={[
                { value: "studio", label: "Studio" },
                { value: "home", label: "Home" },
                { value: "both", label: "Both" },
              ]}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <SegmentedControl
                legend="Sessions / week"
                name="sessions_per_week"
                value={profile.logistics.sessions_per_week}
                onChange={(v) => updateProfile("logistics", { sessions_per_week: v as 1 | 2 | 3 })}
                options={[
                  { value: 1, label: "1×" },
                  { value: 2, label: "2×" },
                  { value: 3, label: "3×" },
                ]}
              />
              <div className="space-y-2">
                <Label>Package</Label>
                <Select value={packageType ?? ""} onValueChange={(v: Package) => setPackageType(v)}>
                  <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4-week">4-week</SelectItem>
                    <SelectItem value="6-week">6-week</SelectItem>
                    <SelectItem value="12-week">12-week</SelectItem>
                    <SelectItem value="24-week">24-week</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SegmentedControl
              legend="Time tier"
              name="time_tier"
              value={profile.logistics.time_tier}
              onChange={(v) => updateProfile("logistics", { time_tier: v })}
              options={[
                { value: "compact", label: "Compact", sub: "~45m" },
                { value: "standard", label: "Standard", sub: "~60m" },
                { value: "extended", label: "Extended", sub: "~75–90m" },
              ]}
            />
          </div>
        </HubCard>

        <HubCard>
          <HubCardHeader icon={<IconHeart className="w-4 h-4" />} title="Health and clearance" subtitle="What has to be adapted around, and what unblocks planning" color="rose" noBottomPadding />
          <div className="px-5 pb-5 pt-4 space-y-4">
            <div className="flex items-start gap-3 py-3.5 border-t border-[var(--hub-border)] first:border-t-0 first:pt-0">
              <label htmlFor="gp_clearance" className="relative shrink-0 w-5 h-5 mt-px cursor-pointer">
                <input
                  type="checkbox"
                  id="gp_clearance"
                  checked={profile.health.gp_clearance}
                  onChange={(e) => updateProfile("health", { gp_clearance: e.target.checked })}
                  className="sr-only"
                />
                <span className={`absolute inset-0 rounded-[5px] border cursor-pointer transition-colors grid place-items-center ${profile.health.gp_clearance ? "bg-rose border-rose" : "bg-[var(--hub-card)] border-[var(--color-muted-text)]"}`}>
                  {profile.health.gp_clearance && <IconCheck className="w-3.5 h-3.5 text-white" />}
                </span>
              </label>
              <div className="min-w-0">
                <Label htmlFor="gp_clearance" className="text-[13px] font-semibold text-foreground cursor-pointer">GP clearance obtained</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Tick once the written clearance letter is on file.</p>
              </div>
            </div>
            <div className="space-y-2 rounded-[12px] border border-[var(--hub-border)] p-3">
              <div className="flex items-start gap-3">
                <label htmlFor="parq_trainer_override" className="relative shrink-0 w-5 h-5 mt-px cursor-pointer">
                  <input
                    type="checkbox"
                    id="parq_trainer_override"
                    checked={profile.health.parq_trainer_override ?? false}
                    onChange={(e) => updateProfile("health", { parq_trainer_override: e.target.checked })}
                    className="sr-only"
                  />
                  <span className={`absolute inset-0 rounded-[5px] border cursor-pointer transition-colors grid place-items-center ${(profile.health.parq_trainer_override ?? false) ? "bg-rose border-rose" : "bg-[var(--hub-card)] border-[var(--color-muted-text)]"}`}>
                    {(profile.health.parq_trainer_override ?? false) && <IconCheck className="w-3.5 h-3.5 text-white" />}
                  </span>
                </label>
                <div className="min-w-0">
                  <Label htmlFor="parq_trainer_override" className="text-[13px] font-semibold text-foreground cursor-pointer">PAR-Q trainer override — completed on Microsoft Forms, not yet in system</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Only tick this once you've personally reviewed the client's submitted PAR-Q. This unblocks plan
                    generation until the record is migrated into the hub — it does not replace a signed PAR-Q on file.
                  </p>
                </div>
              </div>
              {profile.health.parq_trainer_override && (
                <Textarea
                  placeholder="Optional note — anything flagged on the form Esther should know (e.g. risk factors, restrictions)"
                  value={profile.health.parq_trainer_override_note ?? ""}
                  onChange={(e) => updateProfile("health", { parq_trainer_override_note: e.target.value })}
                  rows={2}
                  className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Conditions</Label>
              <TagMultiSelect
                category="condition"
                selected={profile.health.conditions}
                onChange={(conditions) => updateProfile("health", { conditions })}
                placeholder="Select known conditions or add new..."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Contraindications</Label>
                <TagMultiSelect
                  category="contraindication"
                  selected={profile.health.contraindications}
                  onChange={(contraindications) => updateProfile("health", { contraindications })}
                  placeholder="Select contraindications or add new..."
                />
              </div>
              <div className="space-y-2">
                <Label>Pain Points</Label>
                <TagMultiSelect
                  category="pain_point"
                  selected={profile.health.pain_points}
                  onChange={(pain_points) => updateProfile("health", { pain_points })}
                  placeholder="Select pain points or add new..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Injury History</Label>
              <InjuryHistoryTable
                value={profile.health.injury_history}
                onChange={(injury_history) => updateProfile("health", { injury_history })}
              />
            </div>
          </div>
        </HubCard>

        <HubCard>
          <HubCardHeader icon={<IconTarget className="w-4 h-4" />} title="Goals" subtitle="What the client is working towards" color="teal" noBottomPadding />
          <div className="px-5 pb-5 pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Primary Goal</Label>
              <Select value={profile.goals.primary} onValueChange={(v: ClientProfile["goals"]["primary"]) => updateProfile("goals", { primary: v })}>
                <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="mobility">Mobility</SelectItem>
                  <SelectItem value="weight_loss">Weight Loss</SelectItem>
                  <SelectItem value="rehabilitation">Rehabilitation</SelectItem>
                  <SelectItem value="confidence">Confidence</SelectItem>
                  <SelectItem value="general_fitness">General Fitness</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Milestones</Label>
              <TagMultiSelect
                category="milestone"
                selected={profile.goals.milestones}
                onChange={(milestones) => updateProfile("goals", { milestones })}
                placeholder="Select milestones or add new..."
              />
            </div>
          </div>
        </HubCard>

        <HubCard>
          <HubCardHeader icon={<IconClipboardList className="w-4 h-4" />} title="Training rules" subtitle="Applied systematically by the Plan Agent" color="navy" noBottomPadding />
          <div className="px-5 pb-5 pt-4">
            <TrainingRulesEditor
              value={profile.programming_adaptations}
              onChange={(programming_adaptations) => setProfile((prev) => ({ ...prev, programming_adaptations }))}
            />
          </div>
        </HubCard>

        <HubCard>
          <HubCardHeader icon={<IconEdit3 className="w-4 h-4" />} title="Notes" subtitle="Prose the Plan Agent reads for context" color="slate" noBottomPadding />
          <div className="px-5 pb-5 pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Client intro</Label>
              <p className="text-xs text-muted-foreground">Shown at the top of each session. A short note Esther writes to set the tone for this client&rsquo;s workouts.</p>
              <Textarea value={profile.notes.client_intro} onChange={(e) => updateProfile("notes", { client_intro: e.target.value })} rows={2} placeholder="e.g. &quot;Welcome back — let&rsquo;s keep the momentum going this week.&quot;" className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
            </div>
            <div className="space-y-2">
              <Label>Esther's Observations</Label>
              <Textarea value={profile.notes.esther_observations} onChange={(e) => updateProfile("notes", { esther_observations: e.target.value })} rows={3} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Motivation Notes</Label>
                <Textarea value={profile.notes.motivation_notes} onChange={(e) => updateProfile("notes", { motivation_notes: e.target.value })} rows={2} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
              </div>
              <div className="space-y-2">
                <Label>Watch For</Label>
                <Textarea value={profile.notes.watch_for} onChange={(e) => updateProfile("notes", { watch_for: e.target.value })} rows={2} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
              </div>
            </div>
          </div>
        </HubCard>

        {/* Sticky save bar — mirrors the reference edit mockup */}
        <div className="sticky bottom-0 z-15 flex items-center gap-3 mt-6 rounded-[12px] border border-[var(--hub-border)] bg-white/90 backdrop-blur px-5 py-3 shadow-[0_-1px_3px_rgba(16,24,40,0.05)]">
          <p className="m-0 text-xs text-muted-foreground">
            <span><b className="text-foreground font-semibold">Ready to create client.</b></span>
          </p>
          <div className="ml-auto flex gap-2">
            <Link href="/hub/clients">
              <Button variant="outline" className="rounded-lg border border-[var(--color-muted-text)]">Cancel</Button>
            </Link>
            <Button onClick={handleSave} disabled={saving} className="rounded-lg gap-2 bg-rose hover:bg-rose/90 text-white">
              {!saving && <IconPlus className="w-4 h-4" />}
              {saving ? "Saving..." : "Create client"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
