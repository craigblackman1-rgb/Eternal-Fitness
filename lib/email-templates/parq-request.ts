import { buildBrandedUpdateEmail } from "./shell";

const ROSE = "#C1839F";
const INK = "#131313";
const BODY_COLOR = "#525A61";
const TEAL = "#087E8B";

export interface ParqRequestEmailInput {
  clientName: string;
  /** Name used in the "Hi …," greeting. Defaults to clientName. */
  greetingName?: string;
  /** Absolute URL the client clicks to complete or update their PAR-Q. */
  signUrl: string;
  /** True when the client already has a PAR-Q on file and this is an update request. */
  isUpdate: boolean;
}

/**
 * Email sent to a client asking them to complete (or update) their PAR-Q health
 * questionnaire. Reuses the shared branded shell; wording differs from the
 * generic document-ready email since a PAR-Q is filled in, not signed.
 */
export function buildParqRequestEmail(input: ParqRequestEmailInput): string {
  const greeting = (input.greetingName ?? "").trim() || input.clientName;
  const { signUrl, isUpdate } = input;

  const ctaButton = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 20px;">
      <tr>
        <td align="center" bgcolor="${ROSE}" style="border-radius:999px;">
          <a href="${signUrl}" target="_blank" rel="noopener"
             style="display:inline-block;padding:15px 36px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${INK};text-decoration:none;border-radius:999px;">
            ${isUpdate ? "Review &amp; update" : "Complete PAR-Q"}
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:${BODY_COLOR};">Or copy this link: <a href="${signUrl}" style="color:${TEAL};text-decoration:underline;">${signUrl}</a></p>`;

  return buildBrandedUpdateEmail({
    documentTitle: "Your PAR-Q health questionnaire",
    previewText: isUpdate
      ? "Please take a moment to review and update your PAR-Q."
      : "Please complete your PAR-Q health questionnaire before we get started.",
    title: isUpdate ? "Time to review your PAR-Q" : "A quick health questionnaire",
    subtitle: "From Eternal Fitness",
    greetingName: greeting,
    introHtml: isUpdate
      ? `<p style="margin:0;">It's time to check in on your PAR-Q — your answers help me keep every session safe and appropriate for you. Please take a moment to review it and update anything that's changed.</p>${ctaButton}`
      : `<p style="margin:0;">Before we get started, I need you to complete a short PAR-Q (Physical Activity Readiness Questionnaire) — it's how I make sure every session is safe and adapted to you.</p>${ctaButton}`,
    sections: [
      {
        label: "What to do",
        color: ROSE,
        html: `<p style="margin:0;">Open the link and work through the questions — it only takes a few minutes. If anything's unclear, just reply and let me know.</p>`,
      },
    ],
    psHtml: `<p style="margin:0;">You can also open the link on your phone and fill it in on the go.</p>`,
  });
}
