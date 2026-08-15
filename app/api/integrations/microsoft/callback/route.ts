import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { exchangeCodeForTokens, getMe, saveConnection } from "@/lib/graph-client";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "ms_oauth_state";

function settingsRedirect(request: Request, params: Record<string, string>) {
  const url = new URL("/hub/settings/integrations", new URL(request.url).origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url.toString());
}

/** OAuth redirect target for the Microsoft connect flow. */
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // The browser arriving here is Esther's own hub session mid-connect flow;
  // without one, bounce to login rather than exchanging the code.
  if (!user) return NextResponse.redirect(new URL("/hub/login", new URL(request.url).origin).toString());

  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  if (error) {
    return settingsRedirect(request, { error: searchParams.get("error_description") || error });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = cookies().get(STATE_COOKIE)?.value;
  cookies().delete(STATE_COOKIE);

  if (!code || !state || !cookieState || state !== cookieState) {
    return settingsRedirect(request, { error: "Sign-in state check failed — try connecting again" });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const me = await getMe(tokens.access_token);
    await saveConnection(tokens, me.email);
    return settingsRedirect(request, { connected: "1" });
  } catch (err) {
    console.error("Microsoft OAuth callback failed:", err);
    return settingsRedirect(request, { error: "Connection failed — see server logs" });
  }
}
