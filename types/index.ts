export type TrainingLocation = "studio" | "home" | "both";
export type SessionsPerWeek = 1 | 2 | 3;
export type TimeTier = "compact" | "standard" | "extended";
export type Package = "4-week" | "6-week" | "12-week" | "24-week" | "ongoing";

/** CR-EF-106 — structured session cadence. Replaces the fixed `sessions_per_week`
 *  to support fortnightly, monthly, and irregular cadences.
 *  - `unit: "week"` + `per_unit: N` → N sessions per week (the common case).
 *  - `unit: "fortnight"` + `per_unit: N` → N sessions every two weeks.
 *  - `unit: "month"` + `per_unit: N` → N sessions per calendar month.
 *  - `unit: "irregular"` + `per_unit: 0` → no fixed pattern; block generation
 *    falls back to 1x/week with a coaching note flagging the default. */
export interface Frequency {
  unit: "week" | "fortnight" | "month" | "irregular";
  per_unit: number;
}

/** Default frequency for new clients — 2x per week, the most common starting point. */
export const DEFAULT_FREQUENCY: Frequency = { unit: "week", per_unit: 2 };

/** Convert any Frequency to an approximate sessions-per-week count.
 *  Used by code that needs a single number (display labels, AI prompts).
 *  Monthly uses 4.33 weeks/month; fortnight divides by 2.
 *  Irregular returns 1 (the fallback cadence). */
export function frequencyToSessionsPerWeek(freq: Frequency | undefined | null): number {
  if (!freq) return 2; // legacy clients without frequency default to 2x/week
  switch (freq.unit) {
    case "week": return freq.per_unit;
    case "fortnight": return freq.per_unit / 2;
    case "month": return (freq.per_unit * 12) / 52; // ~per_unit * 0.2308
    case "irregular": return 1;
  }
}

/** Human-readable label for a frequency. */
export function formatFrequency(freq: Frequency | undefined | null): string {
  if (!freq) return "—";
  switch (freq.unit) {
    case "week":
      return freq.per_unit === 1 ? "1× per week" : `${freq.per_unit}× per week`;
    case "fortnight":
      return freq.per_unit === 1 ? "Every 2 weeks" : `${freq.per_unit}× every 2 weeks`;
    case "month":
      return freq.per_unit === 1 ? "Monthly" : `${freq.per_unit}× per month`;
    case "irregular":
      return "Irregular";
  }
}

/** Short label for table columns — e.g. "2x/wk", "Ftntl", "Mnthly". */
export function formatFrequencyShort(freq: Frequency | undefined | null): string {
  if (!freq) return "—";
  switch (freq.unit) {
    case "week": return `${freq.per_unit}x/wk`;
    case "fortnight": return freq.per_unit === 1 ? "Ftntl" : `${freq.per_unit}× Ftntl`;
    case "month": return freq.per_unit === 1 ? "Monthly" : `${freq.per_unit}× /mo`;
    case "irregular": return "Irregular";
  }
}
export type FitnessLevel = 1 | 2 | 3 | 4 | 5;
export type StrengthLevel = "beginner" | "intermediate" | "advanced";
export type PrimaryGoal = "strength" | "mobility" | "weight_loss" | "rehabilitation" | "confidence" | "general_fitness";
export type Archetype = "A" | "B" | "C";
export type Phase = "foundation" | "build" | "develop" | "peak" | "deload";
export type BlockStatus = "draft" | "approved" | "active" | "complete";
export type SessionStatus = "planned" | "scheduled" | "in_progress" | "completed" | "cancelled";

/** CR-EF-099 — structured flag for whether a cancellation consumed a session. Set explicitly at cancellation time, never auto-derived. */
export type ChargedFree = "charged" | "free";

/** Highest week number a session may sit on — mirrors the sessions_week_check
 *  constraint. Esther's standard block is 6 weeks, but supplied programmes run
 *  longer (Nathan Wadey's is 12) and Package allows a 24-week engagement. */
export const MAX_BLOCK_WEEKS = 24;

export type ProfileOptionCategory = "condition" | "movement_quality_flag" | "milestone" | "adaptation" | "contraindication" | "pain_point";

export interface ProfileOption {
  id: string;
  category: ProfileOptionCategory;
  value: string;
  created_at: string;
}

