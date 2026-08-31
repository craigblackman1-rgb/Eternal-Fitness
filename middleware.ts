import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Portal session cookie name (kept in sync with lib/portal-auth.ts).
const PORTAL_COOKIE = "better_auth_portal_session";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // PWA service-worker scripts must be served directly — a redirected response
  // is invalid for navigator.serviceWorker.register() fetches, killing PWA on prod.
  if (pathname === "/hub/sw.js" || pathname === "/portal/sw.js") {
    return NextResponse.next();
  }

  const hasStaffSession = !!getSessionCookie(request);

  const publicHubPaths = ["/hub/login", "/hub/forgot-password", "/hub/reset-password"];

  // --- Staff/trainer guard (unchanged, /hub + /admin) ----------------------
  if (
    !hasStaffSession &&
    (pathname.startsWith("/hub") || pathname.startsWith("/admin")) &&
    !publicHubPaths.includes(pathname)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/hub/login";
    return NextResponse.redirect(url);
  }

  // --- Client portal guard (ADDITIVE — does not touch staff rules) ---------
  // The portal uses its own cookie, isolated from the staff session.
  const publicPortalPaths = ["/portal/login", "/portal/forgot-password", "/portal/reset-password"];
  if (pathname.startsWith("/portal") && !publicPortalPaths.some((p) => pathname === p || pathname.startsWith(p + "?"))) {
    const hasPortalSession = !!request.cookies.get(PORTAL_COOKIE)?.value;
    if (!hasPortalSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Hub/admin guard + portal guard must both run.
  matcher: ["/hub/:path*", "/admin/:path*", "/portal/:path*"],
};
