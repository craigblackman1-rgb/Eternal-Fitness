"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconChevronLeft, IconCheckCircle, IconTriangleAlert } from "@/components/icons";
import { NewUpdateClient } from "../../new/NewUpdateClient";
import type { ReviewDecision } from "@/types";
import type { AttendanceFacts, PbFact, BelowBestFact } from "@/lib/block-review-facts";

/* ── S8 — Block review & update client shell (design-systems v3/09-update-
   review.html). One scroll: facts, Esther's internal decision, the email —
   matching schedule/triage/page.tsx's V3 tailwind idiom (rounded-surface /
   rounded-nested / rounded-control, CSS-var colours) rather than the older
   shadcn HubCard chrome the embedded composer still uses below. Per RULES.md
   rule 2 ("queue before record") and the governing constraint, nothing here
   is a blank box: every fact panel is computed server-side and passed in —
   see page.tsx and lib/block-review-facts.ts. */

const DECISIONS: { key: ReviewDecision; title: string; sub: string }[] = [
  { key: "continue", title: "Continue", sub: "Block 3 runs as planned" },
  { key: "adjust", title: "Adjust", sub: "Next block needs changes first" },
  { key: "restart", title: "Restart", sub: "Go back to an earlier point" },
];

interface NextBlockInfo {
  blockNumber: number;
  sessionCount: number;
  startDateLabel: string | null;
}

interface BlockReviewClientProps {
  clientNumber: number;
  clientName: string;
  defaultEmail: string;
  currentUserName: string;
  block: { id: string; blockNumber: number; status: string };
  nextBlock: NextBlockInfo | null;
  attendance: AttendanceFacts;
  pbsThisBlock: PbFact[];
  belowBest: BelowBestFact[];
  rulesInEffect: { id: string; text: string }[];
}

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function firstName(name: string): string {
  return name.split(" ")[0];
}

