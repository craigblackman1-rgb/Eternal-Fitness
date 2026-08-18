"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HubQuickActions } from "@/components/hub";
import { IconPencil, IconCalendar, IconPrinter, IconEllipsis, IconPlus } from "@/components/icons";
import { ExportSpreadsheetButton } from "./export-spreadsheet";
import { DeleteBlockButton } from "./delete-block-button";

interface BlockActionsProps {
  onEditBlock: () => void;
  onAddWorkout: () => void;
  clientId: string;
  blockId: string;
  blockNumber: number;
  clientName: string;
}

/**
 * Quick Actions — same top-left .qa-bar primitive as the dashboard and
 * client record. "Edit Block"/"Add Workout" open drawers rather than
 * navigating, so the bar's onClick variant carries them; "Schedule" is a
 * real link. Print/Export/Delete stay in the "..." overflow menu — they're
 * secondary/destructive actions, not the page's quick actions.
 */
export function BlockActions({ onEditBlock, onAddWorkout, clientId, blockId, blockNumber, clientName }: BlockActionsProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <HubQuickActions
        variant="bar"
        actions={[
          { onClick: onEditBlock, label: "Edit block", icon: <IconPencil className="w-4 h-4" />, primary: true },
          { onClick: onAddWorkout, label: "Add workout", icon: <IconPlus className="w-4 h-4" /> },
          { href: `/hub/clients/${clientId}/blocks/${blockId}/review`, label: "Schedule", icon: <IconCalendar className="w-4 h-4" /> },
        ]}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9 shrink-0">
            <IconEllipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={`/hub/clients/${clientId}/blocks/${blockId}/print`} className="gap-2 cursor-pointer">
              <IconPrinter className="h-4 w-4" />
              Print
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <ExportSpreadsheetButton
              blockId={blockId}
              blockNumber={blockNumber}
              clientName={clientName}
            />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-destructive cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <DeleteBlockButton clientId={clientId} blockId={blockId} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
