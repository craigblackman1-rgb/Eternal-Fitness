import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function PlanNewProgrammePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, name, client_number, sessions_remaining, sessions_purchased, active_program_id",
    )
    .eq("client_number", parseInt(params.id))
    .single();

  if (!client) notFound();

  const initials = client.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Remaining sessions badge
  let remainingBadge: string;
  if (client.sessions_purchased == null) {
    remainingBadge = "Ongoing";
  } else {
    remainingBadge = `${client.sessions_remaining ?? 0} of ${client.sessions_purchased} remaining`;
  }

  // Active programme name (only if one exists)
  let activeProgrammeName: string | null = null;
  if (client.active_program_id) {
    const { data: program } = await supabase
      .from("programs")
      .select("name")
      .eq("id", client.active_program_id)
      .single();
    activeProgrammeName = program?.name ?? null;
  }

  return (
    <>
      <style>{`
        .pn-choice { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .pn-choice-card {
          border: 1px solid var(--hub-border);
          border-radius: var(--r-nested);
          background: var(--hub-card);
          padding: 20px;
          cursor: pointer;
          transition: border-color .12s, box-shadow .12s;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 0;
          text-decoration: none;
          color: inherit;
        }
        .pn-choice-card:hover { border-color: var(--color-rose); }
        .pn-choice-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--r-control);
          display: grid;
          place-items: center;
          margin-bottom: 12px;
          flex-shrink: 0;
        }
        .pn-choice-icon.rose { background: var(--status-primary-bg); color: var(--color-rose); }
        .pn-choice-icon.teal { background: var(--status-success-bg); color: var(--color-teal); }
        .pn-choice-icon.amber { background: var(--status-warning-bg); color: var(--status-warning); }
        .pn-choice-k { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: var(--color-muted-text); }
        .pn-choice-t { margin: 5px 0 6px; font-size: 15px; font-weight: 700; color: var(--color-ink); line-height: 1.3; }
        .pn-choice-s { font-size: 13px; color: var(--color-body); margin: 0; line-height: 1.5; }
        .pn-choice-hint { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--hub-border); font-size: 12px; color: var(--color-muted-text); }
        .pn-choice-hint b { color: var(--color-ink); font-weight: 600; }
        .pn-choice-actions { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
        .pn-process { display: flex; align-items: stretch; gap: 0; padding: 16px 0; }
        .pn-process-step { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0 12px; position: relative; }
        .pn-process-step + .pn-process-step::before { content: ''; position: absolute; left: -8px; top: 14px; width: 16px; height: 1px; background: var(--hub-border); }
        .pn-process-num {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: var(--status-primary-bg);
          color: var(--color-rose);
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 8px;
          flex-shrink: 0;
        }
        .pn-process-label { font-size: 12.5px; font-weight: 600; color: var(--color-ink); margin-bottom: 2px; }
        .pn-process-desc { font-size: 11.5px; color: var(--color-muted-text); line-height: 1.4; }
        .pn-current {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: var(--r-nested);
          background: var(--hub-hover);
          border: 1px solid var(--hub-border);
          font-size: 13px;
          color: var(--color-body);
        }
        .pn-current b { color: var(--color-ink); font-weight: 600; }
        .pn-current-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--r-control-sm);
          display: grid;
          place-items: center;
          background: var(--status-primary-bg);
          color: var(--color-rose);
          flex-shrink: 0;
          font-size: 14px;
        }
        .pn-hdr { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 11px; }
        .pn-hdr-av {
          width: 52px;
          height: 52px;
          border-radius: 9999px;
          flex-shrink: 0;
          background: var(--status-primary-bg);
          color: var(--color-rose);
          display: grid;
          place-items: center;
          font-size: 17px;
          font-weight: 700;
        }
        .pn-hdr-main { min-width: 0; flex: 1; }
        .pn-hdr-name { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
        .pn-hdr-name h1 { margin: 0; font-size: 25px; font-weight: 700; letter-spacing: -.015em; color: var(--color-ink); }
        .pn-hdr-sub { margin: 3px 0 0; font-size: 13px; color: var(--color-body); }
        .pn-bdg { display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 9px; border-radius: 9999px; font-size: 11.5px; font-weight: 600; background: var(--status-primary-bg); color: var(--color-rose); border: 1px solid var(--status-primary-border); }
        @media (max-width: 1080px) { .pn-choice { grid-template-columns: 1fr; } }
      `}</style>

      <div className="max-w-[1100px] mx-auto">
        {/* Back link */}
        <Link
          href={`/hub/clients/${client.client_number}`}
          className="inline-flex items-center gap-1 text-[12.5px] text-[var(--color-body)] hover:text-[var(--color-ink)] no-underline mb-[7px]"
        >
          &#8249; {client.name}
        </Link>

        {/* Header */}
        <div className="pn-hdr">
          <div className="pn-hdr-av">{initials}</div>
          <div className="pn-hdr-main">
            <div className="pn-hdr-name">
              <h1>Plan the next programme</h1>
              <span className="pn-bdg">{remainingBadge}</span>
            </div>
            <p className="pn-hdr-sub">
              {client.name} — planning the next programme
            </p>
          </div>
        </div>

        {/* SECTION 1: Three choice cards */}
        <div className="sec mb-[14px]">
          <div className="sec-hd">
            <h2>How do you want to build it?</h2>
          </div>
          <div className="sec-body">
            <div className="pn-choice">
              {/* 1. Plan Agent */}
              <Link
                href={`/hub/clients/${client.client_number}/plan-agent`}
                className="pn-choice-card"
              >
                <div className="pn-choice-icon rose">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h2v2a4 4 0 0 0 8 0v-2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4Z" />
                    <circle cx="9" cy="10" r="1" fill="currentColor" />
                    <circle cx="15" cy="10" r="1" fill="currentColor" />
                  </svg>
                </div>
                <span className="pn-choice-k">AI-assisted</span>
                <p className="pn-choice-t">Build with the Plan Agent</p>
                <p className="pn-choice-s">
                  AI drafts the programme from {client.name}&apos;s profile,
                  health rules and training history. You review and adjust before
                  anything goes live.
                </p>
                <p className="pn-choice-hint">
                  <b>Best when</b> starting fresh, or the client&apos;s needs
                  have shifted since the last block.
                </p>
                <div className="pn-choice-actions">
                  <span className="btn btn-primary btn-sm">
                    Open Plan Agent
                  </span>
                </div>
              </Link>

              {/* 2. Programme template */}
              <Link
                href={`/hub/programs?client=${client.client_number}`}
                className="pn-choice-card"
              >
                <div className="pn-choice-icon teal">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                </div>
                <span className="pn-choice-k">From a programme</span>
                <p className="pn-choice-t">Start from a programme</p>
                <p className="pn-choice-s">
                  Apply or adapt an existing programme from the library or
                  another client&apos;s. You can also import a written plan
                  &mdash; paste text or a spreadsheet.
                </p>
                <p className="pn-choice-hint">
                  <b>Best when</b> the plan already exists on paper or
                  you&apos;re reusing something that worked.
                </p>
                <div className="pn-choice-actions">
                  <span className="btn btn-outline btn-sm">
                    Browse programmes
                  </span>
                  <Link
                    href="/hub/programs/import"
                    className="btn btn-outline btn-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Import a plan
                  </Link>
                </div>
              </Link>

              {/* 3. Hand-build */}
              <Link
                href={`/hub/clients/${client.client_number}/add-workout`}
                className="pn-choice-card"
              >
                <div className="pn-choice-icon amber">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
                  </svg>
                </div>
                <span className="pn-choice-k">Manual</span>
                <p className="pn-choice-t">Hand-build from workouts</p>
                <p className="pn-choice-s">
                  Compose sessions from workout templates and the exercise
                  library. Full control over every set, rep and rest period.
                </p>
                <p className="pn-choice-hint">
                  <b>Best when</b> the work is one-off or highly bespoke
                  &mdash; rehab progressions, event prep, or a unique programme
                  shape.
                </p>
                <div className="pn-choice-actions">
                  <span className="btn btn-outline btn-sm">
                    Build workouts
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* SECTION 2: What happens next */}
        <div className="sec mb-[14px]">
          <div className="sec-hd">
            <h2>What happens next</h2>
          </div>
          <div className="sec-body">
            <div className="pn-process">
              <div className="pn-process-step">
                <div className="pn-process-num">1</div>
                <div className="pn-process-label">Draft</div>
                <div className="pn-process-desc">
                  The programme is built &mdash; by AI, from a template, or by
                  hand.
                </div>
              </div>
              <div className="pn-process-step">
                <div className="pn-process-num">2</div>
                <div className="pn-process-label">You review</div>
                <div className="pn-process-desc">
                  In the builder: week bands, exercise swaps, coaching notes.
                  Nothing goes live until you confirm.
                </div>
              </div>
              <div className="pn-process-step">
                <div className="pn-process-num">3</div>
                <div className="pn-process-label">Apply</div>
                <div className="pn-process-desc">
                  The programme lands on {client.name}&apos;s record. The queue
                  takes over &mdash; next session, next slot.
                </div>
              </div>
            </div>

            {/* Current programme note — only when an active programme exists */}
            {activeProgrammeName && (
              <div className="pn-current">
                <div className="pn-current-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  Replaces the current programme <b>{activeProgrammeName}</b>{" "}
                  when applied. History is kept.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
