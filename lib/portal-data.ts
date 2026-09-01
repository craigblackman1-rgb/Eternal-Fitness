/**
 * Server-side data access for the client portal. This is the ONLY place portal
 * routes read client data, and every query is filtered by the authenticated
 * client_id. The portal cookie never grants access to the staff Postgres role's
 * anon policies — reads use the app's service-role pg pool (same as the document
 * engine's public links). Defense-in-depth: each method re-asserts client_id.
 */

import { createPgClient, getPool } from "@/lib/pg-client";
import type { DeliveryMode, Exercise, Session, SetLog } from "@/types";
import type { TrendSessionMeta } from "@/lib/progress";

export interface PortalClient {
  id: string;
  name: string;
  email: string | null;
  delivery_mode: DeliveryMode;
  resource_visibility: Record<string, boolean> | null;
}

export interface PortalDocument {
  id: string;
  kind: string;
  title: string;
  status: string;
  sent_at: string | null;
  signed_at: string | null;
  client_signed_date: string | null;
  requires_client_signature: boolean;
  version: number;
}

export interface PortalUpdate {
  id: string;
  subject: string;
  block_number: number;
  sent_at: string | null;
  status: string;
  opened_at: string | null;
}

/** A prescribed exercise as shown in the portal — trimmed to client-facing
 *  fields, with the image/video links resolved (embedded media first, then a
 *  by-name match against the exercises library). */
export interface PortalExercise {
  exercise_name: string;
  sets: number;
  reps: string;
  tempo: string;
  rest: string;
  coaching_cue: string;
  modification: string;
  /** CR-EF-124 — prescribed load. Absent on legacy data. */
  load?: string;
  equipment: string[];
  group_label?: string;
  log_type?: "reps" | "time";
  image_url: string | null;
  video_url: string | null;
}

export interface PortalSessionPlan {
  id: string;
  session_number: number;
  week: number;
  scheduled_at: string | null;
  phase: string;
  focus_label: string;
  archetype: string;
  client_intro: string;
  completed_at: string | null;
  warm_up: PortalExercise[];
  main_block: PortalExercise[];
  cooldown: PortalExercise[];
}

export interface PortalTrainingPlan {
  block: { id: string; block_number: number; status: string };
  sessions: PortalSessionPlan[];
}

export class PortalDataClient {
  private clientId: string;
  constructor(clientId: string) {
    this.clientId = clientId;
  }

  async getClient(): Promise<PortalClient | null> {
    const pg = createPgClient();
    const { data, error } = await pg
      .from("clients")
      .select("id, name, email, delivery_mode, resource_visibility")
      .eq("id", this.clientId)
      .single();
    if (error || !data) return null;
    return data as PortalClient;
  }

  /** Documents the client has signed (signed status). */
  async getSignedDocuments(): Promise<PortalDocument[]> {
    const pg = createPgClient();
    const { data } = await pg
      .from("client_documents")
      .select(
        "id, kind, title, status, sent_at, signed_at, client_signed_date, requires_client_signature, version",
      )
      .eq("client_id", this.clientId)
      .eq("status", "signed")
      .order("signed_at", { ascending: false });
    return (data ?? []) as PortalDocument[];
  }

  /**
   * Outstanding / unsigned documents: any document issued to the client that is
   * not yet signed (draft, sent, received, expired, needs_update, superseded).
   * Superseded documents are shown but clearly marked as no longer current.
   */
  async getOutstandingDocuments(): Promise<PortalDocument[]> {
    const pg = createPgClient();
    const { data } = await pg
      .from("client_documents")
      .select(
        "id, kind, title, status, sent_at, signed_at, client_signed_date, requires_client_signature, version",
      )
      .eq("client_id", this.clientId)
      .neq("status", "signed")
      .order("sent_at", { ascending: false });
    return (data ?? []) as PortalDocument[];
  }

