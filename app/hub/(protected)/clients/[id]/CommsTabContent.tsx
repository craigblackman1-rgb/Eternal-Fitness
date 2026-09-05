"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClientUpdatesPanel } from "@/components/hub/ClientUpdatesPanel";
import { ClientTasksPanel } from "./ClientTasksPanel";
import { UpdateIntervalControl } from "./UpdateIntervalControl";
import type { UpdateInterval, UpdateDueInfo } from "@/lib/updates-due";
import type { SentUpdate } from "@/types";

type Segment = "updates" | "tasks";

interface Props {
  clientId: string;
  clientNumber: number;
  updates: SentUpdate[];
  updateInterval: UpdateInterval | null;
  dueInfo: UpdateDueInfo;
  lastSentAt: string | null;
  updateIntervalWeeks: number | null;
  updateIntervalNextDate: string | null;
  currentUserName: string | null;
}

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "updates", label: "Updates" },
  { key: "tasks", label: "Tasks" },
];

export function CommsTabContent({
  clientId,
  clientNumber,
  updates,
  updateInterval,
  dueInfo,
  lastSentAt,
  updateIntervalWeeks,
  updateIntervalNextDate,
  currentUserName,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const viewParam = searchParams.get("view");
  const initialView: Segment = viewParam === "tasks" ? "tasks" : "updates";

  const [segment, setSegment] = useState<Segment>(initialView);

  useEffect(() => {
    const vp = searchParams.get("view");
    if (vp === "updates" || vp === "tasks") setSegment(vp);
  }, [searchParams]);

  const handleSegmentChange = (next: Segment) => {
    setSegment(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg bg-[var(--hub-hover)] p-[3px]">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => handleSegmentChange(s.key)}
            className={cn(
              "rounded-nested px-4 py-2 text-[13px] font-semibold transition-all",
              segment === s.key
                ? "bg-[var(--hub-card)] text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {segment === "updates" && (
        <>
          {/* CR-EF-073: the update-cadence control moved here from Overview's
              Snapshot card. It sets how often this client is due a written
              update, so it belongs beside the updates it schedules rather than
              on a top-level summary. */}
          <div className="rounded-surface border border-[var(--hub-border)] bg-[var(--hub-card)] px-5 py-4">
            <UpdateIntervalControl
              clientNumber={clientNumber}
              updateInterval={updateInterval}
              updateIntervalWeeks={updateIntervalWeeks}
              updateIntervalNextDate={updateIntervalNextDate}
              dueInfo={dueInfo}
            />
          </div>
          <ClientUpdatesPanel
            clientNumber={clientNumber}
            updates={updates}
            reportHref={`/hub/clients/${clientNumber}/updates`}
          />
        </>
      )}

      {segment === "tasks" && (
        <ClientTasksPanel
          clientId={clientId}
          clientNumber={clientNumber}
          updateInterval={updateInterval}
          dueInfo={dueInfo}
          lastSentAt={lastSentAt}
          currentUserName={currentUserName}
        />
      )}
    </div>
  );
}
