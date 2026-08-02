import { buildBrandedUpdateEmail } from "./shell";

const ROSE = "#C1839F";
const INK = "#131313";
const BODY_COLOR = "#525A61";
const TEAL = "#087E8B";

export interface DocumentReadyInput {
  clientName: string;
  /** Name used in the "Hi …," greeting. Defaults to clientName. */
  greetingName?: string;
  documentTitle: string;
  /** Absolute URL the client clicks to read and sign. */
  signUrl: string;
}

/**
 * Email sent to a client when a document is ready for them to review and sign.
 * Reuses the shared branded shell; the primary CTA is a rose, rounded button
 * linking to the sign URL.
 */
export function buildDocumentReadyEmail(input: DocumentReadyInput): string {
  const greeting = (input.greetingName ?? "").trim() || input.clientName;
  const signUrl = input.signUrl;

  // Email-client-safe button: table layout, inline styles, no CSS classes —
  // matches shell.ts's own conventions so it survives Outlook/Gmail stripping.
  const ctaButton = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 20px;">
      <tr>
        <td align="center" bgcolor="${ROSE}" style="border-radius:999px;">
          <a href="${signUrl}" target="_blank" rel="noopener"
             style="display:inline-block;padding:15px 36px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${INK};text-decoration:none;border-radius:999px;">
            Review &amp; sign
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:${BODY_COLOR};">Or copy this link: <a href="${signUrl}" style="color:${TEAL};text-decoration:underline;">${signUrl}</a></p>`;

  return buildBrandedUpdateEmail({
    documentTitle: input.documentTitle,
    previewText: "A document is ready for you to review and sign.",
    title: "A document is ready for you",
    subtitle: "From Eternal Fitness",
    greetingName: greeting,
    introHtml: `<p style="margin:0;">I've prepared <strong>${input.documentTitle}</strong> for you. Please read it through and add your signature using the button below — it only takes a moment.</p>${ctaButton}`,
    sections: [
      {
        label: "What to do",
        color: ROSE,
        html: `<p style="margin:0;">Open the document, review the details, and sign where indicated. If anything's unclear, just reply and let me know.</p>`,
      },
    ],
    psHtml: `<p style="margin:0;">You can also open the link on your phone — tap the button and sign on the go.</p>`,
  });
}

export { ROSE };
