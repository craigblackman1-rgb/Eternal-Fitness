import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const VALID_INCOME_CATEGORIES = ["invoice_payment", "other_income", "refund", "interest"];
const VALID_EXPENSE_CATEGORIES = ["studio_rent", "equipment", "insurance", "software", "marketing", "professional_fees", "other"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const updates: Record<string, unknown> = {};

  if (body.income_category !== undefined) {
    if (body.income_category !== null && !VALID_INCOME_CATEGORIES.includes(body.income_category)) {
      return NextResponse.json({ error: `Invalid income_category: ${body.income_category}` }, { status: 400 });
    }
    updates.income_category = body.income_category;
  }

  if (body.expense_category !== undefined) {
    if (body.expense_category !== null && !VALID_EXPENSE_CATEGORIES.includes(body.expense_category)) {
      return NextResponse.json({ error: `Invalid expense_category: ${body.expense_category}` }, { status: 400 });
    }
    updates.expense_category = body.expense_category;
  }

  if (body.is_excluded !== undefined) {
    if (typeof body.is_excluded !== "boolean") {
      return NextResponse.json({ error: "is_excluded must be a boolean" }, { status: 400 });
    }
    updates.is_excluded = body.is_excluded;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bank_transactions")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
