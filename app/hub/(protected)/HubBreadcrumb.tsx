"use client";

import { usePathname } from "next/navigation";

const crumbLabels: Record<string, string> = {
  "/hub": "Dashboard",
  "/hub/clients": "Clients",
  "/hub/exercises": "Exercise Library",
  "/hub/tracker": "Medical Tracker",
  "/hub/agreements": "Agreements",
  "/hub/reports/updates": "Email Updates",
  "/hub/sessions/review": "Cancellation review",
  "/hub/sessions/lapse-review": "Lapse review",
};

function resolveLabel(pathname: string): string {
  if (crumbLabels[pathname]) return crumbLabels[pathname];
  if (pathname.startsWith("/hub/clients/") && pathname.includes("/blocks/")) {
    if (pathname.endsWith("/review")) return "Block Review";
    if (pathname.endsWith("/print")) return "Print Block";
    if (pathname.includes("/sessions/")) return "Session";
    return "Block";
  }
  if (pathname.startsWith("/hub/clients/") && pathname.endsWith("/updates/new")) return "New Update";
  if (pathname.startsWith("/hub/clients/") && pathname.includes("/updates/") && pathname.endsWith("/edit")) return "Edit Update";
  if (pathname.startsWith("/hub/clients/") && pathname.includes("/updates")) return "Updates";
  if (pathname.startsWith("/hub/clients/") && pathname.endsWith("/edit")) return "Edit Client";
  if (pathname.startsWith("/hub/clients/new")) return "New Client";
  if (pathname.startsWith("/hub/clients/")) return "Client";
  if (pathname.startsWith("/hub/agreements/")) return "Agreement";
  return "Hub";
}

export function HubBreadcrumb() {
  const pathname = usePathname();
  const label = resolveLabel(pathname);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="text-rose font-semibold">Hub</span>
      <span>/</span>
      <span className="text-foreground font-medium">{label}</span>
    </div>
  );
}
