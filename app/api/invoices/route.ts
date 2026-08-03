import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("invoices")
    .select("*, clients(name, client_number, display_code)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { client_id, issue_date, due_date, notes, line_items } = body;

  if (!client_id || !due_date) {
    return NextResponse.json({ error: "client_id and due_date are required" }, { status: 400 });
  }

  const lines: { description: string; quantity: number; unit_price: number }[] =
    Array.isArray(line_items) ? line_items : [];

  const subtotal = lines.reduce((sum, li) => sum + (li.quantity || 0) * (li.unit_price || 0), 0);
  const vatTotal = 0;
  const total = subtotal + vatTotal;

  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const { data: last } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let seq = 1;
  if (last?.invoice_number) {
    const num = parseInt(last.invoice_number.replace(prefix, ""), 10);
    if (!isNaN(num)) seq = num + 1;
  }

  const invoice_number = `${prefix}${String(seq).padStart(4, "0")}`;

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      client_id,
      invoice_number,
      issue_date: issue_date || new Date().toISOString().split("T")[0],
      due_date,
      status: "draft",
      subtotal,
      vat_total: vatTotal,
      total,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (invErr || !invoice) {
    return NextResponse.json({ error: invErr?.message || "Failed to create invoice" }, { status: 500 });
  }

  if (lines.length > 0) {
    const lineRows = lines.map((li, i) => ({
      invoice_id: invoice.id,
      description: li.description,
      quantity: li.quantity || 1,
      unit_price: li.unit_price || 0,
      vat_rate: 0,
      line_total: (li.quantity || 0) * (li.unit_price || 0),
      sort_order: i,
    }));

    const { error: linesErr } = await supabase.from("invoice_line_items").insert(lineRows);
    if (linesErr) {
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json({ error: linesErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id: invoice.id }, { status: 201 });
}
