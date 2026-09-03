import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// CR-EF-050 — list Outlook Bookings reconciliation queue rows.
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "open"; // "open" | "dismissed" | "confirmed" | "all"
  const clientId = searchParams.get("client_id"); // optional — scope to one client
  const countOnly = searchParams.get("count") === "true";

  let query = supabase
    .from("outlook_booking_events")
    .select(countOnly ? "id" : "*, clients(id, name, client_number, email)", countOnly ? { count: "exact", head: true } : undefined)
    .order("start_at", { ascending: true });

  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  if (countOnly) {
    const { count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Normalise Postgres TIMESTAMPTZ to strict ISO-8601 so WebKit (iOS Safari)
  // doesn't render "Invalid Date". Node/V8 parses the raw format correctly;
  // the client then only ever receives a string every engine agrees on.
  for (const row of data ?? []) {
    if (row.start_at) row.start_at = new Date(row.start_at).toISOString();
    if (row.end_at) row.end_at = new Date(row.end_at).toISOString();
  }

  return NextResponse.json(data);
}
