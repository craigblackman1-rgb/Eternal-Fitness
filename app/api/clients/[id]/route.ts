import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { normaliseClientEquipment } from "@/lib/client-equipment";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: client, error } = await supabase.from("clients").select("*").eq("client_number", parseInt(params.id)).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: blocks } = await supabase.from("blocks").select("*").eq("client_id", client.id).order("block_number", { ascending: false });
  const blockIds = (blocks ?? []).map((b) => b.id);
  let sessions: any[] | null = null;
  if (blockIds.length > 0) {
    const { data, error: sessionsError } = await supabase
      .from("sessions")
      .select("*, blocks(block_number)")
      .in("block_id", blockIds)
      .order("session_number", { ascending: false })
      .limit(50);
    if (sessionsError) console.error("clients/[id] sessions query failed:", sessionsError.message);
    sessions = data;
  }
  const { data: clientDocuments } = await supabase.from("client_documents").select("id, kind, title, status").eq("client_id", client.id);

  const hasSignedAgreementDocument = (clientDocuments ?? []).some((d: any) => d.kind === "terms" && d.status === "signed");

  const blockSessionsCount: Record<number, number> = {};
  for (const s of sessions ?? []) {
    const bn = (s as any).blocks?.block_number;
    if (bn != null) blockSessionsCount[bn] = (blockSessionsCount[bn] ?? 0) + 1;
  }

  const lastSessionLog = sessions?.[0] ? ((sessions[0] as any).data?.session_log ?? null) : null;
  const lastSessionDate = lastSessionLog?.completed_at ?? null;

  return NextResponse.json({
    ...client,
    _blocks: blocks ?? [],
    _sessionsCount: blockSessionsCount,
    _lastSessionDate: lastSessionDate,
    _hasSignedAgreementDocument: hasSignedAgreementDocument,
  });
}

// Fields the client-record drawers let Esther edit inline that do NOT have
// their own top-level column — they live nested inside the `profile` JSONB
// blob alongside a lot of unrelated data (health, notes, emergency contact,
// logistics, ...). `clients.update(body)` below does a plain column SET, so
// blind-assigning `profile: {...}` from the client would silently wipe out
// every sibling field that wasn't part of this edit. Instead we read the
// current profile, merge only the requested nested path, and let the normal
// update carry the merged object through.
const PROFILE_PATCH_KEYS = ["date_of_birth", "goals_primary"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// BUG-EF fix — column allow-list. Previously `clients.update(body)` ran with
// whatever keys the caller sent, so any hub session could write any column
// on the table (including ones no UI exposes). This is the exhaustive list
// of columns the shipped hub UI actually edits through this route, plus the
// two virtual `profile`-nested keys handled below. Enumerated by reading
// every legitimate PATCH call site as of this fix:
//   - ClientDrawers.tsx (client record drawers): name, email, phone,
//     date_of_birth*, referral_source, medical_clearance_status, risk_level,
//     gp_letter_status, annual_review_due_date, clearance_from,
//     specialist_name, exercise_modifications, package_type, client_rate,
//     block_expiry_date, sessions_remaining, delivery_mode, session_duration,
//     pace_mode, goals_primary*
//   - clients/[id]/edit/page.tsx (full record editor, linked from
//     ClientRecordHeader "Edit"): name, email, phone, profile,
//     compliance_status, outstanding_actions, group_type, pace_mode,
//     delivery_mode, equipment, resource_visibility, start_date,
//     band_set_id, package_type
//   - UpdateIntervalControl.tsx (rendered in CommsTabContent.tsx):
//     update_interval, update_interval_weeks, update_interval_next_date
//   (* = virtual profile-nested key, not a real column — see PROFILE_PATCH_KEYS)
// components/hub/{ClinicalComplianceCard,GpLetterCard,GracePeriodExtension,
// PackagePaymentsCard}.tsx are NOT imported by any page (dead code) — their
// fields (e.g. gp_letter_requested_date, gp_letter_received_date,
// block_expiry_extensions) are deliberately excluded. If one of those
// components is wired up in future, add its column(s) here at that time.
const ALLOWED_COLUMNS = new Set<string>([
  "name",
  "email",
  "phone",
  "referral_source",
  "medical_clearance_status",
  "risk_level",
  "gp_letter_status",
  "annual_review_due_date",
  "clearance_from",
  "specialist_name",
  "exercise_modifications",
  "package_type",
  "client_rate",
  "block_expiry_date",
  "sessions_remaining",
  "delivery_mode",
  "session_duration",
  "pace_mode",
  "profile",
  "compliance_status",
  "outstanding_actions",
  "group_type",
  "equipment",
  "resource_visibility",
  "start_date",
  "band_set_id",
  "update_interval",
  "update_interval_weeks",
  "update_interval_next_date",
  ...PROFILE_PATCH_KEYS,
]);

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const offending = Object.keys(body).find((k) => !ALLOWED_COLUMNS.has(k));
  if (offending) {
    return NextResponse.json({ error: `Field "${offending}" cannot be edited through this endpoint.` }, { status: 400 });
  }

  if ("equipment" in body) body.equipment = normaliseClientEquipment(body.equipment);

  if ("name" in body && (typeof body.name !== "string" || body.name.trim() === "")) {
    return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
  }
  if ("date_of_birth" in body && body.date_of_birth !== null && !DATE_RE.test(String(body.date_of_birth))) {
    return NextResponse.json({ error: "Date of birth must be a valid date." }, { status: 400 });
  }

  const numericId = parseInt(params.id);
  const col = Number.isFinite(numericId) && numericId > 0 ? "client_number" : "id";
  const val = Number.isFinite(numericId) && numericId > 0 ? numericId : params.id;

  const hasProfilePatch = PROFILE_PATCH_KEYS.some((k) => k in body);
  if (hasProfilePatch) {
    const { data: existing, error: fetchError } = await supabase
      .from("clients").select("profile").eq(col, val).single();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 });
    const profile = { ...(existing?.profile ?? {}) };

    if ("date_of_birth" in body) {
      profile.client = { ...(profile.client ?? {}), date_of_birth: body.date_of_birth };
      delete body.date_of_birth;
    }
    if ("goals_primary" in body) {
      const primary = typeof body.goals_primary === "string" ? body.goals_primary.trim() : body.goals_primary;
      profile.goals = { ...(profile.goals ?? {}), primary: primary === "" ? null : primary };
      delete body.goals_primary;
    }
    body.profile = profile;
  }

  const { data, error } = await supabase.from("clients").update(body).eq(col, val).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("clients").delete().eq("client_number", parseInt(params.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
