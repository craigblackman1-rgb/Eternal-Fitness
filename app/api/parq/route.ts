import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { resolveClientId } from "@/lib/resolve-client-id";
import { getEmailSender } from "@/lib/email";
import { diffParq } from "@/lib/parq-diff";
import { mintParqLinkParams } from "@/lib/parq-link";
import type { SignedPARQ } from "@/types";

const COACH_EMAIL = "esther.fair@eternal-fitness.co.uk";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(request: Request) {
  const supabase = createClient();

  // PAR-Q answers are special-category health data. Every caller is a
  // hub-protected page, so require a staff session (there is no RLS on this
  // instance — app-layer auth is the only gate).
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const clientName = searchParams.get("client_name");

  if (!clientName) {
    return NextResponse.json({ error: "client_name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("signed_parq")
    .select("*")
    .eq("full_name", clientName)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Every caller of this endpoint (Agreement page's "copy client link", etc.) needs
  // the same signed exp/sig pair the hub's own "Send PAR-Q update" flow mints —
  // a bare /parq/edit/[id] is always rejected as invalid (see lib/parq-link.ts).
  if (!data) return NextResponse.json(data);
  const { exp, sig } = mintParqLinkParams(data.id);
  return NextResponse.json({ ...data, link_exp: exp, link_sig: sig });
}

export async function POST(request: Request) {
  const supabase = createClient();

  const body = await request.json();
  const {
    id,
    admin_save,
    client_name,
    client_number,
    full_name,
    date_of_birth,
    address,
    email,
    phone,
    emergency_contact_name,
    emergency_contact_phone,
    gp_name,
    gp_surgery,
    gp_phone,
    q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11,
    q12, q13, q14, q15, q16, q17, q18,
    q19, q20, q21, q22, q23, q24, q25, q26,
    q27, q28, q29,
    conditions,
    medications,
    devices,
    exercise_restrictions,
    surgeries,
    other_info,
    current_exercise,
    training_goals,
    client_name_print,
    client_signature_date,
    client_signature,
    client_typed_signature,
  } = body;

  const clientId = id ? undefined : await resolveClientId(supabase, client_number);

  // Fields Esther/the client can edit — signature + status are handled separately
  // so an admin "save without signing" never touches the signature or marks it signed.
  const editableFields = {
    ...(clientId ? { client_id: clientId } : {}),
    full_name: (full_name || client_name || "").trim(),
    date_of_birth: date_of_birth || null,
    address: address || null,
    email: email || null,
    phone: phone || null,
    emergency_contact_name: emergency_contact_name || null,
    emergency_contact_phone: emergency_contact_phone || null,
    gp_name: gp_name || null,
    gp_surgery: gp_surgery || null,
    gp_phone: gp_phone || null,
    q1: q1 || "", q2: q2 || "", q3: q3 || "", q4: q4 || "", q5: q5 || "",
    q6: q6 || "", q7: q7 || "", q8: q8 || "", q9: q9 || "", q10: q10 || "",
    q11: q11 || "", q12: q12 || "", q13: q13 || "", q14: q14 || "", q15: q15 || "",
    q16: q16 || "", q17: q17 || "", q18: q18 || "",
    q19: q19 || "", q20: q20 || "", q21: q21 || "", q22: q22 || "", q23: q23 || "",
    q24: q24 || "", q25: q25 || "", q26: q26 || "",
    q27: q27 || "", q28: q28 || "", q29: q29 || "",
    conditions: conditions || null,
    medications: medications || null,
    devices: devices || null,
    exercise_restrictions: exercise_restrictions || null,
    surgeries: surgeries || null,
    other_info: other_info || null,
    current_exercise: current_exercise || null,
    training_goals: training_goals || null,
    client_name_print: client_name_print || null,
  };

  // Updates target an existing PAR-Q by its unguessable id — a logged-out client
  // (or Esther) may be saving, and RLS hides the row from anon. Writes keyed on
  // that id go through the service-role client; a brand-new insert stays on the
  // request client (anon insert is allowed for first submissions).
  const writer = id ? createAdminClient() : supabase;

  let result;
  let error;
  let resubmission = false;

  if (admin_save) {
    // Esther saving her edits without a signature — keep the PAR-Q awaiting the
    // client and never overwrite the signature columns. Requires an existing record.
    if (!id) {
      return NextResponse.json({ error: "admin_save requires an existing PAR-Q id" }, { status: 400 });
    }
    const res = await writer
      .from("signed_parq")
      .update({ ...editableFields, status: "sent" })
      .eq("id", id)
      .select()
      .single();
    result = res.data;
    error = res.error;
  } else {
    // Client submitting/finishing — capture the signature and mark it signed.
    const hasSignature = !!(client_signature || client_typed_signature);
    const ip = request.headers.get("x-forwarded-for") || null;
    const userAgent = request.headers.get("user-agent") || null;

    if (id) {
      // Resubmission: fetch existing, supersede it, insert a new versioned row.
      const { data: oldRow, error: fetchErr } = await writer
        .from("signed_parq")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchErr || !oldRow) {
        return NextResponse.json({ error: fetchErr?.message || "PAR-Q not found" }, { status: 500 });
      }

      // Mark the existing row as superseded (only if it's currently active).
      if (oldRow.status !== "superseded") {
        await writer
          .from("signed_parq")
          .update({ status: "superseded", updated_at: new Date().toISOString() })
          .eq("id", id);
      }

      // Insert new versioned row with supersedes_id pointing to the old row.
      const record: Record<string, unknown> = {
        client_id: oldRow.client_id,
        ...editableFields,
        client_signature_date: client_signature_date || null,
        client_signature_data: client_signature || null,
        client_typed_signature: client_typed_signature || null,
        status: "signed",
        version: (oldRow.version ?? 1) + 1,
        supersedes_id: oldRow.id,
      };
      if (hasSignature) {
        record.signed_by_ip = ip;
        record.signed_by_user_agent = userAgent;
      }

      const res = await writer.from("signed_parq").insert(record).select().single();
      result = res.data;
      error = res.error;
      resubmission = !error && !!hasSignature;
    } else {
      // First submission — plain insert.
      const record: Record<string, unknown> = {
        ...(clientId ? { client_id: clientId } : {}),
        ...editableFields,
        client_signature_date: client_signature_date || null,
        client_signature_data: client_signature || null,
        client_typed_signature: client_typed_signature || null,
        status: "signed",
      };
      if (hasSignature) {
        record.signed_by_ip = ip;
        record.signed_by_user_agent = userAgent;
      }

      const res = await supabase.from("signed_parq").insert(record).select().single();
      result = res.data;
      error = res.error;
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // After a successful resubmission, notify the coach with a field-level diff.
  if (resubmission && result) {
    try {
      const { data: oldRow } = await writer
        .from("signed_parq")
        .select("*")
        .eq("id", result.supersedes_id)
        .single();

      if (oldRow) {
        const diffs = diffParq(oldRow as SignedPARQ, result as SignedPARQ);
        const clientDisplayName = result.full_name || client_name || "Unknown";

        const diffHtml = diffs.length === 0
          ? "<p>No field changes detected.</p>"
          : `<table style="border-collapse:collapse;width:100%;font-size:13px;">
              <tr style="text-align:left;border-bottom:1px solid #ddd;">
                <th style="padding:6px 8px;">Field</th>
                <th style="padding:6px 8px;">Old</th>
                <th style="padding:6px 8px;">New</th>
              </tr>
              ${diffs.map((d) => `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:6px 8px;font-weight:500;">${escapeHtml(d.label)}</td>
                  <td style="padding:6px 8px;color:#888;text-decoration:line-through;">${escapeHtml(d.from)}</td>
                  <td style="padding:6px 8px;">${escapeHtml(d.to)}</td>
                </tr>
              `).join("")}
            </table>`;

        const sender = getEmailSender();
        await sender.send({
          to: COACH_EMAIL,
          subject: `PAR-Q updated: ${clientDisplayName}`,
          html: `<div style="font-family:sans-serif;font-size:14px;">
            <p><strong>${escapeHtml(clientDisplayName)}</strong> submitted an updated PAR-Q (version ${result.version}).</p>
            ${diffs.length > 0 ? `<p>${diffs.length} field${diffs.length === 1 ? "" : "s"} changed:</p>` : ""}
            ${diffHtml}
          </div>`,
        });
      }
    } catch (notifyErr) {
      console.error("[parq:resubmit-notify]", notifyErr);
    }
  }

  return NextResponse.json(result, { status: id ? 200 : 201 });
}
