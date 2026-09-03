import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AvailabilityScreen } from "./AvailabilityScreen";

/**
 * CR-EF-097 — Mobile availability page (/hub/m/availability).
 *
 * Phone-first layout: block-time-off presets at the top (the phone job is
 * shutting a day FAST), weekly pattern and booking rules below in collapsed
 * accordions. Reuses lib/availability.ts for slot derivation — never
 * reimplements the derivation logic.
 */
export default async function MobileAvailabilityPage() {
  const supabase = createClient();

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

  // Fetch real clash data for time-off overrides (same approach as desktop page)
  const activeTimeOff = overrides.filter(
    (o) => o.active && o.override_type === "time_off"
  );

  const overrideClashData: {
    overrideId: string;
    clashes: {
      sessionId: string;
      sessionNumber: number;
      scheduledAt: string;
      clientName: string;
      blockNumber: number;
    }[];
  }[] = [];

  for (const o of activeTimeOff) {
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, session_number, scheduled_at, block_id")
      .not("scheduled_at", "is", null)
      .is("cancelled_at", null)
      .not("status", "eq", "cancelled")
      .not("status", "eq", "completed")
      .gte("scheduled_at", `${o.start_date}T00:00:00Z`)
      .lte("scheduled_at", `${o.end_date}T23:59:59Z`);

    const clashes: (typeof overrideClashData)[number]["clashes"] = [];

    if (sessions && sessions.length > 0) {
      // Fetch block → client mapping
      const blockIds = [...new Set(sessions.map((s) => s.block_id))];
      const { data: blocks } = await supabase
        .from("blocks")
        .select("id, client_id, block_number")
        .in("id", blockIds);

      const blockMap = new Map(
        (blocks ?? []).map((b) => [b.id, { client_id: b.client_id, block_number: b.block_number }])
      );
      const clientIds = [...new Set((blocks ?? []).map((b) => b.client_id))];
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name")
        .in("id", clientIds);
      const nameMap = new Map((clients ?? []).map((c) => [c.id, c.name]));

      for (const s of sessions) {
        const blockInfo = blockMap.get(s.block_id);
        if (blockInfo) {
          clashes.push({
            sessionId: s.id,
            sessionNumber: s.session_number,
            scheduledAt: new Date(s.scheduled_at).toISOString(),
            clientName: nameMap.get(blockInfo.client_id) ?? "Unknown client",
            blockNumber: blockInfo.block_number,
          });
        }
      }

      clashes.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    }

    overrideClashData.push({ overrideId: o.id, clashes });
  }

  return (
    <AvailabilityScreen
      initialSettings={settings}
      initialPattern={pattern}
      initialOverrides={overrides}
      overrideClashes={overrideClashData}
    />
  );
}
