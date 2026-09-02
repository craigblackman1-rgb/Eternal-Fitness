/**
 * Portal client auth — a SEPARATE, ISOLATED password-based auth surface.
 *
 * This is intentionally NOT the same instance as the staff/trainer auth in
 * lib/auth.ts. It owns its own tables (portal_accounts / portal_sessions /
 * portal_reset_tokens, created in db/migrations/20260720_portal_auth.sql)
 * and its own cookie (better_auth_portal_session). The staff auth path,
 * middleware, and (protected) layout are never imported or modified here.
 *
 * Design contract (lane-k-brief.md):
 *  - Password-based login (no CAPTCHA, no puzzle 2FA).
 *  - Accounts are created ONLY via staff invite (invitePortalAccount).
 *  - Clients can self-serve password reset only, never account creation.
 *  - Each account is bound 1:1 to a clients.id; a client sees only their own data.
 *  - Short-lived, single-use reset tokens; sessions are 7-day cookies.
 *  - All data reads are server-filtered by the authenticated client_id.
 *
 * Password hashing uses Node's built-in crypto.scryptSync (no npm dependency).
 *
 * HARD CONSTRAINTS respected by this unit:
 *  - No migration is run; no database is connected to from this module at import.
 *  - No real email is sent unless SENDGRID/SMTP is configured; otherwise the
 *    link/password is surfaced only in the dry-run result (never auto-emitted).
 */

import { randomBytes, createHash, scryptSync, timingSafeEqual } from "crypto";
import { getPool } from "@/lib/pg-client";

const RESET_TOKEN_TTL_SECONDS = 15 * 60;
// Welcome/invite links sit in an inbox until the client gets around to it —
// unlike a "forgot password" reset, a 15-minute window would expire before
// most clients ever open the email. Same token mechanism, longer life.
const WELCOME_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const PORTAL_COOKIE = "better_auth_portal_session";
const PORTAL_BASE_URL = process.env.PORTAL_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

export class PortalAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalAuthError";
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, "hex");
  if (derived.length !== storedBuf.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  const bytes = randomBytes(16);
  let pw = "";
  for (let i = 0; i < 16; i++) {
    pw += chars[bytes[i] % chars.length];
  }
  return pw;
}

export interface PortalAccount {
  id: string;
  client_id: string;
  email: string;
  password_hash: string | null;
  disabled_at: string | null;
  last_login_at: string | null;
}

export interface PortalSession {
  accountId: string;
  clientId: string;
  email: string;
}

export interface InviteResult {
  email: string;
  password: string;
  loginUrl: string;
  clientName: string;
}

export interface PortalAccountStatus {
  exists: boolean;
  email: string | null;
  disabled: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
}

/**
 * Generates (or regenerates) a portal account with a fresh plaintext password
 * for staff to hand to the client directly. Does not send any email — the
 * password is only ever surfaced here, once, in the API response.
 */
export async function invitePortalAccount(clientId: string): Promise<InviteResult> {
  const pool = getPool();
  const clientRes = await pool.query(
    `SELECT id, name, email FROM clients WHERE id = $1 LIMIT 1`,
    [clientId],
  );
  const client = clientRes.rows[0];
  if (!client) throw new PortalAuthError("Client not found.");
  const email = (client.email ?? "").trim().toLowerCase();
  if (!email) throw new PortalAuthError("No email address on file for this client.");

  const password = generatePassword();
  const pwHash = hashPassword(password);

  await pool.query(
    `INSERT INTO portal_accounts (client_id, email, password_hash, disabled_at)
     VALUES ($1, $2, $3, NULL)
     ON CONFLICT (client_id) DO UPDATE
       SET email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           disabled_at = NULL,
           updated_at = NOW()
     RETURNING id, email`,
    [clientId, email, pwHash],
  );

  return {
    email,
    password,
    loginUrl: `${PORTAL_BASE_URL}/portal/login`,
    clientName: client.name ?? "",
  };
}

