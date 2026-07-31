import Link from "next/link";
import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import { HubCard, HubCardHeader } from "@/components/hub";
import { EmptyState } from "@/components/hub/EmptyState";
import {
  IconMail,
  IconCheckCircle,
  IconBarChart3,
  IconChevronRight,
  IconFileSignature,
  IconClipboardCheck,
  IconClock,
  IconFileText,
} from "@/components/icons";
import { formatUpdateTime } from "@/lib/updates/status";
import { ExerciseTrendsPanel } from "@/components/progress/ExerciseTrendsPanel";
import { buildExerciseTrends } from "@/lib/progress";
import { StatusBadge } from "@/components/hub/StatusBadge";

const KIND_LABELS: Record<string, string> = {
  terms: "Training agreement & studio terms",
  risk_assessment: "Risk assessment",
  annual_review: "Annual review",
  parq: "Health questionnaire (PAR‑Q+)",
  consent: "Consent form",
  feedback: "Client feedback",
};

function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function firstName(name: string): string {
  return name.split(" ")[0];
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function todayLong(): string {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export default async function PortalDashboardPage() {
  const session = await getPortalSessionFromCookies();
  if (!session) return null;

  const data = createPortalDataClient(session.clientId);
  const [client, signed, outstanding, updates, setLogHistory, upcomingSession] =
    await Promise.all([
      data.getClient(),
      data.getSignedDocuments(),
      data.getOutstandingDocuments(),
      data.getUpdateHistory(),
      data.getSetLogHistory(),
      data.getUpcomingSession(),
    ]);

  const exerciseTrends = buildExerciseTrends(setLogHistory.logs, setLogHistory.sessionMeta);

  const clientName = client?.name ?? "you";
  const needsSignature = outstanding.filter(
    (d) => d.requires_client_signature && d.status !== "signed",
  );
  const actionCount = needsSignature.length;
  const hasOutstanding = outstanding.length > 0;

  return (
    <div className="space-y-10">
      {/* Greeting --------------------------------------------- */}
      <section aria-labelledby="portal-welcome">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-2">
          {todayLong()}
        </p>
        <h1 id="portal-welcome" className="text-2xl font-semibold tracking-tight">
          {greeting()}, {firstName(clientName)}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Everything Esther has shared with you lives here. Take it at your own
          pace — nothing is timed, and everything saves as you go.
        </p>
      </section>

      {/* Action summary --------------------------------------- */}
      {hasOutstanding && (
        <div className="rounded-xl border border-amber/25 bg-amber/5 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <IconClock className="w-[18px] h-[18px] shrink-0 mt-0.5 text-amber" />
            <div>
              <p className="font-semibold text-sm text-amber">
                {actionCount > 0
                  ? `${actionCount} document${actionCount === 1 ? "" : "s"} need${actionCount === 1 ? "s" : ""} you`
                  : `${outstanding.length} document${outstanding.length === 1 ? "" : "s"} shared`}
              </p>
              <p className="text-sm text-foreground/75 mt-0.5">
                {actionCount > 0
                  ? `One needs your signature${outstanding.length > 1 ? " and one needs completing" : ""}.`
                  : "Nothing needs your signature right now."}{" "}
                Everything below is also in{" "}
                <Link
                  href="/portal/documents"
                  className="font-medium text-teal hover:text-teal/80 underline underline-offset-2"
                >
                  your documents
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Needs you — task cards ------------------------------- */}
      {hasOutstanding && (
        <section aria-labelledby="needs-you">
          <h2
            id="needs-you"
            className="text-lg font-semibold tracking-tight mb-1"
          >
            Needs you
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            {actionCount > 0
              ? `${outstanding.length} thing${outstanding.length === 1 ? "" : "s"}, roughly ten minutes in total. You can stop halfway and come back.`
              : "These have been shared with you — no action needed right now."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outstanding.map((doc) => {
              const needsSig =
                doc.requires_client_signature && doc.status !== "signed";
              const isParq = doc.kind === "parq";
              const hasFeedbackSections =
                doc.kind === "parq" || doc.kind === "feedback" || doc.kind === "consent";

              return (
                <HubCard key={doc.id} className="flex flex-col">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0 mt-0.5">
                      {needsSig ? (
                        <IconFileSignature className="w-5 h-5" />
                      ) : (
                        <IconClipboardCheck className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          needsSig
                            ? "border-amber/30 bg-amber/5 text-amber"
                            : "border-teal/30 bg-teal/5 text-teal"
                        }`}
                      >
                        {needsSig ? "Needs your signature" : "Shared"}
                      </span>
                      <h3 className="text-base font-semibold mt-2.5">
                        {doc.title || kindLabel(doc.kind)}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {needsSig
                          ? `Read it, then sign by typing your name.`
                          : `Read, download or print whenever you want.`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 flex flex-wrap gap-2">
                    {needsSig ? (
                      <Link
                        href={`/portal/documents/${doc.id}`}
                        className="inline-flex min-h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/90 transition-colors"
                      >
                        Read and sign
                      </Link>
                    ) : hasFeedbackSections ? (
                      <Link
                        href={`/portal/documents/${doc.id}`}
                        className="inline-flex min-h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/90 transition-colors"
                      >
                        Carry on filling it in
                      </Link>
                    ) : (
                      <Link
                        href={`/portal/documents/${doc.id}`}
                        className="inline-flex min-h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink/90 transition-colors"
                      >
                        View document
                      </Link>
                    )}
                    <Link
                      href="/portal/documents"
                      className="inline-flex min-h-10 items-center rounded-full border border-input px-4 text-sm font-medium hover:bg-accent"
                    >
                      Later
                    </Link>
                  </div>
                </HubCard>
              );
            })}
          </div>
        </section>
      )}

      {/* Your next session ------------------------------------ */}
      {upcomingSession ? (
        <section aria-labelledby="next-session">
          <h2
            id="next-session"
            className="text-lg font-semibold tracking-tight mb-1"
          >
            Your next session
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Bookings still go through Esther directly. Session booking arrives in
            the client area later this year.
          </p>

          <div className="rounded-2xl bg-ink text-white p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
                  When
                </p>
                <p className="font-semibold">
                  {formatDateLong(upcomingSession.scheduled_at)},{" "}
                  {formatTime(upcomingSession.scheduled_at)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
                  Where
                </p>
                <p className="font-semibold">The studio, Worthing</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">
                  Focus
                </p>
                <p className="font-semibold">
                  Block {upcomingSession.block_number} —{" "}
                  {upcomingSession.focus_label || upcomingSession.archetype || "Not set"}
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm text-white/80">
              Need to move it? Call or text Esther on{" "}
              <a
                href="tel:07517658128"
                className="font-semibold text-white underline underline-offset-2"
              >
                07517 658 128
              </a>
              .
            </p>
          </div>
        </section>
      ) : null}

      {/* Recently shared with you ----------------------------- */}
      <section aria-labelledby="recent-docs">
        <h2
          id="recent-docs"
          className="text-lg font-semibold tracking-tight mb-1"
        >
          Recently shared with you
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          Nothing to do with these — they are yours to read, download or print
          whenever you want.
        </p>

        {signed.length === 0 ? (
          <HubCard>
            <p className="text-sm text-muted-foreground">
              No signed documents yet. Documents you sign will appear here.
            </p>
          </HubCard>
        ) : (
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-white">
            {signed.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/portal/documents/${doc.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-off-white/60 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0 mt-0.5">
                      <IconFileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {doc.title || kindLabel(doc.kind)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Signed {formatDate(doc.signed_at || doc.client_signed_date)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-teal/30 bg-teal/5 px-2 py-0.5 text-[11px] font-semibold text-teal shrink-0">
                    <IconCheckCircle className="w-3 h-3 mr-1.5" />
                    Signed
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {signed.length > 0 && (
          <p className="mt-4">
            <Link
              href="/portal/documents"
              className="inline-flex min-h-10 items-center rounded-full border border-input px-4 text-sm font-medium hover:bg-accent"
            >
              See all documents
            </Link>
          </p>
        )}
      </section>

      {/* Tools ------------------------------------------------- */}
      <section aria-labelledby="tools">
        <h2 id="tools" className="text-lg font-semibold tracking-tight mb-1">
          Tools you can use any time
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Yours to open whenever you want. Nothing you enter is saved or sent to
          Esther.
        </p>

        <div className="rounded-2xl border border-border/60 bg-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0 mt-0.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 32 32"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <rect x="5" y="3" width="22" height="26" rx="2" />
                <line x1="9" y1="9" x2="15" y2="9" />
                <line x1="9" y1="14" x2="11" y2="14" />
                <line x1="16" y1="14" x2="18" y2="14" />
                <line x1="9" y1="19" x2="11" y2="19" />
                <line x1="16" y1="19" x2="18" y2="19" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Your daily calorie guide
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                A starting estimate of how much you need in a day, and how it
                might split across protein, carbohydrate and fat. About 3
                minutes.
              </p>
            </div>
          </div>
          <Link
            href="/portal/calorie-guide"
            className="inline-flex min-h-10 items-center rounded-full border border-input px-4 text-sm font-medium hover:bg-accent shrink-0"
          >
            Open
          </Link>
        </div>
      </section>

      {/* Coming to your client area ---------------------------- */}
      <section aria-labelledby="whats-next">
        <h2 id="whats-next" className="text-lg font-semibold tracking-tight mb-1">
          Coming to your client area
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Documents come first because they are what you need most. These are
          next, in order.
        </p>

        <ul className="grid gap-3">
          {[
            {
              label: "Sessions",
              desc: "See and reschedule your bookings",
              eta: "Autumn 2026",
            },
            {
              label: "Messages",
              desc: "Message Esther between sessions",
              eta: "Autumn 2026",
            },
            {
              label: "Your plan",
              desc: "Exercises with video, at your own pace",
              eta: "Winter 2026",
            },
            {
              label: "Payments",
              desc: "Invoices and receipts in one place",
              eta: "Winter 2026",
            },
          ].map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-white px-5 py-3.5 text-sm"
            >
              <b className="text-ink shrink-0">{item.label}</b>
              <span className="text-muted-foreground hidden sm:inline">
                — {item.desc}
              </span>
              <span className="ml-auto inline-flex items-center rounded-full border border-slate/30 bg-slate/5 px-2.5 py-0.5 text-[11px] font-semibold text-slate shrink-0">
                {item.eta}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Your progress — unchanged --------------------------- */}
      <section aria-labelledby="portal-progress">
        <HubCard>
          <HubCardHeader
            icon={<IconBarChart3 className="w-5 h-5" aria-hidden="true" />}
            title="Your progress"
            subtitle="Working weight and reps per exercise, from your logged sessions"
            color="teal"
          />
          <ExerciseTrendsPanel
            trends={exerciseTrends}
            emptyTitle="No logged sessions yet"
            emptyDescription="Once sets are logged against your training plan, your per-exercise progress will appear here."
            idPrefix="portal-exercise-trends"
          />
        </HubCard>
      </section>

      {/* Update-email history — unchanged --------------------- */}
      <section aria-labelledby="portal-updates">
        <HubCard>
          <HubCardHeader
            icon={<IconMail className="w-5 h-5" aria-hidden="true" />}
            title="Update email history"
            subtitle={`${updates.length} email${updates.length === 1 ? "" : "s"} sent`}
            color="teal"
          />
          {updates.length === 0 ? (
            <EmptyState
              icon={<IconMail className="w-7 h-7" />}
              title="No updates sent yet"
              description="When Eternal Fitness sends you a progress update, it will appear here."
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {updates.map((u) => {
                const viewable = u.status === "sent";
                const row = (
                  <>
                    <div>
                      <p className="font-medium">{u.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {u.block_number > 0 ? `Block ${u.block_number} · ` : ""}
                        {formatUpdateTime(u.sent_at)}
                        {u.opened_at ? " · Opened" : " · Not opened"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={u.status} />
                      {viewable && (
                        <IconChevronRight
                          className="w-4 h-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </>
                );
                return (
                  <li key={u.id}>
                    {viewable ? (
                      <Link
                        href={`/portal/updates/${u.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-off-white/60 rounded-lg px-2 -mx-2 transition-colors"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                        {row}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </HubCard>
      </section>
    </div>
  );
}
