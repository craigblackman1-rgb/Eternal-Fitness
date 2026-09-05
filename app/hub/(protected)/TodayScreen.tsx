import Link from "next/link";

/* ── S5 Today (design-systems v3/03-today.html) ───────────────────────────
   The entry point. Booked sessions first, then what is outstanding, then
   alerts — and every alert links to the thing you do about it, rather than
   telling you something you then have to go and find.

   This replaces a dashboard of seven browse-widgets (recent clients, recent
   blocks, this week's plan, recent check-ins…). Those answered "what has
   been happening"; this answers "what needs me". That is the whole point of
   the surface, so their removal is the design, not an omission — with one
   exception, noted at Updates due below. */

export interface TodaySession {
  time: string;
  clientName: string;
  clientNumber: number;
  focus: string | null;
}

export interface AlertRow {
  id: string;
  headline: string;
  subline?: string;
  actionLabel: string;
  href: string;
  dot: "due" | "warn";
}

export interface TaskRow {
  id: string;
  title: string;
  clientName: string | null;
  clientNumber: number | null;
  due: string | null;
  overdue: boolean;
}

const DOT: Record<string, string> = {
  due: "bg-rose",
  warn: "bg-[var(--status-warning)]",
};

function Section({
  title,
  meta,
  action,
  children,
}: {
  title: string;
  meta?: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[var(--hub-border)] rounded-surface shadow-[0_1px_2px_rgba(16,24,40,.04),0_1px_3px_rgba(16,24,40,.07)] overflow-hidden mb-3.5">
      <div className="flex items-center gap-2.5 py-2.5 px-4 border-b border-[var(--hub-border)]">
        <h2 className="m-0 text-[15px] font-bold text-[var(--color-ink)] tracking-tight">{title}</h2>
        {meta && <span className="text-xs text-[var(--color-muted)]">{meta}</span>}
        {action && (
          <Link
            href={action.href}
            className="ml-auto text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)] no-underline"
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export function TodayScreen({
  dateLabel,
  sessions,
  weekCount,
  tasks,
  alerts,
}: {
  dateLabel: string;
  sessions: TodaySession[];
  weekCount: number;
  tasks: TaskRow[];
  alerts: AlertRow[];
}) {
  return (
    <div className="max-w-[940px] mx-auto">
      <div className="flex items-baseline gap-2.5 flex-wrap mb-3.5">
        <h1 className="m-0 text-[25px] font-bold tracking-tight text-[var(--color-ink)]">Today</h1>
        <span className="text-[13px] text-[var(--color-body)]">{dateLabel}</span>
      </div>

      {/* ── Booked today ── */}
      <Section
        title="Booked today"
        meta={
          sessions.length === 0
            ? `Nothing booked · ${weekCount} this week`
            : `${sessions.length} session${sessions.length === 1 ? "" : "s"} · ${weekCount} this week`
        }
      >
        <div>
          {sessions.map((s, i) => (
            <div
              key={`${s.clientNumber}-${i}`}
              className="flex items-center gap-3 py-2 px-4 border-t border-[var(--hub-border)] first:border-t-0 hover:bg-[var(--hub-hover)] transition-colors"
            >
              <span className="w-[52px] shrink-0 text-[13px] font-semibold text-[var(--color-ink)] tabular-nums">
                {s.time}
              </span>
              <span className="flex-1 min-w-0 text-[13.5px] text-[var(--color-ink)] truncate">
                {s.clientName}
                {s.focus && <span className="text-[var(--color-muted)]"> · {s.focus}</span>}
              </span>
              <Link
                href={`/hub/clients/${s.clientNumber}`}
                className="shrink-0 inline-flex items-center justify-center rounded-lg border border-[var(--hub-field-border)] bg-white hover:bg-[var(--hub-hover)] text-foreground px-2.5 py-1 min-h-[30px] text-xs font-semibold no-underline transition-colors"
              >
                Open
              </Link>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="m-0 py-6 px-4 text-[13px] text-[var(--color-muted)]">Nothing booked today.</p>
          )}
        </div>
      </Section>

      {/* ── Outstanding tasks ── */}
      <Section
        title="Outstanding tasks"
        meta={tasks.length > 0 ? `${tasks.length} open` : undefined}
        action={{ label: "Open tasks", href: "/hub/tasks" }}
      >
        <div>
          {tasks.slice(0, 8).map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 py-2 px-4 border-t border-[var(--hub-border)] first:border-t-0 hover:bg-[var(--hub-hover)] transition-colors"
            >
              <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${t.overdue ? "bg-rose" : "bg-[var(--status-warning)]"}`} />
              <span className="flex-1 min-w-0 text-[13.5px] text-[var(--color-ink)] truncate">
                {t.title}
                {t.clientName && <span className="text-[var(--color-muted)]"> · {t.clientName}</span>}
              </span>
              {t.due && (
                <span className={`shrink-0 text-xs ${t.overdue ? "font-semibold text-rose" : "text-[var(--color-muted)]"}`}>
                  {t.overdue ? "Overdue " : ""}{t.due}
                </span>
              )}
              {t.clientNumber != null && (
                <Link
                  href={`/hub/clients/${t.clientNumber}`}
                  className="shrink-0 text-xs font-semibold text-[var(--color-rose)] no-underline hover:underline underline-offset-2"
                >
                  Open
                </Link>
              )}
            </div>
          ))}
          {tasks.length > 8 && (
            <p className="m-0 py-2 px-4 text-xs text-[var(--color-muted)] border-t border-[var(--hub-border)]">
              Showing 8 of {tasks.length}.
            </p>
          )}
          {tasks.length === 0 && (
            <p className="m-0 py-6 px-4 text-[13px] text-[var(--color-muted)]">No outstanding tasks.</p>
          )}
        </div>
      </Section>

      {/* ── Alerts ── every one links to the thing you do about it */}
      <Section title="Alerts" meta={alerts.length > 0 ? `${alerts.length} to look at` : undefined}>
        <div className="px-4 pb-3">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 py-2 px-3 rounded-nested border border-transparent hover:bg-[var(--hub-hover)] hover:border-[var(--hub-border)] transition-colors"
            >
              <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${DOT[a.dot]}`} />
              <span className="min-w-0 flex-1 text-[13.5px] text-[var(--color-ink)]">
                <b className="font-semibold">{a.headline}</b>
                {a.subline && <span className="block text-xs text-[var(--color-muted)] mt-px">{a.subline}</span>}
              </span>
              <Link
                href={a.href}
                className="shrink-0 inline-flex items-center justify-center rounded-lg border border-[var(--hub-field-border)] bg-white hover:bg-[var(--hub-hover)] text-foreground px-2.5 py-1 min-h-[30px] text-xs font-semibold no-underline transition-colors"
              >
                {a.actionLabel}
              </Link>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="flex items-center gap-2.5 py-2 px-3 text-[13px] text-[var(--color-muted)]">
              <span className="w-[7px] h-[7px] rounded-full bg-[var(--status-success)] shrink-0" />
              <span>Nothing needs looking at.</span>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
