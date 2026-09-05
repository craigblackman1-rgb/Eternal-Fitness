"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HubCard, HubCardHeader, EmptyState } from "@/components/hub";
import { HubAccordion, HubAccordionItem } from "@/components/hub/HubAccordion";
import { HubAlert } from "@/components/hub/HubAlert";
import { IconChevronLeft, IconCheckCircle, IconTriangleAlert, IconClock, IconHeart, IconClipboardList, IconRefreshCw } from "@/components/icons";
import type { DBClient, DBBlock, DBClientReview, ReviewDecision } from "@/types";
import type { SessionPotBreakdown } from "@/lib/session-pot";
import type { ComplianceFlags } from "@/lib/compliance";
import { formatFrequency } from "@/types";

interface ReviewFlowClientProps {
  client: DBClient;
  sessions: any[];
  activeBlock: DBBlock | undefined;
  pot: SessionPotBreakdown;
  completedSessions: { id: string; name: string; scheduled_at: string | null; position: string }[];
  unreviewedCancellations: any[];
  lapsedSessions: any[];
  complianceFlags: ComplianceFlags;
  reviews: DBClientReview[];
  extensionHistory: { from: string; to: string; at: string; reason?: string }[];
  pbsCount: number;
  hasDeliveredSessions: boolean;
  chronologicalTotal: number;
  blockExpiryDate: string | null;
  clientNumber: number;
  currentUserName: string;
}

const STEPS = ["Progress", "Outstanding", "Position", "Health check-in", "Decision"] as const;

