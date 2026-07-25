"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconAlertTriangle, IconCheckCircle, IconChevronLeft, IconEye } from "@/components/icons";
import Link from "next/link";
import { toast } from "sonner";
import type { DBSession, DBBlock } from "@/types";
import { HubCard, HubCardHeader, HubAlert } from "@/components/hub";
import { BlockScheduler } from "./BlockScheduler";

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
          <h1 className="text-xl font-semibold tracking-tight">Review & Approve</h1>
          <p className="text-muted-foreground">Block {block.block_number} — {sessions.length} sessions</p>
        </div>
      </div>

      {hasMissingMods && (
        <HubAlert severity="warning" title="Missing Modifications">
          Some exercises are missing client-specific modifications. Review each session before approving.
        </HubAlert>
      )}

      <BlockScheduler sessions={sessions} onChanged={loadSessions} />

      <HubCard>
        <HubCardHeader title="Session Overview" />
        <div className="pb-5">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Exercises (Studio)</TableHead>
                <TableHead>Exercises (Home)</TableHead>
                <TableHead className="w-16"></TableHead>
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
                    className="border-border/60 odd:bg-off-white/40 hover:bg-rose/5 transition-colors"
                  >
                    <TableCell className="font-medium">{session.session_number}</TableCell>
                    <TableCell>
                      <Badge variant={session.archetype === "A" ? "secondary" : session.archetype === "B" ? "default" : "outline"} className="rounded-full">
                        {session.archetype}
                      </Badge>
                    </TableCell>
                    <TableCell>{session.week}</TableCell>
                    <TableCell className="capitalize">{session.phase}</TableCell>
                    <TableCell>{studioCount} exercises</TableCell>
                    <TableCell>{homeCount} exercises</TableCell>
                    <TableCell>
                      <Link href={`/hub/clients/${params.id}/blocks/${params.blockId}/sessions/${session.session_number}`}>
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
        <Button onClick={handleApprove} disabled={approving} className="gap-2 bg-rose hover:bg-rose/90 text-white rounded-lg">
          <IconCheckCircle className="h-4 w-4" />
          {approving ? "Approving..." : "Approve Block"}
        </Button>
      </div>
    </div>
  );
}
