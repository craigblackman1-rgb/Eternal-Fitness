import * as React from "react";
import { cn } from "@/lib/utils";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Canonical hub tab-strip styling (spec: hub-client-detail.html's `.tabs`/`.tab`).
 * Centralised here so every tab bar in the hub shares one source of truth for
 * padding/gap/icon-sizing instead of each page hand-typing its own Tailwind string. */
export const HubTabsList = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  React.ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => (
  <TabsList
    ref={ref}
    className={cn(
      "inline-flex h-auto w-full max-w-full flex-wrap justify-start gap-0.5 rounded-[12px] border border-[var(--hub-border)] bg-[var(--hub-card)] p-1 shadow-sm sm:w-auto",
      className,
    )}
    {...props}
  />
));
HubTabsList.displayName = "HubTabsList";

export const HubTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsTrigger>,
  React.ComponentPropsWithoutRef<typeof TabsTrigger>
>(({ className, ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    className={cn(
      "gap-2 rounded-lg border-0 bg-transparent px-[13px] py-2 text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-[var(--hub-hover)] hover:text-foreground data-[state=active]:bg-[var(--hub-sidebar-active)] data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none [&_svg]:h-[15px] [&_svg]:w-[15px] [&_svg]:shrink-0 [&_svg]:text-muted-foreground [&[data-state=active]_svg]:text-rose",
      className,
    )}
    {...props}
  />
));
HubTabsTrigger.displayName = "HubTabsTrigger";
