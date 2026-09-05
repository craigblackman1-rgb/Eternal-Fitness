"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  IconChevronLeft,
  IconChevronRight,
  IconUsers,
  IconHeart,
  IconTarget,
  IconMapPin,
  IconClipboardList,
  IconClock,
  IconCheck,
  IconAlertTriangle,
  IconTrash2,
  IconUpload,
  IconX,
} from "@/components/icons";
import Link from "next/link";
import { HubCard, HubCardHeader, HubPageHeader } from "@/components/hub";
import { TagMultiSelect } from "@/components/hub/TagMultiSelect";
import { InjuryHistoryTable } from "@/components/hub/InjuryHistoryTable";
import { ClientEquipmentCard } from "@/components/hub/ClientEquipmentCard";
import { normaliseClientEquipment } from "@/lib/client-equipment";
import { MedicationTable } from "@/components/hub/MedicationTable";
import type {
  ClientProfile,
  ClientEquipmentEntry,
  Gender,
  Frequency,
  Package,
  PrimaryGoal,
  TrainingLocation,
} from "@/types";
import { DEFAULT_FREQUENCY, formatFrequency } from "@/types";

/* ─────────────────────────────────────────────────────────────
   CR-EF-118 — Guided onboarding wizard
   Five steps: Who they are → Health → Goals → Where they train → First workouts
   The programme is created behind the flow and never asked about.
   ───────────────────────────────────────────────────────────── */

const STEPS = [
  { key: 1, label: "Who they are", icon: IconUsers },
  { key: 2, label: "Health", icon: IconHeart },
  { key: 3, label: "Goals", icon: IconTarget },
  { key: 4, label: "Where they train", icon: IconMapPin },
  { key: 5, label: "First workouts", icon: IconClipboardList },
] as const;

type StepKey = 1 | 2 | 3 | 4 | 5;
type ParqMode = "send" | "upload" | "override" | null;

