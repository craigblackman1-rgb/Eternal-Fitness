import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// CR-EF-050 — mark an Outlook event as "not a client booking" so it stops
// reappearing in the queue. Reversible via the undismiss route.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("outlook_booking_events")
    .update({ status: "dismissed", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