export async function getPortalAccountStatus(clientId: string): Promise<PortalAccountStatus> {
  const pool = getPool();
  const res = await pool.query(
    `SELECT email, disabled_at, last_login_at, created_at
       FROM portal_accounts WHERE client_id = $1 LIMIT 1`,
    [clientId],
  );
  const row = res.rows[0];
  if (!row) return { exists: false, email: null, disabled: false, lastLoginAt: null, createdAt: null };
  return {
    exists: true,
    email: row.email,
    disabled: !!row.disabled_at,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

export async function verifyPortalLogin(
  email: string,
  password: string,
  opts: { ipAddress?: string; userAgent?: string } = {},
): Promise<{ session: PortalSession; cookieValue: string } | null> {
  const normalised = (email ?? "").trim().toLowerCase();
  if (!normalised || !password) return null;

  const pool = getPool();
  const res = await pool.query(
    `SELECT id, client_id, email, password_hash, disabled_at
       FROM portal_accounts WHERE lower(email) = $1 LIMIT 1`,
    [normalised],
  );
  const account = res.rows[0];
  if (!account || !account.password_hash || account.disabled_at) return null;

  if (!verifyPassword(password, account.password_hash)) return null;

  const sessionToken = randomBytes(32).toString("hex");
  const sessionExpires = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await pool.query(
    `INSERT INTO portal_sessions (account_id, client_id, token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [account.id, account.client_id, sessionToken, sessionExpires, opts.ipAddress ?? null, opts.userAgent ?? null],
  );
  await pool.query(`UPDATE portal_accounts SET last_login_at = NOW() WHERE id = $1`, [account.id]);

  return {
    session: { accountId: account.id, clientId: account.client_id, email: account.email },
    cookieValue: sessionToken,
  };
}

export interface ResetRequestResult {
  requested: true;
  devLink?: string;
  dryRun?: boolean;
}

export async function requestPasswordReset(
  emailRaw: string,
): Promise<ResetRequestResult> {
  const email = (emailRaw ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new PortalAuthError("A valid email address is required.");
  }

  const pool = getPool();
  const acctRes = await pool.query(
    `SELECT id, client_id FROM portal_accounts WHERE lower(email) = $1 AND disabled_at IS NULL LIMIT 1`,
    [email],
  );
  const account = acctRes.rows[0];
  if (!account) {
    return { requested: true };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000);

  await pool.query(
    `INSERT INTO portal_reset_tokens (account_id, client_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [account.id, account.client_id, tokenHash, expiresAt],
  );

  const link = `${PORTAL_BASE_URL}/portal/reset-password?token=${token}`;

  const { getEmailSender } = await import("@/lib/email");
  const sender = getEmailSender();
  const status = (await import("@/lib/email")).getEmailStatus();
  const dryRun = !status.configured;

  if (!dryRun) {
    await sender.send({
      to: email,
      subject: "Reset your Eternal Fitness portal password",
      html: `
        <p>Hi,</p>
        <p>A password reset was requested for your Eternal Fitness client portal. Click the link below to choose a new password. This link expires in 15 minutes.</p>
        <p><a href="${link}">Reset your password</a></p>
        <p>If you didn't request this, you can ignore this email.</p>
      `,
    });
  }

  return { requested: true, devLink: dryRun ? link : undefined, dryRun };
}

export async function resetPortalPassword(token: string, newPassword: string): Promise<void> {
  if (!token) throw new PortalAuthError("Missing reset token.");
  if (!newPassword || newPassword.length < 8) throw new PortalAuthError("Password must be at least 8 characters.");

  const tokenHash = hashToken(token);
  const pool = getPool();

  const res = await pool.query(
    `SELECT id, account_id, expires_at, used_at
       FROM portal_reset_tokens WHERE token_hash = $1 LIMIT 1`,
    [tokenHash],
  );
  const row = res.rows[0];
  if (!row) throw new PortalAuthError("This reset link is invalid.");
  if (row.used_at) throw new PortalAuthError("This reset link has already been used.");
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new PortalAuthError("This reset link has expired. Please request a new one.");
  }

  const pwHash = hashPassword(newPassword);
  await pool.query(`UPDATE portal_accounts SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [pwHash, row.account_id]);
  await pool.query(`UPDATE portal_reset_tokens SET used_at = NOW() WHERE id = $1`, [row.id]);
}

export async function getPortalSession(token: string | undefined): Promise<PortalSession | null> {
  if (!token) return null;
  const pool = getPool();
  try {
    const res = await pool.query(
      `SELECT s.account_id, s.client_id, a.email, a.disabled_at
         FROM portal_sessions s
         JOIN portal_accounts a ON a.id = s.account_id
        WHERE s.token = $1 AND s.expires_at > NOW()
        LIMIT 1`,
      [token],
    );
    const row = res.rows[0];
    if (!row) return null;
    if (row.disabled_at) return null;
    return { accountId: row.account_id, clientId: row.client_id, email: row.email };
  } finally {
  }
}

export async function destroyPortalSession(token: string | undefined): Promise<void> {
  if (!token) return;
  const pool = getPool();
  await pool.query(`DELETE FROM portal_sessions WHERE token = $1`, [token]);
}

import { buildBrandedUpdateEmail } from "@/lib/email-templates/shell";

const ROSE = "#C1839F";
const TEAL = "#087E8B";

export interface WelcomeEmailResult {
  email: string;
  sent: boolean;
  dryRun: boolean;
  devLink?: string;
}

export interface WelcomeEmailPreviewInput {
  clientName: string;
  resetLink: string;
  loginUrl: string;
}

export function buildPortalWelcomeEmailHtml(input: WelcomeEmailPreviewInput): string {
  const { resetLink, loginUrl } = input;

  const ctaButton = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 20px;">
      <tr>
        <td align="center" bgcolor="${ROSE}" style="border-radius:999px;">
          <a href="${resetLink}" target="_blank" rel="noopener"
             style="display:inline-block;padding:15px 36px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#131313;text-decoration:none;border-radius:999px;">
            Set your password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:#525A61;">Or copy this link: <a href="${resetLink}" style="color:${TEAL};text-decoration:underline;">${resetLink}</a></p>`;

  return buildBrandedUpdateEmail({
    documentTitle: "Welcome to your Eternal Fitness client portal",
    previewText: "Your client portal is ready — set your password to get started.",
    title: "Welcome to your client portal",
    subtitle: "From Eternal Fitness",
    greetingName: input.clientName,
    introHtml: `<p style="margin:0;">I've set up your Eternal Fitness client portal. You can use it to view training plans, track your progress, and access your documents — all in one place.</p>${ctaButton}`,
    sections: [
      {
        label: "What to do",
        color: ROSE,
        html: `<p style="margin:0;">Tap the button above to set your password. This link expires in 7 days. Once you've set a password, you can log in anytime at <a href="${loginUrl}" style="color:${TEAL};text-decoration:underline;">${loginUrl}</a>.</p>`,
      },
    ],
    psHtml: `<p style="margin:0;">If you have any questions, just reply to this email and I'll get back to you.</p>`,
  });
}

export async function sendPortalWelcomeEmail(clientId: string): Promise<WelcomeEmailResult> {
  const invite = await invitePortalAccount(clientId);

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + WELCOME_TOKEN_TTL_SECONDS * 1000);

  const pool = getPool();
  const acctRes = await pool.query(
    `SELECT id FROM portal_accounts WHERE client_id = $1 LIMIT 1`,
    [clientId],
  );
  const account = acctRes.rows[0];

  await pool.query(
    `INSERT INTO portal_reset_tokens (account_id, client_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [account.id, clientId, tokenHash, expiresAt],
  );

  const resetLink = `${PORTAL_BASE_URL}/portal/reset-password?token=${token}`;

  const html = buildPortalWelcomeEmailHtml({
    clientName: invite.clientName,
    resetLink,
    loginUrl: invite.loginUrl,
  });

  const { getEmailSender } = await import("@/lib/email");
  const sender = getEmailSender();
  const status = (await import("@/lib/email")).getEmailStatus();
  const dryRun = !status.configured;

  if (!dryRun) {
    await sender.send({
      to: invite.email,
      subject: "Welcome to your Eternal Fitness client portal",
      html,
    });
  }

  return { email: invite.email, sent: !dryRun, dryRun, devLink: dryRun ? resetLink : undefined };
}

export const PORTAL_SESSION_COOKIE = PORTAL_COOKIE;
export const PORTAL_SESSION_MAX_AGE = SESSION_TTL_SECONDS;
