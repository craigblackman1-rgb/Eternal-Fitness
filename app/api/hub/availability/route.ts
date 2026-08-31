import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * CR-EF-097 — PUT /api/hub/availability
 *
 * Saves the full availability model: settings + pattern + overrides.
 * Only the staff hub can call this (auth required).
 */

interface PatternInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
  note?: string | null;
}

interface OverrideInput {
  id?: string;
  override_type: "time_off" | "extra_hours";
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
  active?: boolean;
}

interface SettingsInput {
  session_length?: number;
  gap_after?: number;
  notice_hours?: number;
  lead_hours?: number;
  horizon_weeks?: number;
  max_per_day?: number;
  intro_holdback?: number;
}

export async function PUT(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { settings, pattern, overrides } = body as {
    settings?: SettingsInput;
    pattern?: PatternInput[];
    overrides?: OverrideInput[];
  };

  // Update settings if provided
  if (settings) {
    const { data: existing } = await supabase
      .from("booking_settings")
      .select("id")
      .limit(1)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("booking_settings")
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json(
          { error: `Failed to save settings: ${error.message}` },
          { status: 500 }
        );
      }
    }
  }

  // Replace pattern if provided
  if (pattern) {
    const { error: delErr } = await supabase
      .from("availability_pattern")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (delErr) {
      return NextResponse.json(
        { error: `Failed to clear pattern: ${delErr.message}` },
        { status: 500 }
      );
    }

    const rows = pattern.map((r, i) => ({
      day_of_week: r.day_of_week,
      start_time: r.start_time,
      end_time: r.end_time,
      active: r.active,
      note: r.note ?? null,
      sort_order: i,
    }));

    const { error: insErr } = await supabase
      .from("availability_pattern")
      .insert(rows);

    if (insErr) {
      return NextResponse.json(
        { error: `Failed to save pattern: ${insErr.message}` },
        { status: 500 }
      );
    }
  }

  // Replace overrides if provided
  if (overrides) {
    const { error: delErr } = await supabase
      .from("availability_overrides")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (delErr) {
      return NextResponse.json(
        { error: `Failed to clear overrides: ${delErr.message}` },
        { status: 500 }
      );
    }

    const rows = overrides.map((o) => ({
      override_type: o.override_type,
      start_date: o.start_date,
      end_date: o.end_date,
      start_time: o.start_time ?? null,
      end_time: o.end_time ?? null,
      reason: o.reason ?? null,
      active: o.active ?? true,
    }));

    const { error: insErr } = await supabase
      .from("availability_overrides")
      .insert(rows);

    if (insErr) {
      return NextResponse.json(
        { error: `Failed to save overrides: ${insErr.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return NextResponse.json({
    settings: settingsRes.data,
    pattern: patternRes.data ?? [],
    overrides: overridesRes.data ?? [],
  });
}
