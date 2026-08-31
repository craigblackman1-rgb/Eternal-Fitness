import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { IconChevronLeft } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "./print-button";
import type { DBSession, Exercise } from "@/types";

const phaseLabels: Record<string, string> = {
  foundation: "Foundation",
  build: "Build",
  develop: "Develop",
  peak: "Peak",
  deload: "Deload",
};

export default async function BlockPrintPage({
  params,
}: {
  params: { id: string; blockId: string };
}) {
  const supabase = createClient();

  const { data: block } = await supabase
    .from("blocks")
    .select("*")
    .eq("id", params.blockId)
    .single();

  if (!block) notFound();

  const [clientRes, sessionsRes] = await Promise.all([
    supabase.from("clients").select("name, profile, client_number").eq("client_number", parseInt(params.id)).single(),
    supabase
      .from("sessions")
      .select("*")
      .eq("block_id", params.blockId)
      .order("session_number", { ascending: true }),
  ]);

  const client = clientRes.data;
  const sessions = sessionsRes.data;

  const phaseWeeks = new Map<string, number[]>();
  sessions?.forEach((s) => {
    const w = s.week;
    if (!phaseWeeks.has(s.phase)) phaseWeeks.set(s.phase, []);
    const weeks = phaseWeeks.get(s.phase)!;
    if (!weeks.includes(w)) weeks.push(w);
  });

  return (
    <>
      <style>{`
        @media print {
          nav, aside, .no-print { display: none !important; }
          body { background: white !important; color: #000 !important; }
          @page { margin: 1.5cm; }
          .print-break { page-break-before: always; }
          .print-safe { background: white !important; }
          .print-table th { background: #f3f4f6 !important; }
          th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print flex items-center gap-4 mb-6">
        <Link
          href={`/hub/clients/${client?.client_number || params.id}/blocks/${params.blockId}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Block {block.block_number} &mdash; Print View
          </h1>
        </div>
        <PrintButton />
      </div>

      <div className="print-safe space-y-8">
        <HeaderSection
          clientName={client?.name || "Unknown"}
          blockNumber={block.block_number}
          status={block.status}
          createdAt={block.created_at}
          profile={client?.profile}
          phaseCalendar={Array.from(phaseWeeks.entries())}
          blockNote={block.block_note}
        />

        {sessions?.map((session, idx) => (
          <SessionPrintSection
            key={session.id}
            session={session}
            first={idx === 0}
            clientIntro={client?.profile?.notes?.client_intro || ""}
          />
        ))}
      </div>
    </>
  );
}

function HeaderSection({
  clientName,
  blockNumber,
  status,
  createdAt,
  profile,
  phaseCalendar,
  blockNote,
}: {
  clientName: string;
  blockNumber: number;
  status: string;
  createdAt: string;
  profile: any;
  phaseCalendar: [string, number[]][];
  blockNote: string | null;
}) {
  const log = profile?.logistics;
  return (
    <div className="border-b-2 border-foreground pb-4">
      <h1 className="text-2xl font-bold tracking-tight">ETERNAL FITNESS</h1>
      <h2 className="text-xl font-semibold mt-1">
        Training Block {blockNumber}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Client:</span>{" "}
          <span className="font-medium">{clientName}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Status:</span>{" "}
          <span className="capitalize font-medium">{status}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Created:</span>{" "}
          {new Date(createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        {log && (
          <p>
            <span className="text-muted-foreground">Schedule:</span>{" "}
            {log.sessions_per_week}x/week &middot;{" "}
            {log.time_tier} &middot;{" "}
            {log.training_location}
          </p>
        )}
      </div>

      {phaseCalendar.length > 0 && (
        <div className="mt-3">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Phase Calendar
          </span>
          <div className="mt-1 flex flex-wrap gap-2">
            {phaseCalendar.map(([phase, weeks]) => (
              <span
                key={phase}
                className="inline-flex rounded-lg border px-2.5 py-0.5 text-xs font-medium capitalize"
              >
                {phaseLabels[phase] || phase} &mdash; Week{weeks.length > 1 ? "s" : ""}{" "}
                {weeks.join(", ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {blockNote && (
        <div className="mt-3 text-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Block Note
          </span>
          <p className="mt-0.5">{blockNote}</p>
        </div>
      )}
    </div>
  );
}

function SessionPrintSection({
  session,
  first,
  clientIntro,
}: {
  session: DBSession;
  first: boolean;
  clientIntro?: string;
}) {
  const s = session.data;

  return (
    <div className={first ? "pt-2" : "print-break pt-6"}>
      <div className="flex items-baseline justify-between border-b pb-1 mb-3">
        <h3 className="text-lg font-bold">
          Session {session.session_number}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            Archetype {session.archetype} &middot; Week {session.week}
          </span>
        </h3>
        <Badge variant="outline" className="capitalize">
          {phaseLabels[session.phase] || session.phase}
        </Badge>
      </div>

      {s?.focus_label && (
        <p className="text-sm font-medium mb-3">{s.focus_label}</p>
      )}

      {(clientIntro || s?.client_intro) && (
        <p className="text-sm italic text-muted-foreground mb-3">
          {clientIntro || s?.client_intro}
        </p>
      )}

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Studio Version
        </h4>
        <ExerciseTable
          title="Warm-up"
          exercises={s?.versions?.studio?.warm_up || []}
        />
        <div className="mt-3">
          <ExerciseTable
            title="Main Block"
            exercises={s?.versions?.studio?.main_block || []}
          />
        </div>
        <div className="mt-3">
          <ExerciseTable
            title="Cool-down"
            exercises={s?.versions?.studio?.cooldown || []}
          />
        </div>
      </div>

      <div className="mt-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Home Version
        </h4>
        <HomeMiniSection
          exercises={s?.versions?.home?.warm_up || []}
          label="Warm-up"
        />
        <HomeMiniSection
          exercises={s?.versions?.home?.main_block || []}
          label="Main Block"
        />
        <HomeMiniSection
          exercises={s?.versions?.home?.cooldown || []}
          label="Cool-down"
        />
      </div>

      {s?.coaching_notes && (
        <div className="mt-3 rounded-md border p-2 text-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Coaching Notes
          </span>
          <p className="mt-0.5 whitespace-pre-wrap">{s.coaching_notes}</p>
        </div>
      )}
    </div>
  );
}

function ExerciseTable({
  title,
  exercises,
}: {
  title: string;
  exercises: Exercise[];
}) {
  if (exercises.length === 0) {
    <p className="text-xs italic text-muted-foreground">{title}: None</p>;
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
        {title}
      </p>
      {exercises.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">No exercises</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b print-table">
                <th className="text-left py-1 pr-2 font-semibold">Exercise</th>
                <th className="text-center px-1 py-1 font-semibold w-8">S</th>
                <th className="text-center px-1 py-1 font-semibold w-12">R</th>
                <th className="text-center px-1 py-1 font-semibold w-14">
                  Tempo
                </th>
                <th className="text-center px-1 py-1 font-semibold w-12">
                  Rest
                </th>
                <th className="text-left px-1 py-1 font-semibold w-22">
                  Equipment
                </th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((ex, i) => (
                <tr key={i} className="border-b border-dashed border-gray-200">
                  <td className="py-1 pr-2 font-medium">{ex.exercise_name}</td>
                  <td className="text-center px-1 py-1">{ex.sets}</td>
                  <td className="text-center px-1 py-1">{ex.reps}</td>
                  <td className="text-center px-1 py-1">{ex.tempo || "-"}</td>
                  <td className="text-center px-1 py-1">{ex.rest || "-"}</td>
                  <td className="px-1 py-1">
                    {ex.equipment?.length > 0
                      ? ex.equipment.join(", ")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {exercises.some((ex) => ex.coaching_cue || ex.modification) && (
            <div className="mt-1 space-y-0.5">
              {exercises.map((ex, i) => {
                if (!ex.coaching_cue && !ex.modification) return null;
                return (
                  <p key={i} className="text-[10px] leading-tight">
                    <span className="font-medium">{ex.exercise_name}:</span>
                    {ex.coaching_cue && ` ${ex.coaching_cue}`}
                    {ex.modification && (
                      <span className="text-amber-700">
                        {" "}
                        [Mod: {ex.modification}]
                      </span>
                    )}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HomeMiniSection({
  exercises,
  label,
}: {
  exercises: Exercise[];
  label: string;
}) {
  if (exercises.length === 0) return null;
  return (
    <p className="text-xs leading-snug">
      <span className="font-medium">{label}: </span>
      {exercises.map((ex, i) => (
        <span key={i}>
          {ex.exercise_name} ({ex.sets}&times;{ex.reps})
          {i < exercises.length - 1 ? ", " : ""}
        </span>
      ))}
    </p>
  );
}