const DECISIONS: Record<ReviewDecision, { label: string; desc: string; tone: string }> = {
  continue: {
    label: "Continue as is",
    desc: "No changes to the plan. Confirms things are on track and closes this review.",
    tone: "success",
  },
  adjust: {
    label: "Adjust the programme",
    desc: "Something needs to change — equipment, intensity, or a specific exercise — without starting over.",
    tone: "primary",
  },
  restart: {
    label: "Start a new programme",
    desc: "What has been delivered no longer fits — record the decision and set up a new programme manually.",
    tone: "warning",
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

function firstName(name: string): string {
  return name.split(" ")[0];
}

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDeliveryLabel(mode: string | null): string {
  if (!mode) return "—";
  return mode === "studio_1to1" ? "Studio 1:1" : mode === "home_training" ? "Home training" : mode;
}

export function ReviewFlowClient({
  client,
  sessions,
  activeBlock,
  pot,
  completedSessions,
  unreviewedCancellations,
  lapsedSessions,
  complianceFlags,
  reviews,
  extensionHistory,
  pbsCount,
  hasDeliveredSessions,
  chronologicalTotal,
  blockExpiryDate,
  clientNumber,
  currentUserName,
}: ReviewFlowClientProps) {
  const [step, setStep] = useState(1);
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedReview, setSavedReview] = useState<DBClientReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastReview = reviews[0] ?? null;

  const deliveryMode = (client as any).delivery_mode as string | null;
  const profile = client.profile;
  const frequency = profile?.logistics?.frequency;
  const medications = profile?.health?.medications ?? [];
  const conditions = profile?.health?.conditions ?? [];
  const gpClearanceRequired = !!profile?.health?.gp_clearance_required;
  const gpClearanceObtained = !!profile?.health?.gp_clearance;
  const annualReviewDue = client.annual_review_due_date;
  const annualOverdue = annualReviewDue ? new Date(annualReviewDue) < new Date() : false;
  const daysOverdue = annualOverdue ? daysBetween(annualReviewDue!, new Date().toISOString().split("T")[0]) : 0;

  const canRecord = decision !== null && note.trim().length > 0;

  async function handleRecord() {
    if (!canRecord || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientNumber}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          note: note.trim(),
          recorded_by_name: currentUserName || "Staff",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to record decision");
      }
      const data: DBClientReview = await res.json();
      setSavedReview(data);
      setSaved(true);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (saved && savedReview) {
    return <ConfirmationPanel review={savedReview} previousReviews={reviews} client={client} decision={decision!} clientNumber={clientNumber} />;
  }

  return (
    <div className="space-y-4 max-w-[900px] mx-auto">
      {/* Back link */}
      <Link
        href={`/hub/clients/${clientNumber}`}
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-nested px-2 py-0.5 -ml-2"
      >
        <IconChevronLeft className="w-4 h-4" />
        Back to {client.name}
      </Link>

      {/* Page header */}
      <div className="flex items-center gap-3.5">
        <div className="w-[44px] h-[44px] rounded-pill bg-rose/10 text-rose flex items-center justify-center text-[15px] font-bold shrink-0">
          {initials(client.name)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[22px] font-bold text-foreground tracking-tight">{client.name}</h1>
            {client.display_code && (
              <span className="text-[12.5px] text-muted-foreground font-mono">#{client.display_code}</span>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {formatDeliveryLabel(deliveryMode)}
            {frequency ? <> · {formatFrequency(frequency)}</> : null}
          </p>
        </div>
      </div>

      {/* Last review context strip */}
      <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground p-2.5 bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-nested">
        <IconClock className="w-[15px] h-[15px] shrink-0 text-muted-foreground" />
        {lastReview ? (
          <span>
            Last reviewed <span className="font-semibold text-foreground">{formatDate(lastReview.created_at)}</span> — decision:{" "}
            <span className="font-semibold text-foreground">{DECISIONS[lastReview.decision]?.label ?? lastReview.decision}</span>
          </span>
        ) : (
          <span>
            <span className="font-semibold text-foreground">No previous review on file</span> — this is the first check-in for {firstName(client.name)}.
          </span>
        )}
      </div>

      {/* Stepper */}
      <Stepper steps={STEPS} current={step} onStepClick={(n) => { if (n < step) setStep(n); }} />

      {/* Step panels */}
      {step === 1 && (
        <StepPanel onContinue={() => setStep(2)}>
          <ProgressStep client={client} completedSessions={completedSessions} hasDeliveredSessions={hasDeliveredSessions} totalSessions={chronologicalTotal || client.sessions_purchased || 0} pbsCount={pbsCount} />
        </StepPanel>
      )}

      {step === 2 && (
        <StepPanel onBack={() => setStep(1)} onContinue={() => setStep(3)}>
          <OutstandingStep
            complianceFlags={complianceFlags}
            unreviewedCancellations={unreviewedCancellations}
            lapsedSessions={lapsedSessions}
            hasDeliveredSessions={hasDeliveredSessions}
            clientName={client.name}
            annualReviewDateSet={!!annualReviewDue}
          />
        </StepPanel>
      )}

      {step === 3 && (
        <StepPanel onBack={() => setStep(2)} onContinue={() => setStep(4)}>
          <PositionStep
            pot={pot}
            blockExpiryDate={blockExpiryDate}
            extensionHistory={extensionHistory}
            hasDeliveredSessions={hasDeliveredSessions}
            unreviewedCount={unreviewedCancellations.length}
          />
        </StepPanel>
      )}

      {step === 4 && (
        <StepPanel onBack={() => setStep(3)} onContinue={() => setStep(5)}>
          <HealthStep
            client={client}
            medications={medications}
            conditions={conditions}
            gpClearanceRequired={gpClearanceRequired}
            gpClearanceObtained={gpClearanceObtained}
            annualReviewDue={annualReviewDue}
            annualOverdue={annualOverdue}
            daysOverdue={daysOverdue}
            hasPriorReview={!!lastReview}
            lastReviewDate={lastReview?.created_at ?? null}
          />
        </StepPanel>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <HubCard>
            <HubCardHeader
              icon={<IconCheckCircle className="w-4 h-4" />}
              title="Decision"
              subtitle="Required — this is what closes the review"
            />
            <div className="space-y-4">
              {/* Decision options */}
              <div className="space-y-2" role="radiogroup" aria-label="Review decision">
                {(Object.keys(DECISIONS) as ReviewDecision[]).map((key) => {
                  const d = DECISIONS[key];
                  const selected = decision === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDecision(key)}
                      className={cn(
                        "flex items-start gap-3 p-3.5 border rounded-nested bg-[var(--hub-card)] cursor-pointer transition-colors w-full text-left",
                        selected
                          ? "border-rose bg-rose/5"
                          : "border-[var(--hub-border)] hover:border-[var(--hub-field-hover)]",
                      )}
                      role="radio"
                      aria-checked={selected}
                    >
                      <input
                        type="radio"
                        name="decision"
                        value={key}
                        checked={selected}
                        onChange={() => setDecision(key)}
                        className="mt-0.5 accent-rose w-4 h-4 shrink-0"
                        tabIndex={-1}
                      />
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-bold text-foreground">{d.label}</span>
                        <span className="block text-[12.5px] text-muted-foreground mt-0.5">{d.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Consequence box */}
              <div
                className={cn(
                  "rounded-nested p-3.5 border flex gap-2.5",
                  decision === "continue"
                    ? "bg-[var(--status-success-bg)] border-[var(--status-success-border)]"
                    : decision === "adjust"
                      ? "bg-rose/5 border-rose/20"
                      : decision === "restart"
                        ? "bg-amber/5 border-amber/20"
                        : "bg-[var(--hub-hover)] border-[var(--hub-border)]",
                )}
              >
                <div className="shrink-0">
                  {decision === "continue" && <IconCheckCircle className="w-4 h-4 text-[var(--status-success-text)]" />}
                  {decision === "adjust" && <IconClipboardList className="w-4 h-4 text-rose" />}
                  {decision === "restart" && <IconRefreshCw className="w-4 h-4 text-amber" />}
                  {!decision && <IconClock className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-foreground">
                    {decision ? `${DECISIONS[decision].label} — selected` : "Choose one to see what happens next."}
                  </p>
                  <p className="text-[12.5px] text-foreground/75 mt-0.5 leading-relaxed">
                    {decision === "continue" && `Recorded as on track for ${firstName(client.name)}. No follow-up task is created.`}
                    {decision === "adjust" && `Takes you to Add a workout for ${firstName(client.name)} next, to bring in the change — the same short flow used to add any workout, nothing else to set up first.`}
                    {decision === "restart" && `Records the decision to start fresh. The current programme stays open — you end it and set up the new one from Add a workout, which is available on the next screen.`}
                    {!decision && "Nothing is recorded until you confirm below."}
                  </p>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Note <span className="font-normal normal-case tracking-normal text-muted-foreground">— required, shown wherever this decision is visible</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What did you see, and why this decision — e.g. hitting all PBs, keep as is until week 12 review…"
                  className="w-full min-h-[76px] border border-[var(--hub-field-border)] rounded-lg px-3 py-2.5 text-[13px] font-[inherit] bg-[var(--hub-card)] text-foreground resize-y focus:outline-none focus:border-rose focus:shadow-[0_0_0_3px_rgba(193,131,159,.3)]"
                />
              </div>

              {error && (
                <HubAlert severity="danger" title={error} />
              )}
            </div>
          </HubCard>

          {/* Step actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[13px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
            >
              Back
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={handleRecord}
              disabled={!canRecord || saving}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border text-[13px] font-semibold transition-colors",
                canRecord && !saving
                  ? "bg-rose border-rose text-white hover:bg-[color-mix(in_oklch,var(--rose)_82%,var(--ink))]"
                  : "bg-[var(--hub-hover)] border-[var(--hub-border)] text-muted-foreground cursor-not-allowed pointer-events-none",
              )}
            >
              {saving ? "Recording…" : "Record decision"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function Stepper({ steps, current, onStepClick }: { steps: readonly string[]; current: number; onStepClick: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => {
        const n = i + 1;
        const isOn = n === current;
        const isDone = n < current;
        return (
          <span key={s} className="contents">
            {i > 0 && <span className="w-6 h-px bg-[var(--hub-border)] shrink-0" />}
            <button
              type="button"
              onClick={() => onStepClick(n)}
              className={cn(
                "inline-flex items-center gap-2 text-[13px] font-semibold bg-transparent border-0 p-0 font-[inherit] shrink-0",
                isOn ? "text-foreground cursor-default" : isDone ? "text-foreground cursor-pointer" : "text-muted-foreground cursor-default",
              )}
            >
              <span
                className={cn(
                  "w-[26px] h-[26px] rounded-pill border grid place-items-center text-[12px] font-bold shrink-0",
                  isOn
                    ? "bg-rose border-rose text-white"
                    : isDone
                      ? "bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--status-success-text)]"
                      : "bg-[var(--hub-card)] border-[var(--hub-field-border)] text-muted-foreground",
                )}
              >
                {n}
              </span>
              {s}
            </button>
          </span>
        );
      })}
    </div>
  );
}

function StepPanel({
  children,
  onBack,
  onContinue,
}: {
  children: React.ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
}) {
  return (
    <div className="space-y-4">
      {children}
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[13px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
          >
            Back
          </button>
        )}
        <span className="flex-1" />
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-rose bg-rose text-white text-[13px] font-semibold hover:bg-[color-mix(in_oklch,var(--rose)_82%,var(--ink))] transition-colors"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

function ProgressStep({
  client,
  completedSessions,
  hasDeliveredSessions,
  totalSessions,
  pbsCount,
}: {
  client: DBClient;
  completedSessions: { id: string; name: string; scheduled_at: string | null; position: string }[];
  hasDeliveredSessions: boolean;
  totalSessions: number;
  pbsCount: number;
}) {
  return (
    <HubCard>
      <HubCardHeader
        icon={<IconClipboardList className="w-4 h-4" />}
        title="Progress"
        subtitle="Sessions delivered, PBs this period, position in programme"
      />
      <div>
        {!hasDeliveredSessions ? (
          <EmptyState
            icon={<IconClock className="w-5 h-5" />}
            title="No sessions logged yet"
            description={
              <>
                {client.name}&apos;s programme was created but nothing has been delivered yet, so there is nothing to compare against — this is not the same as &ldquo;on track&rdquo;.
              </>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 bg-[var(--hub-card)] border border-[var(--hub-border)] rounded-surface shadow-sm overflow-hidden mb-4">
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Delivered</p>
                <p className="text-base font-bold text-foreground mt-0.5 tabular-nums">{completedSessions.length}</p>
              </div>
              <div className="px-4 py-3 border-l border-[var(--hub-border)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PBs this period</p>
                <p className="text-base font-bold text-foreground mt-0.5 tabular-nums">{pbsCount}</p>
              </div>
              <div className="px-4 py-3 border-l border-[var(--hub-border)]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Position</p>
                <p className="text-[13px] font-bold text-foreground mt-0.5">Session {completedSessions.length} of {totalSessions || "?"}</p>
              </div>
            </div>

            <p className="text-[12.5px] text-muted-foreground">
              {completedSessions.length} session{completedSessions.length === 1 ? "" : "s"} delivered this period.
            </p>
          </>
        )}
      </div>
    </HubCard>
  );
}

function OutstandingStep({
  complianceFlags,
  unreviewedCancellations,
  lapsedSessions,
  hasDeliveredSessions,
  clientName,
  annualReviewDateSet,
}: {
  complianceFlags: ComplianceFlags;
  unreviewedCancellations: any[];
  lapsedSessions: any[];
  hasDeliveredSessions: boolean;
  clientName: string;
  annualReviewDateSet: boolean;
}) {
  const openCount = complianceFlags.autoOutstanding.length + unreviewedCancellations.length + lapsedSessions.length;

  return (
    <HubCard>
      <HubCardHeader
        icon={<IconTriangleAlert className="w-4 h-4" />}
        title="Outstanding"
        subtitle="Compliance actions, unreviewed cancellations, lapse-flagged sessions"
        action={openCount > 0 ? <span className="inline-grid place-items-center min-w-[20px] h-[20px] px-1.5 rounded-pill bg-amber/10 border border-amber/20 text-amber text-[11.5px] font-bold tabular-nums">{openCount}</span> : undefined}
      />
      <div className="space-y-4">
        {/* Compliance actions */}
        <SectionHeader title="Compliance actions" />
        {complianceFlags.autoOutstanding.length === 0 ? (
          <InfoLine variant={annualReviewDateSet ? "success" : "muted"}>
            {annualReviewDateSet
              ? "No outstanding compliance actions — all flags derived from stored records are clear."
              : "No outstanding compliance actions from stored records — annual review date is not set, so overdue status cannot be checked."}
          </InfoLine>
        ) : (
          <HubAccordion>
            {complianceFlags.autoOutstanding.map((action, i) => (
              <HubAccordionItem
                key={action}
                defaultOpen={i === 0}
                panel={<p className="text-[12.5px] text-foreground/75">{action}</p>}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <svg className="hub-acc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-foreground">{action}</span>
                  <span className="shrink-0 inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-pill border text-[11.5px] font-semibold bg-amber/5 border-amber/20 text-amber">
                    {action.includes("overdue") ? "Action needed" : "Pending"}
                  </span>
                </div>
              </HubAccordionItem>
            ))}
          </HubAccordion>
        )}

        {/* Unreviewed cancellations */}
        <SectionHeader title="Unreviewed cancellations" />
        {unreviewedCancellations.length > 0 ? (
          <div className="border border-amber/20 bg-amber/5 rounded-nested overflow-hidden">
            <div className="flex items-center gap-2.5 p-3">
              <div className="w-7 h-7 rounded-lg bg-[var(--hub-card)] text-amber grid place-items-center shrink-0">
                <IconTriangleAlert className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-foreground">
                  {unreviewedCancellations.length} cancellation{unreviewedCancellations.length === 1 ? "" : "s"} need a charged/free decision
                </p>
                <p className="text-[12px] text-foreground/75 mt-0.5">
                  Never guessed — each needs a human call before it can count toward the position.
                </p>
              </div>
            </div>
            <div className="bg-[var(--hub-card)] border-t border-amber/20">
              {unreviewedCancellations.map((s: any, i: number) => (
                <div key={s.id} className={cn("flex items-center gap-3 px-3.5", i < unreviewedCancellations.length - 1 && "border-b border-[var(--hub-border)]")}>
                  <span className="text-[12.5px] font-bold text-foreground w-[92px] shrink-0">
                    {s.scheduled_at ? formatDate(s.scheduled_at) : "—"}
                  </span>
                  <span className="text-[12.5px] text-muted-foreground flex-1 min-w-0">
                    {s.cancel_reason || "Outlook shows cancelled — charged/free not set by a trainer."}
                  </span>
                  <span className="inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-pill border text-[11.5px] font-semibold bg-amber/5 border-amber/20 text-amber">
                    Unreviewed
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2.5 p-3 border-t border-amber/20">
              <Link
                href="/hub/sessions/review"
                className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[12.5px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
              >
                Review these first
              </Link>
              <span className="text-[11.5px] text-muted-foreground">Opens /hub/sessions/review</span>
            </div>
          </div>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">
            No cancellations awaiting a charged/free decision{!hasDeliveredSessions ? " — sessions have not started yet" : ""}.
          </p>
        )}

        {/* Lapse-flagged sessions */}
        <SectionHeader title="Lapse-flagged sessions" />
        {lapsedSessions.length > 0 ? (
          <div className="space-y-2">
            {lapsedSessions.map((s: any) => (
              <div key={s.id} className="flex items-start gap-2.5">
                <div className="w-[26px] h-[26px] rounded-lg bg-[var(--status-danger-bg)] text-[var(--status-danger)] grid place-items-center shrink-0 mt-0.5">
                  <IconClipboardList className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-foreground">{s.scheduled_at ? formatDate(s.scheduled_at) : "—"}</p>
                  <p className="text-[12.5px] text-muted-foreground mt-0.5">
                    No outcome recorded 5+ days after the scheduled time — flagged as lapsed.
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">
            No sessions flagged as lapsed{!hasDeliveredSessions ? " — none have started yet" : ""}.
          </p>
        )}
      </div>
    </HubCard>
  );
}

function PositionStep({
  pot,
  blockExpiryDate,
  extensionHistory,
  hasDeliveredSessions,
  unreviewedCount,
}: {
  pot: SessionPotBreakdown;
  blockExpiryDate: string | null;
  extensionHistory: { from: string; to: string; at: string; reason?: string }[];
  hasDeliveredSessions: boolean;
  unreviewedCount: number;
}) {
  const effectivePurchased = pot.purchasedIsEstimate ? pot.estimatedPurchase : pot.purchased;
  const effectiveRemaining = pot.purchasedIsEstimate ? pot.estimatedRemaining : pot.remaining;
  const pctCompleted = effectivePurchased ? (pot.completed / effectivePurchased) * 100 : 0;
  const pctCharged = effectivePurchased ? (pot.chargedCancellations / effectivePurchased) * 100 : 0;
  const pctRemaining = effectivePurchased && effectiveRemaining != null ? (effectiveRemaining / effectivePurchased) * 100 : 0;
  const isExpired = blockExpiryDate ? new Date(blockExpiryDate) < new Date() : false;

  return (
    <HubCard>
      <HubCardHeader
        icon={<IconClock className="w-4 h-4" />}
        title="Position"
        subtitle={pot.purchased != null
          ? `${pot.purchased} purchased · ${pot.used} used · ${pot.remaining} remaining`
          : pot.purchasedIsEstimate
            ? `${pot.estimatedPurchase} purchased (est.) · ${pot.used} used · ${pot.estimatedRemaining} remaining (est.)`
            : `Purchased not recorded · ${pot.used} used`}
      />
      <div className="space-y-4">
        {/* Hero */}
        <div className="flex items-baseline gap-6 flex-wrap">
          <div className="flex items-baseline gap-2.5">
            <span className={cn("text-[40px] font-extrabold tracking-tight leading-none tabular-nums", !hasDeliveredSessions ? "text-muted-foreground" : "text-foreground")}>
              {pot.purchasedIsEstimate ? pot.estimatedRemaining : pot.remaining ?? "?"}
            </span>
            <span className="text-[12px] font-bold text-muted-foreground max-w-[88px] leading-tight">
              sessions remaining
            </span>
            {pot.purchasedIsEstimate && (
              <span className="text-[11px] text-muted-foreground leading-tight">est.</span>
            )}
          </div>
          <div className="flex gap-5.5 pl-5.5 border-l border-[var(--hub-border)]">
            <div>
              <div className="text-[19px] font-bold text-foreground leading-tight tabular-nums">{pot.used}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Used</div>
            </div>
            <div>
              <div className="text-[19px] font-bold text-foreground leading-tight tabular-nums">{pot.purchased ?? "—"}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Purchased{pot.purchasedIsEstimate ? " (est.)" : ""}</div>
            </div>
          </div>
        </div>

        {pot.purchasedIsEstimate && (
          <InfoLine variant="muted">
            Purchased count is not recorded on this client — the figure above is not a known value. Set it on the client record for an accurate position.
          </InfoLine>
        )}

        {!hasDeliveredSessions ? (
          <InfoLine variant="muted">
            No sessions delivered yet — nothing has been used. The number above is unearned, not a sign anything is on track.
          </InfoLine>
        ) : (effectivePurchased != null ? (
          <>
            {/* Bar */}
            <div className="flex h-3 rounded-pill overflow-hidden bg-[var(--hub-hover)] border border-[var(--hub-border)]" role="img" aria-label="Session position breakdown">
              {pctCompleted > 0 && <span className="h-full rounded-l-pill" style={{ width: `${pctCompleted}%`, backgroundColor: "var(--status-success)" }} />}
              {pctCharged > 0 && <span className="h-full" style={{ width: `${pctCharged}%`, backgroundColor: "var(--status-danger)" }} />}
              {pctRemaining > 0 && <span className="h-full rounded-r-pill" style={{ width: `${pctRemaining}%`, background: "repeating-linear-gradient(135deg,#E4E7EC 0 5px,#F2F3F6 5px 10px)" }} />}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Legend color="var(--status-success)" label="Completed" count={pot.completed} />
              {pot.chargedCancellations > 0 && <Legend color="var(--status-danger)" label="Charged cancellation" count={pot.chargedCancellations} />}
              {effectiveRemaining != null && <Legend color="repeating-linear-gradient(135deg,#E4E7EC 0 3px,#F2F3F6 3px 6px)" label="Remaining" count={effectiveRemaining} />}
            </div>
          </>
        ) : (
          <InfoLine variant="muted">
            {pot.completed} session{pot.completed === 1 ? "" : "s"} completed — purchased count is not set, so a position bar cannot be drawn.
          </InfoLine>
        ))}

        {/* Unreviewed — shown again as "not counted above" */}
        {unreviewedCount > 0 && (
          <div className="border border-amber/20 bg-amber/5 rounded-nested overflow-hidden">
            <div className="flex items-center gap-2.5 p-3">
              <div className="w-7 h-7 rounded-lg bg-[var(--hub-card)] text-amber grid place-items-center shrink-0">
                <IconTriangleAlert className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-foreground">{unreviewedCount} unreviewed — not counted above</p>
                <p className="text-[12px] text-foreground/75 mt-0.5">Excluded from Used and Remaining until a trainer marks each charged or free.</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 border-t border-amber/20">
              <Link
                href="/hub/sessions/review"
                className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[12.5px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
              >
                Review these first
              </Link>
              <span className="text-[11.5px] text-muted-foreground">Opens /hub/sessions/review</span>
            </div>
          </div>
        )}

        {/* Expiry */}
        <div className="flex items-center gap-3 pt-3.5 border-t border-[var(--hub-border)]">
          <div className={cn("w-[30px] h-[30px] rounded-lg grid place-items-center shrink-0", isExpired ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)]" : "bg-[var(--hub-hover)] text-muted-foreground")}>
            <IconClock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground">
              {blockExpiryDate
                ? isExpired
                  ? <>{formatDate(blockExpiryDate)} <span className="line-through font-normal text-muted-foreground mr-1.5">Expired</span></>
                  : <>Expires {formatDate(blockExpiryDate)}</>
                : "No expiry date set"}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {extensionHistory.length > 0
                ? <>Extended from {formatDate(extensionHistory[0].from)}{extensionHistory[0].reason ? ` (${extensionHistory[0].reason})` : ""}{extensionHistory[0].at ? ` · ${formatDate(extensionHistory[0].at)}` : ""}</>
                : "No extensions on this record."}
            </p>
          </div>
        </div>
      </div>
    </HubCard>
  );
}

function HealthStep({
  client,
  medications,
  conditions,
  gpClearanceRequired,
  gpClearanceObtained,
  annualReviewDue,
  annualOverdue,
  daysOverdue,
  hasPriorReview,
  lastReviewDate,
}: {
  client: DBClient;
  medications: any[];
  conditions: string[];
  gpClearanceRequired: boolean;
  gpClearanceObtained: boolean;
  annualReviewDue: string | null;
  annualOverdue: boolean;
  daysOverdue: number;
  hasPriorReview: boolean;
  lastReviewDate: string | null;
}) {
  return (
    <HubCard>
      <HubCardHeader
        icon={<IconHeart className="w-4 h-4" />}
        title="Health check-in"
        subtitle="Medication changes, clearance status, annual review date"
      />
      <div className="space-y-4">
        {/* Medication changes */}
        <SectionHeader title="Current medications" />
        {medications.length > 0 ? (
          <div className="space-y-2">
            {medications.map((m: any) => (
              <div key={m.id} className="flex items-start gap-2.5">
                <div className="w-[26px] h-[26px] rounded-lg bg-[var(--hub-hover)] text-muted-foreground grid place-items-center shrink-0 mt-0.5">
                  <IconHeart className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-foreground">{m.name}</p>
                  <p className="text-[12.5px] text-foreground/75 mt-0.5">
                    {m.treats ? `${m.treats} · ` : ""}{m.form} · {m.frequency}
                    {m.side_effects ? ` · Side effects: ${m.side_effects}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : !hasPriorReview ? (
          <p className="text-[12.5px] text-muted-foreground">
            No medication on file — this is {firstName(client.name)}&apos;s first review, so there is nothing to compare against yet.
          </p>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">
            No medication on file.
          </p>
        )}

        {/* Clearance */}
        <SectionHeader title="Clearance" />
        <dl className="space-y-0">
          <DataRow label="GP clearance required" value={gpClearanceRequired ? "Yes" : "No"} />
          <DataRow label="Status" value={gpClearanceObtained ? "Obtained" : "Not yet obtained"} muted={!gpClearanceObtained} />
        </dl>

        {/* Annual medical review */}
        <SectionHeader title="Annual medical review" />
        {!annualReviewDue ? (
          <InfoLine variant="muted">
            No annual review date on record — cannot judge whether one is overdue without a date.
          </InfoLine>
        ) : annualOverdue ? (
          <InfoLine variant="danger">
            Annual review was due <span className="font-bold">{formatDate(annualReviewDue)}</span> — <span className="font-bold">{daysOverdue} days overdue</span>. Treat the clearance above as stale until it happens.
          </InfoLine>
        ) : (
          <InfoLine variant="success">
            Next annual review due <span className="font-bold">{formatDate(annualReviewDue)}</span> — not yet due.
          </InfoLine>
        )}
      </div>
    </HubCard>
  );
}

function ConfirmationPanel({
  review,
  previousReviews,
  client,
  decision,
  clientNumber,
}: {
  review: DBClientReview;
  previousReviews: DBClientReview[];
  client: DBClient;
  decision: ReviewDecision;
  clientNumber: number;
}) {
  return (
    <div className="space-y-4 max-w-[900px] mx-auto">
      <Link
        href={`/hub/clients/${clientNumber}`}
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-nested px-2 py-0.5 -ml-2"
      >
        <IconChevronLeft className="w-4 h-4" />
        Back to {client.name}
      </Link>

      <HubCard>
        <div className="text-center py-10 px-8">
          <div className="w-14 h-14 rounded-pill bg-[var(--status-success-bg)] text-[var(--status-success-text)] grid place-items-center mx-auto mb-4">
            <IconCheckCircle className="w-7 h-7" />
          </div>
          <h2 className="text-[19px] font-extrabold text-foreground mb-1.5">Decision recorded</h2>
          <p className="text-[13.5px] text-muted-foreground">The review for {client.name} is closed.</p>

          <dl className="max-w-[440px] mx-auto mt-5 text-left space-y-0">
            <DataRow label="Decision" value={DECISIONS[decision]?.label ?? decision} />
            <DataRow label="Note" value={review.note} muted />
            <DataRow label="Recorded by" value={`${review.recorded_by_name} · ${formatDateTime(review.created_at)}`} muted />
          </dl>

          <div className="max-w-[440px] mx-auto mt-4 text-left text-[12.5px] text-foreground/75 bg-[var(--hub-hover)] border border-[var(--hub-border)] rounded-nested p-3 leading-relaxed">
            <span className="font-bold text-foreground">Where this shows up: </span>
            {client.name}&apos;s overview panel as the latest review outcome, and in the review history below.
            {decision !== "continue" && <> Add a workout for {firstName(client.name)} is available on the next screen if you are ready to set up the new programme.</>}
            {decision === "continue" && <> No further action is scheduled.</>}
          </div>

          <div className="flex items-center justify-center gap-2.5 mt-5">
            <Link
              href={`/hub/clients/${clientNumber}`}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-[var(--hub-field-border)] bg-[var(--hub-card)] text-[13px] font-semibold text-foreground hover:bg-[var(--hub-hover)] transition-colors"
            >
              Back to {client.name}
            </Link>
            {decision !== "continue" && (
              <Link
                href={`/hub/clients/${clientNumber}/add-workout`}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-rose bg-rose text-white text-[13px] font-semibold hover:bg-[color-mix(in_oklch,var(--rose)_82%,var(--ink))] transition-colors"
              >
                Go to Add a workout
              </Link>
            )}
          </div>
        </div>
      </HubCard>

      {/* Review history */}
      <HubCard>
        <HubCardHeader
          icon={<IconClipboardList className="w-4 h-4" />}
          title="Review history"
          subtitle="Every recorded decision for this client, most recent first"
        />
        <div>
          {/* Just-recorded review */}
          <div className="flex items-center gap-3 px-5 py-2.5 bg-[var(--status-success-bg)]">
            <span className="text-[11.5px] font-bold text-muted-foreground w-[92px] shrink-0 uppercase tracking-wider">
              {formatDate(review.created_at)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground">
                {DECISIONS[review.decision]?.label ?? review.decision}
                <span className="ml-1.5 inline-flex items-center h-[22px] px-2.5 rounded-pill bg-[var(--status-success-bg)] border border-[var(--status-success-border)] text-[11.5px] font-semibold text-[var(--status-success-text)]">
                  Just recorded
                </span>
              </p>
              {review.note && <p className="text-[12px] text-muted-foreground mt-0.5">{review.note}</p>}
            </div>
          </div>
          {/* Previous reviews */}
          {previousReviews.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-2.5 border-t border-[var(--hub-border)]">
              <span className="text-[11.5px] font-bold text-muted-foreground w-[92px] shrink-0 uppercase tracking-wider">
                {formatDate(r.created_at)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground">
                  {DECISIONS[r.decision]?.label ?? r.decision}
                </p>
                {r.note && <p className="text-[12px] text-muted-foreground mt-0.5">{r.note}</p>}
              </div>
            </div>
          ))}
          {previousReviews.length === 0 && !review && (
            <p className="text-[12.5px] text-muted-foreground p-5">No previous reviews — this is the first entry on file.</p>
          )}
        </div>
      </HubCard>
    </div>
  );
}

// ── Shared tiny components ──────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
      <span className="flex-1 h-px bg-[var(--hub-section-border)]" />
    </div>
  );
}

function InfoLine({ children, variant = "success" }: { children: React.ReactNode; variant?: "success" | "muted" | "danger" }) {
  return (
    <div className={cn("flex items-start gap-2 text-[12.5px] text-foreground/75 p-3 bg-[var(--hub-hover)] border rounded-nested",
      variant === "danger" ? "bg-[var(--status-danger-bg)] border-[var(--status-danger-border)]" : "border-[var(--hub-border)]",
    )}>
      {variant === "success" && <IconCheckCircle className="w-[15px] h-[15px] shrink-0 mt-0.5 text-[var(--status-success-text)]" />}
      {variant === "danger" && <IconTriangleAlert className="w-[15px] h-[15px] shrink-0 mt-0.5 text-[var(--status-danger)]" />}
      {variant === "muted" && <IconClock className="w-[15px] h-[15px] shrink-0 mt-0.5 text-muted-foreground" />}
      <span>{children}</span>
    </div>
  );
}

function Legend({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-foreground/75">
      <span className="w-2.5 h-2.5 rounded-control shrink-0" style={{ backgroundColor: color }} />
      {label} <span className="font-bold text-foreground tabular-nums">{count}</span>
    </span>
  );
}

function DataRow({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-3.5 py-2.5 border-b border-[var(--hub-border)] last:border-0 text-[13px]">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className={cn("m-0 text-right max-w-[60%] font-semibold", muted ? "text-muted-foreground font-medium" : "text-foreground")}>{value}</dd>
    </div>
  );
}
