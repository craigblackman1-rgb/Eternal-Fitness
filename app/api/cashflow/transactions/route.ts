import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/** All bank transactions across every import, most recent first — the data
 *  source for the unified /hub/cashflow/transactions table (mockup:
 *  hub-cashflow-transactions.html shows one flat list, not import-scoped). */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("bank_transactions")
    .select("*")
    .order("txn_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