export function BlockReviewClient({
  clientNumber,
  clientName,
  defaultEmail,
  currentUserName,
  block,
  nextBlock,
  attendance,
  pbsThisBlock,
  belowBest,
  rulesInEffect,
}: BlockReviewClientProps) {
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [note, setNote] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionSaved, setDecisionSaved] = useState(false);

  // Seed the email's sections from the facts above. Attendance and "what's
  // next" are computable, so they're pre-filled; the big win, highlights and
  // worth-saying are the interpretive layer no query can produce — left
  // blank for Esther to write, exactly as the mockup's design notes call for.
  const attendanceHtml = attendance.bookedCount === 0
    ? ""
    : attendance.isFullAttendance
      ? `<p>You made every one of your ${attendance.bookedCount} session${attendance.bookedCount === 1 ? "" : "s"} this block, ${attendance.dateRangeLabel} — nothing missed, nothing rearranged.</p>`
      : `<p>You completed ${attendance.completedCount} of your ${attendance.bookedCount} booked session${attendance.bookedCount === 1 ? "" : "s"} this block, ${attendance.dateRangeLabel}${attendance.cancelledCount > 0 ? `, with ${attendance.cancelledCount} cancelled` : ""}.</p>`;

  const whatsNextHtml = nextBlock
    ? `<p>Block ${nextBlock.blockNumber} ${nextBlock.startDateLabel ? `starts ${nextBlock.startDateLabel}` : "is set up"}${nextBlock.sessionCount > 0 ? ` — ${nextBlock.sessionCount} session${nextBlock.sessionCount === 1 ? "" : "s"} planned` : ""}.</p>`
    : "";

  async function saveDecision(): Promise<void> {
    if (!decision || note.trim().length === 0) {
      setDecisionError("Choose a decision and add a note above before continuing — client_reviews will not save without both.");
      throw new Error("Record your call above first — a decision and a note are both required.");
    }
    setDecisionError(null);
    if (decisionSaved) return; // already recorded earlier in this visit — don't double-insert
    const res = await fetch(`/api/clients/${clientNumber}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note: note.trim(), recorded_by_name: currentUserName || "Staff" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to record the review decision");
    setDecisionSaved(true);
  }

  return (
    <div className="w-full max-w-[1680px] mx-auto space-y-3.5">
      <Link
        href={`/hub/clients/${clientNumber}`}
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-body)] hover:text-[var(--color-ink)] transition-colors -ml-2 px-2 py-0.5"
      >
        <IconChevronLeft className="w-4 h-4" />
        {clientName}
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3.5">
        <div className="w-[52px] h-[52px] rounded-pill bg-rose/10 text-[var(--rose-text)] flex items-center justify-center text-[17px] font-bold shrink-0">
          {initials(clientName)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="m-0 text-[25px] font-bold tracking-tight text-[var(--color-ink)]">
              {block.status === "complete" ? `Block ${block.blockNumber} is complete` : `Block ${block.blockNumber} review`}
            </h1>
            <span
              className={cn(
                "inline-flex items-center h-[21px] px-2.5 rounded-pill border text-[11.5px] font-semibold",
                attendance.isFullAttendance
                  ? "bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--status-success-text)]"
                  : "bg-[var(--status-warning-bg)] border-[var(--status-warning-border)] text-[var(--status-warning-text)]",
              )}
            >
              {attendance.completedCount} of {attendance.bookedCount} session{attendance.bookedCount === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-[var(--color-body)]">
            {clientName} · {attendance.dateRangeLabel}
            {nextBlock && (
              <>
                {" "}· {firstName(clientName)}&apos;s next block (Block {nextBlock.blockNumber})
                {nextBlock.sessionCount > 0 ? ` already has ${nextBlock.sessionCount} sessions` : " is set up"}
                {nextBlock.startDateLabel ? ` from ${nextBlock.startDateLabel}` : ""}
              </>
            )}
          </p>
        </div>
      </div>

      {/* 1. This block, in facts */}
      <section className="bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden">
        <div className="flex items-center gap-2.5 py-2.5 px-4 border-b border-[var(--hub-border)]">
          <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">This block, in facts</h2>
          <span className="text-xs text-[var(--color-muted-text)]">Pulled from her sessions and set logs — nothing here is typed</span>
        </div>
        <div className="p-4 space-y-3">
          <FactCard tone="teal" title="Attendance" source="from sessions">
            <div className="flex flex-wrap gap-4 mb-1.5">
              <Stat value={attendance.completedCount} label={`of ${attendance.bookedCount} booked`} />
              <Stat value={attendance.cancelledCount} label="cancelled" />
            </div>
            {attendance.cancelledCount === 0 ? (
              <p className="m-0 text-[13px] text-[var(--color-muted-text)]">
                No session in this block carries a cancellation — a clean run, nothing to explain away.
              </p>
            ) : (
              <ul className="m-0 pl-4 text-[13px] text-[var(--color-muted-text)] space-y-0.5">
                {attendance.cancelledSessions.map((s, i) => (
                  <li key={i}>
                    {s.scheduledAt ? new Date(s.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Undated"}
                    {s.reason ? ` — ${s.reason}` : ""}
                  </li>
                ))}
              </ul>
            )}
            {!attendance.isFullAttendance && attendance.cancelledCount === 0 && (
              <p className="m-0 mt-1.5 text-[13px] text-[var(--color-muted-text)]">
                {attendance.bookedCount - attendance.completedCount} booked session{attendance.bookedCount - attendance.completedCount === 1 ? "" : "s"} in this block never logged as completed.
              </p>
            )}
          </FactCard>

          <FactCard tone="teal" title="Personal bests this block" source="from set logs">
            {pbsThisBlock.length === 0 ? (
              <p className="m-0 text-[13px] text-[var(--color-muted-text)]">
                Nothing was logged inside {attendance.dateRangeLabel} that beat an all-time best, so there is nothing to pull in here automatically. If she hit anything worth naming, it needs writing in from memory or the paper log.
              </p>
            ) : (
              <ul className="m-0 pl-4 text-[13px] text-[var(--color-ink)] space-y-0.5">
                {pbsThisBlock.map((pb, i) => (
                  <li key={i}>
                    <b className="font-semibold">{pb.exercise}</b> — {pb.weightKg}kg{pb.repCount ? ` × ${pb.repCount}` : ""} ({pb.achievedAtLabel})
                  </li>
                ))}
              </ul>
            )}
          </FactCard>

          <FactCard tone="amber" title="Still below her best" source="from set logs">
            {belowBest.length === 0 ? (
              <p className="m-0 text-[13px] text-[var(--color-muted-text)]">
                Nothing is currently logging below its all-time best.
              </p>
            ) : (
              <>
                <p className="m-0 text-[13px] text-[var(--color-ink)]">
                  {belowBest.map((b, i) => (
                    <span key={b.exercise}>
                      <b className="font-semibold">{b.exercise}</b>
                      {i < belowBest.length - 2 ? ", " : i === belowBest.length - 2 ? " and " : ""}
                    </span>
                  ))}
                  {" "}{belowBest.length === 1 ? "is" : "are"} still logging below {belowBest.length === 1 ? "its" : "their"} all-time best.
                </p>
                <p className="m-0 mt-1.5 text-[13px] text-[var(--color-muted-text)]">
                  She has not yet logged a session that beats it.
                </p>
              </>
            )}
          </FactCard>

          <FactCard tone="amber" title="Rules in effect" source="from her health record">
            {rulesInEffect.length === 0 ? (
              <p className="m-0 text-[13px] text-[var(--color-muted-text)]">No standing training rules on file.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {rulesInEffect.map((r) => (
                  <span key={r.id} className="inline-flex items-center h-[25px] px-2.5 rounded-pill bg-[var(--hub-hover)] border border-[var(--hub-border)] text-[12.5px] text-[var(--color-ink)]">
                    {r.text}
                  </span>
                ))}
              </div>
            )}
          </FactCard>
        </div>
      </section>

      {/* 2. Your call */}
      <section className="bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden">
        <div className="flex items-center gap-2.5 py-2.5 px-4 border-b border-[var(--hub-border)]">
          <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">Your call</h2>
          <span className="text-xs text-[var(--color-muted-text)]">Internal only · {firstName(clientName)} never sees this</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Block decision">
            {DECISIONS.map((d) => {
              const selected = decision === d.key;
              return (
                <label
                  key={d.key}
                  className={cn(
                    "flex-1 min-w-[150px] flex items-center gap-2.5 p-3 rounded-nested border cursor-pointer transition-colors",
                    selected ? "border-rose bg-rose/5 shadow-[inset_0_0_0_1px_var(--color-rose)]" : "border-[var(--hub-border)] hover:bg-[var(--hub-hover)]",
                  )}
                >
                  <input
                    type="radio"
                    name="decision"
                    value={d.key}
                    checked={selected}
                    onChange={() => setDecision(d.key)}
                    className="accent-rose w-[15px] h-[15px] shrink-0"
                  />
                  <span>
                    <span className={cn("block text-[13.5px] font-bold", selected ? "text-[var(--rose-text)]" : "text-[var(--color-ink)]")}>{d.title}</span>
                    <span className="block text-xs text-[var(--color-muted-text)] mt-px">{d.sub}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <div>
            <label htmlFor="review-note" className="block text-[13px] font-semibold text-[var(--color-ink)] mb-1.5">
              Why <span className="text-[var(--rose-text)] font-bold">*</span>
            </label>
            <textarea
              id="review-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A sentence is enough — this is the record of why you made this call, not client copy."
              className="w-full min-h-[62px] border border-[var(--hub-field-border)] rounded-control-sm px-2.5 py-2 text-[13px] font-[inherit] bg-white text-[var(--color-ink)] resize-y focus:outline-none focus:border-rose focus:shadow-[0_0_0_3px_rgba(193,131,159,.3)]"
            />
            <p className="mt-1.5 text-[13px] text-[var(--color-muted-text)]">
              Required — client_reviews will not save a decision without a reason attached to it.
            </p>
          </div>
          {decisionSaved && (
            <div className="flex items-center gap-2 text-[12.5px] text-[var(--status-success-text)]">
              <IconCheckCircle className="w-4 h-4" />
              Decision recorded.
            </div>
          )}
          {decisionError && (
            <div className="flex items-start gap-2 text-[12.5px] text-[var(--status-danger)]">
              <IconTriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
              {decisionError}
            </div>
          )}
        </div>
      </section>

      {/* 3. The update she'll receive — embeds the existing composer, seeded
          with the facts above rather than starting from the chat/blank box. */}
      <NewUpdateClient
        clientNumber={clientNumber}
        clientName={clientName}
        defaultEmail={defaultEmail}
        defaultEmailSource="the client record"
        embedded
        initialDraft={{
          subject: "Your last block with me 🏋️",
          blockNumber: block.blockNumber,
          sections: {
            attendanceSection: attendanceHtml,
            bigWinSection: "",
            highlightsSection: "",
            whatsNextSection: whatsNextHtml,
            worthSayingSection: "",
          },
        }}
        onBeforeSubmit={saveDecision}
        primarySendLabel="Save the review & send"
      />
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="text-[12.5px] text-[var(--color-body)]">
      <b className="block text-[17px] font-extrabold text-[var(--color-ink)] tracking-tight tabular-nums">{value}</b>
      {label}
    </span>
  );
}

function FactCard({ tone, title, source, children }: { tone: "teal" | "amber"; title: string; source: string; children: React.ReactNode }) {
  const toneBorder = tone === "teal" ? "border-t-teal" : "border-t-[var(--status-warning)]";
  return (
    <div className={cn("border border-[var(--hub-border)] border-t-[3px] rounded-nested overflow-hidden", toneBorder)}>
      <div className={cn("flex items-center gap-2 px-3 py-2 text-[10.5px] font-extrabold uppercase tracking-wider",
        tone === "teal" ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--status-warning-bg)] text-[var(--color-amber-text)]")}>
        {title}
        <span className="ml-auto normal-case font-semibold text-[11px] tracking-normal bg-white/70 border border-[var(--hub-border)] rounded-pill px-2 py-px text-[var(--color-muted-text)]">{source}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
