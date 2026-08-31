"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconDownload } from "@/components/icons";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { DBSession } from "@/types";
import { derivedWeekLabel } from "@/lib/schedule-dates";

export function ExportSpreadsheetButton({
  blockId,
  blockNumber,
  clientName,
}: {
  blockId: string;
  blockNumber: number;
  clientName: string;
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/blocks/${blockId}/sessions`);
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const sessions = await res.json();
      if (!sessions || sessions.length === 0) {
        toast.error("No sessions found");
        setExporting(false);
        return;
      }

      const rows: Record<string, string | number>[] = [];

      for (const session of sessions as DBSession[]) {
        const s = session.data;
        for (const version of ["studio", "home"] as const) {
          const v = s?.versions?.[version];
          if (!v) continue;
          for (const section of ["warm_up", "main_block", "cooldown"] as const) {
            const exercises = v[section];
            if (!exercises || exercises.length === 0) continue;
            for (const ex of exercises) {
              rows.push({
                "Session #": session.session_number,
                Week: derivedWeekLabel(session.scheduled_at ?? null, session.week),
                Phase: session.phase,
                Archetype: session.archetype,
                Focus: s?.focus_label || "",
                Version: version === "studio" ? "Studio" : "Home",
                Section:
                  section === "warm_up"
                    ? "Warm-up"
                    : section === "main_block"
                      ? "Main Block"
                      : "Cool-down",
                Exercise: ex.exercise_name,
                Sets: ex.sets,
                Reps: ex.reps,
                Tempo: ex.tempo || "",
                Rest: ex.rest || "",
                Equipment: ex.equipment?.join(", ") || "",
                "Coaching Cue": ex.coaching_cue || "",
                Modification: ex.modification || "",
              });
            }
          }
        }
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      const colWidths = [
        { wch: 10 }, // Session #
        { wch: 6 },  // Week
        { wch: 14 }, // Phase
        { wch: 10 }, // Archetype
        { wch: 30 }, // Focus
        { wch: 8 },  // Version
        { wch: 12 }, // Section
        { wch: 35 }, // Exercise
        { wch: 6 },  // Sets
        { wch: 8 },  // Reps
        { wch: 8 },  // Tempo
        { wch: 8 },  // Rest
        { wch: 25 }, // Equipment
        { wch: 40 }, // Coaching Cue
        { wch: 30 }, // Modification
      ];
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Sessions");

      XLSX.writeFile(wb, `Block-${blockNumber}-${clientName.replace(/\s+/g, "-")}.xlsx`);

      toast.success("Spreadsheet downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
    setExporting(false);
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={exporting}>
      <IconDownload className="mr-2 h-4 w-4" />
      {exporting ? "Exporting..." : "Export XLSX"}
    </Button>
  );
}