export type Gender = "female" | "male" | "non_binary" | "prefer_not_to_say";

export interface InjuryHistoryEntry {
  id: string;
  date: string | null;
  description: string;
  body_area: string;
  status: "active" | "monitoring" | "resolved";
}

export interface MedicationEntry {
  id: string;
  name: string;
  form: string;
  frequency: string;
  treats: string;
  start_date: string | null;
  end_date: string | null;
  side_effects: string;
}

/** Governance catalog row — see training_rule_types table / /hub/settings/training-rules. */
export type TrainingRuleBucket = "exclusion" | "restriction" | "emphasis" | "structural" | "coaching_style" | "general";

export interface TrainingRuleType {
  id: string;
  label: string;
  bucket: TrainingRuleBucket;
  description: string | null;
  active: boolean;
  created_at: string;
}

/** Governance catalog row — see studio_equipment table / /hub/settings/studio-equipment. */
export interface StudioEquipment {
  id: string;
  name: string;
  detail: string | null;
  home_equivalent: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
}

/** Lane B — Process & Quality System tables (see supabase/migrations/20260720_process_quality_system.sql). */
export type ProcessStatus = "active" | "draft" | "review" | "archived";

export interface ProcessEntry {
  id: string;
  ref: string;
  name: string;
  owner: string;
  area: string;
  status: ProcessStatus;
  reviewed: string | null;
  category: string;
  sop_ref: string | null;
  created_at: string;
}

export interface Sop {
  id: string;
  ref: string;
  title: string;
  area: string;
  trigger: string;
  owner: string;
  last_updated: string | null;
  what: string;
  good_looks_like: string;
  steps: string[];
  prompt_template: string | null;
  applies_to: string | null;
  review_date: string | null;
  linked_client: string | null;
  source: string | null;
  status: string;
  created_at: string;
}

export interface ImprovementEntry {
  id: string;
  ref: string;
  title: string;
  entry_date: string | null;
  process_ref: string | null;
  broke: string;
  changed: string;
  result: string;
  created_at: string;
}

/** Hub to-do task list (see supabase/migrations/20260725_hub_tasks.sql). */
export type TaskStatus = "todo" | "in_progress" | "done";

export interface TaskBucket {
  id: string;
  name: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee: string | null;
  bucket_id: string | null;
  due_date: string | null;
  client_id: string | null;
  client_name?: string | null;
  created_at: string;
  updated_at: string;
}

/** Timestamped free-text note against a client (CR-EF-017). Append-only. */
export interface ClientNote {
  id: string;
  client_id: string;
  note: string;
  created_at: string;
  /** Optional link to the session this note was captured against (CR-EF-079). */
  session_id?: string | null;
  /** The linked session's real display name (focus_label etc) -- derived
   *  server-side by GET /api/client-notes, never stored. Null when session_id
   *  is null. */
  session_name?: string | null;
  /** Display name of the staff member who wrote the note. */
  author?: string | null;
  /** Pinned notes surface first in the client-mode Notes tab. */
  pinned?: boolean;
}

/** A structured, per-client instance of a TrainingRuleType — replaces bare-string
  *  programming_adaptations so the Plan Agent applies it systematically rather than
  *  parsing prose. Stored inline in ClientProfile, not a separate table. */
export interface TrainingRule {
  id: string;
  rule_type_id: string;
  detail: string;
  severity: "hard" | "soft";
}

