"use client";

import { DrawerShell } from "./DrawerManager";

/* ── ClientDrawers — stub drawer shells for the five reference doors plus
   the training content drawers. Each drawer has real open/close/focus
   mechanics via DrawerManager. Content is placeholder text for S0b. */

function StubBody({ heading, note }: { heading: string; note?: string }) {
  return (
    <div className="space-y-4">
      <div className="border border-[var(--hub-border)] rounded-[10px] bg-white overflow-hidden">
        <div className="px-3 py-2.5 border-t-[3px] border-t-[var(--color-muted)] bg-[var(--hub-hover)]">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[.08em] text-[var(--color-muted)]">
            {heading}
          </span>
        </div>
        <div className="px-3 py-3">
          <p className="m-0 text-[13px] text-[var(--color-muted)] italic">
            {note ?? "Full content ships in S0b"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ClientDrawers() {
  return (
    <>
      {/* ── Profile ── */}
      <DrawerShell id="dw-profile" title="Profile" subtitle="Who this client is" width="md">
        <StubBody heading="Identity" note="Full content ships in S0b" />
        <StubBody heading="Emergency contact" note="Full content ships in S0b" />
        <StubBody heading="Portal" note="Full content ships in S0b" />
        <StubBody heading="Notes" note="Full content ships in S0b" />
        <StubBody heading="Record" note="Full content ships in S0b" />
      </DrawerShell>

      {/* ── Health ── */}
      <DrawerShell id="dw-health" title="Health" subtitle="Body and what it means for training" width="lg">
        <StubBody heading="Conditions" note="Full content ships in S0b" />
        <StubBody heading="Medication" note="Full content ships in S0b" />
        <StubBody heading="Injuries and pain" note="Full content ships in S0b" />
        <StubBody heading="Training rules" note="Full content ships in S0b" />
        <StubBody heading="Clearance" note="Full content ships in S0b" />
      </DrawerShell>

      {/* ── Arrangement ── */}
      <DrawerShell id="dw-arrangement" title="Arrangement" subtitle="What you have agreed" width="lg">
        <StubBody heading="How they train" note="Full content ships in S0b" />
        <StubBody heading="Goals" note="Full content ships in S0b" />
        <StubBody heading="Package and payment" note="Full content ships in S0b" />
        <StubBody heading="Kit and reviews" note="Full content ships in S0b" />
      </DrawerShell>

      {/* ── Documents ── */}
      <DrawerShell id="dw-documents" title="Documents" subtitle="On file" width="md">
        <StubBody heading="Cleared to train" note="Full content ships in S0b" />
        <StubBody heading="On file" note="Full content ships in S0b" />
      </DrawerShell>

      {/* ── Comms ── */}
      <DrawerShell id="dw-comms" title="Comms" subtitle="Updates and tasks" width="md">
        <StubBody heading="Next update" note="Full content ships in S0b" />
        <StubBody heading="Tasks" note="Full content ships in S0b" />
        <StubBody heading="Sent" note="Full content ships in S0b" />
      </DrawerShell>

      {/* ── Workout (training) ── */}
      <DrawerShell id="dw-workout" title="Workout" subtitle="Session exercises" width="lg">
        <StubBody heading="Exercises" note="Full content ships in S0b" />
      </DrawerShell>

      {/* ── Block (training) ── */}
      <DrawerShell id="dw-block" title="Block" subtitle="Every workout in the block" width="md">
        <StubBody heading="Workouts" note="Full content ships in S0b" />
      </DrawerShell>

      {/* ── Progress (training) ── */}
      <DrawerShell id="dw-progress" title="Progress" subtitle="Every exercise logged" width="lg">
        <StubBody heading="Exercise table" note="Full content ships in S0b" />
      </DrawerShell>

      {/* ── Pre-app (training history) ── */}
      <DrawerShell id="dw-preapp" title="Before the app" subtitle="Trainerize import · read-only" width="md">
        <StubBody heading="Imported sessions" note="Full content ships in S0b" />
      </DrawerShell>
    </>
  );
}
