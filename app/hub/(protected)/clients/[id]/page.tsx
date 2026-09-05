import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { computeUpdateDue } from "@/lib/updates-due";
import { buildExerciseTrends, isGoneQuiet, HOME_TRAINING_QUIET_DAYS, type TrendSessionMeta } from "@/lib/progress";
import { getLastClientLogAt } from "@/lib/progress-db";
import { computeComplianceFlags } from "@/lib/compliance";
import { lookupStatus } from "@/lib/hubStatus";
import { deriveBlockStatus } from "@/lib/block-status";
import { trainerizeResultsToSetLogs } from "@/lib/trainerize-adapter";
import type { SessionNoteData, PinnedNoteRef, DBSession, SetLog } from "@/types";
import { ClientRecordShell } from "./ClientRecordShell";
import type { TrainerizeHistoryData } from "@/components/hub";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: client } = await supabase.from("clients").select("*, compliance_status, outstanding_actions, group_type, pace_mode, resource_visibility").eq("client_number", parseInt(params.id)).single();

  if (!client) notFound();

  const resourceVisibility: Record<string, boolean> = (client as any).resource_visibility ?? {};

  const { data: parqs } = await supabase.from("signed_parq").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
  const { data: agreements } = await supabase.from("signed_agreements").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
  const { data: clientDocuments } = await supabase.from("client_documents").select("id, kind, title, status, version, created_at, updated_at, client_name, trainer_name, client_signature, trainer_signature, requires_trainer_signature, emailed, source_type, source_file_name, source_file_mime, source_file_size, consent_choices").eq("client_id", client.id).order("created_at", { ascending: false });

  const latestParq = parqs?.[0] ?? null;
  const latestAgreement = agreements?.[0] ?? null;

  const { data: blocks } = await supabase.from("blocks").select("*").eq("client_id", client.id).order("block_number", { ascending: false });
  const clientBlockIds = (blocks ?? []).map((b) => b.id);
  // Ordered by scheduled_at (a real column the pg shim can sort on) rather than
  // session_number, which repeats per block and used to interleave block 1's
  // session 12 with block 3's session 12 (CR-EF-027). completed_at lives inside
  // the `data` JSONB and isn't sortable at the DB level — TrainingTabContent
  // re-sorts client-side by completed-or-scheduled date, and independently by
  // session number, once the rows are in memory. NULLS LAST (CR-EF-033) keeps
  // unscheduled sessions from sorting ahead of scheduled ones under DESC, which
  // would otherwise push real dated sessions out of the capped 50-row window.
  const { data: sessions } = clientBlockIds.length > 0
    ? await supabase
        .from("sessions")
        .select(`*, blocks!inner(block_number, client_id)`)
        .in("block_id", clientBlockIds)
        .order("scheduled_at", { ascending: false, nullsLast: true })
        .limit(50)
    : { data: [] as any[] };

  // Normalise Postgres TIMESTAMPTZ to strict ISO-8601 so WebKit (iOS Safari)
  // doesn't render "Invalid Date". Node/V8 parses the raw format correctly;
  // the client then only ever receives a string every engine agrees on.
  for (const s of sessions ?? []) {
    if (s.scheduled_at) s.scheduled_at = new Date(s.scheduled_at).toISOString();
    if (s.completed_at) s.completed_at = new Date(s.completed_at).toISOString();
    const log = s.data?.session_log;
    if (log?.completed_at) log.completed_at = new Date(log.completed_at).toISOString();
  }

  // Column lists below deliberately exclude each table's `raw_data` JSONB blob
  // (and other columns nothing downstream reads) — that column duplicates the
  // whole imported API row and was previously pulled over the wire on every
  // client page load via `select("*")` for no reason: nothing in page.tsx or
  // the drawers reads it except trainerize_exercises' targetDetail below.
  const { data: trainerizeBlocks } = await supabase
    .from("trainerize_training_blocks")
    .select("id, trainerize_phase_id, phase_name, start_date, end_date, plan_type, instruction")
    .eq("client_id", client.id)
    .order("start_date", { ascending: false });
  const tBlockIds = (trainerizeBlocks ?? []).map((b: any) => b.id);
  const { data: trainerizeWorkouts } = tBlockIds.length > 0
    ? await supabase
        .from("trainerize_workouts")
        .select("id, trainerize_block_id, trainerize_workout_id, workout_name, workout_index, duration_seconds, workout_type, instruction")
        .in("trainerize_block_id", tBlockIds)
        .order("workout_index", { ascending: true })
    : { data: [] };
  const workoutIds = (trainerizeWorkouts ?? []).map((w: any) => w.id);
  const { data: trainerizeExercises } = workoutIds.length > 0
    ? await supabase
        .from("trainerize_exercises")
        .select("id, trainerize_workout_id, trainerize_exercise_id, exercise_name, exercise_order, sets, target_reps, target_type, rest_time_seconds, record_type, raw_data")
        .in("trainerize_workout_id", workoutIds)
        .order("exercise_order", { ascending: true })
    : { data: [] };
  const { data: trainerizeNotes } = await supabase
    .from("trainerize_client_notes")
    .select("id, source, content, source_date, sender_name")
    .eq("client_id", client.id)
    .order("source_date", { ascending: false });
  // Still fetches every logged set for this client (needed for exerciseTrends
  // below, which computes personal bests across the client's full history) —
  // but no longer pulls raw_data, distance, or created_at, none of which are
  // used by either the trend computation or the "Before the app" summary
  // built from this same array further down.
  const { data: workoutResults } = await supabase
    .from("trainerize_workout_results")
    .select("id, trainerize_daily_workout_id, workout_name, performed_date, rpe, trainerize_daily_exercise_id, exercise_name, set_number, reps, weight, duration_seconds")
    .eq("client_id", client.id)
    .order("performed_date", { ascending: false });

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: setLogs } = sessionIds.length > 0
    ? await supabase.from("set_logs").select("*").in("session_id", sessionIds).order("logged_at", { ascending: true })
    : { data: [] as any[] };
  const trendSessionMeta: Record<string, TrendSessionMeta> = {};
  for (const s of sessions ?? []) {
    trendSessionMeta[s.id] = {
      blockNumber: (s as any).blocks?.block_number ?? null,
      sessionNumber: s.session_number ?? null,
    };
  }
  const combinedSetLogs: SetLog[] = [
    ...((setLogs ?? []) as SetLog[]),
    ...trainerizeResultsToSetLogs((workoutResults ?? []) as any),
  ];
  const exerciseTrends = buildExerciseTrends(combinedSetLogs, trendSessionMeta);

  // CR-EF-098 — build session-level notes for the merged notes panel.
  // Session notes live in sessions.data.session_log.notes (a free-text string).
  // Session position is "Session N" without the total — the total per block is
  // computed further down and the capped 50-row window makes an accurate "of Y"
  // unreliable anyway.
  const sessionNotes: SessionNoteData[] = (sessions ?? [])
    .filter((s: any) => {
      const log = s.data?.session_log as Record<string, unknown> | undefined;
      return log && typeof log.notes === "string" && log.notes.trim();
    })
    .map((s: any) => {
      const log = s.data?.session_log as { completed_at?: string | null; notes: string };
      const sessName = s.data?.focus_label ?? (s.session_number != null ? `Session ${s.session_number}` : "—");
      return {
        note: log.notes,
        sessionName: sessName,
        sessionPos: s.session_number != null ? `Session ${s.session_number}` : "",
        sessionDate:
          (s.data?.scheduled_at as string | null) ??
          log.completed_at ??
          s.created_at ??
          "",
        sessionId: s.id,
        author: "Esther Fair",
      };
    });

  const pinnedNoteRefs: PinnedNoteRef[] = Array.isArray(
    (client as Record<string, unknown>).pinned_note_refs,
  )
    ? ((client as Record<string, unknown>).pinned_note_refs as PinnedNoteRef[])
    : [];

  const { data: clientUpdates } = await supabase.from("sent_updates").select("*").eq("client_id", client.id).order("created_at", { ascending: false });

  // BUG-EF-116 — the "Before the app" drawer used to render only block
  // headers (name, date range, workout count): the 19,687 rows in
  // trainerize_workout_results were fetched (needed for exerciseTrends
  // above) but never reached the drawer, and trainerize_client_notes wasn't
  // read by it at all. This reconstructs each real workout Esther's clients
  // logged in Trainerize (grouped by trainerize_daily_workout_id — there is
  // no FK from results to trainerize_workouts, the *prescribed* program) as
  // a compact summary: exercise name, set count, and top set per exercise.
  // Full per-set reps/weight/RPE for one workout is fetched on demand by
  // GET /api/clients/[id]/trainerize-workout/[workoutId] when a workout row
  // is expanded in the drawer — this summary never carries every set.
  //
  // Results carry no block reference either, only their own performed_date,
  // so each workout instance is bucketed into the training block whose
  // start_date is the latest one on/before it (open-ended — a real client's
  // declared block end_date is frequently earlier than their last logged
  // session in that phase; using it as a hard upper bound left roughly half
  // of Emma Atkinson's 3,162 results unmatched to any block in testing,
  // against ~0% with this open-ended approach).
  function summarisePerformedWorkouts() {
    const sortedBlocks = [...(trainerizeBlocks ?? [])]
      .filter((b: any) => b.start_date)
      .sort((a: any, b: any) => (a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0));

    interface ExerciseAcc { name: string; setCount: number; topWeightKg: number | null; topReps: number | null }
    interface WorkoutAcc {
      id: string;
      workoutName: string | null;
      performedDate: string | null;
      setCount: number;
      exercises: Map<string, ExerciseAcc>;
    }
    const workoutsById = new Map<string, WorkoutAcc>();
    for (const r of (workoutResults ?? []) as any[]) {
      if (!r.exercise_name || !r.performed_date) continue;
      const wid = String(r.trainerize_daily_workout_id);
      let w = workoutsById.get(wid);
      if (!w) {
        w = { id: wid, workoutName: r.workout_name ?? null, performedDate: r.performed_date, setCount: 0, exercises: new Map() };
        workoutsById.set(wid, w);
      }
      if (r.performed_date < (w.performedDate ?? r.performed_date)) w.performedDate = r.performed_date;
      w.setCount++;
      const weight = r.weight != null ? Number(r.weight) : null;
      const reps = r.reps != null ? Number(r.reps) : null;
      let ex = w.exercises.get(r.exercise_name);
      if (!ex) {
        ex = { name: r.exercise_name, setCount: 0, topWeightKg: null, topReps: null };
        w.exercises.set(r.exercise_name, ex);
      }
      ex.setCount++;
      if (weight != null && !Number.isNaN(weight) && (ex.topWeightKg == null || weight > ex.topWeightKg)) {
        ex.topWeightKg = weight;
        ex.topReps = reps != null && !Number.isNaN(reps) ? reps : null;
      }
    }

    const toSummary = (w: WorkoutAcc) => ({
      id: w.id,
      workoutName: w.workoutName,
      performedDate: w.performedDate,
      setCount: w.setCount,
      exercises: Array.from(w.exercises.values()),
    });

    const byBlockId: Record<string, ReturnType<typeof toSummary>[]> = {};
    const unmatched: ReturnType<typeof toSummary>[] = [];
    for (const w of workoutsById.values()) {
      const summary = toSummary(w);
      if (sortedBlocks.length === 0 || !w.performedDate || w.performedDate < sortedBlocks[0].start_date) {
        unmatched.push(summary);
        continue;
      }
      let blockId = sortedBlocks[0].id;
      for (const b of sortedBlocks) {
        if (w.performedDate >= b.start_date) blockId = b.id;
        else break;
      }
      (byBlockId[blockId] ??= []).push(summary);
    }
    const byDateDesc = (a: { performedDate: string | null }, b: { performedDate: string | null }) =>
      (b.performedDate ?? "").localeCompare(a.performedDate ?? "");
    for (const list of Object.values(byBlockId)) list.sort(byDateDesc);
    unmatched.sort(byDateDesc);
    return { byBlockId, unmatched };
  }
  const { byBlockId: performedWorkoutsByBlockId, unmatched: unmatchedPerformedWorkouts } = summarisePerformedWorkouts();

  const composeHistoryData = (): TrainerizeHistoryData => {
    const workoutsByBlock: Record<string, any[]> = {};
    for (const w of (trainerizeWorkouts ?? [])) {
      const bId = w.trainerize_block_id;
      if (!workoutsByBlock[bId]) workoutsByBlock[bId] = [];
      const exs = (trainerizeExercises ?? []).filter((ex: any) => ex.trainerize_workout_id === w.id);
      workoutsByBlock[bId].push({ ...w, exercises: exs.map((ex: any) => ({ ...ex, targetDetail: ex.raw_data?.targetDetail })) });
    }
    const tBlocks = (trainerizeBlocks ?? []).map((b: any) => ({
      ...b,
      workouts: workoutsByBlock[b.id] || [],
      performedWorkouts: performedWorkoutsByBlockId[b.id] || [],
    }));
    return {
      blocks: tBlocks,
      notes: trainerizeNotes ?? [],
      unmatchedPerformedWorkouts,
    };
  };
  const trainerizeHistory = composeHistoryData();

  const lastSentAt =
    (clientUpdates ?? [])
      .filter((u) => u.status === "sent" && u.sent_at)
      .sort((a, b) => new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime())[0]
      ?.sent_at ?? null;
  const dueInfo = computeUpdateDue(
    (client.update_interval as import("@/lib/updates-due").UpdateInterval) ?? null,
    lastSentAt,
    {
      weeks: (client as any).update_interval_weeks ?? null,
      fixedDate: (client as any).update_interval_next_date ?? null,
    },
  );
  const { data: ruleTypes } = await supabase.from("training_rule_types").select("id, label, bucket");
  const ruleTypesById = new Map((ruleTypes ?? []).map((rt) => [rt.id, rt]));

  // ── S0b drawer data ──

  // Portal account for this client
  const { data: portalAccountRows } = await supabase.from("portal_accounts").select("id, email, disabled_at, last_login_at, created_at").eq("client_id", client.id).limit(1);
  const portalAccount = portalAccountRows?.[0] ?? null;

  // Trainer notes about this client (not session notes)
  const { data: clientNoteRows } = await supabase.from("client_notes").select("id, note, created_at").eq("client_id", client.id).order("created_at", { ascending: false });
  const clientNotes = clientNoteRows ?? [];

  // Client reviews
  const { data: clientReviewRows } = await supabase.from("client_reviews").select("id, decision, note, recorded_by_name, created_at").eq("client_id", client.id).order("created_at", { ascending: false });
  const clientReviews = clientReviewRows ?? [];

  // Band set assigned to this client
  const bandSetId = (client as any).band_set_id;
  const { data: bandSet } = bandSetId
    ? await supabase.from("band_sets").select("id, name").eq("id", bandSetId).single()
    : { data: null };

  // ── S1 (home-training) ──
  // Gone-quiet detection already exists and was simply never called from this
  // page (lib/progress-db's own doc comment says "used on the client detail
  // page"). It is Esther-facing only — nothing is sent to the client from here.
  const isHomeTraining = (client as any).delivery_mode === "home_training";
  const lastClientLogAt = isHomeTraining ? await getLastClientLogAt(client.id) : null;
  const goneQuiet = isHomeTraining && isGoneQuiet(lastClientLogAt);

  // Outlook bookings still waiting to be sorted for THIS client. This was the
  // one item on the mockup's queue that S0a left out for want of a source —
  // outlook_booking_events is real (status open/confirmed/dismissed/blocked),
  // and until these are confirmed the block's session count reads short,
  // which is exactly why it belongs on the record and not only on triage.
  const { data: openBookingRows } = await supabase
    .from("outlook_booking_events")
    .select("id, start_at")
    .eq("client_id", client.id)
    .eq("status", "open");
  const openBookings = openBookingRows ?? [];
  const openBookingCount = openBookings.length;
  const oldestOpenBooking = openBookings.length
    ? openBookings
        .map((b: any) => b.start_at)
        .filter(Boolean)
        .sort()[0] ?? null
    : null;

  // Full task rows (not just status count)
  const { data: fullTaskRows } = await supabase.from("tasks").select("id, title, status, due_date, created_at").eq("client_id", client.id).order("created_at", { ascending: false });
  const allTaskRows = fullTaskRows ?? [];

  const p = client.profile;
  const initials = client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  // BUG-EF-109 — derive block status from sessions instead of trusting the stored column.
  const derivedStatusByBlock = new Map<string, import("@/types").BlockStatus>();
  for (const block of (blocks ?? [])) {
    const blockSessions = (sessions ?? []).filter((s: any) => s.block_id === block.id);
    derivedStatusByBlock.set(block.id, deriveBlockStatus(block.status, blockSessions));
  }

  const latestBlock = blocks && blocks.length > 0
    ? blocks.find((b) => derivedStatusByBlock.get(b.id) === "active") ?? blocks.find((b) => b.status === "approved") ?? blocks[0]
    : null;
  // Most-recently-*completed* session, found by completed_at rather than by
  // taking sessions[0] — array order now follows scheduled_at (see the query
  // above), so an upcoming future session could otherwise sort first and this
  // would silently pick up a session with no log at all.
  // CR-EF-101 — exclude sub-sessions: "last completed session" should be a
  // main session, not supplementary work.
  const completedSessions = (sessions ?? []).filter((s: any) => s.completed_at && !s.parent_session_id);
  const latestCompletedSession = completedSessions.length > 0
    ? completedSessions.reduce((latest: any, s: any) =>
        new Date(s.completed_at) > new Date(latest.completed_at) ? s : latest,
      )
    : null;
  const latestSessionLog = latestCompletedSession?.data?.session_log ?? null;

  // CR-EF-085 — surface the workout name (focus_label) on the Active Block card,
  // not just "Block N". Prefer the next upcoming (not-yet-completed) session in
  // the active block, falling back to the most recently completed one.
  const sessionIsCompleted = (s: any) =>
    s.status === "completed" || !!s.completed_at;
  const nextSession = (() => {
    const blockSessions = (sessions ?? []).filter((s: any) => s.block_id === latestBlock?.id);
    return (
      blockSessions
        .filter((s: any) => !sessionIsCompleted(s) && s.scheduled_at)
        .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        .find((s: any) => new Date(s.scheduled_at).getTime() >= Date.now()) ?? null
    );
  })();
  const blockSessionCounts: Record<number, number> = {};
  const blockCompletedCounts: Record<number, number> = {};
  for (const s of sessions ?? []) {
    if ((s as any).parent_session_id) continue;
    const bn = (s as any).blocks?.block_number;
    if (bn != null) {
      blockSessionCounts[bn] = (blockSessionCounts[bn] ?? 0) + 1;
      if (s.completed_at) {
        blockCompletedCounts[bn] = (blockCompletedCounts[bn] ?? 0) + 1;
      }
    }
  }

  /**
   * CR-EF-073 — a block is a dated period, so its card shows the real span
   * derived from its own sessions' scheduled_at (earliest–latest), never a
   * fabricated end date. Falls back to "Not yet scheduled" when none of the
   * block's sessions carry a date yet.
   */
  const latestBlockDateRangeLabel = (() => {
    if (!latestBlock) return "Not yet scheduled";
    const dates = (sessions ?? [])
      .filter((s: any) => s.block_id === latestBlock.id && s.scheduled_at)
      .map((s: any) => s.scheduled_at as string)
      .sort();
    if (dates.length === 0) return "Not yet scheduled";
    const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const start = fmt(dates[0]);
    const end = fmt(dates[dates.length - 1]);
    return start === end ? start : `${start} – ${end}`;
  })();

  const hasSignedParqDocument = (clientDocuments ?? []).some((d) => d.kind === "parq" && d.status === "signed");
  const hasSignedAgreementDocument = (clientDocuments ?? []).some((d) => d.kind === "terms" && d.status === "signed");
  const flags = computeComplianceFlags({
    client,
    latestParq: latestParq ?? null,
    latestAgreement: latestAgreement ?? null,
    hasSignedParqDocument,
    hasSignedAgreementDocument,
  });

  // Completion dates for the flat Compliance Status summary — resolved from the
  // legacy signed_parq/signed_agreements tables first, then the document engine.
  const signedParqDoc = (clientDocuments ?? []).find((d) => d.kind === "parq" && d.status === "signed");
  const signedTermsDoc = (clientDocuments ?? []).find((d) => d.kind === "terms" && d.status === "signed");
  const parqCompletedDate = latestParq?.parq_date ?? latestParq?.created_at ?? signedParqDoc?.updated_at ?? signedParqDoc?.created_at ?? null;
  const agreementDate = latestAgreement?.client_signature_date ?? latestAgreement?.created_at ?? signedTermsDoc?.updated_at ?? signedTermsDoc?.created_at ?? null;
  const gpClearanceDate = client.gp_letter_status === "received" ? client.gp_letter_received_date : null;

  // CR-EF-026: when compliance is satisfied entirely through a legacy
  // signed_parq/signed_agreements row (pre-dating the document engine) with
  // no corresponding signed client_documents row, the Document Register
  // used to show nothing for that document kind at all — reading as "not
  // signed" even though compliance was quietly fine. Surface it as a
  // read-only row so what's satisfying compliance is visible on the same
  // screen someone would check.
  const legacyDocumentRows = [
    !hasSignedParqDocument && latestParq
      ? {
          id: `legacy-parq-${latestParq.id}`,
          kind: "parq",
          title: "PAR-Q (legacy record)",
          status: "signed",
          version: 1,
          created_at: latestParq.created_at,
          legacy: true as const,
        }
      : null,
    !hasSignedAgreementDocument && latestAgreement?.status === "signed"
      ? {
          id: `legacy-agreement-${latestAgreement.id}`,
          kind: "terms",
          title: "Personal Training Agreement (legacy record)",
          status: "signed",
          version: 1,
          created_at: latestAgreement.created_at,
          legacy: true as const,
        }
      : null,
  ].filter((r): r is NonNullable<typeof r> => r !== null);
  const complianceLookup = lookupStatus(flags.effectiveStatus);
  const gpClearance = p?.health?.gp_clearance;
  const manualActions = client.outstanding_actions ?? [];
  const outstandingCount = flags.autoOutstanding.length + manualActions.length;

  const { data: taskRows } = await supabase.from("tasks").select("status").eq("client_id", client.id);
  const pendingTaskCount = (taskRows ?? []).filter((t: any) => t.status !== "done").length;

  // ── Derived values for the new single-screen layout ──

  // Draft blocks: blocks whose status is "draft"
  const draftBlockCount = (blocks ?? []).filter((b) => b.status === "draft").length;

  // Undated sessions in the latest block: sessions with no scheduled_at
  const latestBlockSessions = latestBlock
    ? (sessions ?? []).filter((s) => s.block_id === latestBlock.id && !s.parent_session_id)
    : [];
  const undatedSessionCount = latestBlockSessions.filter((s) => !s.scheduled_at).length;

  // Block session count mismatch: typed sessions_remaining vs counted completed
  const countedCompleted = latestBlockSessions.filter((s) => s.completed_at).length;
  const blockSessionCountMismatch = client.sessions_remaining != null
    && client.sessions_used != null
    && client.sessions_remaining + client.sessions_used !== latestBlockSessions.length;

  // Unpaid blocks: blocks whose package has payment_status != "paid"
  // TODO(S0b): This currently checks client-level payment_status. Per-block
  // payment tracking would need a payments table — not yet available.
  const unpaidBlocks = client.payment_status !== "paid" && latestBlock
    ? [`Block ${latestBlock.block_number}`]
    : [];

  // Missing band set: when a block has group_type === "band" but no band set on the client
  const missingBandSet = latestBlock?.group_type === "band" && !(client as any).band_set;

  // Training rules count (from profile)
  const trainingRulesCount = p?.programming_adaptations?.length ?? 0;

  // S1 — a package that exists in name only. Tested on rate and expiry
  // specifically: those two are never defaulted, so their absence really does
  // mean "not agreed", whereas sessions_used defaults to 0 for every client
  // and sessions_remaining is often legitimately set on its own. An earlier
  // version required all four to be null and so would never have fired for
  // the one real client it was drawn for.
  const missingPackageTerms = [
    (client as any).client_rate == null ? "rate" : null,
    (client as any).block_expiry_date == null ? "expiry" : null,
  ].filter((x): x is string => x !== null);
  const packageUnderSpecified =
    Boolean((client as any).package_type) && missingPackageTerms.length > 0;

  // Health flags: count of conditions, medications, pain points, contraindications
  const healthFlagsCount = (() => {
    if (!p?.health) return 0;
    let count = 0;
    if (p.health.conditions?.length > 0) count++;
    if (p.health.medications?.length > 0) count++;
    if (p.health.pain_points?.length > 0) count++;
    if (p.health.contraindications?.length > 0) count++;
    return count;
  })();

  // Exercise trend summary for the duo panel
  const exerciseTrendSummary = (() => {
    if (!exerciseTrends || exerciseTrends.length === 0) {
      return { totalExercisesLogged: 0, personalBests: 0, heaviestLift: null, belowBestCount: 0, recentNotes: null };
    }
    let totalLogged = 0;
    let personalBests = 0;
    let heaviestWeight = 0;
    let heaviestLabel = null;
    let belowBestCount = 0;

    for (const trend of exerciseTrends) {
      totalLogged += trend.points?.length ?? 0;
      // Count personal bests: exercises where the last point's topWeightKg equals
      // the max across all points (simple heuristic for now)
      if (trend.points && trend.points.length >= 2) {
        const maxWeight = Math.max(...trend.points.map((p) => p.topWeightKg ?? 0));
        const lastWeight = trend.points[trend.points.length - 1].topWeightKg ?? 0;
        if (maxWeight > 0 && lastWeight === maxWeight) personalBests++;
        if (lastWeight < maxWeight && lastWeight > 0) belowBestCount++;
      }
      // Check for heaviest lift
      for (const point of trend.points ?? []) {
        if (point.topWeightKg != null && point.topWeightKg > heaviestWeight) {
          heaviestWeight = point.topWeightKg;
          heaviestLabel = `${point.topWeightKg}kg`;
        }
      }
    }

    return {
      totalExercisesLogged: totalLogged,
      personalBests,
      heaviestLift: heaviestLabel,
      belowBestCount,
      recentNotes: latestSessionLog?.notes ?? null,
    };
  })();

  // Has all docs signed
  const hasAllDocsSigned = flags.effectiveStatus === "clear"
    || (flags.autoOutstanding.length === 0 && manualActions.length === 0);

  return (
    <ClientRecordShell
      client={client}
      blocks={blocks ?? []}
      sessions={(sessions ?? []) as DBSession[]}
      blockSessionCounts={blockSessionCounts}
      blockCompletedCounts={blockCompletedCounts}
      blockDateRangeLabel={latestBlockDateRangeLabel}
      trainerizeHistory={trainerizeHistory}
      pendingTaskCount={pendingTaskCount}
      draftBlockCount={draftBlockCount}
      undatedSessionCount={undatedSessionCount}
      blockSessionCountMismatch={blockSessionCountMismatch}
      unpaidBlocks={unpaidBlocks}
      outstandingActions={manualActions}
      autoOutstanding={flags.autoOutstanding}
      effectiveStatus={flags.effectiveStatus}
      dueInfo={dueInfo}
      hasAllDocsSigned={hasAllDocsSigned}
      healthFlagsCount={healthFlagsCount}
      trainingRulesCount={trainingRulesCount}
      isHomeTraining={isHomeTraining}
      goneQuiet={goneQuiet}
      lastClientLogAt={lastClientLogAt}
      quietDays={HOME_TRAINING_QUIET_DAYS}
      packageUnderSpecified={packageUnderSpecified}
      openBookingCount={openBookingCount}
      oldestOpenBooking={oldestOpenBooking}
      missingPackageTerms={missingPackageTerms}
      trainingRules={p?.programming_adaptations ?? []}
      exerciseTrendSummary={exerciseTrendSummary}
      missingBandSet={missingBandSet}
      latestBlock={latestBlock}
      derivedStatusByBlock={derivedStatusByBlock}
      /* S0b drawer data */
      portalAccount={portalAccount}
      clientNotes={clientNotes}
      clientReviews={clientReviews}
      bandSetName={bandSet?.name ?? null}
      allTaskRows={allTaskRows}
      clientDocuments={clientDocuments ?? []}
      legacyDocumentRows={legacyDocumentRows}
      flags={flags}
      clientUpdates={clientUpdates ?? []}
      exerciseTrends={exerciseTrends}
      ruleTypesById={ruleTypesById}
      complianceLookup={complianceLookup}
      gpClearance={gpClearance}
      sessionsRemaining={client.sessions_remaining}
      sessionsUsed={client.sessions_used}
      paymentStatus={client.payment_status}
      packageType={client.package_type}
      medicalClearanceStatus={client.medical_clearance_status}
      riskLevel={client.risk_level}
      annualReviewDueDate={client.annual_review_due_date}
      clearanceFrom={client.clearance_from}
      specialistName={client.specialist_name}
      exerciseModifications={client.exercise_modifications}
      clientStatus={client.client_status}
      referralSource={client.referral_source}
      startDate={client.start_date}
      blockExpiryDate={client.block_expiry_date}
      countCompletedSessions={countedCompleted}
    />
  );
}
