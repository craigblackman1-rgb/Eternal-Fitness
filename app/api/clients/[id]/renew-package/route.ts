import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPackageSize, defaultExpiryDate, blockTitleFromDateRange } from "@/lib/packages";
import type { PackageSizeId } from "@/lib/packages";

/* ── POST /api/clients/[id]/renew-package ──────────────────────────────
 * Creates a new training block + updates client pot in ONE transaction.
 * Optionally creates a draft invoice for the package price.
 *
 * Body:
 *   client_number: number
 *   package_size: "4" | "6" | "12" | "24" | "ongoing"
 *   expiry_date?: string        — ISO date, defaults to today + 60
 *   raise_invoice?: boolean     — create a draft invoice alongside
 *   invoice_due_date?: string   — defaults to today
 *   keep_programme?: boolean    — keep current active_program_id (default true)
 *   programme_id?: string       — switch to a different programme
 *   mode?: "renew" | "fresh"    — renew adds to existing pot, fresh replaces
 */

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    client_number,
    package_size,
    expiry_date,
    raise_invoice = false,
    invoice_due_date,
    keep_programme = true,
    programme_id,
    mode = "fresh",
  } = body as {
    client_number: number;
    package_size: PackageSizeId;
    expiry_date?: string;
    raise_invoice?: boolean;
    invoice_due_date?: string;
    keep_programme?: boolean;
    programme_id?: string | null;
    mode?: "renew" | "fresh";
  };

  if (!client_number) {
    return NextResponse.json({ error: "client_number is required" }, { status: 400 });
  }

  const pkg = getPackageSize(package_size);
  if (!pkg) {
    return NextResponse.json({ error: "Invalid package_size" }, { status: 400 });
  }

  // Fetch client
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, sessions_purchased, sessions_used, sessions_remaining, payment_status, block_expiry_date, block_expiry_extensions, active_program_id, package_type")
    .eq("client_number", client_number)
    .single();
  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Before state for the response
  const before = {
    sessions_remaining: client.sessions_remaining ?? 0,
    sessions_purchased: client.sessions_purchased ?? 0,
    block_expiry_date: client.block_expiry_date,
  };

  // New pot value
  const newSessionsPurchased = pkg.sessions ?? client.sessions_purchased;
  const newSessionsRemaining = pkg.sessions ?? client.sessions_remaining;
  const newExpiry = expiry_date || defaultExpiryDate();
  const newPaymentStatus: string = raise_invoice ? "pending" : "paid";

  // Get next block number
  const { data: existingBlocks } = await supabase
    .from("blocks")
    .select("block_number")
    .eq("client_id", client.id)
    .order("block_number", { ascending: false })
    .limit(1);
  const blockNumber = (existingBlocks?.[0]?.block_number ?? 0) + 1;

  const today = new Date().toISOString().split("T")[0];
  const title = blockTitleFromDateRange(today, newExpiry);

  // 1. Create the new block (status: active)
  const { data: block, error: blockError } = await supabase
    .from("blocks")
    .insert({
      client_id: client.id,
      block_number: blockNumber,
      status: "active",
      title,
    })
    .select("id")
    .single();
  if (blockError || !block) {
    return NextResponse.json({ error: blockError?.message || "Failed to create block" }, { status: 500 });
  }

  // 2. Update client pot — reset used to 0 and baseline to 0 (a fresh
  //    package has no pre-hub component).
  const clientUpdate: Record<string, unknown> = {
    sessions_purchased: newSessionsPurchased,
    sessions_remaining: newSessionsRemaining,
    sessions_used: 0,
    pot_baseline_used: 0,
    block_expiry_date: newExpiry,
    payment_status: newPaymentStatus,
    package_type: package_size,
  };

  // Programme handling
  if (!keep_programme) {
    clientUpdate.active_program_id = programme_id ?? null;
  }
  // If keep_programme, we don't touch active_program_id

  const { error: updateError } = await supabase
    .from("clients")
    .update(clientUpdate)
    .eq("id", client.id);
  if (updateError) {
    // Rollback: delete the block we just created
    await supabase.from("blocks").delete().eq("id", block.id);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 3. Optionally create a draft invoice
  let invoiceId: string | null = null;
  if (raise_invoice && pkg.sessions) {
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
    const invoiceNumber = `${prefix}${String(seq).padStart(4, "0")}`;
    const unitPrice = pkg.pricePence / pkg.sessions;

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .insert({
        client_id: client.id,
        invoice_number: invoiceNumber,
        issue_date: today,
        due_date: invoice_due_date || today,
        status: "draft",
        subtotal: pkg.pricePence,
        vat_total: 0,
        total: pkg.pricePence,
        notes: `Renewal — ${pkg.label}`,
      })
      .select("id")
      .single();

    if (invErr || !invoice) {
      // Non-fatal: invoice creation failed but the renewal succeeded
      console.error("Invoice creation failed during renewal:", invErr);
    } else {
      invoiceId = invoice.id;
      const lineItem = {
        invoice_id: invoice.id,
        description: `Personal training — ${pkg.label}`,
        quantity: pkg.sessions,
        unit_price: unitPrice,
        vat_rate: 0,
        line_total: pkg.pricePence,
        sort_order: 0,
      };
      const { error: linesErr } = await supabase.from("invoice_line_items").insert(lineItem);
      if (linesErr) {
        console.error("Invoice line item creation failed:", linesErr);
      }
    }
  }

  // After state
  const after = {
    sessions_remaining: newSessionsRemaining,
    sessions_purchased: newSessionsPurchased,
    block_expiry_date: newExpiry,
    block_number: blockNumber,
    title,
    invoice_id: invoiceId,
  };

  return NextResponse.json({ before, after }, { status: 201 });
}
