"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { cn } from "@/lib/utils";
import EternalFitnessLogo from "@/components/EternalFitnessLogo";
import {
  IconBarChart3,
  IconBookText,
  IconCalendar,
  IconCheckCircle,
  IconCheckSquare,
  IconChevronDown,
  IconClipboardCheck,
  IconClipboardList,
  IconClock,
  IconDumbbell,
  IconEye,
  IconTarget,
  IconBot,
  IconExternalLink,
  IconFileSignature,
  IconFileText,
  IconLayoutDashboard,
  IconLogOut,
  IconMail,
  IconPencil,
  IconRibbon,
  IconTrendUp,
  IconUpload,
  IconUsers,
} from "@/components/icons";

const navGroups: { label: string; items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/hub", label: "Dashboard", icon: IconLayoutDashboard },
      { href: "/hub/schedule", label: "Studio Schedule", icon: IconCalendar },
      { href: "/hub/tasks", label: "Tasks", icon: IconCheckSquare },
    ],
  },
  {
    label: "Clients",
    items: [
      { href: "/hub/clients", label: "Clients", icon: IconUsers },
      { href: "/hub/training-blocks", label: "Training Blocks", icon: IconClock },
      { href: "/hub/resources", label: "Portal Resources", icon: IconRibbon },
    ],
  },
  {
    label: "Client Library",
    items: [
      { href: "/hub/exercises", label: "Exercise Library", icon: IconBookText },
      { href: "/hub/workouts", label: "Workouts", icon: IconDumbbell },
      { href: "/hub/programs", label: "Programs", icon: IconTarget },
    ],
  },
  {
    label: "Documents",
    items: [
      { href: "/hub/documents", label: "All Documents", icon: IconFileText },
      { href: "/hub/document-templates", label: "Document templates", icon: IconFileSignature },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/hub/cashflow", label: "Overview", icon: IconBarChart3 },
      { href: "/hub/cashflow/invoices", label: "Invoices", icon: IconFileText },
      { href: "/hub/cashflow/reconciliation", label: "Reconciliation", icon: IconCheckCircle },
      { href: "/hub/cashflow/transactions", label: "Bank transactions", icon: IconUpload },
      { href: "/hub/cashflow/tax", label: "Tax", icon: IconPencil },
      { href: "/hub/cashflow/forecast", label: "Forecast", icon: IconTrendUp },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/hub/reports/updates", label: "Email Updates", icon: IconMail },
      { href: "/hub/compliance", label: "Compliance", icon: IconClipboardList },
    ],
  },
  {
    label: "Studio Admin",
    items: [
      { href: "/hub/sessions/lapse-review", label: "Lapse review", icon: IconEye },
      { href: "/hub/sessions/review", label: "Cancellation review", icon: IconClipboardCheck },
      { href: "/hub/process-quality", label: "Process & Quality", icon: IconClipboardList },
      { href: "/hub/settings/training-rules", label: "Training Rules", icon: IconClipboardCheck },
      { href: "/hub/settings/studio-equipment", label: "Studio Equipment", icon: IconDumbbell },
      { href: "/hub/settings/plan-agent", label: "Plan Agent Rules", icon: IconBot },
      { href: "/hub/settings/integrations", label: "Integrations", icon: IconCalendar },
      { href: "/hub/web-admin", label: "Web Admin", icon: IconExternalLink },
    ],
  },
];

// Groups collapsed by default on first load — matches hub-nav-restructure.html's
// own spec ("Studio Admin shown collapsed"), room for more groups later without
// lengthening the sidebar. Every other group starts expanded.
const DEFAULT_COLLAPSED: Record<string, boolean> = { "Studio Admin": true };

export function HubSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  // Start from the default collapse state, but force-expand whichever group
  // contains the current route — a collapsed group hiding the active link
  // with no indication would be worse than not collapsing at all.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const activeGroup = navGroups.find((group) =>
      group.items.some(
        (item) => pathname === item.href || (item.href !== "/hub" && pathname.startsWith(item.href + "/")),
      ),
    );
    if (!activeGroup) return DEFAULT_COLLAPSED;
    return { ...DEFAULT_COLLAPSED, [activeGroup.label]: false };
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/hub/login");
  };

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="flex h-full w-60 shrink-0 flex-col bg-[var(--hub-sidebar)] text-white">
      <div className="flex flex-col items-start justify-center gap-1 px-5 py-3 border-b border-white/[0.07]">
        <EternalFitnessLogo variant="light" className="h-9 w-auto" />
        <span className="text-[11px] text-white/40 tracking-wide uppercase">Trainer Hub</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navGroups.map((group) => {
          const isCollapsed = !!collapsed[group.label];
          return (
            <div key={group.label} className="pb-4">
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={!isCollapsed}
                className="flex w-full items-center justify-between gap-2 rounded-nested px-3 py-1 mb-1.5 text-left hover:bg-[var(--hub-sidebar-hover)] transition-colors"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
                  {group.label}
                </span>
                <IconChevronDown
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 text-white/30 transition-transform duration-150",
                    isCollapsed && "-rotate-90",
                  )}
                />
              </button>
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href || (item.href !== "/hub" && pathname.startsWith(item.href + "/"));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-100",
                          isActive
                            ? "bg-[var(--hub-sidebar-active)] text-white"
                            : "text-white/55 hover:text-white hover:bg-[var(--hub-sidebar-hover)]",
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-pill bg-rose" />
                        )}
                        <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-rose" : "text-white/45")} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-white/[0.07]">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-pill bg-rose/20 text-rose flex items-center justify-center text-xs font-bold shrink-0">
            EF
          </div>
          <div className="text-xs min-w-0 flex-1">
            <p className="font-semibold text-white truncate">Esther Fair</p>
            <p className="text-white/40">Level 4 Cancer & Exercise Rehab</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-[var(--hub-sidebar-hover)] transition-colors"
          >
            <IconLogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function HubSidebar() {
  return (
    <aside className="hidden lg:flex sticky top-0 h-screen">
      <HubSidebarNav />
    </aside>
  );
}
