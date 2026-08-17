import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { renderToBuffer } from "@react-pdf/renderer";
import { AgreementPDF } from "@/lib/agreement-pdf";
import { getEmailSender } from "@/lib/email";

/**
 * Emails the client their signed agreement as a PDF — can be called as many
 * times as needed (first send or resend after a bounce / junk-mail report).
 * Uses the same SendGrid/SMTP backend as every other email in the app
 * (lib/email.ts) — previously this route used a separate, unconfigured
 * RESEND_API_KEY backend and silently 501'd on every click.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  // Only the hub's agreement detail page calls this; unauthenticated it would
  // email a signed agreement PDF to the client for any guessed id.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: agreement } = await supabase
    .from("signed_agreements")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!agreement) {
    return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  }

  if (!agreement.client_email) {
    return NextResponse.json({ error: "No client email on file" }, { status: 400 });
  }

  // Fetch PAR-Q data
  const { data: parqData } = await supabase
    .from("signed_parq")
    .select("*")
    .eq("full_name", agreement.client_name)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  try {
    const pdfDoc = <AgreementPDF agreement={agreement} parqData={parqData} />;
    const pdfBuffer = await renderToBuffer(pdfDoc);

    const sender = getEmailSender();
    const result = await sender.send({
      to: agreement.client_email,
      subject: "Your Signed Personal Training Agreement — Eternal Fitness",
      html: `
        <p>Dear ${agreement.client_name},</p>
        <p>Thank you for signing your personal training agreement with Eternal Fitness.</p>
        <p>Please find your signed agreement attached to this email. A copy is also held securely on file.</p>
        <p>If you have any questions, please don't hesitate to get in touch.</p>
        <p>Kind regards,<br/>Esther Fair<br/>Eternal Fitness</p>
      `,
      attachments: [
        {
          filename: `Eternal-Fitness-Agreement-${agreement.client_name.replace(/\s+/g, "-")}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({ success: true, dryRun: Boolean(result.dryRun) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
