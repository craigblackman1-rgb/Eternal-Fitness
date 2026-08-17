import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { authorityUrl, graphConfigured, GRAPH_SCOPES } from "@/lib/graph-client";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "ms_oauth_state";

/** Starts the Microsoft OAuth connect flow from Settings → Integrations. */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!graphConfigured()) {
    return NextResponse.json(
      { error: "Microsoft Graph is not configured on this environment (MS_GRAPH_* env vars missing)" },
      { status: 503 }
    );
  }

  const state = randomBytes(24).toString("hex");
  cookies().set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  const url = new URL(authorityUrl("authorize"));
  url.searchParams.set("client_id", process.env.MS_GRAPH_CLIENT_ID as string);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", process.env.MS_GRAPH_REDIRECT_URI as string);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", GRAPH_SCOPES);
  url.searchParams.set("state", state);
  // Always show the account picker — avoids silently binding to whichever
  // Microsoft account happens to be signed in on the browser.
  url.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(url.toString());
}
