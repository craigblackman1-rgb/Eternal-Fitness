"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconAlertTriangle, IconCheckCircle, IconChevronLeft, IconEye } from "@/components/icons";
import { StatusBadge } from "@/components/hub/StatusBadge";
import Link from "next/link";
import { toast } from "sonner";
import type { DBSession, DBBlock } from "@/types";
import { HubCard, HubCardHeader, HubAlert } from "@/components/hub";
import { BlockScheduler } from "./BlockScheduler";
import { sessionWorkoutName } from "@/lib/session-display";
import { derivedWeekLabel } from "@/lib/schedule-dates";

export default function ReviewPage({ params }: { params: { id: string; blockId: string } }) {
  const router = useRouter();
  const [block, setBlock] = useState<DBBlock | null>(null);
  const [sessions, setSessions] = useState<DBSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const loadSessions = async () => {
    const sessionsRes = await fetch(`/api/blocks/${params.blockId}/sessions`);
    if (sessionsRes.ok) setSessions(await sessionsRes.json());
  };

  useEffect(() => {
    async function load() {
      const [blockRes, sessionsRes] = await Promise.all([
        fetch(`/api/blocks/${params.blockId}`),
        fetch(`/api/blocks/${params.blockId}/sessions`),
      ]);
      if (blockRes.ok) setBlock(await blockRes.json());
      if (sessionsRes.ok) setSessions(await sessionsRes.json());
      setLoading(false);
    }
    load();
  }, [params.blockId]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/blocks/${params.blockId}/approve`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve");
      }
      toast.success("Block approved!");
      router.push(`/hub/clients/${params.id}/blocks/${params.blockId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setApproving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!block) {
    return <div className="p-8 text-center text-muted-foreground">Block not found</div>;
  }

  const hasMissingMods = sessions.some((s) => {
    const studio = s.data?.versions?.studio;
    const home = s.data?.versions?.home;
    const allExercises = [
      ...(studio?.warm_up || []),
      ...(studio?.main_block || []),
      ...(studio?.cooldown || []),
      ...(home?.warm_up || []),
      ...(home?.main_block || []),
      ...(home?.cooldown || []),
    ];
    return allExercises.some((e: { modification?: string }) => !e.modification);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/hub/clients/${params.id}/blocks/${params.blockId}`} className="text-muted-foreground hover:text-foreground">
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {block.status === "draft" ? "Review & Approve" : "Schedule Sessions"}
            </h1>
            <StatusBadge status={block.status} />
          </div>
          <p className="text-muted-foreground">Block {block.block_number} — {sessions.length} sessions</p>
        </div>
      </div>

      {block.status === "draft" && hasMissingMods && (
        <HubAlert severity="warning" title="Missing modifications">
          Some exercises are missing client-specific modifications. Review each session before approving.
        </HubAlert>
      )}

      <BlockScheduler sessions={sessions} onChanged={loadSessions} />

      <HubCard>
        <HubCardHeader title="Session overview" />
        <div className="pb-5">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--hub-border)] hover:bg-transparent">
                <TableHead className="w-12 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-[var(--hub-hover)] h-10">#</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-[var(--hub-hover)] h-10">Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-[var(--hub-hover)] h-10">Week</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-[var(--hub-hover)] h-10">Phase</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-[var(--hub-hover)] h-10">Exercises (Studio)</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium bg-[var(--hub-hover)] h-10">Exercises (Home)</TableHead>
                <TableHead className="w-16 text-xs uppercase tracking-wider text-muted-foreground font-medium bg-[var(--hub-hover)] h-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => {
                const studioCount =
                  (session.data?.versions?.studio?.warm_up?.length || 0) +
                  (session.data?.versions?.studio?.main_block?.length || 0) +
                  (session.data?.versions?.studio?.cooldown?.length || 0);
                const homeCount =
                  (session.data?.versions?.home?.warm_up?.length || 0) +
                  (session.data?.versions?.home?.main_block?.length || 0) +
                  (session.data?.versions?.home?.cooldown?.length || 0);
                return (
                  <TableRow
                    key={session.id}
                    className="border-[var(--hub-border)] hover:bg-[var(--hub-hover)] transition-colors"
                  >
                    <TableCell className="font-medium text-sm py-2.5">{sessionWorkoutName(session, `Session ${session.session_number}`)}</TableCell>
                    <TableCell className="text-sm py-2.5">
                      <Badge variant={session.archetype === "A" ? "secondary" : session.archetype === "B" ? "default" : "outline"} className="rounded-full">
                        {session.archetype}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm py-2.5">{derivedWeekLabel(session.scheduled_at ?? null, session.week)}</TableCell>
                    <TableCell className="capitalize text-sm py-2.5">{session.phase}</TableCell>
                    <TableCell className="text-sm py-2.5">{studioCount} exercises</TableCell>
                    <TableCell className="text-sm py-2.5">{homeCount} exercises</TableCell>
                    <TableCell className="text-right py-2.5">
                      <Link href={`/hub/clients/${params.id}/blocks/${params.blockId}/sessions/${session.session_number}${session.parent_session_id ? `?session=${session.id}` : ""}`}>
                        <Button variant="ghost" size="icon" className="rounded-lg hover:bg-rose/10 hover:text-rose">
                          <IconEye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </HubCard>

      <div className="flex justify-end gap-3">
        <Link href={`/hub/clients/${params.id}/blocks/${params.blockId}`}>
          <Button variant="outline" className="rounded-lg">Back to Block</Button>
        </Link>
        {block.status === "draft" && (
          <Button onClick={handleApprove} disabled={approving} className="gap-2 bg-rose hover:bg-rose/90 text-white rounded-lg">
            <IconCheckCircle className="h-4 w-4" />
            {approving ? "Approving..." : "Approve Block"}
          </Button>
        )}
      </div>
    </div>
  );
}
