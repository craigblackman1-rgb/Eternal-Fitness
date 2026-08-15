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

export function BlockActions({ onEditBlock, onAddWorkout, clientId, blockId, blockNumber, clientName }: BlockActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        className="rounded-lg bg-rose hover:bg-rose/90 text-white gap-1.5"
        onClick={onEditBlock}
      >
        <IconPencil className="h-4 w-4" />
        Edit Block
      </Button>
      <Button variant="outline" className="rounded-lg gap-1.5 border-border/60" onClick={onAddWorkout}>
        <IconPlus className="h-4 w-4" />
        Add Workout
      </Button>
      <Link href={`/hub/clients/${clientId}/blocks/${blockId}/review`}>
        <Button variant="outline" className="rounded-lg gap-1.5 border-border/60">
          <IconCalendar className="h-4 w-4" />
          Schedule
        </Button>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9">
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