export interface ClientProfile {
  client: {
    id: string;
    name: string;
    /** Derived from date_of_birth when present; kept for legacy records without a DOB. */
    age: number;
    date_of_birth: string | null;
    gender: Gender | "";
  };
  logistics: {
    training_location: TrainingLocation;
    /** CR-EF-106 — structured cadence. New clients always get this field.
     *  Legacy clients may only have `sessions_per_week`; the app reads
     *  `frequency` first and falls back to `sessions_per_week`. */
    frequency?: Frequency;
    /** Legacy field — retained for backward compatibility with existing profile
     *  JSONB data. New code should read `frequency` instead. When both exist,
     *  `frequency` is authoritative. */
    sessions_per_week?: SessionsPerWeek;
    time_tier: TimeTier;
    /** @deprecated — use client.package_type instead. Kept for legacy JSONB records. */
    package?: Package;
    block_number: number;
    /** Label of a split defined in the Plan Agent "splits" setting (e.g. "Full body",
     *  "Upper body"). Absent → Full body. Defines the muscle-group coverage contract
     *  each generated session is validated against. */
    split?: string;
  };
  health: {
    gp_clearance: boolean;
    /** Trainer-set flag — Esther decides whether this client needs a GP clearance
     *  letter before training, based on her own clinical judgement. Replaces the
     *  earlier automated rule that inferred this from PAR-Q answers. */
    gp_clearance_required?: boolean;
    conditions: string[];
    contraindications: string[];
    medications_relevant: string[];
    medications: MedicationEntry[];
    injury_history: InjuryHistoryEntry[];
    pain_points: string[];
    /** Trainer-confirmed PAR-Q override — for clients screened via the external Microsoft Forms
     *  PAR-Q before it's ported into this system. Esther ticks this only once she's personally
     *  reviewed the submitted form; it stands in for `signed_parq` until the record is migrated. */
    parq_trainer_override?: boolean;
    parq_trainer_override_note?: string;
  };
  physical_baseline: {
    fitness_level: FitnessLevel;
    movement_quality_flags: string[];
    strength_baseline: {
      lower_body: StrengthLevel;
      upper_body: StrengthLevel;
      core: StrengthLevel;
    };
  };
  programming_adaptations: TrainingRule[];
  goals: {
    primary: PrimaryGoal;
    secondary: string[];
    milestones: string[];
  };
  notes: {
    client_intro: string;
    esther_observations: string;
    motivation_notes: string;
    watch_for: string;
  };
}

export interface ExerciseMedia {
  image_url?: string;
  video_url?: string;
}

export interface Exercise {
  exercise_name: string;
  sets: number;
  reps: string;
  tempo: string;
  rest: string;
  coaching_cue: string;
  modification: string;
  equipment: string[];
  media?: ExerciseMedia;
  /** Format group within the main block — free-form, named after the session format it
   *  belongs to (e.g. "Superset A", "Tri-Set", "Straight Sets", "Metabolic Block",
   *  "Skill Block"). Consecutive exercises sharing a label perform together as that
   *  format. Absent on legacy data. */
  group_label?: string;
  /** How this exercise is logged — 'reps' measures reps & weight per set,
   *  'time' measures a single duration. Absent on legacy data; the reader
   *  falls back to a regex guess on the `reps` string for old sessions. */
  log_type?: 'reps' | 'time';
  /** Persistent identity set by the migration and preserved by ensureUids.
   *  Optional so nothing that constructs an Exercise object needs to change. */
  uid?: string;
  /** First N of `sets` are warm-up. Absent on all current data —
   *  the badge simply won't show on existing sessions. */
  warmup_sets?: number;
  /** Only set when Esther manually corrects the unit for this exercise.
   *  Absent → derived from equipment at read time (band → lb, else kg). */
  weight_unit?: 'kg' | 'lb';
  /** CR-EF-014 — for banded exercises, the prescribed band colour (e.g. "Green").
   *  Absent on non-banded exercises. The band picker replaces the kg/lb field
   *  entirely when this is set or when the exercise has band equipment. */
  band_colour?: string;
}

