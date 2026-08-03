"use client";

import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { HubSidebar, HubSidebarNav } from "./HubSidebar";
import { HubTopbar } from "./HubTopbar";

export function HubShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="hub-shell flex min-h-screen bg-[var(--hub-canvas)]">
      <HubSidebar />
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-60 p-0 border-r border-white/[0.07] bg-[var(--hub-sidebar)] text-white lg:hidden"
        >
          <HubSidebarNav onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex-1 flex flex-col min-w-0">
        <HubTopbar onMenuOpen={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1600px] px-6 py-7 lg:px-10 lg:py-9">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
