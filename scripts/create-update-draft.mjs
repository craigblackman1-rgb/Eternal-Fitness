#!/usr/bin/env node
// Create a DRAFT client training update in the hub (sent_updates, status="draft").
//
// Unlike the six_week_update template, this accepts a fully custom section list
// (custom headers/labels), so it can build updates whose structure differs from
// the standard template. The rendered HTML is stored in body_html — which is
// exactly what the hub emails when the draft is later sent (see
// app/api/updates/[updateId]/send/route.ts) — so branding must match the app's
// shared shell. The buildBrandedUpdateEmail() below is a faithful, dependency-free
// port of lib/email-templates/shell.ts so this runs under plain node.
//
// Usage:
//   node scripts/create-update-draft.mjs path/to/update.json [--preview-only out.html]
//
// Reads DATABASE_URL from the environment — run against production via the
// Coolify SSH tunnel. With --preview-only it renders the HTML to a file and does
// NOT touch the database (no tunnel needed).
//
// Input JSON shape:
// {
//   "clientNumber": 9,                    // preferred: exact clients.client_number match
//   "clientName": "Ian ...",               // fallback if clientNumber omitted: ILIKE match on clients.name
//   "updateId": "…",                       // optional; UPDATE this existing sent_updates row instead of INSERT
//   "subject": "Your last 4 weeks with me 🏋️",
//   "documentTitle": "Your last 4 weeks with me",
//   "previewText": "…inbox preview line…",
//   "title": "Your last 4 weeks",
//   "subtitle": "A training update from Esther",
//   "greetingName": "Ian",
//   "introText": "I wanted to take a moment to look back over the last 4 weeks.",
//   "sections": [ { "key": "attendanceSection", "label": "…", "color": "rose|teal|body|#hex", "html": "…" }, … ],
//   "psHtml": "",                         // optional
//   "blockNumber": 1,
//   "templateKind": "four_week_update",    // must match a lib/email-templates/registry.ts id for the hub's
//                                           // Edit page to rebuild these sections correctly (see registry.ts)
//   "clientEmail": "…"                    // optional; stored on the draft + prefilled
// }
//
// Note: `sections[].key` values must match the registry entry's section keys for
// `templateKind` — the hub's Edit page reads `sections` back out by key and
// rebuilds the HTML from them (see components NewUpdateClient.tsx buildHtmlForKind());
// keys that don't match the registry silently disappear from the edit view.

import { Pool, types } from "pg";
import { readFileSync, writeFileSync } from "fs";

types.setTypeParser(1114, (v) => v);
types.setTypeParser(1184, (v) => v);
types.setTypeParser(1082, (v) => v);

// ---- Brand tokens (mirror lib/email-templates/shell.ts) --------------------
const ROSE = "#C1839F";
const TEAL = "#087E8B";
const NAVY = "#282B38";
const INK = "#3C3C3C";
const BODY_COLOR = "#525A61";
const OFF_WHITE = "#F5F5F5";
const HAIRLINE = "#E7E4E6";

const COLOR_ALIASES = { rose: ROSE, teal: TEAL, body: BODY_COLOR, navy: NAVY, ink: INK };
const resolveColor = (c) => COLOR_ALIASES[String(c).toLowerCase()] ?? c;

