"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { IconChevronLeft, IconCalendar, IconUser, IconHeart, IconRuler, IconTarget, IconShieldCheck, IconBot, IconFileText, IconCheck, IconAlertCircle, IconSave, IconLayoutDashboard, IconDumbbell } from "@/components/icons";
import Link from "next/link";
import { HubCard, HubCardHeader, HubAlert, StatusBadge } from "@/components/hub";
import { TagMultiSelect } from "@/components/hub/TagMultiSelect";
import { InjuryHistoryTable } from "@/components/hub/InjuryHistoryTable";
import { TrainingRulesEditor } from "@/components/hub/TrainingRulesEditor";
import { EquipmentMultiSelect } from "@/components/hub/EquipmentMultiSelect";
import type { ClientProfile, DBClientComplianceStatus, DBClientGroupType, DBClientPaceMode, DeliveryMode, Gender, Package } from "@/types";
import { DEFAULT_SPLITS, parseSplits } from "@/lib/planAgentPrompt";
import { RESOURCES } from "@/lib/resources";

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

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [clientNumber, setClientNumber] = useState<number | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profile, setProfile] = useState<ClientProfile>(emptyProfile);
  const [complianceStatus, setComplianceStatus] = useState<DBClientComplianceStatus>("action_needed");
  const [outstandingActions, setOutstandingActions] = useState("");
  const [groupType, setGroupType] = useState<DBClientGroupType>("individual_journey");
  const [paceMode, setPaceMode] = useState<DBClientPaceMode>("medium");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("studio_1to1");
  const [equipment, setEquipment] = useState<string[] | null>(null);
  const [resourceVisibility, setResourceVisibility] = useState<Record<string, boolean>>({});
  const [splitOptions, setSplitOptions] = useState<string[]>(parseSplits(DEFAULT_SPLITS).map((s) => s.label));
  const [blocksCompleted, setBlocksCompleted] = useState<number>(0);
  const [sessionsLogged, setSessionsLogged] = useState<number>(0);
  const [lastSessionDate, setLastSessionDate] = useState<string | null>(null);
  const [hasSignedAgreementDocument, setHasSignedAgreementDocument] = useState(false);
  const [bandSetId, setBandSetId] = useState<string | null>(null);
  const [bandSets, setBandSets] = useState<{ id: string; name: string; owner_type: string }[]>([]);
  const [packageType, setPackageType] = useState<Package | null>(null);

  useEffect(() => {
    // Split options come from the Plan Agent "splits" setting so Esther can add
    // one at Settings → Plan Agent Rules without a deploy; defaults if the fetch fails.
    fetch("/api/plan-agent-settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((rows: { key: string; value: unknown }[] | null) => {
        const raw = rows?.find((r) => r.key === "splits")?.value;
        if (Array.isArray(raw) && raw.length > 0) {
          setSplitOptions(parseSplits(raw as string[]).map((s) => s.label));
        }
      })
      .catch(() => {});

    // CR-EF-016: Fetch available band sets for the assignment dropdown
    fetch("/api/band-sets")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { id: string; name: string; owner_type: string }[] | null) => {
        if (data) setBandSets(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/clients/${params.id}`);
      if (!res.ok) {
        toast.error("Failed to load client");
        router.push("/hub/clients");
        return;
      }
      const data = await res.json();
      setName(data.name);
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      setDirty(false);
      setClientNumber(data.client_number ?? null);
      setCreatedAt(data.created_at ?? null);
      setStartDate(data.start_date ?? null);
      const p = data.profile || {};
      setProfile({
        client: { ...emptyProfile.client, ...(p.client || {}) },
        logistics: { ...emptyProfile.logistics, ...(p.logistics || {}) },
        health: { ...emptyProfile.health, ...(p.health || {}) },
        physical_baseline: {
          ...emptyProfile.physical_baseline,
          ...(p.physical_baseline || {}),
          strength_baseline: {
            ...emptyProfile.physical_baseline.strength_baseline,
            ...(p.physical_baseline?.strength_baseline || {}),
          },
        },
        programming_adaptations: p.programming_adaptations || [],
        goals: { ...emptyProfile.goals, ...(p.goals || {}) },
        notes: { ...emptyProfile.notes, ...(p.notes || {}) },
      });
      setComplianceStatus(data.compliance_status ?? "action_needed");
      setOutstandingActions((data.outstanding_actions ?? []).join("\n"));
      setGroupType(data.group_type ?? "individual_journey");
      setPaceMode(data.pace_mode ?? "medium");
      setDeliveryMode(data.delivery_mode ?? "studio_1to1");
      setEquipment(data.equipment ?? null);
      setResourceVisibility(data.resource_visibility ?? {});
      setBandSetId(data.band_set_id ?? null);
      setPackageType(data.package_type ?? null);
      const blocks: any[] = data._blocks ?? [];
      setBlocksCompleted(blocks.filter((b: any) => b.status === "complete").length);
      const counts: Record<number, number> = data._sessionsCount ?? {};
      setSessionsLogged(Object.values(counts).reduce((a, b) => a + b, 0));
      setLastSessionDate(data._lastSessionDate ?? null);
      setHasSignedAgreementDocument(data._hasSignedAgreementDocument ?? false);
      setLoading(false);
    }
    load();
  }, [params.id, router]);

  const updateProfile = <K extends keyof ClientProfile>(section: K, updates: Partial<ClientProfile[K]>) => {
    setDirty(true);
    setProfile((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }));
  };

  const markDirty = () => setDirty(true);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Client name is required");
      return;
    }

    setSaving(true);
    setDirty(false);
    const fullProfile: ClientProfile = {
      ...profile,
      client: { ...profile.client, name: name.trim(), age: calculateAge(profile.client.date_of_birth) || profile.client.age },
    };

    const res = await fetch(`/api/clients/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        profile: fullProfile,
        compliance_status: complianceStatus,
        outstanding_actions: outstandingActions.split("\n").map((s) => s.trim()).filter(Boolean),
        group_type: groupType,
        pace_mode: paceMode,
        delivery_mode: deliveryMode,
        equipment: equipment,
        resource_visibility: resourceVisibility,
        start_date: startDate,
        band_set_id: bandSetId,
        package_type: packageType,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to save" }));
      toast.error(`Failed to save: ${err.error}`);
      setSaving(false);
      return;
    }

    toast.success("Client updated");
    router.push(`/hub/clients/${params.id}`);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    || "?";

  const gpHeld = profile.health.gp_clearance;
  const parqOverridden = profile.health.parq_trainer_override ?? false;
  const outstandingCount = outstandingActions.split("\n").filter((l) => l.trim()).length;

  return (
    <div className="space-y-6">
      {/* Page header — back link, avatar, title row with badges */}
      <div>
        <Link
          href={`/hub/clients/${params.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md px-2 py-1 -ml-2 mb-3 transition-colors"
        >
          <IconChevronLeft className="h-3.5 w-3.5" />
          Back to {name || "client"}
        </Link>
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-full bg-rose/15 text-rose flex items-center justify-center shrink-0 text-base font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[22px] font-bold tracking-tight text-foreground">Edit client</h1>
              {clientNumber != null && (
                <span className="text-xs font-medium text-muted-foreground bg-[var(--hub-canvas)] border border-[var(--hub-border)] rounded-md px-1.5 py-0.5">
                  #{clientNumber}
                </span>
              )}
              <StatusBadge status={complianceStatus} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {name}{createdAt ? ` · with the studio since ${new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Clinical clearance warning */}
      {(complianceStatus === "pending_medical" || complianceStatus === "action_needed") && (
        <HubAlert
          severity="warning"
          title="Clearance is still outstanding"
        >
          The Plan Agent will not issue a block for {name || "this client"} until GP clearance is recorded, or a PAR-Q override is applied below.
        </HubAlert>
      )}

      {/* Two-column layout — form column + rail */}
      <div className="hub-layout">
        <div className="space-y-6 min-w-0">
          {/* ── All form cards (unchanged) ── */}
        <HubCard>
          <HubCardHeader icon={<IconUser className="w-4 h-4" />} title="Basic info" subtitle="Who the client is, and how to reach them" color="navy" noBottomPadding />
          <div className="px-5 pb-5 pt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="name">Name <span className="font-medium text-muted-foreground">(required)</span></Label>
                <Input id="name" value={name} onChange={(e) => { setDirty(true); setName(e.target.value); }} placeholder="Client name" className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
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
              <div className="space-y-2">
                <Label htmlFor="start_date">Start date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate ?? ""}
                  onChange={(e) => { setDirty(true); setStartDate(e.target.value || null); }}
                  className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                />
                <p className="text-xs text-muted-foreground">
                  When the client's training began — separate from record creation.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setDirty(true); setEmail(e.target.value); }}
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
                  onChange={(e) => { setDirty(true); setPhone(e.target.value); }}
                  placeholder="07…"
                  className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                />
              </div>
            </div>
          </div>
        </HubCard>

        <HubCard>
          <HubCardHeader icon={<IconCalendar className="w-4 h-4" />} title="Logistics" subtitle="Where, how often and how long" color="slate" noBottomPadding />
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
            <div className="grid gap-4 md:grid-cols-3">
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
                <Label>Training Split</Label>
                <Select
                  value={profile.logistics.split ?? splitOptions[0] ?? "Full body"}
                  onValueChange={(v) => updateProfile("logistics", { split: v })}
                >
                  <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {splitOptions.map((label) => (
                      <SelectItem key={label} value={label}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Package</Label>
                <Select value={packageType ?? ""} onValueChange={(v: Package) => { setDirty(true); setPackageType(v); }}>
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
            <div className="space-y-2">
              <Label>Time Tier</Label>
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
            <div className="space-y-2">
              <SegmentedControl
                legend="Delivery mode"
                name="delivery_mode"
                value={deliveryMode}
                onChange={(v) => { setDirty(true); setDeliveryMode(v); }}
                options={[
                  { value: "studio_1to1", label: "Studio 1:1" },
                  { value: "home_training", label: "Home training" },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Home training gives this client a "Your training" tab in their portal, where they can
                view their plan and log their own sets. Studio 1:1 clients see no change — Esther logs
                for them from the session page as usual.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Band set</Label>
              <Select
                value={bandSetId ?? ""}
                onValueChange={(v) => { setDirty(true); setBandSetId(v || null); }}
              >
                <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30">
                  <SelectValue placeholder="EF Studio (default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">EF Studio (default)</SelectItem>
                  {bandSets.filter((s) => s.id !== "00000000-0000-0000-0000-000000000001").map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.owner_type === "client" ? " (client set)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Which band set this client uses for banded exercises. PBs compare by actual tension (kg),
                so a client switching sets won&apos;t lose their history.
              </p>
            </div>
          </div>
        </HubCard>

        <HubCard>
          <HubCardHeader icon={<IconDumbbell className="w-4 h-4" />} title="Equipment" subtitle="What this client has available — constrains plan generation" color="teal" noBottomPadding />
          <div className="px-5 pb-5 pt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Tick every item this client can use. The Plan Agent will only select exercises that match. Leave as
              &quot;Not configured&quot; to use the full studio catalogue (no constraint).
            </p>
            <EquipmentMultiSelect
              selected={equipment}
              onChange={(v) => { setDirty(true); setEquipment(v); }}
            />
          </div>
        </HubCard>

        <HubCard>
          <HubCardHeader icon={<IconHeart className="w-4 h-4" />} title="Health and clearance" subtitle="What has to be adapted around, and what unblocks planning" color="rose" noBottomPadding />
          <div className="px-5 pb-5 pt-4 space-y-4">
            <div className="flex items-start gap-3 py-3.5 border-t border-[var(--hub-border)] first:border-t-0 first:pt-0">
              <label htmlFor="gp_clearance_required" className="relative shrink-0 w-5 h-5 mt-px cursor-pointer">
                <input
                  type="checkbox"
                  id="gp_clearance_required"
                  checked={profile.health.gp_clearance_required ?? false}
                  onChange={(e) => updateProfile("health", { gp_clearance_required: e.target.checked })}
                  className="sr-only"
                />
                <span className={`absolute inset-0 rounded-[5px] border cursor-pointer transition-colors grid place-items-center ${(profile.health.gp_clearance_required ?? false) ? "bg-rose border-rose" : "bg-[var(--hub-card)] border-[var(--color-muted-text)]"}`}>
                  {(profile.health.gp_clearance_required ?? false) && <IconCheck className="w-3.5 h-3.5 text-white" />}
                </span>
              </label>
              <div className="min-w-0">
                <Label htmlFor="gp_clearance_required" className="text-[13px] font-semibold text-foreground cursor-pointer">GP clearance required</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Your call — tick if this client needs written GP clearance before training. Drives the "pending medical" status below until it's obtained.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-3.5 border-t border-[var(--hub-border)]">
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
          <HubCardHeader icon={<IconRuler className="w-4 h-4" />} title="Physical baseline" subtitle="Where the client is starting from" color="teal" noBottomPadding />
          <div className="px-5 pb-5 pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Fitness Level</Label>
              <SegmentedControl
                legend="Fitness level"
                name="fitness_level"
                value={profile.physical_baseline.fitness_level}
                onChange={(v) => updateProfile("physical_baseline", { fitness_level: v as 1 | 2 | 3 | 4 | 5 })}
                options={[
                  { value: 1, label: "1", sub: "Very low" },
                  { value: 2, label: "2", sub: "Low" },
                  { value: 3, label: "3", sub: "Moderate" },
                  { value: 4, label: "4", sub: "Good" },
                  { value: 5, label: "5", sub: "High" },
                ]}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Lower Body Strength</Label>
                <Select
                  value={profile.physical_baseline.strength_baseline.lower_body}
                  onValueChange={(v: "beginner" | "intermediate" | "advanced") =>
                    setProfile((prev) => ({ ...prev, physical_baseline: { ...prev.physical_baseline, strength_baseline: { ...prev.physical_baseline.strength_baseline, lower_body: v } } }))
                  }
                >
                  <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Upper Body Strength</Label>
                <Select
                  value={profile.physical_baseline.strength_baseline.upper_body}
                  onValueChange={(v: "beginner" | "intermediate" | "advanced") =>
                    setProfile((prev) => ({ ...prev, physical_baseline: { ...prev.physical_baseline, strength_baseline: { ...prev.physical_baseline.strength_baseline, upper_body: v } } }))
                  }
                >
                  <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Core Strength</Label>
                <Select
                  value={profile.physical_baseline.strength_baseline.core}
                  onValueChange={(v: "beginner" | "intermediate" | "advanced") =>
                    setProfile((prev) => ({ ...prev, physical_baseline: { ...prev.physical_baseline, strength_baseline: { ...prev.physical_baseline.strength_baseline, core: v } } }))
                  }
                >
                  <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Movement Quality Flags</Label>
              <TagMultiSelect
                category="movement_quality_flag"
                selected={profile.physical_baseline.movement_quality_flags}
                onChange={(movement_quality_flags) => updateProfile("physical_baseline", { movement_quality_flags })}
                placeholder="Select observed movement quality flags or add new..."
              />
            </div>
          </div>
        </HubCard>

        <HubCard>
          <HubCardHeader icon={<IconShieldCheck className="w-4 h-4" />} title="Compliance and pace" subtitle="The safety brake, and how hard the Plan Agent may push" color="amber" noBottomPadding />
          <div className="px-5 pb-5 pt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Compliance Override</Label>
                <Select value={complianceStatus} onValueChange={(v: DBClientComplianceStatus) => { setDirty(true); setComplianceStatus(v); }}>
                  <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clear">No override — status computed automatically</SelectItem>
                    <SelectItem value="do_not_train">Do Not Train (hard stop)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Action Needed / Pending Medical are now worked out automatically from PAR-Q, agreement,
                  and GP clearance status — see the Compliance & Documents card on the profile.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Group Type</Label>
                <Select value={groupType} onValueChange={(v: DBClientGroupType) => { setDirty(true); setGroupType(v); }}>
                  <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual_journey">Individual Journey</SelectItem>
                    <SelectItem value="calendar_block">Calendar Block (shared)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pace Mode</Label>
              <SegmentedControl
                legend="Pace mode"
                name="pace_mode"
                value={paceMode}
                onChange={(v) => { setDirty(true); setPaceMode(v); }}
                options={[
                  { value: "fast", label: "Fast", sub: "~10 exercises" },
                  { value: "medium", label: "Medium", sub: "~8 exercises" },
                  { value: "slow", label: "Slow", sub: "~5–6 exercises" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Outstanding Actions (one per line)</Label>
              <Textarea
                value={outstandingActions}
                onChange={(e) => { setDirty(true); setOutstandingActions(e.target.value); }}
                rows={4}
                placeholder="e.g. No signed PAR-Q on file&#10;GP clearance letter outstanding"
                className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
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
          <HubCardHeader icon={<IconBot className="w-4 h-4" />} title="Training rules" subtitle="Applied systematically by the Plan Agent" color="navy" noBottomPadding />
          <div className="px-5 pb-5 pt-4">
            <TrainingRulesEditor
              value={profile.programming_adaptations}
              onChange={(programming_adaptations) => setProfile((prev) => ({ ...prev, programming_adaptations }))}
            />
          </div>
        </HubCard>

        <HubCard>
          <HubCardHeader icon={<IconFileText className="w-4 h-4" />} title="Notes" subtitle="Prose the Plan Agent reads for context" color="slate" noBottomPadding />
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

        <HubCard>
          <HubCardHeader icon={<IconLayoutDashboard className="w-4 h-4" />} title="Resources" subtitle="Enable or disable client resources for this client's portal" color="teal" noBottomPadding />
          <div className="px-5 pb-5 pt-4 space-y-0">
            {RESOURCES.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No resources available yet. Add them in the resource registry.</p>
            ) : (
              RESOURCES.map((r) => {
                const enabled = resourceVisibility[r.key] === true;
                return (
                  <div key={r.key} className="flex items-start gap-3 py-3.5 border-t border-[var(--hub-border)] first:border-t-0 first:pt-0">
                    <label htmlFor={`res-${r.key}`} className="relative shrink-0 w-5 h-5 mt-px cursor-pointer">
                      <input
                        type="checkbox"
                        id={`res-${r.key}`}
                        checked={enabled}
                        onChange={(e) => {
                          setDirty(true);
                          setResourceVisibility((prev) => ({ ...prev, [r.key]: e.target.checked }));
                        }}
                        className="sr-only"
                      />
                      <span className={`absolute inset-0 rounded-[5px] border cursor-pointer transition-colors grid place-items-center ${enabled ? "bg-teal border-teal" : "bg-[var(--hub-card)] border-[var(--color-muted-text)]"}`}>
                        {enabled && <IconCheck className="w-3.5 h-3.5 text-white" />}
                      </span>
                    </label>
                    <div className="min-w-0">
                      <Label htmlFor={`res-${r.key}`} className="text-[13px] font-semibold text-foreground cursor-pointer">{r.name}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </HubCard>

        {/* Sticky save bar — mirrors the reference edit mockup */}
        <div className="sticky bottom-0 z-15 flex items-center gap-3 mt-6 rounded-[12px] border border-[var(--hub-border)] bg-white/90 backdrop-blur px-5 py-3 shadow-[0_-1px_3px_rgba(16,24,40,0.05)]">
          <p className="m-0 text-xs text-muted-foreground">
            {dirty ? <span><b className="text-foreground font-semibold">Unsaved changes.</b> Saving records this against the client's audit trail.</span> : <span><b className="text-foreground font-semibold">No changes yet.</b></span>}
          </p>
          <div className="ml-auto flex gap-2">
            <Link href={`/hub/clients/${params.id}`}>
              <Button variant="outline" className="rounded-lg border border-[var(--color-muted-text)]">Cancel</Button>
            </Link>
            <Button onClick={handleSave} disabled={saving} className="rounded-lg gap-2 bg-rose hover:bg-rose/90 text-white">
              <IconSave className="w-4 h-4" />
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
        </div>{/* /form-col */}

        {/* ── Rail ── */}
        <aside className="hub-rail">
          {/* Computed status */}
          <HubCard>
            <HubCardHeader
              icon={<IconAlertCircle className="w-4 h-4" />}
              title="Computed status"
              color="amber"
            />
            <p className="text-xs text-muted-foreground mb-3">Worked out from the record — not set by hand.</p>
            <div className="space-y-0">
              <div className="flex items-start gap-2.5 py-2.5 border-t border-[var(--hub-border)] text-xs text-[var(--color-body)]">
                {gpHeld
                  ? <><IconCheck className="w-4 h-4 shrink-0 text-teal mt-px" /><span>GP clearance on file</span></>
                  : <><IconAlertCircle className="w-4 h-4 shrink-0 text-amber mt-px" /><span>GP clearance not recorded</span></>
                }
              </div>
              <div className="flex items-start gap-2.5 py-2.5 border-t border-[var(--hub-border)] text-xs text-[var(--color-body)]">
                {parqOverridden
                  ? <><IconCheck className="w-4 h-4 shrink-0 text-teal mt-px" /><span>PAR-Q override applied — planning unblocked</span></>
                  : <><IconAlertCircle className="w-4 h-4 shrink-0 text-amber mt-px" /><span>No PAR-Q override</span></>
                }
              </div>
              <div className="flex items-start gap-2.5 py-2.5 border-t border-[var(--hub-border)] text-xs text-[var(--color-body)]">
                {hasSignedAgreementDocument
                  ? <><IconCheck className="w-4 h-4 shrink-0 text-teal mt-px" /><span>Training agreement signed</span></>
                  : <><IconAlertCircle className="w-4 h-4 shrink-0 text-amber mt-px" /><span>Training agreement not signed</span></>
                }
              </div>
              <div className="flex items-start gap-2.5 py-2.5 border-t border-[var(--hub-border)] text-xs text-[var(--color-body)]">
                {outstandingCount === 0
                  ? <><IconCheck className="w-4 h-4 shrink-0 text-teal mt-px" /><span>No outstanding actions</span></>
                  : <><IconAlertCircle className="w-4 h-4 shrink-0 text-amber mt-px" /><span>{outstandingCount} outstanding action{outstandingCount !== 1 ? "s" : ""}</span></>
                }
              </div>
            </div>
          </HubCard>

          {/* Record */}
          <HubCard>
            <HubCardHeader
              icon={<IconFileText className="w-4 h-4" />}
              title="Record"
              color="slate"
            />
            <div className="space-y-0">
              <div className="flex items-baseline justify-between gap-3 py-2 border-t border-[var(--hub-border)] text-[13px] first:border-t-0 first:pt-0">
                <span className="text-muted-foreground">Client</span>
                <span className="font-semibold text-foreground text-right">
                  {clientNumber != null ? `#${clientNumber}` : "—"}
                </span>
              </div>
              {createdAt && (
                <div className="flex items-baseline justify-between gap-3 py-2 border-t border-[var(--hub-border)] text-[13px]">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-semibold text-foreground text-right">
                    {new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3 py-2 border-t border-[var(--hub-border)] text-[13px]">
                <span className="text-muted-foreground">Blocks completed</span>
                <span className="font-semibold text-foreground text-right">{blocksCompleted}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2 border-t border-[var(--hub-border)] text-[13px]">
                <span className="text-muted-foreground">Sessions logged</span>
                <span className="font-semibold text-foreground text-right">{sessionsLogged}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2 border-t border-[var(--hub-border)] text-[13px]">
                <span className="text-muted-foreground">Last session</span>
                <span className="font-semibold text-foreground text-right">
                  {lastSessionDate
                    ? new Date(lastSessionDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                </span>
              </div>
            </div>
          </HubCard>
        </aside>
      </div>{/* /two-col */}
    </div>
  );
}
