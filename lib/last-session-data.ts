/**
 * CR-EF-010 — Last-session prefill data.
 * Server-only: imports getPool() from pg-client.
 *
 * Returns per-exercise data from the client's most recent session containing
 * that exercise, used to prefill weight/duration/band fields instead of the
 * all-time best. Also returns PB metadata (date achieved) for the header chip.
 */

import { getPool } from "@/lib/pg-client";

export interface LastSessionPrefill {
  /** Heaviest non-warmup weight_kg from the last session with this exercise. */
  weight_kg: number | null;
  /** Reps at that best weight. */
  reps: number | null;
  /** Longest non-warmup duration_seconds (for timed exercises). */
  duration_seconds: number | null;
  /** Band colour from the last session (for band exercises). */
  band_colour: string | null;
  /** ISO timestamp of the session where this data came from. */
  session_date: string;
  /** Session number (if available). */
  session_number: number | null;
}

export interface PbMetadata {
  /** Weight_kg of the personal best. */
  weight_kg: number | null;
  /** Reps at the PB weight. */
  reps: number | null;
  /** Duration for timed PBs. */
  duration_seconds: number | null;
  /** ISO date when the PB was achieved. */
  achieved_at: string;
  /** Source of the PB: 'live_log', 'trainerize_import', or 'manual'. */
  source: "live_log" | "trainerize_import" | "manual";
  /** Note recorded with a manual PB. */
  note?: string | null;
  /** Name of the person who recorded a manual PB. */
  recorded_by?: string | null;
  /** Band colour for band-type PBs. */
  band_colour?: string | null;
  /** Band sort_order for ranking band PBs — never stored in weight_kg. */
  band_rank?: number | null;
}

export interface LastSessionAndPbData {
  lastSession: Record<string, LastSessionPrefill>;
  pbDates: Record<string, PbMetadata>;
}

/**
 * Fetch last-session prefill data and PB metadata for all exercises a client
 * has logged. Two queries, one round-trip each:
 *   1. All completed non-warmup set_logs for this client, ordered by session date
 *      (used to derive the "last session" per exercise).
 *   2. All personal_records for this client (used for PB display).
 *
 * The caller (page.tsx or API route) passes the clientId UUID.
 */
export async function getLastSessionAndPbData(
  clientId: string,
): Promise<LastSessionAndPbData> {
  const pool = getPool();

  const [logsRes, pbRes] = await Promise.all([
    pool.query(
      `SELECT sl.exercise_ref, sl.weight_kg, sl.reps, sl.duration_seconds,
              sl.band_colour, sl.completed, sl.is_warmup,
              s.scheduled_at AS session_date, s.session_number
         FROM set_logs sl
         JOIN sessions s ON s.id = sl.session_id
         JOIN blocks b ON b.id = s.block_id
        WHERE b.client_id = $1
          AND sl.completed = true
        ORDER BY s.scheduled_at DESC, sl.exercise_ref ASC, sl.weight_kg DESC NULLS LAST`,
      [clientId],
    ),
    pool.query(
      `SELECT exercise, metric, value, rep_count, achieved_at, source, note, recorded_by, band_colour
         FROM personal_records
        WHERE client_id = $1`,
      [clientId],
    ),
  ]);

  // ── Derive last session per exercise ────────────────────────────
  // Walk logs newest-first. For each exercise name, keep only the first
  // (most recent) session's sets, picking the heaviest weight and longest duration.
  const lastSession: Record<string, LastSessionPrefill> = {};
  const seenSessions = new Map<string, Set<string>>(); // exercise → set of session_dates seen

  for (const row of logsRes.rows) {
    // Parse exercise_name from exercise_ref (everything after last colon)
    const ref: string = row.exercise_ref;
    const lastColon = ref.lastIndexOf(":");
    const exerciseName = lastColon >= 0 ? ref.slice(lastColon + 1) : ref;

    const sessionDate = row.session_date as string;

    if (!lastSession[exerciseName]) {
      // First entry for this exercise (most recent session, since ordered DESC)
      lastSession[exerciseName] = {
        weight_kg: row.weight_kg ?? null,
        reps: row.reps ?? null,
        duration_seconds: row.duration_seconds ?? null,
        band_colour: row.band_colour ?? null,
        session_date: sessionDate,
        session_number: row.session_number ?? null,
      };
      const sessSet = new Set<string>();
      sessSet.add(sessionDate);
      seenSessions.set(exerciseName, sessSet);
    } else {
      const existing = lastSession[exerciseName];
      const sessSet = seenSessions.get(exerciseName)!;

      if (sessSet.has(sessionDate)) {
        // Same session — update best if this set is heavier or longer
        if (row.weight_kg != null && (existing.weight_kg == null || row.weight_kg > existing.weight_kg)) {
          existing.weight_kg = row.weight_kg;
          existing.reps = row.reps;
        }
        if (row.duration_seconds != null && (existing.duration_seconds == null || row.duration_seconds > existing.duration_seconds)) {
          existing.duration_seconds = row.duration_seconds;
        }
        if (row.band_colour && !existing.band_colour) {
          existing.band_colour = row.band_colour;
        }
      }
      // If it's a different (older) session, skip — we only want the most recent
    }
  }

  // ── PB metadata ─────────────────────────────────────────────────
  const pbDates: Record<string, PbMetadata> = {};
  for (const row of pbRes.rows) {
    const exercise = row.exercise as string;
    const metric = row.metric as string;
    const value = Number(row.value);
    const reps = row.rep_count != null ? Number(row.rep_count) : null;
    const achievedAt = row.achieved_at as string;

    const rowSource = (row.source as "live_log" | "trainerize_import" | "manual") ?? "live_log";
    const rowNote = row.note as string | null ?? null;
    const rowRecordedBy = row.recorded_by as string | null ?? null;
    const rowBandColour = row.band_colour as string | null ?? null;

    if (!pbDates[exercise]) {
      pbDates[exercise] = {
        weight_kg: null,
        reps: null,
        duration_seconds: null,
        achieved_at: achievedAt,
        source: rowSource,
        note: rowNote,
        recorded_by: rowRecordedBy,
        band_colour: rowBandColour,
        band_rank: null,
      };
    }

    const pb = pbDates[exercise];
    let beats = false;
    if (metric === "weight") {
      beats = pb.weight_kg == null || value > pb.weight_kg;
    } else if (metric === "duration") {
      beats = pb.duration_seconds == null || value > pb.duration_seconds;
    } else if (metric === "band") {
      // Higher sort_order wins; tie → reps
      beats = pb.band_rank == null || value > pb.band_rank;
    } else if (metric === "reps") {
      // Reps-only PB: only relevant when no kg/band PB exists for this exercise
      beats = pb.weight_kg == null && pb.band_rank == null && (pb.reps == null || value > pb.reps);
    }

    if (beats) {
      if (metric === "weight") {
        pb.weight_kg = value;
        pb.reps = reps;
        pb.band_colour = null; // weight PB — clear any stale band colour
        pb.band_rank = null;
      } else if (metric === "duration") {
        pb.duration_seconds = value;
      } else if (metric === "band") {
        pb.band_rank = value;
        pb.reps = reps;
        pb.band_colour = rowBandColour;
        pb.weight_kg = null; // band PB — clear any stale weight
      } else if (metric === "reps") {
        pb.reps = value;
        // Keep weight_kg/band_colour null (they were already null to reach here)
      }
      pb.achieved_at = achievedAt;
      pb.source = rowSource;
      pb.note = rowNote;
      pb.recorded_by = rowRecordedBy;
    }
  }

  return { lastSession, pbDates };
}
