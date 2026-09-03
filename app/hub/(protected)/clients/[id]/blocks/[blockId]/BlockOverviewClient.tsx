"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HubCard, HubCardHeader } from "@/components/hub";
import { IconFileText } from "@/components/icons";
import type { Weekday } from "@/lib/scheduling";
import { BlockActions } from "./BlockActions";
import { BlockSchedulePanel } from "./BlockSchedulePanel";
import { EditBlockDrawer } from "./EditBlockDrawer";
import { AddWorkoutDialog } from "./AddWorkoutDialog";
import type { BlockStatus } from "@/types";

interface BlockOverviewClientProps {
  children: React.ReactNode;
  block: {
    id: string;
    block_number: number;
    block_note: string | null;
    summary: string | null;
    status: BlockStatus;
  };
  clientId: string;
  blockId: string;
  clientName: string;
  weeks: number[];
  sessionCount: number;
  /** CR-EF-143 — number of completed/charged sessions for the edit drawer's min-floor. */
  completedSessions: number;
  scheduledStartIso: string | null;
  weekdays: Weekday[];
}

export function BlockOverviewClient({
  children,
  block,
  clientId,
  blockId,
  clientName,
  weeks,
  sessionCount,
  completedSessions,
  scheduledStartIso,
  weekdays,
}: BlockOverviewClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addWorkoutOpen, setAddWorkoutOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <div className="space-y-6">
      <BlockActions
        onEditBlock={() => setDrawerOpen(true)}
        onAddWorkout={() => setAddWorkoutOpen(true)}
        onSchedule={() => setScheduleOpen(true)}
        clientId={clientId}
        blockId={blockId}
        blockNumber={block.block_number}
        clientName={clientName}
      />

      {children}

      <BlockSchedulePanel
        blockId={blockId}
        sessionCount={sessionCount}
        scheduledStartIso={scheduledStartIso}
        weekdays={weekdays}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
      />

      {/* Block Note stays a plain HubCard, not a HubAccordionSection: it's the
          only optional info section on this page (everything else is the
          week/session `<details>` structure, a genuinely different kind of
          collapsible per the structure-consistency brief) — an accordion adds
          nothing when there's only ever one section to open/close. */}
      {block.block_note && (
        <HubCard>
          <HubCardHeader
            icon={<IconFileText className="h-4 w-4" />}
            title="Block Note"
            color="slate"
            action={
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg text-xs h-auto py-1 px-2.5"
                onClick={() => setDrawerOpen(true)}
              >
                Edit
              </Button>
            }
          />
          <div className="pb-5">
            <p className="text-sm text-foreground">{block.block_note}</p>
          </div>
        </HubCard>
      )}

      <EditBlockDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        block={block}
        sessionCount={sessionCount}
        completedSessions={completedSessions}
        scheduledStartIso={scheduledStartIso}
      />
      <AddWorkoutDialog open={addWorkoutOpen} onOpenChange={setAddWorkoutOpen} blockId={blockId} weeks={weeks} />
    </div>
  );
}
