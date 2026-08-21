"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

const VALID_TABS = ["overview", "profile", "compliance", "documents", "training", "comms", "plan-agent"];

const VALID_VIEWS: Record<string, string[]> = {
  training: ["blocks", "sessions", "progress", "history"],
  comms: ["updates", "tasks"],
};

const DEFAULT_VIEWS: Record<string, string> = {
  training: "blocks",
  comms: "updates",
};

const TAB_ALIASES: Record<string, string> = {
  admin: "compliance",
  progress: "training",
  history: "training",
  "training-history": "training",
  updates: "comms",
  tasks: "comms",
};

const TAB_ALIAS_VIEWS: Record<string, string> = {
  progress: "progress",
  history: "progress",
  "training-history": "history",
  updates: "updates",
  tasks: "tasks",
};

export function ClientDetailTabs({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const resolvedTab = tabParam ? (TAB_ALIASES[tabParam] ?? tabParam) : tabParam;
  const activeTab = VALID_TABS.includes(resolvedTab ?? "") ? (resolvedTab as string) : "overview";

  const viewParam = searchParams.get("view");
  const aliasView = tabParam ? TAB_ALIAS_VIEWS[tabParam] : undefined;
  const effectiveView = aliasView ?? viewParam;
  const validViews = VALID_VIEWS[activeTab] ?? [];
  const activeView = effectiveView && validViews.includes(effectiveView) ? effectiveView : (DEFAULT_VIEWS[activeTab] ?? null);

  const [value, setValue] = useState(activeTab);

  useEffect(() => {
    setValue(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const isAlias = tabParam && TAB_ALIASES[tabParam];
    const aliasViewVal = tabParam ? TAB_ALIAS_VIEWS[tabParam] : undefined;

    if (isAlias) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", activeTab);
      if (aliasViewVal) params.set("view", aliasViewVal);
      else params.delete("view");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } else if (tabParam && !aliasViewVal) {
      const defaultView = DEFAULT_VIEWS[activeTab];
      const currentView = searchParams.get("view");
      const validVs = VALID_VIEWS[activeTab] ?? [];
      if (defaultView && currentView !== defaultView && (!currentView || !validVs.includes(currentView))) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", defaultView);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }
  }, []);

  const handleValueChange = (next: string) => {
    setValue(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);

    const defaultView = DEFAULT_VIEWS[next];
    if (defaultView) params.set("view", defaultView);
    else params.delete("view");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <Tabs value={value} onValueChange={handleValueChange} className="w-full">
      {children}
    </Tabs>
  );
}

export { VALID_TABS, VALID_VIEWS, DEFAULT_VIEWS, TAB_ALIASES, TAB_ALIAS_VIEWS };
