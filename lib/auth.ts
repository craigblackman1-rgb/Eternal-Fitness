import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { getEmailSender } from "@/lib/email";

const _cs = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: _cs,
  ssl: _cs && !/127\.0\.0\.1|localhost/.test(_cs) ? { rejectUnauthorized: false } : false,
});

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  // Better Auth trusts ONLY the origin of `baseURL` unless told otherwise, and it
  // rejects any non-GET /api/auth request whose Origin header doesn't match with a
  // 403 "Invalid origin". Coolify binds both the apex and the www host to this app,
  // so a hub login or password reset started on www.eternal-fitness.co.uk sent
  // `Origin: https://www.eternal-fitness.co.uk` against a baseURL of
  // `https://eternal-fitness.co.uk` and 403'd (reported 2026-08-10 on
  // /hub/forgot-password; sign-in on www was broken the same way).
  // Every host the app is genuinely reachable on has to be listed here.
  // BETTER_AUTH_TRUSTED_ORIGINS (comma-separated) is merged in by Better Auth itself
  // if a new host ever needs adding without a code change.
  trustedOrigins: [
    "https://eternal-fitness.co.uk",
    "https://www.eternal-fitness.co.uk",
    "https://development.eternal-fitness.co.uk",
    "http://localhost:3001",
  ],
  emailAndPassword: {
    enabled: true,
    // Hub staff accounts are provisioned by hand (no public registration surface
    // for a 2-person studio) -- this closes the previously-open /api/auth/sign-up/email
    // endpoint, which anyone on the public internet could otherwise use to create
    // a full staff account with no invite or approval step. Existing accounts and
    // the login/password-reset flow are unaffected.
    disableSignUp: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await getEmailSender().send({
        to: user.email,
        subject: "Reset your Eternal Fitness hub password",
        html: `
          <p>Hi ${user.name || ""},</p>
          <p>Someone requested a password reset for the Eternal Fitness hub. Click below to set a new password — this link expires in 1 hour.</p>
          <p><a href="${url}">Reset your password</a></p>
          <p>If you didn't request this, you can ignore this email.</p>
        `,
      });
    },
  },
});

export type Auth = typeof auth;
