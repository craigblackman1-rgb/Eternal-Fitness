import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { ensureUids } from "@/lib/exercise-ref";
import { syncSessionCalendarEvent } from "@/lib/calendar-sync";

// Fields a staff PATCH is allowed to update on a session. `data` carries the
// prescription + session_log (existing behaviour, from an earlier lane). The
// three scheduling fields are Lane D1 additions. Anything else in the body is
// ignored so this route can't be used to touch columns it shouldn't.
const ALLOWED_FIELDS = ["data", "scheduled_at", "cancelled_at", "cancel_reason"] as const;

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const update: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      update[field] = body[field];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const sectionKeys = ["warm_up", "main_block", "cooldown"] as const;

  if (update.data && typeof update.data === "object" && !Array.isArray(update.data)) {
    const data = update.data as Record<string, unknown>;
    if (data.versions && typeof data.versions === "object" && !Array.isArray(data.versions)) {
      const versions = data.versions as Record<string, unknown>;
      for (const v of Object.keys(versions)) {
        const version = versions[v];
        if (version && typeof version === "object" && !Array.isArray(version)) {
          const ver = version as Record<string, unknown>;
          for (const sk of sectionKeys) {
            if (Array.isArray(ver[sk])) {
              ver[sk] = ensureUids(ver[sk] as { uid?: string }[]);
            }
          }
        }
      }
    }
  }

  const { data, error } = await supabase.from("sessions").update(update).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Push the change to the Outlook calendar immediately; the 15-minute cron
  // repairs any miss, so a sync failure must never fail the PATCH itself.
  if ("scheduled_at" in update || "cancelled_at" in update) {
    try {
      await syncSessionCalendarEvent(params.id);
    } catch (err) {
      console.error("On-demand calendar sync failed (cron will retry):", err);
    }
  }

  return NextResponse.json(data);
}