  /**
   * The client's current training block with its sessions, trimmed to the
   * portal-safe shape: version exercises keyed by delivery_mode (home vs studio),
   * no trainer-facing coaching_notes/session RPE data.
   * Exercises missing an embedded video_url are backfilled by name from the
   * exercises library where a video exists there. Returns null when the client
   * has no active/approved block yet.
   *
   * Callers are responsible for the delivery_mode gate — this method still
   * re-asserts client_id on every query (defense-in-depth).
   */
  async getTrainingPlan(): Promise<PortalTrainingPlan | null> {
    const pg = createPgClient();

    const { data: blocks } = await pg
      .from("blocks")
      .select("id, block_number, status")
      .eq("client_id", this.clientId)
      .in("status", ["active", "approved"])
      .order("block_number", { ascending: false })
      .limit(1);
    const block = (blocks ?? [])[0] as { id: string; block_number: number; status: string } | undefined;
    if (!block) return null;

    // Fetch the profile-level client_intro (Esther-written) to use as fallback
    // when session-level client_intro is empty (CR-EF-061).
    const { data: profileRow } = await pg
      .from("clients")
      .select("profile, delivery_mode")
      .eq("id", this.clientId)
      .single();
    const profileClientIntro = (profileRow as any)?.profile?.notes?.client_intro ?? "";
    const deliveryMode: DeliveryMode = (profileRow as any)?.delivery_mode ?? "studio_1to1";

    const { data: sessionRows } = await pg
      .from("sessions")
      .select("id, session_number, week, scheduled_at, phase, data")
      .eq("block_id", block.id)
      .order("session_number", { ascending: true });
    const rows = (sessionRows ?? []) as {
      id: string;
      session_number: number;
      week: number;
      scheduled_at: string | null;
      phase: string;
      data: Session;
    }[];

    // Backfill missing exercise media by name from the exercises library.
    const missingNames = new Set<string>();
    for (const row of rows) {
      const versionKey = deliveryMode === "home_training" ? "home" : "studio";
      const ver = row.data?.versions?.[versionKey];
      for (const section of [ver?.warm_up, ver?.main_block, ver?.cooldown]) {
        for (const ex of section ?? []) {
          if (ex.exercise_name && (!ex.media?.video_url || !ex.media?.image_url)) {
            missingNames.add(ex.exercise_name.toLowerCase());
          }
        }
      }
    }
    const imageByName = new Map<string, string>();
    const videoByName = new Map<string, string>();
    if (missingNames.size > 0) {
      const { data: library } = await pg
        .from("exercises")
        .select("name, image_url, video_url");
      for (const entry of (library ?? []) as { name: string; image_url: string | null; video_url: string | null }[]) {
        if (!entry.name) continue;
        const key = entry.name.toLowerCase();
        if (entry.image_url && !imageByName.has(key)) imageByName.set(key, entry.image_url);
        if (entry.video_url && !videoByName.has(key)) videoByName.set(key, entry.video_url);
      }
    }

    const toPortalExercise = (ex: Exercise): PortalExercise => ({
      exercise_name: ex.exercise_name,
      sets: ex.sets,
      reps: ex.reps,
      tempo: ex.tempo,
      rest: ex.rest,
      coaching_cue: ex.coaching_cue,
      modification: ex.modification,
      equipment: ex.equipment ?? [],
      group_label: ex.group_label,
      log_type: ex.log_type,
      image_url:
        ex.media?.image_url ||
        imageByName.get((ex.exercise_name ?? "").toLowerCase()) ||
        null,
      video_url:
        ex.media?.video_url ||
        videoByName.get((ex.exercise_name ?? "").toLowerCase()) ||
        null,
    });

    const sessions: PortalSessionPlan[] = rows.map((row) => {
      const versionKey = deliveryMode === "home_training" ? "home" : "studio";
      const version = row.data?.versions?.[versionKey];
      return {
        id: row.id,
        session_number: row.session_number,
        week: row.week,
        scheduled_at: row.scheduled_at ?? null,
        phase: row.phase,
        focus_label: row.data?.focus_label ?? "",
        archetype: row.data?.archetype ?? "",
        client_intro: row.data?.client_intro || profileClientIntro,
        completed_at: row.data?.session_log?.completed_at ?? null,
        warm_up: (version?.warm_up ?? []).map(toPortalExercise),
        main_block: (version?.main_block ?? []).map(toPortalExercise),
        cooldown: (version?.cooldown ?? []).map(toPortalExercise),
      };
    });

    return {
      block: { id: block.id, block_number: block.block_number, status: block.status },
      sessions,
    };
  }

  /** Set logs for the given sessions — every session id is re-verified against
   *  this client's ownership server-side before anything is returned. */
  async getSetLogsForSessions(sessionIds: string[]): Promise<SetLog[]> {
    if (sessionIds.length === 0) return [];
    const pool = getPool();
    const res = await pool.query(
      `SELECT sl.*
         FROM set_logs sl
         JOIN sessions s ON s.id = sl.session_id
         JOIN blocks b ON b.id = s.block_id
        WHERE b.client_id = $1
          AND sl.session_id = ANY($2::uuid[])
        ORDER BY sl.exercise_ref ASC, sl.set_number ASC`,
      [this.clientId, sessionIds],
    );
    return res.rows as SetLog[];
  }

  /**
   * Logged sets for this client's progress view (Lane C), plus block/session
   * labels for charting. Scoped by client_id at every step of the join chain
   * (client -> blocks -> sessions -> set_logs); a client can never see another
   * client's logs. Read-only. Empty at every step degrades to empty arrays.
   */
  async getSetLogHistory(): Promise<{ logs: SetLog[]; sessionMeta: Record<string, TrendSessionMeta> }> {
    const pg = createPgClient();
    const { data: blocks } = await pg
      .from("blocks")
      .select("id, block_number")
      .eq("client_id", this.clientId);
    const blockIds = (blocks ?? []).map((b: any) => b.id);
    if (blockIds.length === 0) return { logs: [], sessionMeta: {} };

    const { data: sessions } = await pg
      .from("sessions")
      .select("id, block_id, session_number")
      .in("block_id", blockIds);
    const sessionRows = (sessions ?? []) as { id: string; block_id: string; session_number: number | null }[];
    if (sessionRows.length === 0) return { logs: [], sessionMeta: {} };

    const blockNumberById = new Map((blocks ?? []).map((b: any) => [b.id, b.block_number as number | null]));
    const sessionMeta: Record<string, TrendSessionMeta> = {};
    for (const s of sessionRows) {
      sessionMeta[s.id] = {
        blockNumber: blockNumberById.get(s.block_id) ?? null,
        sessionNumber: s.session_number ?? null,
      };
    }

    const { data: logs } = await pg
      .from("set_logs")
      .select("*")
      .in("session_id", sessionRows.map((s) => s.id))
      .order("logged_at", { ascending: true });
    return { logs: (logs ?? []) as SetLog[], sessionMeta };
  }

