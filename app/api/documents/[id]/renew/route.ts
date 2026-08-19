import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import type { DocumentBody } from "@/lib/documents/types";

const DAY_MS = 86_400_000;

/** Parse a YYYY-MM-DD string into a UTC epoch-millis value (null if invalid). */
function parseISO(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Format a UTC epoch-millis value back into YYYY-MM-DD. */
function formatISO(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Advance a block's start/end dates by the block's own day-span, so the new
 * block starts the day after the old one ends and covers the same length.
 * Falls back to empty strings if the dates aren't both parseable ISO dates.
 */
function advanceDates(startDate?: string, endDate?: string): { startDate: string; endDate: string } {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (start == null || end == null || end < start) return { startDate: "", endDate: "" };

  const span = Math.round((end - start) / DAY_MS);
  const newStart = end + DAY_MS;
  const newEnd = newStart + span * DAY_MS;
  return { startDate: formatISO(newStart), endDate: formatISO(newEnd) };
}

/**
 * Increment a "Block N" title if it matches the pattern ("Block 1: …" →
 * "Block 2: …"), otherwise append " (renewed)".
 */
function nextBlockTitle(title: string): string {
  const m = title.match(/^(.*\bBlock\s+)(\d+)(.*)$/i);
  if (!m) return `${title} (renewed)`;
  const n = parseInt(m[2], 10);
  return `${m[1]}${Number.isFinite(n) ? n + 1 : m[2]}${m[3]}`;
}

/**
 * Create the next endurance block for the same client — a NEW block, not a new
 * version of the same one (so `supersedes_id` is deliberately left unset).
 * Direction intro and discipline targets carry forward; the calendar rows and
 * coaching note are cleared and the dates advanced to the next span.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: current, error: readErr } = await supabase
    .from("client_documents")
    .select("*")
    .eq("id", params.id)
    .single();
  if (readErr || !current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (current.kind !== "endurance_block") {
    return NextResponse.json({ error: "Only endurance blocks can be renewed" }, { status: 400 });
  }

  const body = (current.body ?? {}) as DocumentBody;
  const block = body.enduranceBlock;
  const { startDate, endDate } = advanceDates(block?.startDate, block?.endDate);

  const nextBody: DocumentBody = {
    ...body,
    sections: body.sections ?? [],
    enduranceBlock: {
      targetEvent: "",
      startDate,
      endDate,
      directionIntro: block?.directionIntro ?? "",
      disciplineTargets: block?.disciplineTargets ?? [],
      coachingNotes: "",
      rows: [],
    },
  };

  const { data: inserted, error: insErr } = await supabase
    .from("client_documents")
    .insert({
      client_id: current.client_id,
      kind: "endurance_block",
      title: nextBlockTitle(current.title ?? "Endurance Training Block"),
      template_id: current.template_id,
      template_version: current.template_version,
      body: nextBody,
      requires_client_signature: current.requires_client_signature,
      requires_trainer_signature: current.requires_trainer_signature,
      status: "draft",
      version: 1,
    })
    .select("id")
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
