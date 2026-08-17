import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { exchangeCodeForTokens, getMe, saveConnection } from "@/lib/graph-client";
import { siteUrl } from "@/lib/calendar-sync";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "ms_oauth_state";

// Redirects must be built from the app's known public URL, not request.url's
// origin — behind the Coolify/Traefik proxy the container sees its own
// internal bind address (0.0.0.0:3000), not the public domain, and a redirect
// built from that sends the browser to an unreachable address.
function settingsRedirect(params: Record<string, string>) {
  const url = new URL("/hub/settings/integrations", siteUrl());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url.toString());
}

/** OAuth redirect target for the Microsoft connect flow. */
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // The browser arriving here is Esther's own hub session mid-connect flow;
  // without one, bounce to login rather than exchanging the code.
  if (!user) return NextResponse.redirect(new URL("/hub/login", siteUrl()).toString());

  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  if (error) {
    return settingsRedirect({ error: searchParams.get("error_description") || error });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = cookies().get(STATE_COOKIE)?.value;
  cookies().delete(STATE_COOKIE);

  if (!code || !state || !cookieState || state !== cookieState) {
    return settingsRedirect({ error: "Sign-in state check failed — try connecting again" });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const me = await getMe(tokens.access_token);
    await saveConnection(tokens, me.email);
    return settingsRedirect({ connected: "1" });
  } catch (err) {
    console.error("Microsoft OAuth callback failed:", err);
    return settingsRedirect({ error: "Connection failed — see server logs" });
  }
}
