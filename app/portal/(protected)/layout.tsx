import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalSessionFromCookies, PORTAL_SESSION_COOKIE } from "@/lib/portal-session";
import EternalFitnessLogo from "@/components/EternalFitnessLogo";
import { createPortalDataClient } from "@/lib/portal-data";

/**
 * Portal layout — server component. Resolves the isolated portal session and
 * redirects to /portal/login if absent. Renders a slim, read-only client shell
 * (no hub sidebar/nav — this is a distinct surface). All child data is fetched
 * server-side and filtered by the authenticated client_id.
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getPortalSessionFromCookies();
  if (!session) redirect("/portal/login");

  const data = createPortalDataClient(session.clientId);
  const client = await data.getClient();

  return (
    <div className="min-h-screen bg-[var(--hub-canvas)] text-foreground">
      <a
        href="#portal-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-[var(--status-primary)] focus:shadow-md"
      >
        Skip to content
      </a>

      <header className="border-b border-border/60 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <EternalFitnessLogo variant="dark" size="sm" />
            <div>
              <p className="font-semibold leading-tight">Client Portal</p>
              <p className="text-xs text-muted-foreground">
                {client?.name ?? "Your account"}
              </p>
            </div>
          </div>
          <form action="/api/portal/auth/logout" method="POST">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-full border border-input px-4 text-sm font-medium hover:bg-accent"
            >
              Sign out
            </button>
          </form>
        </div>
        <nav
          aria-label="Portal sections"
          className="mx-auto flex max-w-5xl gap-2 px-4 pb-3 sm:px-6"
        >
          <Link
            href="/portal"
            className="inline-flex min-h-11 items-center rounded-full border border-input px-4 text-sm font-medium hover:bg-accent"
          >
            Documents &amp; updates
          </Link>
          <Link
            href="/portal/exercise-history"
            className="inline-flex min-h-11 items-center rounded-full border border-input px-4 text-sm font-medium hover:bg-accent"
          >
            Exercise history
          </Link>
          {client?.delivery_mode === "home_training" && (
            <Link
              href="/portal/training"
              className="inline-flex min-h-11 items-center rounded-full border border-input px-4 text-sm font-medium hover:bg-accent"
            >
              Your training
            </Link>
          )}
          <Link
            href="/portal/resources"
            className="inline-flex min-h-11 items-center rounded-full border border-input px-4 text-sm font-medium hover:bg-accent"
          >
            Resources
          </Link>
        </nav>
      </header>

      <main id="portal-main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-center text-xs text-muted-foreground sm:px-6">
        Eternal Fitness client portal — your documents and updates, in one place.
      </footer>
    </div>
  );
}
