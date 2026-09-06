"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { IconCheck, IconAlertCircle, IconSave } from "@/components/icons";
import Link from "next/link";
import { HubAlert, StatusBadge } from "@/components/hub";
import { TagMultiSelect } from "@/components/hub/TagMultiSelect";
import { InjuryHistoryTable } from "@/components/hub/InjuryHistoryTable";
import { MedicationTable } from "@/components/hub/MedicationTable";
import { TrainingRulesEditor } from "@/components/hub/TrainingRulesEditor";
import { ClientEquipmentCard } from "@/components/hub/ClientEquipmentCard";
import { normaliseClientEquipment } from "@/lib/client-equipment";
import type { ClientProfile, DBClientComplianceStatus, DBClientGroupType, DBClientPaceMode, DeliveryMode, Gender, Frequency, Package, ClientEquipmentEntry, TrainingLocation, TimeTier } from "@/types";
import { DEFAULT_FREQUENCY } from "@/types";
import { parseSplits } from "@/lib/planAgentPrompt";
import { DEFAULT_SPLITS } from "@/lib/planAgentPrompt";
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

const emptyProfile: ClientProfile = {
  client: { id: "", name: "", age: 0, date_of_birth: null, gender: "" },
  logistics: { training_location: "studio", frequency: DEFAULT_FREQUENCY, time_tier: "standard", block_number: 1 },
  health: { gp_clearance: false, gp_clearance_required: false, conditions: [], contraindications: [], medications_relevant: [], medications: [], injury_history: [], pain_points: [], parq_trainer_override: false, parq_trainer_override_note: "" },
  physical_baseline: { fitness_level: 3, movement_quality_flags: [], strength_baseline: { lower_body: "beginner", upper_body: "beginner", core: "beginner" } },
  programming_adaptations: [],
  goals: { primary: "general_fitness", secondary: [], milestones: [] },
  notes: { client_intro: "", esther_observations: "", motivation_notes: "", watch_for: "" },
};

const SECTION_IDS = ["about", "logistics", "health", "goals", "compliance", "notes", "portal"] as const;
type SectionId = (typeof SECTION_IDS)[number];

const SECTION_FIELDS: Record<SectionId, string[]> = {
  about: ["name", "email", "phone", "dob", "gender", "start_date", "ecName", "ecRel", "ecPhone"],
  logistics: ["training_location", "frequency", "split", "package", "time_tier", "delivery_mode", "bandSetId", "equipment"],
  health: ["conditions", "contraindications", "pain_points", "medications", "injury_history", "gp_clearance", "gp_clearance_required", "parq_trainer_override", "clearance_status", "risk_level"],
  goals: ["primary_goal", "milestones", "fitness_level", "lower_body", "upper_body", "core", "movement_quality_flags"],
  compliance: ["compliance_status", "group_type", "pace_mode", "outstanding_actions", "training_rules"],
  notes: ["client_intro", "esther_observations", "motivation_notes", "watch_for"],
  portal: ["resource_visibility"],
};

function recordFieldChange(dirtySections: React.MutableRefObject<Set<SectionId>>, fieldId: string) {
  for (const [section, fields] of Object.entries(SECTION_FIELDS)) {
    if (fields.includes(fieldId)) {
      dirtySections.current.add(section as SectionId);
      break;
    }
  }
}

