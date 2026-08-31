import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AvailabilityManager } from "./AvailabilityManager";

/**
 * CR-EF-097 — Hub availability page (desktop).
 *
 * The single place Esther's diary is defined. Everything the public booking
 * page and the client portal offer is derived from this screen: pattern
 * minus time off plus one-off extras, filtered by booking rules.
 *
 * Cool-grey hub register (DESIGN.md §13) — never the warm marketing tokens.
 */
export default async function AvailabilityPage() {
  const supabase = createClient();

  // Auth check
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/hub/login");

  // Fetch all availability data in parallel
  const [settingsRes, patternRes, overridesRes] = await Promise.all([
    supabase.from("booking_settings").select("*").limit(1).single(),
    supabase
      .from("availability_pattern")
      .select("*")
      .order("day_of_week")
      .order("sort_order"),
    supabase
      .from("availability_overrides")
      .select("*")
      .order("start_date", { ascending: false }),
  ]);

  const settings = settingsRes.data;
  const pattern = patternRes.data ?? [];
  const overrides = overridesRes.data ?? [];

  // Count booked sessions this week for summary
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const { count: bookedThisWeek } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .not("scheduled_at", "is", null)
    .is("cancelled_at", null)
    .gte("scheduled_at", monday.toISOString())
    .lte("scheduled_at", sunday.toISOString());

  // Count time-off overrides with booked session clashes
  const activeOverrides = overrides.filter(
    (o) => o.active && o.override_type === "time_off"
  );
  let clashesCount = 0;
  for (const o of activeOverrides) {
    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .not("scheduled_at", "is", null)
      .is("cancelled_at", null)
      .gte("scheduled_at", `${o.start_date}T00:00:00Z`)
      .lte("scheduled_at", `${o.end_date}T23:59:59Z`);
    clashesCount += count ?? 0;
  }

  return (
    <AvailabilityManager
      initialSettings={settings}
      initialPattern={pattern}
      initialOverrides={overrides}
      bookedThisWeek={bookedThisWeek ?? 0}
      clashesCount={clashesCount}
    />
  );
}