// ---- Faithful port of buildBrandedUpdateEmail (lib/email-templates/shell.ts) ----
function buildBrandedUpdateEmail(input) {
  const footerNote = input.footerNote ?? "If you'd rather not receive these updates, just let me know.";
  const preview = input.previewText ?? input.subtitle;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <title>${input.documentTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:${OFF_WHITE};font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${OFF_WHITE};font-size:1px;line-height:1px;">${preview}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${OFF_WHITE};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(40,43,56,0.08);">

          <!-- Brand header (dark navy band) -->
          <tr>
            <td style="background-color:${NAVY};padding:28px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;width:52px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" height="48" align="center" valign="middle" style="width:48px;height:48px;background-color:${ROSE};border-radius:50%;color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:1px;text-align:center;font-family:'DM Sans',Helvetica,Arial,sans-serif;">EF</td>
                      </tr>
                    </table>
                  </td>
                  <td style="vertical-align:middle;padding-left:14px;">
                    <div style="font-size:20px;font-weight:700;letter-spacing:3px;color:#FFFFFF;text-transform:uppercase;line-height:1;">Eternal</div>
                    <div style="font-size:11px;font-weight:500;letter-spacing:4px;color:${ROSE};text-transform:uppercase;line-height:1;margin-top:5px;">Fitness</div>
                  </td>
                  <td style="vertical-align:middle;text-align:right;">
                    <div style="font-size:10px;font-weight:500;letter-spacing:1.5px;color:rgba(255,255,255,0.55);text-transform:uppercase;">Worthing &middot; West Sussex</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Rose accent rule -->
          <tr><td style="height:3px;background-color:${ROSE};line-height:3px;font-size:0;">&nbsp;</td></tr>

          <!-- Title block -->
          <tr>
            <td style="padding:36px 40px 8px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;color:${INK};line-height:1.25;">${input.title}</h1>
              <p style="margin:8px 0 0;font-size:13px;font-weight:500;letter-spacing:1px;color:${TEAL};text-transform:uppercase;">${input.subtitle}</p>
            </td>
          </tr>

          <!-- Personal greeting -->
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="font-size:16px;line-height:1.6;color:${INK};margin:0 0 14px;font-weight:600;">Hi ${input.greetingName},</p>
              <div style="font-size:15px;line-height:1.7;color:${BODY_COLOR};margin:0;">${input.introHtml}</div>
            </td>
          </tr>

          ${input.sections
            .map(
              (section) => `
          <!-- Section: ${section.label} -->
          <tr>
            <td style="padding:20px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${OFF_WHITE};border-radius:14px;">
                <tr>
                  <td style="width:4px;background-color:${resolveColor(section.color)};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
                  <td style="padding:18px 20px;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${resolveColor(section.color)};margin:0 0 8px;">${section.label}</div>
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
            <td style="padding:28px 40px 36px;">
              <div style="border-top:1px solid ${HAIRLINE};padding-top:22px;">
                <p style="font-size:15px;line-height:1.6;color:${BODY_COLOR};margin:0 0 4px;">Speak soon,</p>
                <p style="font-size:20px;line-height:1.4;color:${INK};margin:0;font-weight:600;font-style:italic;">Esther x</p>
                <p style="font-size:12px;line-height:1.6;color:#8A8790;margin:12px 0 0;">
                  <strong style="color:${INK};font-weight:600;">Esther Fair</strong> &middot; Level 4 Cancer and Exercise Rehabilitation Specialist<br />
                  <span style="color:${ROSE};font-weight:600;">Eternal Fitness</span> &middot; Private studio, Worthing, West Sussex
                </p>
              </div>
            </td>
          </tr>
          ${input.psHtml && input.psHtml.trim()
            ? `
          <!-- P.S. -->
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="font-size:14px;line-height:1.7;color:${BODY_COLOR};font-style:italic;background-color:${OFF_WHITE};border-radius:12px;padding:16px 18px;">
                ${input.psHtml}
              </div>
            </td>
          </tr>`
            : ""}

          <!-- Footer -->
          <tr>
            <td style="padding:22px 40px;background-color:${NAVY};text-align:center;">
              <p style="font-size:11px;line-height:1.6;color:rgba(255,255,255,0.55);margin:0;">
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

// ---- CLI -------------------------------------------------------------------
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const previewIdx = args.indexOf("--preview-only");
const previewOnly = previewIdx !== -1;
const previewOut = previewOnly ? args[previewIdx + 1] : null;

if (!file) {
  console.error("Usage: node scripts/create-update-draft.mjs path/to/update.json [--preview-only out.html]");
  process.exit(1);
}

const input = JSON.parse(readFileSync(file, "utf8"));

const introHtml = input.introHtml ?? (input.introText ? `<p style="margin:0;">${input.introText}</p>` : "");

const html = buildBrandedUpdateEmail({
  documentTitle: input.documentTitle ?? input.title ?? "Your training update",
  previewText: input.previewText,
  title: input.title ?? "Your training update",
  subtitle: input.subtitle ?? "A training update from Esther",
  greetingName: input.greetingName ?? input.clientName,
  introHtml,
  sections: input.sections ?? [],
  psHtml: input.psHtml,
  footerNote: input.footerNote,
});

if (previewOnly) {
  writeFileSync(previewOut, html, "utf8");
  console.log(`Preview written to ${previewOut} (${html.length} bytes). No DB write.`);
  process.exit(0);
}

const cs = process.env.DATABASE_URL;
if (!cs) {
  console.error("DATABASE_URL is not set. Open the DB tunnel and source the connection string first,");
  console.error("or re-run with --preview-only <out.html> to just render the email.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: cs,
  ssl: !/127\.0\.0\.1|localhost/.test(cs) ? { rejectUnauthorized: false } : false,
});

async function main() {
  const { rows: clientRows } = input.clientNumber
    ? await pool.query(
        `SELECT id, name, client_number, email FROM clients WHERE client_number = $1`,
        [input.clientNumber],
      )
    : await pool.query(
        `SELECT id, name, client_number, email FROM clients WHERE name ILIKE $1`,
        [input.clientName],
      );
  const matchDesc = input.clientNumber ? `client #${input.clientNumber}` : `"${input.clientName}"`;
  if (clientRows.length === 0) throw new Error(`No client found matching ${matchDesc}.`);
  if (clientRows.length > 1) {
    throw new Error(
      `Multiple clients match ${matchDesc}: ${clientRows.map((r) => `#${r.client_number} ${r.name}`).join(", ")}. Disambiguate.`,
    );
  }
  const client = clientRows[0];
  const clientEmail = input.clientEmail ?? client.email ?? null;

  // Mirror what the hub's own editor persists (NewUpdateClient.tsx sectionsForSave),
  // so the Edit page's "existing" load round-trips correctly and rebuilds identical
  // output via buildHtmlForKind(). The flexible_update kind stores an ordered
  // { heading, html } array under `flexSections`; fixed-shape kinds store
  // per-section-key HTML flatly, keyed to match their registry entry.
  const isFlexible = (input.templateKind ?? "four_week_update") === "flexible_update";
  const sectionsJson = input.sections
    ? JSON.stringify(
        isFlexible
          ? {
              flexSections: input.sections.map((s) => ({ heading: s.label ?? "", html: s.html ?? "" })),
              greetingName: input.greetingName ?? client.name,
              introText: input.introText ?? "",
            }
          : {
              ...Object.fromEntries(input.sections.map((s, i) => [s.key ?? `section${i + 1}`, s.html])),
              greetingName: input.greetingName ?? client.name,
              introText: input.introText ?? "",
            },
      )
    : null;

  if (input.updateId) {
    const { rows: updated } = await pool.query(
      `UPDATE sent_updates
         SET subject = $1, body_html = $2, block_number = $3, template_kind = $4,
             sections = $5, client_email = $6, updated_at = now()
       WHERE id = $7 AND client_id = $8 AND status IN ('draft', 'scheduled', 'failed')
       RETURNING id, status`,
      [input.subject ?? input.title, html, input.blockNumber ?? 0, input.templateKind ?? "four_week_update", sectionsJson, clientEmail, input.updateId, client.id],
    );
    if (updated.length === 0) {
      throw new Error(`No editable draft/scheduled/failed row with id ${input.updateId} for client #${client.client_number}.`);
    }
    console.log(`Draft updated for ${client.name} (client #${client.client_number}) — sent_updates id ${updated[0].id} (status=${updated[0].status})`);
    console.log(`  Review at /hub/clients/${client.client_number}/updates`);
    await pool.end();
    return;
  }

  const { rows: inserted } = await pool.query(
    `INSERT INTO sent_updates
       (client_id, subject, body_html, block_number, template_kind, sections, client_email, status, emailed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', false)
     RETURNING id, created_at`,
    [
      client.id,
      input.subject ?? input.title,
      html,
      input.blockNumber ?? 0,
      input.templateKind ?? "four_week_update",
      sectionsJson,
      clientEmail,
    ],
  );

  console.log(`Draft created for ${client.name} (client #${client.client_number}) — sent_updates id ${inserted[0].id}`);
  console.log(`  status=draft, subject="${input.subject ?? input.title}", client_email=${clientEmail ?? "(none)"}`);
  console.log(`  Review at /hub/clients/${client.client_number}/updates`);
  await pool.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