export interface SessionVersion {
  warm_up: Exercise[];
  main_block: Exercise[];
  cooldown: Exercise[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  data: SessionVersion;
  archetypes: string[];
  movement_type: string[];
  muscle_groups: string[];
  equipment: string[];
  difficulty: number | null;
  /** Derived set across the composed exercises' own `position` (Seated/
   *  Supported/Standing) — a template can mix positions, so this is a set
   *  like archetypes/muscle_groups, not a single max like difficulty. */
  position: string[];
  condition_tags: string[];
  source_client_id: string | null;
  source_session_id: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  session_id: string;
  block_id: string;
  client_id: string;
  session_number: number;
  archetype: Archetype;
  week: number;
  phase: Phase;
  focus_label: string;
  time_tier: TimeTier;
  versions: {
    studio: SessionVersion;
    home: SessionVersion;
  };
  coaching_notes: string;
  client_intro: string;
  session_log?: SessionLog;
  /** Per-exercise notes keyed by persistent uid, saved via debounced PATCH. */
  exercise_notes?: Record<string, string>;
  /** Optional override for the session duration display;
   *  absent → derived from time_tier via sessionDurationMinutes(). */
  estimated_minutes?: number;
}

export interface SessionLog {
  completed_at: string | null;
  /** Set when a trainer opens the live session screen and begins logging.
   *  Absent on legacy data. Drives the "in progress" state on the mobile
   *  Today screen and the desktop editor's "live on phone" lock banner. */
  started_at?: string | null;
  rpe?: number | null;
  fatigue: "low" | "moderate" | "high" | null;
  notes: string;
}

/** One performed set against a prescribed exercise — set_logs table
 *  (see supabase/migrations/20260725_session_set_logs.sql).
 *  exercise_ref convention: `<version>:<section>:<index>:<exercise_name>`,
 *  e.g. "studio:warm_up:0:Bodyweight Squat". */
export interface SetLog {
  id: string;
  session_id: string;
  exercise_ref: string;
  /** Stable per-exercise identity (from the prescription JSON's `uid`) —
   *  survives reorders/swaps/edits where the positional exercise_ref breaks.
   *  Null only on rows predating the backfill that couldn't be resolved. */
  exercise_uid?: string | null;
  /** Exercise name at the time the set was logged. */
  exercise_name?: string | null;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  completed: boolean;
  /** True when this set is one of the exercise's prescribed warm-up sets
   *  (the first N of its `sets`). Warm-up sets never register as a personal
   *  best and are excluded from PB/trend history. Absent (undefined) on
   *  Trainerize-imported rows — treated as false. */
  is_warmup?: boolean;
  /** CR-EF-014 — band colour logged for this set (e.g. "Green"). NULL for non-banded. */
  band_colour?: string | null;
  logged_by: "trainer" | "client";
  logged_at: string;
  notes: string | null;
  created_at: string;
}

export type DeliveryMode = "studio_1to1" | "home_training";

export type DBClientComplianceStatus = "clear" | "action_needed" | "do_not_train" | "pending_medical";
export type DBClientGroupType = "individual_journey" | "calendar_block";
export type DBClientPaceMode = "fast" | "medium" | "slow";
export type GpLetterStatus = "not_required" | "requested" | "received";
export type MedicalClearanceStatus = "cleared" | "pending" | "not_required" | "not_yet_requested";
export type RiskLevel = "low" | "medium" | "high";
export type PaymentStatus = "paid" | "deposit" | "pending" | "overdue" | "suspended";
export type ClientStatus = "active" | "inactive" | "completed" | "suspended" | "archived";

export interface BlockSummary {
  block_number: number;
  period_start: string;
  period_end: string;
  attendance: {
    sessions_attended: number;
    sessions_scheduled: number;
    attendance_notes: string;
  };
  movements_introduced: string[];
  highlights: string;
  /** The single standout achievement of the block (leads the update email). */
  big_win?: string;
  areas_to_develop: string;
  discoveries: string;
  next_block_focus: string;
  worth_saying: string;
}

export interface DBClient {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  profile: ClientProfile;
  created_at: string;
  compliance_status: DBClientComplianceStatus;
  outstanding_actions: string[];
  group_type: DBClientGroupType;
  pace_mode: DBClientPaceMode;
  block_summaries?: BlockSummary[];
  client_number?: number;
  display_code?: string;
  email?: string | null;
  phone?: string | null;
  gp_letter_status: GpLetterStatus;
  gp_letter_requested_date: string | null;
  gp_letter_received_date: string | null;
  annual_review_due_date: string | null;
  clearance_from: string | null;
  specialist_name: string | null;
  // Clinical state (moved off signed_agreements — see 20260704_client_master_consolidation)
  medical_clearance_status: MedicalClearanceStatus;
  risk_level: RiskLevel;
  exercise_modifications: string | null;
  // Commercial state (moved off signed_agreements)
  package_type: string | null;
  sessions_purchased: number | null;
  sessions_used: number | null;
  sessions_remaining: number | null;
  session_duration: number | null;
  payment_method: string | null;
  payment_status: PaymentStatus;
  block_expiry_date: string | null;
  /** CR-EF-099 — history of grace-period extensions. Each entry: { from, to, at, reason }. */
  block_expiry_extensions?: { from: string; to: string; at: string; reason?: string }[];
  start_date: string | null;
  client_status: ClientStatus;
  referral_source: string | null;
  /** CR-EF-108 — equipment names the client has available (matching studio_equipment.name). NULL = not configured. */
  equipment?: string[] | null;
}

/** Lifecycle of an update record. 'sending' is transient — set just before dispatch, resolved to sent/failed immediately after. */
export type UpdateStatus = "draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled";

export interface SentUpdate {
  id: string;
  client_id: string;
  subject: string;
  body_html: string;
  block_number: number;
  /** Actual send time — null until the update goes out (drafts/scheduled). */
  sent_at: string | null;
  template_kind: string;
  emailed: boolean;
  status: UpdateStatus;
  /** When a scheduled update should send — null for drafts/immediate. */
  scheduled_for: string | null;
  client_email: string | null;
  /** Structured section values. Keys match the template registry for fixed-shape
   *  kinds; the flexible kind instead carries a `flexSections` array here. */
  sections: Record<string, unknown> | null;
  send_error: string | null;
  /** SendGrid message ID for webhook engagement matching. */
  sg_message_id: string | null;
  opened_at: string | null;
  open_count: number;
  clicked_at: string | null;
  click_count: number;
  created_at: string;
  updated_at: string;
}

/** A sent_update row joined with its client, for the global report. */
export interface UpdateWithClient extends SentUpdate {
  client: { name: string; client_number: number; package_type?: string | null } | null;
}

export interface DBBlock {
  id: string;
  client_id: string;
  block_number: number;
  status: BlockStatus;
  block_note: string | null;
  summary: string | null;
  created_at: string;
  approved_at: string | null;
  scheduled_start: string | null;
}

export interface DBSession {
  id: string;
  block_id: string;
  session_number: number;
  archetype: Archetype;
  week: number;
  phase: Phase;
  data: Session;
  /** When this session is booked to happen. NULL = unscheduled. Distinct from
   *  the performed record in data.session_log.completed_at (see 20260725_session_scheduling.sql). */
  scheduled_at?: string | null;
  /** When the booking was cancelled. NULL = not cancelled. Reversible. */
  cancelled_at?: string | null;
  /** Optional free-text reason for the cancellation. */
  cancel_reason?: string | null;
  /** CR-EF-099 — structured flag: 'charged' = consumed a session, 'free' = did not. NULL = legacy row without the flag. */
  charged_free?: ChargedFree | null;
  /** CR-EF-099 — timestamp when the cron flagged this session for lapse review. NULL = not flagged. */
  lapse_flagged_at?: string | null;
  /** First-class lifecycle state (CR-EF-037 Phase 1) — the single source of truth.
   *  Surfaces read this, never re-derive it from data.session_log / scheduled_at /
   *  cancelled_at. Absent only on rows created before the Phase 1 migration backfill. */
  status?: "planned" | "scheduled" | "in_progress" | "completed" | "cancelled";
  /** When the first set was logged (NOT screen-mount time). NULL if nothing logged. */
  started_at?: string | null;
  /** Real, indexable copy of data.session_log.completed_at — kept in sync by the
   *  transition API. */
  completed_at?: string | null;
  /** CR-EF-101 — sub-session parent link. NULL = this is a main (or standalone)
   *  session that counts toward the pot. Non-null = this is a supplementary
   *  session (drill, progression, assessment) that does NOT consume a session.
   *  Cascade delete: a sub-session has no meaning without its parent. */
  parent_session_id?: string | null;
}

export type DocumentStatus = "draft" | "sent" | "received" | "signed" | "expired" | "needs_update" | "superseded";
export type ClearanceStatus = "CLEARED" | "PENDING" | "NOT YET REQUESTED" | "NOT REQUIRED";
export type ClearanceRequired = "Y" | "N" | "NA";

export interface ClientDocument {
  id: string;
  client_id: string;
  status: DocumentStatus;
  sent_date: string | null;
  received_date: string | null;
  signed_at: string | null;
  requires_update: boolean;
  update_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignedAgreement extends ClientDocument {
  client_name: string;
  client_dob: string | null;
  client_address: string | null;
  client_email: string | null;
  client_phone: string | null;
  trainer_name: string;
  business_name: string;
  start_date: string | null;
  client_name_print: string | null;
  client_signature_date: string | null;
  client_signature_data: string | null;
  client_typed_signature: string | null;
  trainer_name_print: string;
  trainer_signature_date: string | null;
  trainer_signature_data: string | null;
  trainer_typed_signature: string;
  parq_completed: string;
  parq_date: string | null;
  parq_filed_by: string | null;
  medical_clearance: string;
  medical_clearance_date: string | null;
  medical_clearance_from: string | null;
  agreed_to_terms: boolean;
}

export interface SignedPARQ extends ClientDocument {
  version: number;
  supersedes_id: string | null;
  signed_by_ip: string | null;
  signed_by_user_agent: string | null;
  full_name: string;
  date_of_birth: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  gp_name: string | null;
  gp_surgery: string | null;
  gp_phone: string | null;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  q6: string;
  q7: string;
  q8: string;
  q9: string;
  q10: string;
  q11: string;
  q12: string;
  q13: string;
  q14: string;
  q15: string;
  q16: string;
  q17: string;
  q18: string;
  q19: string;
  q20: string;
  q21: string;
  q22: string;
  q23: string;
  q24: string;
  q25: string;
  q26: string;
  conditions: string | null;
  medications: string | null;
  devices: string | null;
  exercise_restrictions: string | null;
  surgeries: string | null;
  other_info: string | null;
  current_exercise: string | null;
  training_goals: string | null;
  q27: string;
  q28: string;
  q29: string;
  client_name_print: string | null;
  client_signature_date: string | null;
  client_signature_data: string | null;
  client_typed_signature: string | null;
}

export interface MedicalClearanceTracker {
  id: string;
  client_id: string | null;
  client_name: string;
  date_of_birth: string | null;
  parq_received_date: string | null;
  contract_signed_date: string | null;
  clearance_required: ClearanceRequired;
  conditions_requiring_clearance: string | null;
  clearance_from: string | null;
  specialist_name: string | null;
  gp_letter_requested_date: string | null;
  gp_letter_received_date: string | null;
  clearance_status: ClearanceStatus;
  clearance_filed: string;
  annual_review_due_date: string | null;
  last_session_delivered: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientDocumentsSummary {
  client_number: number | null;
  client_id: string;
  client_name: string;
  display_code: string | null;
  agreement_id: string | null;
  agreement_status: DocumentStatus | null;
  agreement_sent_date: string | null;
  agreement_received_date: string | null;
  agreement_signed_at: string | null;
  agreement_requires_update: boolean | null;
  agreement_update_notes: string | null;
  parq_id: string | null;
  parq_status: DocumentStatus | null;
  parq_sent_date: string | null;
  parq_received_date: string | null;
  parq_signed_at: string | null;
  parq_requires_update: boolean | null;
  parq_update_notes: string | null;
  tracker_id: string | null;
  clearance_status: ClearanceStatus | null;
  clearance_required: ClearanceRequired | null;
  tracker_parq_received: string | null;
  contract_signed_date: string | null;
  annual_review_due_date: string | null;
  last_session_delivered: string | null;
  tracker_notes: string | null;
  last_updated: string;
}

export interface ClientWithDocuments extends DBClient {
  documents: ClientDocumentsSummary;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

export interface DBInvoice {
  id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  vat_total: number;
  total: number;
  client_document_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBInvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  line_total: number;
  sort_order: number;
  created_at: string;
}

export interface DBInvoiceTemplate {
  id: string;
  name: string;
  description: string | null;
  line_items: InvoiceTemplateLineItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceTemplateLineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

// ── CR-EF-119 — Guided client review flow ────────────────────────────────

/** The three valid review decisions. Must match the CHECK constraint in the migration. */
export type ReviewDecision = "continue" | "adjust" | "restart";

/** A recorded client review row from the `client_reviews` table. */
export interface DBClientReview {
  id: string;
  client_id: string;
  decision: ReviewDecision;
  note: string;
  recorded_by: string;
  recorded_by_name: string;
  created_at: string;
}

/** Shape of the review POST request body. */
export interface ReviewDecisionInput {
  decision: ReviewDecision;
  note: string;
  recorded_by_name: string;
}
