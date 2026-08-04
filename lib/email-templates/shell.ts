// Brand tokens — match mockups at D:\apps\design-systems\ef-client-portal\email-templates\*.html
const ROSE = "#C1839F";
const TEAL = "#087E8B";
const INK = "#131313";
const BODY_COLOR = "#525A61";
const WARM_CANVAS = "#F5EFEA";
const CREAM = "#FCF8F4";
const HAIRLINE = "#E4DDD7";

const BRAND_URL = process.env.PORTAL_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
const LOGO_URL = BRAND_URL ? `${BRAND_URL}/images/ef-logo-horizontal.png` : "";

export interface EmailSection {
  label: string;
  color: string;
  html: string;
}

export interface BrandedUpdateEmailInput {
  documentTitle: string;
  /** Hidden inbox preview line (Gmail/Apple show this after the subject). */
  previewText?: string;
  /** @deprecated Emoji is no longer rendered in the header — kept for call-site compatibility. */
  emoji?: string;
  title: string;
  subtitle: string;
  greetingName: string;
  introHtml: string;
  sections: EmailSection[];
  /** Optional P.S. block rendered after the sign-off (already includes its own "P.S." if wanted). */
  psHtml?: string;
  footerNote?: string;
}

/**
 * Shared branded email chrome for every client-facing email. Matches the
 * pixel-accurate HTML mockups in D:\apps\design-systems\ef-client-portal\email-templates\.
 *
 * Email-client constraints honoured: table layout, inline styles, web-safe
 * fallbacks (DM Sans → Helvetica/Arial), no SVG (Gmail strips it), border-radius
 * used decoratively so Outlook degrades to squares without breaking layout.
 */
export function buildBrandedUpdateEmail(input: BrandedUpdateEmailInput): string {
  const footerNote = input.footerNote ?? "If you'd rather not receive these updates, just let me know.";
  const preview = input.previewText ?? input.subtitle;

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <title>${input.documentTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:${WARM_CANVAS};font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${WARM_CANVAS};font-size:1px;line-height:1px;">${preview}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${WARM_CANVAS};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#FFFFFF;border:1px solid ${HAIRLINE};border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(19,19,19,0.06);">

          <!-- Brand header (warm cream band + logo lockup) -->
          <tr>
            <td style="background-color:${CREAM};border-bottom:1px solid ${HAIRLINE};padding:32px 40px 26px;text-align:center;">
              <img src="${LOGO_URL}" width="142" height="40" alt="Eternal Fitness" style="display:block;margin:0 auto;width:142px;height:auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>

          <!-- Rose accent rule -->
          <tr><td style="height:3px;background-color:${ROSE};line-height:3px;font-size:0;">&nbsp;</td></tr>

          <!-- Title block -->
          <tr>
            <td style="padding:40px 40px 4px;">
              <p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${BODY_COLOR};">
                <span style="display:inline-block;width:24px;height:2px;background-color:${ROSE};vertical-align:middle;margin-right:10px;">&nbsp;</span>${input.subtitle}
              </p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:32px;line-height:1.15;color:${INK};">${input.title}</h1>
            </td>
          </tr>

          <!-- Personal greeting -->
          <tr>
            <td style="padding:22px 40px 0;">
              <p style="font-size:17px;line-height:1.55;color:${INK};margin:0 0 16px;font-weight:600;">Hi ${input.greetingName},</p>
              <div style="font-size:16px;line-height:1.65;color:${BODY_COLOR};margin:0;">${input.introHtml}</div>
            </td>
          </tr>

          ${input.sections
            .map(
              (section) => `
          <!-- Section: ${section.label} -->
          <tr>
            <td style="padding:24px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CREAM};border:1px solid ${HAIRLINE};border-radius:14px;">
                <tr>
                  <td style="width:4px;background-color:${section.color};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
                  <td style="padding:18px 20px;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${BODY_COLOR};margin:0 0 8px;">${section.label}</div>
                    <div style="font-size:15px;line-height:1.7;color:${BODY_COLOR};">
                      ${section.html}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`,
            )
            .join("")}

          <!-- Sign-off -->
          <tr>
            <td style="padding:36px 40px 40px;">
              <div style="border-top:1px solid ${HAIRLINE};padding-top:24px;">
                <p style="font-size:15px;line-height:1.6;color:${BODY_COLOR};margin:0 0 4px;">Speak soon,</p>
                <p style="font-size:24px;line-height:1.4;color:${INK};margin:0;font-weight:400;font-style:italic;font-family:Georgia,'Times New Roman',serif;">Esther x</p>
                <p style="font-size:12px;line-height:1.7;color:${BODY_COLOR};margin:14px 0 0;">
                  <strong style="color:${INK};font-weight:700;">Esther Fair</strong> &middot; Level 4 Cancer and Exercise Rehabilitation Specialist<br />
                  <span style="color:${ROSE};font-weight:700;">Eternal Fitness</span> &middot; Private studio, Worthing, West Sussex
                </p>
              </div>
            </td>
          </tr>
          ${input.psHtml && input.psHtml.trim()
            ? `
          <!-- P.S. -->
          <tr>
            <td style="padding:0 40px 40px;">
              <div style="font-size:14px;line-height:1.7;color:${BODY_COLOR};font-style:italic;background-color:${CREAM};border:1px solid ${HAIRLINE};border-radius:12px;padding:16px 18px;">
                ${input.psHtml}
              </div>
            </td>
          </tr>`
            : ""}

          <!-- Footer -->
          <tr>
            <td style="padding:26px 40px;background-color:${INK};text-align:center;">
              <p style="font-size:11px;line-height:1.7;color:rgba(255,255,255,0.6);margin:0;">
                Sent to you because you're a client of Eternal Fitness.<br />
                ${footerNote}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
