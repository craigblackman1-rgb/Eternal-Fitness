"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

const VALID_TABS = ["overview", "profile", "compliance", "training", "progress", "plan-agent", "updates"];

export function ClientDetailTabs({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [value, setValue] = useState(VALID_TABS.includes(tabParam ?? "") ? (tabParam as string) : "overview");

  useEffect(() => {
    if (VALID_TABS.includes(tabParam ?? "")) setValue(tabParam as string);
  }, [tabParam]);

  return (
    <Tabs value={value} onValueChange={setValue} className="w-full">
      {children}
    </Tabs>
  );
}