function calculateAge(dob: string | null): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/* ── Segmented control (verbatim from existing page) ── */
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
                  "flex min-h-[30px] cursor-pointer items-center justify-center rounded-nested px-2.5 text-center text-sm font-semibold transition-colors " +
                  (active
                    ? "bg-[var(--hub-card)] text-foreground shadow-sm"
                    : "text-[var(--body)] hover:text-foreground")
                }
              >
                {opt.label}
                {opt.sub && (
                  <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                    {opt.sub}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ── Gate alert ── */
function GateAlert({
  children,
  variant = "warning",
}: {
  children: React.ReactNode;
  variant?: "warning" | "clear";
}) {
  const styles =
    variant === "warning"
      ? "bg-[var(--s-warning-bg)] border-[var(--s-warning-bd)] text-[var(--s-warning-tx)]"
      : "bg-[var(--s-success-bg)] border-[var(--s-success-bd)] text-[var(--s-success-tx)]";
  return (
    <div className={`flex gap-2.5 p-3 rounded-nested border ${styles}`}>
      <IconAlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="text-[12.5px] leading-relaxed">{children}</div>
    </div>
  );
}

/* ── Empty profile ── */
const emptyProfile: ClientProfile = {
  client: { id: "", name: "", age: 0, date_of_birth: null, gender: "" },
  logistics: {
    training_location: "studio",
    frequency: DEFAULT_FREQUENCY,
    time_tier: "standard",
    block_number: 1,
  },
  health: {
    gp_clearance: false,
    gp_clearance_required: false,
    conditions: [],
    contraindications: [],
    medications_relevant: [],
    medications: [],
    injury_history: [],
    pain_points: [],
    parq_trainer_override: false,
    parq_trainer_override_note: "",
  },
  physical_baseline: {
    fitness_level: 3,
    movement_quality_flags: [],
    strength_baseline: { lower_body: "beginner", upper_body: "beginner", core: "beginner" },
  },
  programming_adaptations: [],
  goals: { primary: "general_fitness", secondary: [], milestones: [] },
  notes: { client_intro: "", esther_observations: "", motivation_notes: "", watch_for: "" },
};

/* ── Draft persistence ── */
const DRAFT_KEY = "ef-new-client-draft";
const DRAFT_VERSION = 2;

type DraftData = {
  v: number;
  step: StepKey;
  maxStepReached: StepKey;
  name: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  gender: Gender | "";
  ecName: string;
  ecRel: string;
  ecPhone: string;
  gpName: string;
  gpSurgery: string;
  gpPhone: string;
  packageType: Package;
  cadenceUnit: Frequency["unit"];
  cadencePerUnit: number;
  parqMode: ParqMode;
  overrideNote: string;
  gpClearanceRequired: boolean;
  gpClearanceNote: string;
  conditions: string[];
  contraindications: string[];
  medications: ClientProfile["health"]["medications"];
  injuryHistory: ClientProfile["health"]["injury_history"];
  primaryGoal: PrimaryGoal;
  milestones: string[];
  baseline: string;
  successLooks: string;
  deliveryMode: "studio_1to1" | "home_training";
  equipment: ClientEquipmentEntry[] | null;
  bodyweightOnly: boolean;
  bandSet: "ef" | "own";
  bandNote: string;
  firstWorkoutRoute: "qa" | "templates" | "paste";
};

function serializeDraft(s: {
  step: StepKey; maxStepReached: StepKey;
  name: string; email: string; phone: string; address: string; dob: string; gender: Gender | "";
  ecName: string; ecRel: string; ecPhone: string;
  gpName: string; gpSurgery: string; gpPhone: string;
  packageType: Package; cadenceUnit: Frequency["unit"]; cadencePerUnit: number;
  parqMode: ParqMode; overrideNote: string;
  gpClearanceRequired: boolean; gpClearanceNote: string;
  conditions: string[]; contraindications: string[];
  medications: ClientProfile["health"]["medications"];
  injuryHistory: ClientProfile["health"]["injury_history"];
  primaryGoal: PrimaryGoal; milestones: string[]; baseline: string; successLooks: string;
  deliveryMode: "studio_1to1" | "home_training";
  equipment: ClientEquipmentEntry[] | null; bodyweightOnly: boolean;
  bandSet: "ef" | "own"; bandNote: string;
  firstWorkoutRoute: "qa" | "templates" | "paste";
}): DraftData {
  return {
    v: DRAFT_VERSION,
    step: s.step, maxStepReached: s.maxStepReached,
    name: s.name, email: s.email, phone: s.phone, address: s.address,
    dob: s.dob, gender: s.gender,
    ecName: s.ecName, ecRel: s.ecRel, ecPhone: s.ecPhone,
    gpName: s.gpName, gpSurgery: s.gpSurgery, gpPhone: s.gpPhone,
    packageType: s.packageType, cadenceUnit: s.cadenceUnit, cadencePerUnit: s.cadencePerUnit,
    parqMode: s.parqMode, overrideNote: s.overrideNote,
    gpClearanceRequired: s.gpClearanceRequired, gpClearanceNote: s.gpClearanceNote,
    conditions: s.conditions, contraindications: s.contraindications,
    medications: s.medications, injuryHistory: s.injuryHistory,
    primaryGoal: s.primaryGoal, milestones: s.milestones,
    baseline: s.baseline, successLooks: s.successLooks,
    deliveryMode: s.deliveryMode,
    equipment: s.equipment, bodyweightOnly: s.bodyweightOnly,
    bandSet: s.bandSet, bandNote: s.bandNote,
    firstWorkoutRoute: s.firstWorkoutRoute,
  };
}

function deserializeDraft(raw: string): DraftData | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.v === DRAFT_VERSION) return parsed as DraftData;
    return null;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   Main wizard component
   ═══════════════════════════════════════════════════════════════ */
export default function NewClientPage() {
  const router = useRouter();

  /* ── Draft restore ── */
  const draftCacheRef = useRef<DraftData | null>(null);
  const draftCacheReadRef = useRef(false);
  const draftRestoreReadyRef = useRef(false);
  const [isResumingDraft, setIsResumingDraft] = useState(false);
  const initDraft = <T,>(fallback: T, extract: (d: DraftData) => T): T => {
    if (typeof window === "undefined") return fallback;
    if (!draftCacheReadRef.current) {
      draftCacheReadRef.current = true;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) draftCacheRef.current = deserializeDraft(raw);
      } catch { draftCacheRef.current = null; }
    }
    if (!draftRestoreReadyRef.current) return fallback;
    const draft = draftCacheRef.current;
    if (!draft) return fallback;
    try { return extract(draft); } catch { return fallback; }
  };

  const [step, setStep] = useState<StepKey>(() => initDraft(1, (d) => d.step));
  const [maxStepReached, setMaxStepReached] = useState<StepKey>(() => initDraft(1, (d) => d.maxStepReached));
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* ── Step 1 state ── */
  const [name, setName] = useState(() => initDraft("", (d) => d.name));
  const [email, setEmail] = useState(() => initDraft("", (d) => d.email));
  const [phone, setPhone] = useState(() => initDraft("", (d) => d.phone));
  const [address, setAddress] = useState(() => initDraft("", (d) => d.address));
  const [dob, setDob] = useState(() => initDraft("", (d) => d.dob));
  const [gender, setGender] = useState<Gender | "">(() => initDraft("", (d) => d.gender));
  const [ecName, setEcName] = useState(() => initDraft("", (d) => d.ecName));
  const [ecRel, setEcRel] = useState(() => initDraft("", (d) => d.ecRel));
  const [ecPhone, setEcPhone] = useState(() => initDraft("", (d) => d.ecPhone));
  const [gpName, setGpName] = useState(() => initDraft("", (d) => d.gpName));
  const [gpSurgery, setGpSurgery] = useState(() => initDraft("", (d) => d.gpSurgery));
  const [gpPhone, setGpPhone] = useState(() => initDraft("", (d) => d.gpPhone));
  const [packageType, setPackageType] = useState<Package>(() => initDraft("12-week", (d) => d.packageType));
  const [cadenceUnit, setCadenceUnit] = useState<Frequency["unit"]>(() => initDraft("week", (d) => d.cadenceUnit));
  const [cadencePerUnit, setCadencePerUnit] = useState(() => initDraft(2, (d) => d.cadencePerUnit));

  /* ── Step 2 state ── */
  const [parqMode, setParqMode] = useState<ParqMode>(() => initDraft(null, (d) => d.parqMode));
  const [overrideNote, setOverrideNote] = useState(() => initDraft("", (d) => d.overrideNote));
  const [parqFile, setParqFile] = useState<File | null>(null);
  const [gpClearanceRequired, setGpClearanceRequired] = useState(() => initDraft(false, (d) => d.gpClearanceRequired));
  const [gpClearanceNote, setGpClearanceNote] = useState(() => initDraft("", (d) => d.gpClearanceNote));
  const [conditions, setConditions] = useState<string[]>(() => initDraft([], (d) => d.conditions));
  const [contraindications, setContraindications] = useState<string[]>(() => initDraft([], (d) => d.contraindications));
  const [medications, setMedications] = useState<ClientProfile["health"]["medications"]>(() => initDraft([], (d) => d.medications));
  const [injuryHistory, setInjuryHistory] = useState<ClientProfile["health"]["injury_history"]>(() => initDraft([], (d) => d.injuryHistory));

  /* ── Step 3 state ── */
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>(() => initDraft("general_fitness", (d) => d.primaryGoal));
  const [milestones, setMilestones] = useState<string[]>(() => initDraft([], (d) => d.milestones));
  const [baseline, setBaseline] = useState(() => initDraft("", (d) => d.baseline));
  const [successLooks, setSuccessLooks] = useState(() => initDraft("", (d) => d.successLooks));

  /* ── Step 4 state ── */
  const [deliveryMode, setDeliveryMode] = useState<"studio_1to1" | "home_training">(() => initDraft("studio_1to1", (d) => d.deliveryMode));
  const [equipment, setEquipment] = useState<ClientEquipmentEntry[] | null>(() => initDraft(null, (d) => d.equipment));
  const [bodyweightOnly, setBodyweightOnly] = useState(() => initDraft(false, (d) => d.bodyweightOnly));
  const [bandSet, setBandSet] = useState<"ef" | "own">(() => initDraft("ef", (d) => d.bandSet));
  const [bandNote, setBandNote] = useState(() => initDraft("", (d) => d.bandNote));

  /* ── Step 5 state ── */
  const [firstWorkoutRoute, setFirstWorkoutRoute] = useState<"qa" | "templates" | "paste">(() => initDraft("qa", (d) => d.firstWorkoutRoute));

  /* ── Show resume banner after draft is restored ── */
  useEffect(() => {
    draftRestoreReadyRef.current = true;
    const draft = draftCacheRef.current;
    if (draft) {
      setStep(draft.step);
      setMaxStepReached(draft.maxStepReached);
      setName(draft.name);
      setEmail(draft.email);
      setPhone(draft.phone);
      setAddress(draft.address);
      setDob(draft.dob);
      setGender(draft.gender);
      setEcName(draft.ecName);
      setEcRel(draft.ecRel);
      setEcPhone(draft.ecPhone);
      setGpName(draft.gpName);
      setGpSurgery(draft.gpSurgery);
      setGpPhone(draft.gpPhone);
      setPackageType(draft.packageType);
      setCadenceUnit(draft.cadenceUnit);
      setCadencePerUnit(draft.cadencePerUnit);
      setParqMode(draft.parqMode);
      setOverrideNote(draft.overrideNote);
      setGpClearanceRequired(draft.gpClearanceRequired);
      setGpClearanceNote(draft.gpClearanceNote);
      setConditions(draft.conditions);
      setContraindications(draft.contraindications);
      setMedications(draft.medications);
      setInjuryHistory(draft.injuryHistory);
      setPrimaryGoal(draft.primaryGoal);
      setMilestones(draft.milestones);
      setBaseline(draft.baseline);
      setSuccessLooks(draft.successLooks);
      setDeliveryMode(draft.deliveryMode);
      setEquipment(draft.equipment);
      setBodyweightOnly(draft.bodyweightOnly);
      setBandSet(draft.bandSet);
      setBandNote(draft.bandNote);
      setFirstWorkoutRoute(draft.firstWorkoutRoute);
      setIsResumingDraft(true);
    }
    setMounted(true);
  }, []);

  /* ── Validation tracking ── */
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});

  /* ── Cadence derived ── */
  const frequency: Frequency = useMemo(
    () => ({ unit: cadenceUnit, per_unit: cadenceUnit === "irregular" ? 0 : cadencePerUnit }),
    [cadenceUnit, cadencePerUnit]
  );

  /* ── Step validation ── */
  const step1Valid = name.trim().length > 0 && email.trim().length > 0;
  const step2Valid =
    parqMode !== null && (parqMode !== "override" || overrideNote.trim().length > 0) &&
    (parqMode !== "upload" || parqFile !== null);
  const step4Valid = bodyweightOnly || (equipment !== null && equipment.length > 0);

  const canContinue = useMemo(() => {
    switch (step) {
      case 1: return step1Valid;
      case 2: return step2Valid;
      case 4: return step4Valid;
      default: return true;
    }
  }, [step, step1Valid, step2Valid, step4Valid]);

  /* ── Navigation ── */
  const goTo = useCallback(
    (n: StepKey) => {
      setStep(n);
      setMaxStepReached((prev) => Math.max(prev, n) as StepKey);
      window.scrollTo({ top: 0, behavior: "auto" });
    },
    []
  );

  const goNext = useCallback(() => {
    setAttempted((prev) => ({ ...prev, [step]: true }));
    if (!canContinue) return;
    const next = Math.min(step + 1, 5) as StepKey;
    goTo(next);
  }, [step, canContinue, goTo]);

  const goBack = useCallback(() => {
    if (step > 1) goTo((step - 1) as StepKey);
  }, [step, goTo]);

  /* ── Handle equipment change from ClientEquipmentCard ── */
  const handleEquipmentChange = useCallback((val: ClientEquipmentEntry[] | null) => {
    setEquipment(val);
    setBodyweightOnly(val !== null && val.length === 0);
  }, []);

  /* ── Save and finish later ── */
  const handleSaveDraft = useCallback(() => {
    const draft = serializeDraft({
      step, maxStepReached, name, email, phone, address, dob, gender,
      ecName, ecRel, ecPhone, gpName, gpSurgery, gpPhone,
      packageType, cadenceUnit, cadencePerUnit,
      parqMode, overrideNote,
      gpClearanceRequired, gpClearanceNote,
      conditions, contraindications, medications, injuryHistory,
      primaryGoal, milestones, baseline, successLooks,
      deliveryMode, equipment, bodyweightOnly, bandSet, bandNote,
      firstWorkoutRoute,
    });
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      toast.success("Draft saved — resume any time from Clients → New client.");
    } catch {
      toast.error("Couldn't save the draft in this browser — try a different browser or finish now.");
    }
  }, [
    step, maxStepReached, name, email, phone, address, dob, gender,
    ecName, ecRel, ecPhone, gpName, gpSurgery, gpPhone,
    packageType, cadenceUnit, cadencePerUnit,
    parqMode, overrideNote,
    gpClearanceRequired, gpClearanceNote,
    conditions, contraindications, medications, injuryHistory,
    primaryGoal, milestones, baseline, successLooks,
    deliveryMode, equipment, bodyweightOnly, bandSet, bandNote,
    firstWorkoutRoute,
  ]);

  /* ── Discard draft and start fresh ── */
  const handleDiscardDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* best-effort */ }
    setIsResumingDraft(false);
  }, []);

  /* ── Create client ── */
  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Client name is required");
      return;
    }

    // Re-validate every gated step at submit time — clicking through
    // and back can leave a step desatisfied (e.g. deselecting equipment).
    if (parqMode === null) {
      toast.error("Health screening is required — choose a PAR-Q route before creating the client.");
      setStep(2);
      setAttempted((prev) => ({ ...prev, 2: true }));
      return;
    }
    if (parqMode === "override" && !overrideNote.trim()) {
      toast.error("A trainer override note is required when overriding the PAR-Q.");
      setStep(2);
      setAttempted((prev) => ({ ...prev, 2: true }));
      return;
    }
    if (parqMode === "upload" && !parqFile) {
      toast.error("A signed PAR-Q file is required — upload the document or choose a different route.");
      setStep(2);
      setAttempted((prev) => ({ ...prev, 2: true }));
      return;
    }
    if (!bodyweightOnly && (equipment === null || equipment.length === 0)) {
      toast.error("Equipment is required — pick available equipment or confirm bodyweight only.");
      setStep(4);
      setAttempted((prev) => ({ ...prev, 4: true }));
      return;
    }

    setSaving(true);

    const profile: ClientProfile = {
      ...emptyProfile,
      client: {
        ...emptyProfile.client,
        name: name.trim(),
        age: calculateAge(dob || null),
        date_of_birth: dob || null,
        gender: gender || "",
      },
      logistics: {
        ...emptyProfile.logistics,
        training_location: (deliveryMode === "home_training" ? "home" : "studio") as TrainingLocation,
        frequency,
      },
      health: {
        ...emptyProfile.health,
        gp_clearance_required: gpClearanceRequired,
        conditions,
        contraindications,
        medications,
        injury_history: injuryHistory,
        parq_trainer_override: parqMode === "override",
        parq_trainer_override_note: parqMode === "override" ? overrideNote : "",
      },
      goals: {
        primary: primaryGoal,
        secondary: [],
        milestones,
      },
      notes: {
        client_intro: "",
        esther_observations: baseline,
        motivation_notes: successLooks,
        watch_for: "",
      },
    };

    const body: Record<string, unknown> = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      profile,
      package_type: packageType,
      delivery_mode: deliveryMode,
      equipment: equipment,
    };

    // Emergency contact and GP go into the profile
    const profileExtra = profile as unknown as Record<string, unknown>;
    if (ecName.trim() || ecPhone.trim()) {
      profileExtra.emergency_contact = {
        name: ecName.trim() || null,
        relationship: ecRel.trim() || null,
        phone: ecPhone.trim() || null,
      };
    }
    if (gpName.trim() || gpSurgery.trim() || gpPhone.trim()) {
      profileExtra.gp = {
        name: gpName.trim() || null,
        surgery: gpSurgery.trim() || null,
        phone: gpPhone.trim() || null,
      };
    }

    // Band set
    if (bandSet === "own") {
      body.band_set_note = bandNote.trim() || null;
    }

    // GP clearance note
    if (gpClearanceRequired && gpClearanceNote.trim()) {
      body.gp_clearance_note = gpClearanceNote.trim();
    }

    // Address
    if (address.trim()) {
      body.address = address.trim();
    }

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save client" }));
        toast.error(`Failed to save client: ${err.error}`);
        setSaving(false);
        return;
      }

      const data = await res.json();

      // Upload signed PAR-Q if applicable — client must exist first
      if (parqMode === "upload" && parqFile) {
        const formData = new FormData();
        formData.append("client_id", String(data.client_number));
        formData.append("kind", "parq");
        formData.append("title", "PAR-Q (uploaded)");
        formData.append("file", parqFile);

        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json().catch(() => ({ error: "Upload failed" }));
          toast.error(`Client created, but the PAR-Q upload failed: ${uploadErr.error}. Upload it from the client's Compliance tab.`);
        }
      }

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* best-effort */ }
      toast.success("Client created");
      router.push(`/hub/clients/${data.client_number}/add-workout?view=${firstWorkoutRoute}`);
    } catch {
      toast.error("Failed to save client — please try again");
      setSaving(false);
    }
  }, [
    name, dob, gender, email, phone, address, ecName, ecRel, ecPhone,
    gpName, gpSurgery, gpPhone, packageType, frequency, deliveryMode,
    equipment, bandSet, bandNote, conditions, contraindications, medications,
    injuryHistory, primaryGoal, milestones, baseline, successLooks,
    gpClearanceRequired, parqMode, overrideNote, parqFile, router, firstWorkoutRoute,
  ]);

  /* ── Cadence label ── */
  const cadenceLabel = formatFrequency(frequency);

  /* ── Compliance flags for review ── */
  const complianceFlags = useMemo(() => {
    const flags: { text: string; note?: string }[] = [];
    if (parqMode === "send")
      flags.push({ text: "No PAR-Q on file", note: "Send from the client's Compliance tab after creation." });
    else if (parqMode === "upload")
      flags.push({ text: "Signed PAR-Q ready to upload", note: "The scanned document will be stored after the client record is created." });
    else if (parqMode === "override")
      flags.push({ text: "PAR-Q trainer-overridden — pending migration from Microsoft Forms" });
    else if (!parqMode)
      flags.push({ text: "No PAR-Q on file", note: "No PAR-Q route chosen in step 2." });
    if (gpClearanceRequired)
      flags.push({ text: "GP clearance required — not yet obtained" });
    return flags;
  }, [parqMode, gpClearanceRequired]);

  /* ── Rail fields ── */
  const railFields = useMemo(() => {
    const fields: { label: string; value: string; pending?: boolean }[] = [];
    fields.push({ label: "Name", value: name.trim() || "" });
    if (step >= 1 || maxStepReached >= 1) {
      fields.push({ label: "Package", value: packageType });
      fields.push({ label: "Cadence", value: cadenceLabel });
    }
    if (maxStepReached >= 2) {
      const parqLabel =
        parqMode === "send" ? "Not yet sent"
        : parqMode === "upload" ? "File ready"
        : parqMode === "override" ? "Trainer override"
        : "";
      fields.push({ label: "PAR-Q", value: parqLabel, pending: parqMode === "send" });
      fields.push({ label: "GP clearance", value: gpClearanceRequired ? "Required" : "Not required", pending: gpClearanceRequired });
    }
    if (maxStepReached >= 3) {
      fields.push({ label: "Goals", value: primaryGoal.replace("_", " ") });
    }
    if (maxStepReached >= 4) {
      const deliveryLabel = deliveryMode === "home_training" ? "Home training" : "Studio 1:1";
      const eqLabel = bodyweightOnly ? "Bodyweight only" : equipment && equipment.length > 0 ? `${equipment.length} item${equipment.length === 1 ? "" : "s"}` : "";
      fields.push({ label: "Where", value: deliveryLabel });
      fields.push({ label: "Equipment", value: eqLabel, pending: maxStepReached >= 4 && !eqLabel });
    }
    return fields;
  }, [
    name, step, maxStepReached, packageType, cadenceLabel, parqMode,
    gpClearanceRequired, primaryGoal, deliveryMode, bodyweightOnly, equipment,
  ]);

  /* ── Review preview ── */
  const reviewDeliveryLabel = deliveryMode === "home_training" ? "Home training" : "Studio 1:1";
  const reviewEqLabel = bodyweightOnly
    ? "Bodyweight only \u2014 no equipment"
    : equipment && equipment.length > 0
    ? equipment.map((e) => e.name).join(", ")
    : "";
  const reviewRouteLabel =
    firstWorkoutRoute === "templates" ? "Picked from templates"
    : firstWorkoutRoute === "paste" ? "Pasted in"
    : "Built from a short Q&A";

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <Link
          href="/hub/clients"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-nested px-2 py-1 -ml-2 mb-3 transition-colors"
        >
          <IconChevronLeft className="h-3.5 w-3.5" />
          Back to Clients
        </Link>
        <HubPageHeader
          title="New client"
          subtitle="Five short steps — who they are, their health, their goals, where they train, and their first workouts. Everything here feeds the Plan Agent."
        />
      </div>

      {/* Draft resumed banner */}
      {isResumingDraft && (
        <div className="flex items-center gap-3 p-3 rounded-nested border border-teal/20 bg-teal/5">
          <IconCheck className="w-4 h-4 shrink-0 text-teal" />
          <p className="flex-1 text-[12.5px] text-foreground">
            <strong>Draft restored.</strong> Picking up from step {step} — everything you entered is here.
          </p>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-nested px-2 py-1 transition-colors"
          >
            Start fresh
          </button>
        </div>
      )}

      {/* Stepper */}
      <nav className="flex items-center gap-2 flex-wrap" aria-label="Onboarding steps">
        {STEPS.map((s, i) => {
          const isOn = step === s.key;
          const isDone = s.key < step;
          const isClickable = s.key <= maxStepReached;
          const StepIcon = s.icon;
          return (
            <span key={s.key} className="flex items-center gap-2">
              {i > 0 && <span className="w-6 h-px bg-[var(--hub-border)] shrink-0" />}
              <button
                type="button"
                onClick={() => isClickable && goTo(s.key)}
                disabled={!isClickable}
                className={`inline-flex items-center gap-2 text-[13px] font-semibold transition-colors ${
                  isOn
                    ? "text-foreground"
                    : isDone
                    ? "text-foreground"
                    : "text-muted-foreground"
                } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`w-[26px] h-[26px] rounded-pill border grid place-items-center text-[12px] font-bold shrink-0 transition-colors ${
                    isOn
                      ? "bg-rose border-rose text-white"
                      : isDone
                      ? "bg-teal/10 border-teal/20 text-teal"
                      : "bg-[var(--hub-card)] border-[var(--color-muted-text)] text-muted-foreground"
                  }`}
                >
                  {isDone ? <IconCheck className="w-3 h-3" /> : s.key}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </span>
          );
        })}
      </nav>

      {/* Layout: main + rail */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] items-start">
        {/* ── Main column ── */}
        <div className="space-y-5 min-w-0">

          {/* ══ STEP 1 · WHO THEY ARE ══ */}
          {step === 1 && (
            <HubCard padded={false}>
              <HubCardHeader
                icon={<IconUsers className="w-4 h-4" />}
                title="Who they are"
                subtitle="Contact details, GP, and how often they'll train"
                color="navy"
                noBottomPadding
                divider
              />
              <div className="px-5 pb-5 pt-4 space-y-5">
                {/* Contact */}
                <SectionHeader title="Contact" />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Name <span className="text-muted-foreground font-medium">(required)</span>
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Client name"
                      className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                    />
                    {attempted[1] && !name.trim() && (
                      <p className="text-[11.5px] font-semibold text-destructive">Name is required — this is who the wizard is for.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={gender || undefined} onValueChange={(v) => setGender(v as Gender)}>
                      <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="non_binary">Non-binary</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-muted-foreground font-medium">(required)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                    />
                    {attempted[1] && !email.trim() && (
                      <p className="text-[11.5px] font-semibold text-destructive">An email address is needed to send the 6-week updates.</p>
                    )}
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
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="For home-training visits"
                      className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                    />
                  </div>
                </div>

                {/* Emergency contact */}
                <SectionHeader title="Emergency contact" />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="ecName">Name</Label>
                    <Input id="ecName" value={ecName} onChange={(e) => setEcName(e.target.value)} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ecRel">Relationship</Label>
                    <Input id="ecRel" value={ecRel} onChange={(e) => setEcRel(e.target.value)} placeholder="e.g. Spouse" className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ecPhone">Phone</Label>
                    <Input id="ecPhone" type="tel" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                  </div>
                </div>

                {/* GP */}
                <SectionHeader title="GP" />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="gpName">GP name</Label>
                    <Input id="gpName" value={gpName} onChange={(e) => setGpName(e.target.value)} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gpSurgery">Surgery</Label>
                    <Input id="gpSurgery" value={gpSurgery} onChange={(e) => setGpSurgery(e.target.value)} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gpPhone">Surgery phone</Label>
                    <Input id="gpPhone" type="tel" value={gpPhone} onChange={(e) => setGpPhone(e.target.value)} className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30" />
                  </div>
                </div>

                {/* Package & cadence */}
                <SectionHeader title="Package & cadence" />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Package</Label>
                    <Select value={packageType} onValueChange={(v) => setPackageType(v as Package)}>
                      <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4-week">4-week</SelectItem>
                        <SelectItem value="6-week">6-week</SelectItem>
                        <SelectItem value="12-week">12-week</SelectItem>
                        <SelectItem value="24-week">24-week</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <SegmentedControl
                    legend="Cadence"
                    name="cadenceUnit"
                    value={cadenceUnit}
                    onChange={(v) => {
                      setCadenceUnit(v);
                      if (v === "irregular") setCadencePerUnit(0);
                      else if (cadencePerUnit === 0) setCadencePerUnit(2);
                    }}
                    options={[
                      { value: "week", label: "Weekly" },
                      { value: "fortnight", label: "Fortnightly" },
                      { value: "month", label: "Monthly" },
                      { value: "irregular", label: "Irregular" },
                    ]}
                  />
                  {cadenceUnit !== "irregular" && (
                    <div className="space-y-2">
                      <Label>Sessions per {cadenceUnit === "week" ? "week" : cadenceUnit === "fortnight" ? "fortnight" : "month"}</Label>
                      <Select
                        value={String(cadencePerUnit)}
                        onValueChange={(v) => setCadencePerUnit(Number(v))}
                      >
                        <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1×</SelectItem>
                          <SelectItem value="2">2×</SelectItem>
                          <SelectItem value="3">3×</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {cadenceUnit === "irregular" && (
                    <div className="md:col-span-2">
                      <GateAlert variant="warning">
                        <p><strong>Heads up.</strong> Sessions will be planned on a default weekly cadence and every one will carry a visible &ldquo;default cadence&rdquo; note until a real pattern settles.</p>
                      </GateAlert>
                    </div>
                  )}
                </div>
              </div>
            </HubCard>
          )}

          {/* ══ STEP 2 · HEALTH ══ */}
          {step === 2 && (
            <HubCard padded={false}>
              <HubCardHeader
                icon={<IconHeart className="w-4 h-4" />}
                title="Health"
                subtitle="Required, not skippable — this is what programming has to be safe around"
                color="rose"
                noBottomPadding
                divider
              />
              <div className="px-5 pb-5 pt-4 space-y-5">
                {/* PAR-Q three-way OR */}
                <SectionHeader title="PAR-Q health screening" />
                <div className="space-y-2.5">
                  {/* Send to client */}
                  <label
                    className={`block rounded-nested border p-3 cursor-pointer transition-colors ${
                      parqMode === "send"
                        ? "bg-rose/5 border-rose/20"
                        : "bg-[var(--hub-hover)] border-[var(--hub-border)] hover:border-[var(--color-muted-text)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="parq"
                      value="send"
                      checked={parqMode === "send"}
                      onChange={() => setParqMode("send")}
                      className="sr-only"
                    />
                    <p className="text-[13px] font-bold text-foreground">Send the PAR-Q to the client</p>
                    <p className="text-xs text-muted-foreground mt-0.5">The client completes and signs the PAR-Q themselves. The link is sent from the Compliance tab after the client record is created.</p>
                    {parqMode === "send" && (
                      <div className="mt-2.5 pt-2.5 border-t border-[var(--hub-border)]">
                        <span className="pill warning">
                          Not yet sent · needs signing
                        </span>
                        <p className="text-[11.5px] text-muted-foreground mt-1.5">The PAR-Q link will be available from the client&apos;s Compliance tab after creation. Send it from there — the client completes and signs it themselves. Plan generation stays open, but the compliance record reads &ldquo;No PAR-Q on file&rdquo; until it comes back signed.</p>
                      </div>
                    )}
                  </label>

                  {/* Upload signed PAR-Q */}
                  <label
                    className={`block rounded-nested border p-3 cursor-pointer transition-colors ${
                      parqMode === "upload"
                        ? "bg-rose/5 border-rose/20"
                        : "bg-[var(--hub-hover)] border-[var(--hub-border)] hover:border-[var(--color-muted-text)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="parq"
                      value="upload"
                      checked={parqMode === "upload"}
                      onChange={() => setParqMode("upload")}
                      className="sr-only"
                    />
                    <p className="text-[13px] font-bold text-foreground">Upload a signed PAR-Q</p>
                    <p className="text-xs text-muted-foreground mt-0.5">The client has already signed a paper or PDF PAR-Q. Upload the scanned document — it will be stored as a signed PAR-Q on the client&apos;s compliance record.</p>
                    {parqMode === "upload" && (
                      <div className="mt-2.5 pt-2.5 border-t border-[var(--hub-border)] space-y-2">
                        <Label>
                          Signed PAR-Q file <span className="text-muted-foreground font-medium">(required)</span>
                        </Label>
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setParqFile(e.target.files?.[0] ?? null)}
                          className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                        />
                        <p className="text-[11.5px] text-muted-foreground">PDF, JPG, or PNG — max 10 MB. The file is uploaded and stored after the client record is created.</p>
                        {parqFile && (
                          <p className="text-[11.5px] text-foreground">
                            <IconUpload className="w-3.5 h-3.5 inline mr-1" />
                            {parqFile.name} ({(parqFile.size / 1024).toFixed(0)} KB)
                          </p>
                        )}
                        {attempted[2] && !parqFile && (
                          <p className="text-[11.5px] font-semibold text-destructive">A file is required — upload the signed PAR-Q or choose a different route.</p>
                        )}
                      </div>
                    )}
                  </label>

                  {/* Trainer override */}
                  <label
                    className={`block rounded-nested border p-3 cursor-pointer transition-colors ${
                      parqMode === "override"
                        ? "bg-rose/5 border-rose/20"
                        : "bg-[var(--hub-hover)] border-[var(--hub-border)] hover:border-[var(--color-muted-text)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="parq"
                      value="override"
                      checked={parqMode === "override"}
                      onChange={() => setParqMode("override")}
                      className="sr-only"
                    />
                    <p className="text-[13px] font-bold text-foreground">Trainer override — screened on Microsoft Forms</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Covers a client already screened through the external Forms process, pending migration into the hub.</p>
                    {parqMode === "override" && (
                      <div className="mt-2.5 pt-2.5 border-t border-[var(--hub-border)] space-y-2">
                        <Label>
                          Note <span className="text-muted-foreground font-medium">(required — what did the form flag?)</span>
                        </Label>
                        <Textarea
                          value={overrideNote}
                          onChange={(e) => setOverrideNote(e.target.value)}
                          placeholder="e.g. Cleared, mild lower-back sensitivity noted, avoid loaded spinal flexion"
                          rows={2}
                          className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                        />
                        {attempted[2] && !overrideNote.trim() && (
                          <p className="text-[11.5px] font-semibold text-destructive">A note is required — an override with nothing recorded isn&apos;t a real screening decision.</p>
                        )}
                      </div>
                    )}
                  </label>
                </div>

                {/* PAR-Q gate */}
                {!parqMode && (
                  <GateAlert variant="warning">
                    <p><strong>Choose one before continuing.</strong> Health is a required step — an onboarding that skips it is exactly how a client ends up training with no screening on record.</p>
                  </GateAlert>
                )}

                {/* PAR-Q structure (accordion) */}
                <div>
                  <Label>What&apos;s on the form — structure only</Label>
                  <div className="mt-2 rounded-nested border border-[var(--hub-border)] divide-y divide-[var(--hub-border)]">
                    {[
                      { title: "Section 1 · Cardiovascular and general health", count: 11 },
                      { title: "Section 2 · Musculoskeletal, neurological and surgical history", count: 7 },
                      { title: "Section 3 · Blood conditions, medication and diagnosed conditions", count: 8 },
                      { title: "Section 4 · Lifestyle and activity", count: 3 },
                    ].map((sec) => (
                      <details key={sec.title} className="group">
                        <summary className="flex items-center gap-2.5 px-3.5 min-h-[44px] cursor-pointer text-[12.5px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors list-none [&::-webkit-details-marker]:hidden">
                          <svg className="w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                          <span className="flex-1 min-w-0">{sec.title}</span>
                          <span className="inline-grid place-items-center min-w-[20px] h-5 px-1.5 rounded-pill bg-[var(--s-neutral-bg)] border border-[var(--s-neutral-bd)] text-[11.5px] font-bold text-[var(--body)]">{sec.count}</span>
                        </summary>
                        <div className="px-3.5 pb-3 pt-2 text-xs text-[var(--body)]">
                          Pulled from the live document template at send time — not editable here.
                        </div>
                      </details>
                    ))}
                  </div>
                </div>

                {/* GP clearance */}
                <SectionHeader title="GP clearance" />
                <div className="flex items-start gap-3">
                  <label htmlFor="gpRequired" className="relative shrink-0 w-5 h-5 mt-px cursor-pointer">
                    <input
                      type="checkbox"
                      id="gpRequired"
                      checked={gpClearanceRequired}
                      onChange={(e) => {
                        setGpClearanceRequired(e.target.checked);
                        if (!e.target.checked) setGpClearanceNote("");
                      }}
                      className="sr-only"
                    />
                    <span className={`absolute inset-0 rounded-control-sm border cursor-pointer transition-colors grid place-items-center ${gpClearanceRequired ? "bg-rose border-rose" : "bg-[var(--hub-card)] border-[var(--color-muted-text)]"}`}>
                      {gpClearanceRequired && <IconCheck className="w-3.5 h-3.5 text-white" />}
                    </span>
                  </label>
                  <div className="min-w-0">
                    <Label htmlFor="gpRequired" className="text-[13px] font-semibold text-foreground cursor-pointer">GP clearance required before training</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Trainer judgement — defaults to not required. Whether the letter has actually been obtained is tracked afterwards on the Compliance tab, not here.</p>
                  </div>
                </div>
                {gpClearanceRequired && (
                  <div className="space-y-2">
                    <Label htmlFor="gpNote">Why clearance is required</Label>
                    <Textarea
                      id="gpNote"
                      value={gpClearanceNote}
                      onChange={(e) => setGpClearanceNote(e.target.value)}
                      placeholder="e.g. Referring consultant asked for written sign-off before loaded work"
                      rows={2}
                      className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                    />
                  </div>
                )}

                {/* Conditions & contraindications */}
                <SectionHeader title="Conditions, contraindications and pain points" />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Conditions</Label>
                    <TagMultiSelect
                      category="condition"
                      selected={conditions}
                      onChange={setConditions}
                      placeholder="Select known conditions or add new…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contraindications</Label>
                    <TagMultiSelect
                      category="contraindication"
                      selected={contraindications}
                      onChange={setContraindications}
                      placeholder="Select contraindications or add new…"
                    />
                  </div>
                </div>

                {/* Medication */}
                <SectionHeader title="Medication" />
                <MedicationTable value={medications} onChange={setMedications} />

                {/* Injury history */}
                <SectionHeader title="Injury history" />
                <InjuryHistoryTable value={injuryHistory} onChange={setInjuryHistory} />
              </div>
            </HubCard>
          )}

          {/* ══ STEP 3 · GOALS ══ */}
          {step === 3 && (
            <HubCard padded={false}>
              <HubCardHeader
                icon={<IconTarget className="w-4 h-4" />}
                title="Goals"
                subtitle="What the client is working towards, and where they're starting from"
                color="teal"
                noBottomPadding
                divider
              />
              <div className="px-5 pb-5 pt-4 space-y-5">
                <div className="space-y-2">
                  <Label>Primary goal</Label>
                  <Select value={primaryGoal} onValueChange={(v) => setPrimaryGoal(v as PrimaryGoal)}>
                    <SelectTrigger className="border-[var(--color-muted-text)] focus:border-rose focus:ring-rose/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general_fitness">General fitness</SelectItem>
                      <SelectItem value="strength">Strength</SelectItem>
                      <SelectItem value="mobility">Mobility</SelectItem>
                      <SelectItem value="weight_loss">Weight management</SelectItem>
                      <SelectItem value="rehabilitation">Rehabilitation</SelectItem>
                      <SelectItem value="confidence">Confidence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Milestones</Label>
                  <TagMultiSelect
                    category="milestone"
                    selected={milestones}
                    onChange={setMilestones}
                    placeholder="Select milestones or add new…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseline">Physical baseline</Label>
                  <Textarea
                    id="baseline"
                    value={baseline}
                    onChange={(e) => setBaseline(e.target.value)}
                    placeholder="Current activity level, mobility, strength — whatever the Plan Agent should start from."
                    rows={3}
                    className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="successLooks">What success looks like</Label>
                  <Textarea
                    id="successLooks"
                    value={successLooks}
                    onChange={(e) => setSuccessLooks(e.target.value)}
                    placeholder="In the client's own words if possible."
                    rows={3}
                    className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                  />
                </div>
              </div>
            </HubCard>
          )}

          {/* ══ STEP 4 · WHERE THEY TRAIN ══ */}
          {step === 4 && (
            <HubCard padded={false}>
              <HubCardHeader
                icon={<IconMapPin className="w-4 h-4" />}
                title="Where they train"
                subtitle="And what they've got — this decides what a workout is allowed to include"
                color="teal"
                noBottomPadding
                divider
              />
              <div className="px-5 pb-5 pt-4 space-y-5">
                <SegmentedControl
                  legend="Where they train"
                  name="deliveryMode"
                  value={deliveryMode}
                  onChange={(v) => setDeliveryMode(v as typeof deliveryMode)}
                  options={[
                    { value: "studio_1to1", label: "Studio 1:1" },
                    { value: "home_training", label: "Home training" },
                  ]}
                />
                <p className="text-[11.5px] text-muted-foreground">Exactly these two — there&apos;s no third option and no &ldquo;both&rdquo;. This decides which set of workouts gets served, in the hub and the client&apos;s own app.</p>

                {/* Equipment — the critical gate */}
                <SectionHeader title="Equipment" />
                <p className="text-[11.5px] text-muted-foreground">Choose everything available, or confirm there&apos;s none. Leaving this unanswered isn&apos;t a valid state — an unconstrained profile is how a dumbbell exercise ends up assigned to someone with no dumbbells.</p>

                <ClientEquipmentCard
                  embedded
                  value={equipment}
                  onChange={handleEquipmentChange}
                  clientFirstName={name.split(" ")[0] || "this client"}
                  showCopyStudio={deliveryMode === "studio_1to1"}
                />

                {/* Equipment gate */}
                {!step4Valid && (
                  <GateAlert variant="warning">
                    <p><strong>Continue is disabled until you answer this.</strong> Pick from the list above, or confirm Bodyweight only. Skipping this step would leave the client&apos;s profile unconstrained, and workouts could get generated calling for kit they don&apos;t actually have.</p>
                  </GateAlert>
                )}

                {/* Resistance bands */}
                <SegmentedControl
                  legend="Resistance bands"
                  name="bandSet"
                  value={bandSet}
                  onChange={(v) => setBandSet(v as typeof bandSet)}
                  options={[
                    { value: "ef", label: "EF Studio set", sub: "Blue 9.1 → Black 52.2kg" },
                    { value: "own", label: "Their own set", sub: "Different tensions" },
                  ]}
                />
                {bandSet === "own" && (
                  <div className="space-y-2">
                    <Label htmlFor="bandNote">Their set, briefly</Label>
                    <Input
                      id="bandNote"
                      value={bandNote}
                      onChange={(e) => setBandNote(e.target.value)}
                      placeholder="e.g. 3-band set from a previous PT, colours unlabelled"
                      className="border-[var(--color-muted-text)] focus-visible:border-rose focus-visible:ring-rose/30"
                    />
                    <p className="text-[11.5px] text-muted-foreground">This note is carried across but no band set is linked to the client yet. The set itself still needs to be set up from studio equipment settings before resistance comparisons work.</p>
                  </div>
                )}
              </div>
            </HubCard>
          )}

          {/* ══ STEP 5 · FIRST WORKOUTS + REVIEW ══ */}
          {step === 5 && (
            <HubCard padded={false}>
              <HubCardHeader
                icon={<IconClipboardList className="w-4 h-4" />}
                title="First workouts"
                subtitle="Pick how you want to build the first workouts — you'll go straight there after the client is saved"
                color="navy"
                noBottomPadding
                divider
              />
              <div className="px-5 pb-5 pt-4 space-y-5">
                {/* Three routes */}
                <div className="space-y-2.5">
                  {[
                    { value: "qa" as const, title: "Answer a few questions", desc: "A short Q&A — you'll be taken to the workout builder to build from the answers." },
                    { value: "templates" as const, title: "Pick from templates", desc: "Browse the template library and add one directly to the client's schedule." },
                    { value: "paste" as const, title: "Paste in workouts", desc: "Already got them written down — you'll start a blank workout and paste exercises in." },
                  ].map((route) => (
                    <label
                      key={route.value}
                      className={`block rounded-nested border p-3 cursor-pointer transition-colors ${
                        firstWorkoutRoute === route.value
                          ? "bg-rose/5 border-rose/20"
                          : "bg-[var(--hub-hover)] border-[var(--hub-border)] hover:border-[var(--color-muted-text)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="route"
                        value={route.value}
                        checked={firstWorkoutRoute === route.value}
                        onChange={() => setFirstWorkoutRoute(route.value)}
                        className="sr-only"
                      />
                      <p className="text-[13px] font-bold text-foreground">{route.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{route.desc}</p>
                    </label>
                  ))}
                </div>

                {/* Preview line */}
                <div className="flex items-center gap-2.5 p-3 rounded-nested bg-teal/5 border border-teal/20">
                  <IconCheck className="w-4 h-4 shrink-0 text-teal" />
                  <span className="text-[12.5px]">
                    <strong className="text-foreground">After creating the client, you'll be taken straight to add the first workout.</strong>{" "}
                    {firstWorkoutRoute === "templates"
                      ? "Template library, ready to search and assign."
                      : firstWorkoutRoute === "paste"
                      ? "Blank workout editor — paste exercises in."
                      : "Workout builder, starting from a short Q&A."}
                  </span>
                </div>

                {/* Review summary */}
                <SectionHeader title="Review & finish" end={<span>{complianceFlags.length > 0 ? <span className="pill warning">{complianceFlags.length} outstanding</span> : <span className="pill success">Ready</span>}</span>} />

                <div className="rounded-nested border border-[var(--hub-border)] bg-[var(--hub-card)] p-4">
                  {[
                    { label: "Who they are", value: name.trim() || "This client", sub: email.trim() || "no email yet", editStep: 1 as StepKey },
                    { label: "Package & cadence", value: `${packageType} · ${cadenceLabel}`, editStep: 1 as StepKey },
                    {
                      label: "Health",
                      value: parqMode === "send" ? "PAR-Q needs to be sent from the Compliance tab"
                        : parqMode === "upload" ? "Signed PAR-Q ready to upload"
                        : parqMode === "override" ? "Trainer override, reviewed on Microsoft Forms"
                        : "Not answered",
                      sub: gpClearanceRequired ? "GP clearance required — not yet obtained" : undefined,
                      editStep: 2 as StepKey,
                    },
                    { label: "Goals", value: primaryGoal.replace(/_/g, " "), editStep: 3 as StepKey },
                    { label: "Where they train", value: reviewDeliveryLabel, sub: reviewEqLabel || "Not answered", editStep: 4 as StepKey },
                    { label: "Band set", value: bandSet === "ef" ? "EF Studio set" : "Their own set", sub: "Captured as a note — band set still needs to be linked in studio equipment settings", editStep: 4 as StepKey },
                    { label: "First workouts", value: reviewRouteLabel, sub: "You'll build after the client is saved", editStep: 5 as StepKey },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start gap-3 py-3 border-t border-[var(--hub-border)] first:border-t-0 first:pt-0">
                      <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground w-[132px] shrink-0 pt-0.5">{row.label}</span>
                      <span className="flex-1 text-[13px] text-foreground leading-relaxed">
                        {row.value}
                        {row.sub && <span className="block text-xs text-muted-foreground mt-0.5">{row.sub}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => goTo(row.editStep)}
                        className="shrink-0 text-xs font-semibold text-rose hover:bg-rose/5 rounded-nested px-1.5 py-0.5 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>

                {/* Outstanding */}
                <Label>Still outstanding</Label>
                <div className="rounded-nested border border-[var(--hub-border)] bg-[var(--hub-card)] p-3.5">
                  {complianceFlags.length > 0 ? (
                    complianceFlags.map((flag, i) => (
                      <div key={i} className={`flex items-start gap-2.5 py-2.5 ${i > 0 ? "border-t border-[var(--hub-border)]" : ""}`}>
                        <IconAlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--s-warning-tx)]" />
                        <div>
                          <p className="text-[12.5px] text-foreground">{flag.text}</p>
                          {flag.note && <span className="text-[11px] text-muted-foreground">{flag.note}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-[13.5px] font-bold text-foreground">Nothing outstanding</p>
                      <p className="text-xs text-muted-foreground">PAR-Q is on file and no GP clearance is pending.</p>
                    </div>
                  )}
                </div>
              </div>
            </HubCard>
          )}

          {/* ── Wizard footer ── */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={goBack} className="gap-1.5 rounded-lg">
                <IconChevronLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={handleSaveDraft} className="rounded-lg text-muted-foreground">
              Save and finish later
            </Button>
            <div className="flex-1" />
            {step < 5 ? (
              <Button
                type="button"
                onClick={goNext}
                disabled={!canContinue}
                className="gap-1.5 rounded-lg bg-rose hover:bg-rose/90 text-white"
              >
                Continue
                <IconChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="gap-1.5 rounded-lg bg-rose hover:bg-rose/90 text-white"
              >
                {saving ? "Creating…" : "Create client"}
              </Button>
            )}
          </div>
        </div>

        {/* ── Rail ── */}
        <aside className="hidden lg:block sticky top-20 space-y-4" aria-label="Captured so far">
          <div className="rounded-surface border border-[var(--hub-border)] bg-[var(--hub-card)] shadow-sm overflow-hidden">
            <p className="px-4 py-3 border-b border-[var(--hub-border)] text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Captured so far</p>
            <div className="px-4 py-2">
              <dl className="space-y-0">
                {railFields.map((f) => (
                  <div key={f.label} className="flex justify-between gap-2.5 py-2 border-b border-[var(--hub-border)] last:border-b-0">
                    <dt className="text-xs text-muted-foreground shrink-0">{f.label}</dt>
                    <dd className={`text-xs font-semibold text-right ${f.value ? (f.pending ? "text-[var(--s-warning-tx)]" : "text-foreground") : "text-muted-foreground font-medium italic"}`}>
                      {f.value || "Not yet"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="px-4 py-2.5 text-[11.5px] text-muted-foreground leading-relaxed">Updates live as you move through the steps. Nothing here is written until &ldquo;Create client&rdquo; on the review step.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── Section header helper ── */
function SectionHeader({
  title,
  end,
}: {
  title: string;
  end?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{title}</span>
      <span className="flex-1 h-px bg-[var(--hub-section-border)]" />
      {end && <span className="shrink-0">{end}</span>}
    </div>
  );
}
