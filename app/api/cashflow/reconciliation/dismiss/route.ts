import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { transaction_id, invoice_id } = body;

  if (!transaction_id || !invoice_id) {
    return NextResponse.json({ error: "transaction_id and invoice_id are required" }, { status: 400 });
  }

  const { error } = await supabase.from("dismissed_matches").insert({
    bank_transaction_id: transaction_id,
    invoice_id,
  });

  if (error) {
    if (error.message?.includes("duplicate key") || error.code === "23505") {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