export default function EditClientPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const dirtySections = useRef(new Set<SectionId>());
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
  const [equipment, setEquipment] = useState<ClientEquipmentEntry[] | null>(null);
  const [resourceVisibility, setResourceVisibility] = useState<Record<string, boolean>>({});
  const [splitOptions, setSplitOptions] = useState<string[]>(parseSplits(DEFAULT_SPLITS).map((s) => s.label));
  const [blocksCompleted, setBlocksCompleted] = useState<number>(0);
  const [sessionsLogged, setSessionsLogged] = useState<number>(0);
  const [lastSessionDate, setLastSessionDate] = useState<string | null>(null);
  const [hasSignedAgreementDocument, setHasSignedAgreementDocument] = useState(false);
  const [bandSetId, setBandSetId] = useState<string | null>(null);
  const [bandSets, setBandSets] = useState<{ id: string; name: string; owner_type: string }[]>([]);
  const [packageType, setPackageType] = useState<Package | null>(null);
  const [ecName, setEcName] = useState("");
  const [ecRel, setEcRel] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [activeSection, setActiveSection] = useState<SectionId>("about");

  // IntersectionObserver for pill tracking
  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(`sec-${id}`)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("sec-", "") as SectionId;
            if (SECTION_IDS.includes(id)) setActiveSection(id);
          }
        }
      },
      { rootMargin: "-116px 0px -50% 0px", threshold: 0 },
    );
    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, [loading]);

  // Split options + band sets
  useEffect(() => {
    fetch("/api/plan-agent-settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((rows: { key: string; value: unknown }[] | null) => {
        const raw = rows?.find((r) => r.key === "splits")?.value;
        if (Array.isArray(raw) && raw.length > 0) {
          setSplitOptions(parseSplits(raw as string[]).map((s) => s.label));
        }
      })
      .catch(() => {});
    fetch("/api/band-sets")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { id: string; name: string; owner_type: string }[] | null) => {
        if (data) setBandSets(data);
      })
      .catch(() => {});
  }, []);

  // Load client data
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
      setEquipment(normaliseClientEquipment(data.equipment));
      setResourceVisibility(data.resource_visibility ?? {});
      setBandSetId(data.band_set_id ?? null);
      setPackageType(data.package_type ?? null);
      const ec = p.emergency_contact;
      setEcName(ec?.name ?? "");
      setEcRel(ec?.relationship ?? "");
      setEcPhone(ec?.phone ?? "");
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

  const updateProfile = useCallback(<K extends keyof ClientProfile>(section: K, updates: Partial<ClientProfile[K]>) => {
    setDirty(true);
    setProfile((prev) => ({ ...prev, [section]: { ...prev[section], ...updates } }));
  }, []);

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
    if (ecName.trim() || ecRel.trim() || ecPhone.trim()) {
      (fullProfile as any).emergency_contact = {
        name: ecName.trim() || null,
        relationship: ecRel.trim() || null,
        phone: ecPhone.trim() || null,
      };
    } else {
      (fullProfile as any).emergency_contact = null;
    }
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
    dirtySections.current.clear();
    setSavedTick(true);
    toast.success("Client updated");
    setTimeout(() => setSavedTick(false), 2000);
    setSaving(false);
  };

  const handleDiscard = () => {
    window.location.reload();
  };

  const handlePillClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const el = document.getElementById(`sec-${sectionId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?";
  const gpHeld = profile.health.gp_clearance;
  const parqOverridden = profile.health.parq_trainer_override ?? false;
  const gpRequired = profile.health.gp_clearance_required ?? false;
  const outstandingCount = outstandingActions.split("\n").filter((l) => l.trim()).length;

  const isUpdateOverdue = lastSessionDate
    ? (Date.now() - new Date(lastSessionDate).getTime()) / (1000 * 60 * 60 * 24) > 42
    : false;

  const riskLevel = complianceStatus === "do_not_train" ? "High" : complianceStatus === "pending_medical" ? "Medium" : "Low";
  const clearanceLabel = complianceStatus === "clear" ? "Cleared" : complianceStatus === "pending_medical" ? "Pending" : complianceStatus === "do_not_train" ? "Do not train" : "Action needed";
  const clearanceVariant = complianceStatus === "clear" ? "success" : complianceStatus === "do_not_train" ? "danger" : complianceStatus === "pending_medical" ? "warning" : "warning";

  const sessionLimit = packageType === "4-week" ? 8 : packageType === "6-week" ? 12 : packageType === "12-week" ? 24 : packageType === "24-week" ? 48 : null;

  const pillSections: { id: SectionId; label: string }[] = [
    { id: "about", label: "About" },
    { id: "logistics", label: "Logistics" },
    { id: "health", label: "Health" },
    { id: "goals", label: "Goals & baseline" },
    { id: "compliance", label: "Compliance & rules" },
    { id: "notes", label: "Notes" },
    { id: "portal", label: "Portal" },
  ];

  return (
    <div>
      {/* Header with chip strip */}
      <div className="bg-[var(--hub-card)] border-b border-[var(--hub-border)] pt-4 pb-0">
        <div className="edit-form" style={{ padding: "0 24px 12px" }}>
          <Link
            href={`/hub/clients/${params.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-nested px-2 py-1 -ml-2 mb-2 transition-colors"
          >
            &lsaquo; {name || "client"}
          </Link>
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-pill bg-rose/15 text-rose flex items-center justify-center shrink-0 text-base font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[22px] font-bold tracking-tight text-foreground">Edit {name}</h1>
                {clientNumber != null && (
                  <span className="text-xs font-medium text-muted-foreground bg-[var(--hub-canvas)] border border-[var(--hub-border)] rounded-nested px-1.5 py-0.5">
                    #{clientNumber}
                  </span>
                )}
                <StatusBadge status={complianceStatus} />
              </div>
              {/* Chip strip */}
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {createdAt && (
                  <span className="bdg mut">
                    Client since {new Date(createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                  </span>
                )}
                {sessionLimit != null && (
                  <span className="bdg mut">
                    {sessionsLogged} of {sessionLimit} used
                  </span>
                )}
                {gpRequired && (
                  <span className={gpHeld ? "bdg ok" : "bdg warn"}>
                    {gpHeld ? "Cleared" : "Not cleared"}
                  </span>
                )}
                <span className="bdg mut">{riskLevel} risk</span>
                {isUpdateOverdue && <span className="bdg warn">Update overdue</span>}
                <span className="ml-auto flex gap-3 flex-wrap">
                  <Link href={`/hub/clients/${params.id}`} className="btn-link text-xs">View record</Link>
                  <Link href={`/hub/clients/${params.id}/training`} className="btn-link text-xs">Training</Link>
                  <Link href={`/hub/clients/${params.id}`} className="btn-link text-xs">Invoice</Link>
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                {hasSignedAgreementDocument && <span className="bdg ok">Agreement signed</span>}
                {blocksCompleted > 0 && <span className="bdg mut">{blocksCompleted} block{blocksCompleted !== 1 ? "s" : ""} completed</span>}
                {lastSessionDate && (
                  <span className="bdg mut">
                    Last session {new Date(lastSessionDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
                {outstandingCount > 0 && <span className="bdg warn">{outstandingCount} outstanding action{outstandingCount !== 1 ? "s" : ""}</span>}
                {parqOverridden && <span className="bdg ok">PAR-Q override</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pill navigation */}
      <nav className="edit-pill-bar">
        {pillSections.map(({ id, label }) => {
          const isDirty = dirty && dirtySections.current.has(id);
          return (
            <a
              key={id}
              href={`#sec-${id}`}
              className={`edit-pill ${activeSection === id ? "on" : ""}`}
              onClick={(e) => handlePillClick(e, id)}
            >
              <span className={`edit-pill-dot ${isDirty ? "dirty" : "clean"}`} />
              {label}
            </a>
          );
        })}
      </nav>

      {/* Clinical clearance warning */}
      {(complianceStatus === "pending_medical" || complianceStatus === "action_needed") && (
        <div className="edit-form" style={{ paddingBottom: 0 }}>
          <HubAlert severity="warning" title="Clearance is still outstanding">
            The Plan Agent will not issue a block for {name || "this client"} until GP clearance is recorded, or a PAR-Q override is applied below.
          </HubAlert>
        </div>
      )}

      {/* Form content — centred column */}
      <div className="edit-form">

        {/* ── ABOUT ──────────────────────────────────────────────────────── */}
        <div className="edit-sec" id="sec-about">
          <div className="fcard acc-rose">
            <div className="fcard-h">About</div>
            <div className="fcard-b">
              <div className="edit-fg" style={{ padding: "4px 0 8px" }}>
                <div className="space-y-2">
                  <Label>First name <span className="font-medium text-muted-foreground">(required)</span></Label>
                  <Input value={name} onChange={(e) => { setDirty(true); setName(e.target.value); recordFieldChange(dirtySections, "name"); }} placeholder="Client name" className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => { setDirty(true); setEmail(e.target.value); recordFieldChange(dirtySections, "email"); }} placeholder="client@example.com" className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                  <p className="text-xs text-muted-foreground">Used to send 6-week updates.</p>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input type="tel" value={phone} onChange={(e) => { setDirty(true); setPhone(e.target.value); recordFieldChange(dirtySections, "phone"); }} placeholder="07…" className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                </div>
                <div className="space-y-2">
                  <Label>Date of birth</Label>
                  <Input type="date" value={profile.client.date_of_birth ?? ""} onChange={(e) => { updateProfile("client", { date_of_birth: e.target.value || null }); recordFieldChange(dirtySections, "dob"); }} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                  <p className="text-xs text-muted-foreground">
                    {profile.client.date_of_birth ? `Age: ${calculateAge(profile.client.date_of_birth)}` : "Age will be calculated from date of birth"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={profile.client.gender || undefined} onValueChange={(v: Gender) => { updateProfile("client", { gender: v }); recordFieldChange(dirtySections, "gender"); }}>
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
                  <Label>Client number</Label>
                  <Input value={clientNumber ?? ""} disabled className="bg-[var(--hub-hover)] text-muted-foreground border-[var(--color-muted-text)]" />
                </div>
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input type="date" value={startDate ?? ""} onChange={(e) => { setDirty(true); setStartDate(e.target.value || null); recordFieldChange(dirtySections, "start_date"); }} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                </div>
              </div>

              {/* Emergency contact subsection */}
              <div className="edit-sub-hd">Emergency contact</div>
              <div className="edit-fg" style={{ padding: "4px 0 4px" }}>
                <p className="text-xs text-muted-foreground" style={{ gridColumn: "1 / -1" }}>
                  Clinically important — hard to leave empty for any client doing in-person training.
                </p>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={ecName} onChange={(e) => { setDirty(true); setEcName(e.target.value); recordFieldChange(dirtySections, "ecName"); }} placeholder="Emergency contact name" className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Input value={ecRel} onChange={(e) => { setDirty(true); setEcRel(e.target.value); recordFieldChange(dirtySections, "ecRel"); }} placeholder="e.g. Spouse" className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input type="tel" value={ecPhone} onChange={(e) => { setDirty(true); setEcPhone(e.target.value); recordFieldChange(dirtySections, "ecPhone"); }} placeholder="07…" className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── LOGISTICS ───────────────────────────────────────────────────── */}
        <div className="edit-sec" id="sec-logistics">
          <div className="fcard acc-teal">
            <div className="fcard-h">Logistics</div>
            <div className="fcard-b">
              <div className="edit-fg-3" style={{ padding: "4px 0 8px" }}>
                <div className="space-y-2">
                  <Label>Training location</Label>
                  <Select value={profile.logistics.training_location} onValueChange={(v) => { updateProfile("logistics", { training_location: v as TrainingLocation }); recordFieldChange(dirtySections, "training_location"); }}>
                    <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="studio">Studio 1-to-1</SelectItem>
                      <SelectItem value="home">Home visit</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cadence</Label>
                  <Select
                    value={profile.logistics.frequency?.unit ?? "week"}
                    onValueChange={(v: Frequency["unit"]) => {
                      const unit = v;
                      const per_unit = unit === "irregular" ? 0
                        : unit === "fortnight" ? 1
                        : unit === "month" ? 1
                        : (profile.logistics.frequency?.per_unit ?? 2);
                      setDirty(true);
                      updateProfile("logistics", { frequency: { unit, per_unit } });
                      recordFieldChange(dirtySections, "frequency");
                    }}
                  >
                    <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="fortnight">Fortnightly</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="irregular">Irregular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Session length</Label>
                  <Select value={profile.logistics.time_tier} onValueChange={(v) => { updateProfile("logistics", { time_tier: v as TimeTier }); recordFieldChange(dirtySections, "time_tier"); }}>
                    <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">45 min</SelectItem>
                      <SelectItem value="standard">60 min</SelectItem>
                      <SelectItem value="extended">75–90 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Training Split</Label>
                  <Select value={profile.logistics.split ?? splitOptions[0] ?? "Full body"} onValueChange={(v) => { updateProfile("logistics", { split: v }); recordFieldChange(dirtySections, "split"); }}>
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
                  <Select value={packageType ?? ""} onValueChange={(v: Package) => { setDirty(true); setPackageType(v); recordFieldChange(dirtySections, "package"); }}>
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
                <div className="space-y-2">
                  <Label>Band set</Label>
                  <Select value={bandSetId ?? ""} onValueChange={(v) => { setDirty(true); setBandSetId(v || null); recordFieldChange(dirtySections, "bandSetId"); }}>
                    <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue placeholder="EF Studio (default)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">EF Studio (default)</SelectItem>
                      {bandSets.filter((s) => s.id !== "00000000-0000-0000-0000-000000000001").map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}{s.owner_type === "client" ? " (client set)" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Which band set this client uses for banded exercises. PBs compare by actual tension (kg),
                    so a client switching sets won&apos;t lose their history.
                  </p>
                </div>
              </div>
              {profile.logistics.frequency && profile.logistics.frequency.unit !== "irregular" && (
                <div className="space-y-2 mb-3">
                  <Label>{`Sessions per ${profile.logistics.frequency.unit === "week" ? "week" : profile.logistics.frequency.unit === "fortnight" ? "fortnight" : "month"}`}</Label>
                  <Select
                    value={String(profile.logistics.frequency.per_unit)}
                    onValueChange={(v) => { setDirty(true); updateProfile("logistics", { frequency: { ...profile.logistics.frequency!, per_unit: Number(v) } }); recordFieldChange(dirtySections, "frequency"); }}
                  >
                    <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1×</SelectItem>
                      <SelectItem value="2">2×</SelectItem>
                      {profile.logistics.frequency?.unit === "week" && (
                        <SelectItem value="3">3×</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2 mb-3">
                <Label>Delivery mode</Label>
                <Select value={deliveryMode} onValueChange={(v) => { setDirty(true); setDeliveryMode(v as DeliveryMode); recordFieldChange(dirtySections, "delivery_mode"); }}>
                  <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="studio_1to1">Studio 1:1</SelectItem>
                    <SelectItem value="home_training">Home training</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Home training gives this client a &ldquo;Your training&rdquo; tab in their portal, where they can
                  view their plan and log their own sets. Studio 1:1 clients see no change — Esther logs
                  for them from the session page as usual.
                </p>
              </div>
              <ClientEquipmentCard
                value={equipment}
                onChange={(v) => { setDirty(true); setEquipment(v); recordFieldChange(dirtySections, "equipment"); }}
                clientFirstName={name.split(" ")[0] || "this client"}
                showCopyStudio={deliveryMode === "studio_1to1"}
                embedded
              />
            </div>
          </div>
        </div>

        {/* ── HEALTH & CLEARANCE ──────────────────────────────────────────── */}
        <div className="edit-sec" id="sec-health">
          <div className="fcard acc-rose">
            <div className="fcard-h">Health &amp; clearance</div>
            <div className="fcard-b">
              <div style={{ padding: "4px 0 8px" }}>
                <div className="space-y-2 mb-3">
                  <Label>Conditions</Label>
                  <TagMultiSelect
                    category="condition"
                    selected={profile.health.conditions}
                    onChange={(conditions) => { updateProfile("health", { conditions }); recordFieldChange(dirtySections, "conditions"); }}
                    placeholder="Select known conditions or add new..."
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2 mb-3">
                  <div className="space-y-2">
                    <Label>Contraindications</Label>
                    <TagMultiSelect
                      category="contraindication"
                      selected={profile.health.contraindications}
                      onChange={(contraindications) => { updateProfile("health", { contraindications }); recordFieldChange(dirtySections, "contraindications"); }}
                      placeholder="Select contraindications or add new..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pain Points</Label>
                    <TagMultiSelect
                      category="pain_point"
                      selected={profile.health.pain_points}
                      onChange={(pain_points) => { updateProfile("health", { pain_points }); recordFieldChange(dirtySections, "pain_points"); }}
                      placeholder="Select pain points or add new..."
                    />
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  <Label>Medications</Label>
                  <MedicationTable
                    value={profile.health.medications ?? []}
                    onChange={(medications) => { updateProfile("health", { medications }); recordFieldChange(dirtySections, "medications"); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Injury History</Label>
                  <InjuryHistoryTable
                    value={profile.health.injury_history}
                    onChange={(injury_history) => { updateProfile("health", { injury_history }); recordFieldChange(dirtySections, "injury_history"); }}
                  />
                </div>
              </div>

              {/* Clearance subsection */}
              <div className="edit-sub-hd">Clearance</div>
              <div style={{ padding: "4px 0 8px" }}>
                <div className="flex items-start gap-3 py-3 border-b border-[var(--hub-border)]">
                  <label htmlFor="gp_clearance_required" className="relative shrink-0 w-5 h-5 mt-px cursor-pointer">
                    <input type="checkbox" id="gp_clearance_required" checked={gpRequired} onChange={(e) => { updateProfile("health", { gp_clearance_required: e.target.checked }); recordFieldChange(dirtySections, "gp_clearance_required"); }} className="sr-only" />
                    <span className={`absolute inset-0 rounded-control-sm border cursor-pointer transition-colors grid place-items-center ${gpRequired ? "bg-rose border-rose" : "bg-[var(--hub-card)] border-[var(--color-muted-text)]"}`}>
                      {gpRequired && <IconCheck className="w-3.5 h-3.5 text-white" />}
                    </span>
                  </label>
                  <div className="min-w-0">
                    <Label htmlFor="gp_clearance_required" className="text-[13px] font-semibold text-foreground cursor-pointer">GP clearance required</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Your call — tick if this client needs written GP clearance before training. Drives the &quot;pending medical&quot; status below until it&apos;s obtained.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 py-3 border-b border-[var(--hub-border)]">
                  <label htmlFor="gp_clearance" className="relative shrink-0 w-5 h-5 mt-px cursor-pointer">
                    <input type="checkbox" id="gp_clearance" checked={gpHeld} onChange={(e) => { updateProfile("health", { gp_clearance: e.target.checked }); recordFieldChange(dirtySections, "gp_clearance"); }} className="sr-only" />
                    <span className={`absolute inset-0 rounded-control-sm border cursor-pointer transition-colors grid place-items-center ${gpHeld ? "bg-rose border-rose" : "bg-[var(--hub-card)] border-[var(--color-muted-text)]"}`}>
                      {gpHeld && <IconCheck className="w-3.5 h-3.5 text-white" />}
                    </span>
                  </label>
                  <div className="min-w-0">
                    <Label htmlFor="gp_clearance" className="text-[13px] font-semibold text-foreground cursor-pointer">GP clearance obtained</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Tick once the written clearance letter is on file.</p>
                  </div>
                </div>
                <div className="space-y-2 rounded-[12px] border border-[var(--hub-border)] p-3 my-3">
                  <div className="flex items-start gap-3">
                    <label htmlFor="parq_trainer_override" className="relative shrink-0 w-5 h-5 mt-px cursor-pointer">
                      <input type="checkbox" id="parq_trainer_override" checked={parqOverridden} onChange={(e) => { updateProfile("health", { parq_trainer_override: e.target.checked }); recordFieldChange(dirtySections, "parq_trainer_override"); }} className="sr-only" />
                      <span className={`absolute inset-0 rounded-control-sm border cursor-pointer transition-colors grid place-items-center ${parqOverridden ? "bg-rose border-rose" : "bg-[var(--hub-card)] border-[var(--color-muted-text)]"}`}>
                        {parqOverridden && <IconCheck className="w-3.5 h-3.5 text-white" />}
                      </span>
                    </label>
                    <div className="min-w-0">
                      <Label htmlFor="parq_trainer_override" className="text-[13px] font-semibold text-foreground cursor-pointer">PAR-Q trainer override — completed on Microsoft Forms, not yet in system</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Only tick this once you&apos;ve personally reviewed the client&apos;s submitted PAR-Q. This unblocks plan
                        generation until the record is migrated into the hub — it does not replace a signed PAR-Q on file.
                      </p>
                    </div>
                  </div>
                  {parqOverridden && (
                    <Textarea
                      placeholder="Optional note — anything flagged on the form Esther should know"
                      value={profile.health.parq_trainer_override_note ?? ""}
                      onChange={(e) => { updateProfile("health", { parq_trainer_override_note: e.target.value }); recordFieldChange(dirtySections, "parq_trainer_override"); }}
                      rows={2}
                      className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                    />
                  )}
                </div>
                <div className="space-y-2" style={{ marginBottom: 12 }}>
                  <Label>Risk level</Label>
                  <Select value={riskLevel.toLowerCase()} onValueChange={() => {}} disabled>
                    <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── GOALS & BASELINE ───────────────────────────────────────────── */}
        <div className="edit-sec" id="sec-goals">
          <div className="fcard acc-teal">
            <div className="fcard-h">Goals &amp; baseline</div>
            <div className="fcard-b">
              <div style={{ padding: "4px 0 8px" }}>
                <div className="space-y-2 mb-3">
                  <Label>Primary Goal</Label>
                  <Select value={profile.goals.primary} onValueChange={(v: ClientProfile["goals"]["primary"]) => { updateProfile("goals", { primary: v }); recordFieldChange(dirtySections, "primary_goal"); }}>
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
                <div className="space-y-2 mb-3">
                  <Label>Milestones</Label>
                  <TagMultiSelect
                    category="milestone"
                    selected={profile.goals.milestones}
                    onChange={(milestones) => { updateProfile("goals", { milestones }); recordFieldChange(dirtySections, "milestones"); }}
                    placeholder="Select milestones or add new..."
                  />
                </div>
              </div>

              {/* Physical baseline subsection */}
              <div className="edit-sub-hd">Physical baseline</div>
              <div className="edit-fg-3" style={{ padding: "4px 0 4px" }}>
                <div className="space-y-2">
                  <Label>Fitness Level</Label>
                  <Select value={String(profile.physical_baseline.fitness_level)} onValueChange={(v) => { updateProfile("physical_baseline", { fitness_level: Number(v) as 1 | 2 | 3 | 4 | 5 }); recordFieldChange(dirtySections, "fitness_level"); }}>
                    <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 — Very low</SelectItem>
                      <SelectItem value="2">2 — Low</SelectItem>
                      <SelectItem value="3">3 — Moderate</SelectItem>
                      <SelectItem value="4">4 — Good</SelectItem>
                      <SelectItem value="5">5 — High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lower Body Strength</Label>
                  <Select value={profile.physical_baseline.strength_baseline.lower_body} onValueChange={(v: "beginner" | "intermediate" | "advanced") => { setProfile((prev) => ({ ...prev, physical_baseline: { ...prev.physical_baseline, strength_baseline: { ...prev.physical_baseline.strength_baseline, lower_body: v } } })); recordFieldChange(dirtySections, "lower_body"); }}>
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
                  <Select value={profile.physical_baseline.strength_baseline.upper_body} onValueChange={(v: "beginner" | "intermediate" | "advanced") => { setProfile((prev) => ({ ...prev, physical_baseline: { ...prev.physical_baseline, strength_baseline: { ...prev.physical_baseline.strength_baseline, upper_body: v } } })); recordFieldChange(dirtySections, "upper_body"); }}>
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
                  <Select value={profile.physical_baseline.strength_baseline.core} onValueChange={(v: "beginner" | "intermediate" | "advanced") => { setProfile((prev) => ({ ...prev, physical_baseline: { ...prev.physical_baseline, strength_baseline: { ...prev.physical_baseline.strength_baseline, core: v } } })); recordFieldChange(dirtySections, "core"); }}>
                    <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="span-2 space-y-2">
                  <Label>Movement Quality Flags</Label>
                  <TagMultiSelect
                    category="movement_quality_flag"
                    selected={profile.physical_baseline.movement_quality_flags}
                    onChange={(movement_quality_flags) => { updateProfile("physical_baseline", { movement_quality_flags }); recordFieldChange(dirtySections, "movement_quality_flags"); }}
                    placeholder="Select observed movement quality flags or add new..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── COMPLIANCE & RULES ─────────────────────────────────────────── */}
        <div className="edit-sec" id="sec-compliance">
          <div className="fcard acc-amber">
            <div className="fcard-h">Compliance &amp; rules</div>
            <div className="fcard-b">
              <div className="edit-fg" style={{ padding: "4px 0 8px" }}>
                <div className="space-y-2">
                  <Label>Compliance override</Label>
                  <Select value={complianceStatus} onValueChange={(v: DBClientComplianceStatus) => { setDirty(true); setComplianceStatus(v); recordFieldChange(dirtySections, "compliance_status"); }}>
                    <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clear">No override — status computed automatically</SelectItem>
                      <SelectItem value="do_not_train">Do Not Train (hard stop)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Action Needed / Pending Medical are computed from PAR-Q, agreement, and GP clearance status.</p>
                </div>
                <div className="space-y-2">
                  <Label>Group Type</Label>
                  <Select value={groupType} onValueChange={(v: DBClientGroupType) => { setDirty(true); setGroupType(v); recordFieldChange(dirtySections, "group_type"); }}>
                    <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual_journey">Individual Journey</SelectItem>
                      <SelectItem value="calendar_block">Calendar Block (shared)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <Label>Pace mode</Label>
                <Select value={paceMode} onValueChange={(v: DBClientPaceMode) => { setDirty(true); setPaceMode(v); recordFieldChange(dirtySections, "pace_mode"); }}>
                  <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">Fast — ~10 exercises</SelectItem>
                    <SelectItem value="medium">Medium — ~8 exercises</SelectItem>
                    <SelectItem value="slow">Slow — ~5–6 exercises</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 mb-3">
                <Label>Outstanding actions (one per line)</Label>
                <Textarea
                  value={outstandingActions}
                  onChange={(e) => { setDirty(true); setOutstandingActions(e.target.value); recordFieldChange(dirtySections, "outstanding_actions"); }}
                  rows={4}
                  placeholder={"e.g. No signed PAR-Q on file\nGP clearance letter outstanding"}
                  className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                />
              </div>

              {/* Training rules subsection */}
              <div className="edit-sub-hd">Training rules</div>
              <div style={{ padding: "4px 0 4px" }}>
                <TrainingRulesEditor
                  value={profile.programming_adaptations}
                  onChange={(programming_adaptations) => { setProfile((prev) => ({ ...prev, programming_adaptations })); recordFieldChange(dirtySections, "training_rules"); }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── NOTES ──────────────────────────────────────────────────────── */}
        <div className="edit-sec" id="sec-notes">
          <div className="fcard acc-ink">
            <div className="fcard-h">Notes</div>
            <div className="fcard-b">
              <div style={{ padding: "4px 0 8px" }}>
                <div className="space-y-2 mb-3">
                  <Label>Client intro</Label>
                  <p className="text-xs text-muted-foreground">Shown at the top of each session. A short note Esther writes to set the tone.</p>
                  <Textarea value={profile.notes.client_intro} onChange={(e) => { updateProfile("notes", { client_intro: e.target.value }); recordFieldChange(dirtySections, "client_intro"); }} rows={2} placeholder={"e.g. \"Welcome back — let's keep the momentum going this week.\""} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                </div>
                <div className="space-y-2 mb-3">
                  <Label>Esther&apos;s observations</Label>
                  <Textarea value={profile.notes.esther_observations} onChange={(e) => { updateProfile("notes", { esther_observations: e.target.value }); recordFieldChange(dirtySections, "esther_observations"); }} rows={3} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Motivation notes</Label>
                    <Textarea value={profile.notes.motivation_notes} onChange={(e) => { updateProfile("notes", { motivation_notes: e.target.value }); recordFieldChange(dirtySections, "motivation_notes"); }} rows={2} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                  </div>
                  <div className="space-y-2">
                    <Label>Watch for</Label>
                    <Textarea value={profile.notes.watch_for} onChange={(e) => { updateProfile("notes", { watch_for: e.target.value }); recordFieldChange(dirtySections, "watch_for"); }} rows={2} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── PORTAL ─────────────────────────────────────────────────────── */}
        <div className="edit-sec" id="sec-portal">
          <div className="fcard">
            <div className="fcard-h">Portal resources</div>
            <div className="fcard-b">
              <div style={{ padding: "4px 0 8px" }}>
                <p className="text-xs text-muted-foreground mb-3">Toggle which resources this client can see in their portal.</p>
                <div className="border border-[var(--hub-border)] rounded-control bg-[var(--field-fill,#FDFDFE)] p-3">
                  {RESOURCES.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No resources available yet.</p>
                  ) : (
                    RESOURCES.map((r, i) => {
                      const enabled = resourceVisibility[r.key] === true;
                      return (
                        <div key={r.key} className={`flex items-center justify-between py-2.5 ${i < RESOURCES.length - 1 ? "border-b border-[var(--hub-border)]" : ""}`}>
                          <span className="text-[13px] text-foreground">{r.name}</span>
                          <label className="relative inline-block w-[36px] h-[20px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) => { setDirty(true); setResourceVisibility((prev) => ({ ...prev, [r.key]: e.target.checked })); recordFieldChange(dirtySections, "resource_visibility"); }}
                              className="sr-only"
                            />
                            <span className={`absolute inset-0 rounded-pill transition-colors ${enabled ? "bg-teal" : "bg-[var(--hub-border)]"}`} />
                            <span className={`absolute top-[2px] left-[2px] w-[16px] h-[16px] bg-white rounded-pill transition-transform ${enabled ? "translate-x-[18px]" : ""}`} />
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>{/* /edit-form */}

      {/* Sticky save bar */}
      <div className={`edit-save-bar ${dirty || saving ? "dirty" : ""}`}>
        {savedTick ? (
          <span className="text-xs font-semibold text-teal flex items-center gap-1">
            <IconCheck className="w-3.5 h-3.5" /> Saved
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {dirty ? <><b className="text-foreground font-semibold">Unsaved changes.</b> Saving records this against the client&apos;s audit trail.</> : <><b className="text-foreground font-semibold">No changes yet.</b></>}
          </span>
        )}
        <div className="ml-auto flex gap-2 items-center">
          <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={saving || !dirty} className="text-muted-foreground">Discard</Button>
          <Button onClick={handleSave} disabled={saving || !dirty} size="sm" className="gap-2 bg-rose hover:bg-rose/90 text-white rounded-lg">
            <IconSave className="w-4 h-4" />
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
