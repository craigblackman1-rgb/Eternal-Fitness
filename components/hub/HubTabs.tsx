import * as React from "react";
import { cn } from "@/lib/utils";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Canonical hub tab-strip styling (spec: hub-client-detail-refined.html's
 * `.hub-tabs`/`.hub-tab` — bare underline tabs, not a filled pill panel).
 * Centralised here so every tab bar in the hub shares one source of truth for
 * padding/gap/icon-sizing instead of each page hand-typing its own Tailwind string. */
export const HubTabsList = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  React.ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => (
  <TabsList
    ref={ref}
    className={cn(
      "inline-flex h-auto w-full max-w-full flex-wrap justify-start gap-1 border-b border-[var(--hub-border)] bg-transparent p-0 sm:w-auto",
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
      "gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3.5 py-3 text-[13.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-rose data-[state=active]:bg-transparent data-[state=active]:text-rose data-[state=active]:shadow-none [&_svg]:h-[15px] [&_svg]:w-[15px] [&_svg]:shrink-0 [&_svg]:text-muted-foreground [&[data-state=active]_svg]:text-rose",
      className,
    )}
    {...props}
  />
));
HubTabsTrigger.displayName = "HubTabsTrigger";