  /** History of update emails sent to this client. */
  async getUpdateHistory(): Promise<PortalUpdate[]> {
    const pg = createPgClient();
    const { data } = await pg
      .from("sent_updates")
      .select("id, subject, block_number, sent_at, status, opened_at")
      .eq("client_id", this.clientId)
      .order("sent_at", { ascending: false });
    return (data ?? []) as PortalUpdate[];
  }

  /** One sent update, with its full HTML — scoped to this client so a
   *  guessed/other client's update id can never be read. Only ever-sent
   *  updates are viewable (drafts aren't something the client should see). */
  async getUpdateById(id: string): Promise<(PortalUpdate & { body_html: string }) | null> {
    const pg = createPgClient();
    const { data } = await pg
      .from("sent_updates")
      .select("id, subject, block_number, sent_at, status, opened_at, body_html")
      .eq("id", id)
      .eq("client_id", this.clientId)
      .neq("status", "draft")
      .maybeSingle();
    return (data as (PortalUpdate & { body_html: string }) | null) ?? null;
  }

  /**
   * The client's active block and its sessions, optimised for the booking/
   * reschedule page. Returns only the fields the booking UI needs — no
   * exercise prescriptions, no set logs. The block's focus_label is derived
   * from the first session's data (they all share the same focus within a
   * block). Returns null when the client has no active/approved block.
   */
  async getBookingSessions(): Promise<PortalBookingData | null> {
    const pg = createPgClient();

    const { data: blocks } = await pg
      .from("blocks")
      .select("id, block_number, status")
      .eq("client_id", this.clientId)
      .in("status", ["active", "approved"])
      .order("block_number", { ascending: false })
      .limit(1);
    const block = (blocks ?? [])[0] as { id: string; block_number: number; status: string } | undefined;
    if (!block) return null;

    const { data: sessionRows } = await pg
      .from("sessions")
      .select("id, session_number, week, phase, data, scheduled_at, status, cancelled_at")
      .eq("block_id", block.id)
      .order("session_number", { ascending: true });
    const rows = (sessionRows ?? []) as {
      id: string;
      session_number: number;
      week: number;
      phase: string;
      data: Session;
      scheduled_at: string | null;
      status: string | null;
      cancelled_at: string | null;
    }[];

    const focusLabel = rows[0]?.data?.focus_label ?? "";

    const sessions: PortalBookingSession[] = rows.map((row) => ({
      id: row.id,
      session_number: row.session_number,
      week: row.week,
      phase: row.phase,
      focus_label: row.data?.focus_label ?? "",
      archetype: row.data?.archetype ?? "",
      scheduled_at: row.scheduled_at,
      status: row.status ?? "planned",
      cancelled_at: row.cancelled_at,
    }));

    return {
      block: { id: block.id, block_number: block.block_number, status: block.status, focus_label: focusLabel },
      sessions,
    };
  }

  async getUpcomingSession(): Promise<PortalUpcomingSession | null> {
    const pool = getPool();
    const res = await pool.query(
      `SELECT s.id, s.session_number, s.week, s.phase,
              (s.data->>'focus_label') AS focus_label,
              (s.data->>'archetype') AS archetype,
              s.scheduled_at, b.block_number
         FROM sessions s
         JOIN blocks b ON b.id = s.block_id
        WHERE b.client_id = $1
          AND s.scheduled_at IS NOT NULL
          AND s.cancelled_at IS NULL
          AND s.scheduled_at > NOW()
        ORDER BY s.scheduled_at ASC
        LIMIT 1`,
      [this.clientId],
    );
    if (res.rows.length === 0) return null;
    return res.rows[0] as PortalUpcomingSession;
  }
}

export interface PortalUpcomingSession {
  id: string;
  session_number: number;
  week: number;
  phase: string;
  focus_label: string;
  archetype: string;
  scheduled_at: string;
  block_number: number;
}

export interface PortalBookingSession {
  id: string;
  session_number: number;
  week: number;
  phase: string;
  focus_label: string;
  archetype: string;
  scheduled_at: string | null;
  status: string;
  cancelled_at: string | null;
}

export interface PortalBookingBlock {
  id: string;
  block_number: number;
  status: string;
  focus_label: string;
}

export interface PortalBookingData {
  block: PortalBookingBlock | null;
  sessions: PortalBookingSession[];
}

export function createPortalDataClient(clientId: string): PortalDataClient {
  return new PortalDataClient(clientId);
}
