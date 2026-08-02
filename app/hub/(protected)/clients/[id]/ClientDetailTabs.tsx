"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

const VALID_TABS = ["overview", "profile", "compliance", "training", "progress", "training-history", "plan-agent", "updates", "tasks"];
// "history" was merged into "progress" (consolidated exercise-performance
// data into one tab) — redirect any old bookmark/link rather than silently
// falling back to "overview" and losing the user's place.
const TAB_ALIASES: Record<string, string> = { history: "progress" };

export function ClientDetailTabs({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const resolvedTab = tabParam ? (TAB_ALIASES[tabParam] ?? tabParam) : tabParam;
  const activeTab = VALID_TABS.includes(resolvedTab ?? "") ? (resolvedTab as string) : "overview";
  const [value, setValue] = useState(activeTab);

  // Keep local state in sync with the URL, including when the user navigates
  // back/forward and the tab param changes or disappears.
  useEffect(() => {
    setValue(activeTab);
  }, [activeTab]);

  const handleValueChange = (next: string) => {
    setValue(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <Tabs value={value} onValueChange={handleValueChange} className="w-full">
      {children}
    </Tabs>
  );
}
