import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

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

  const { data, error } = await supabase.from("sessions").update(update).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
