import { buildBrandedUpdateEmail } from "./shell";

const ROSE = "#C1839F";

export interface InvoiceReadyInput {
  clientName: string;
  greetingName?: string;
  invoiceNumber: string;
  totalFormatted: string;
  dueDate: string;
  viewUrl: string;
}

export function buildInvoiceReadyEmail(input: InvoiceReadyInput): string {
  const greeting = (input.greetingName ?? "").trim() || input.clientName;
  const viewUrl = input.viewUrl;

  const ctaButton = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 16px;">
      <tr>
        <td align="center" bgcolor="${ROSE}" style="border-radius:999px;">
          <a href="${viewUrl}" target="_blank" rel="noopener"
             style="display:inline-block;padding:14px 32px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;">
            View invoice
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:8px 0 0;font-size:12px;color:#8A8790;">Or copy this link: <a href="${viewUrl}" style="color:#087E8B;">${viewUrl}</a></p>`;

  return buildBrandedUpdateEmail({
    documentTitle: `Invoice ${input.invoiceNumber}`,
    previewText: `Invoice ${input.invoiceNumber} — ${input.totalFormatted} due by ${input.dueDate}`,
    title: "Your invoice is ready",
    subtitle: "From Eternal Fitness",
    greetingName: greeting,
    introHtml: `<p style="margin:0;">Please find your invoice <strong>${input.invoiceNumber}</strong>. The total is <strong>${input.totalFormatted}</strong>, due by <strong>${input.dueDate}</strong>.</p>${ctaButton}`,
    sections: [
      {
        label: "Payment details",
        color: ROSE,
        html: `<p style="margin:0;">Payment can be made by bank transfer using the details on the invoice. If you have any questions, just reply to this email.</p>`,
      },
    ],
    psHtml: `<p style="margin:0;">You can also view the invoice on your phone — tap the button above.</p>`,
  });
}
