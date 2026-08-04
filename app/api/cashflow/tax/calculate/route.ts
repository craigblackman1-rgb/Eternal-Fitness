import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { calculateAndStoreTax, getTaxYearBounds, currentTaxYear } from "@/lib/cashflow-tax";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const taxYear = body.tax_year || currentTaxYear();
  const periodType = body.period_type || "annual";

  if (periodType !== "annual") {
    return NextResponse.json({ error: "Only 'annual' period_type is supported" }, { status: 400 });
  }

  try {
    const result = await calculateAndStoreTax(taxYear);
    return NextResponse.json({
      calculation: result.calculation,
      bounds: getTaxYearBounds(taxYear),
      taxYear,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Tax calculation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const taxYear = currentTaxYear();
  const bounds = getTaxYearBounds(taxYear);

  const { data } = await supabase
    .from("tax_calculations")
    .select("*")
    .eq("tax_year", taxYear)
    .eq("period_type", "annual")
    .order("calculated_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    calculation: data,
    bounds,
    taxYear,
  });
}
