import Link from "next/link";
import { IconChevronLeft, IconPencil, IconCalendar, IconMail } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/hub/StatusBadge";
import { lookupStatus } from "@/lib/hubStatus";
import { useDrawerManager } from "./DrawerManager";
import type { DBClient } from "@/types";

/* ── ClientRecordHeader — single-screen header replacing HubQuickActions +
   ContextStrip. One name, one number, one status badge, ONE subline sentence
   combining format/days/time/duration/client-since. */

function formatDeliveryMode(mode: string | null): string {
  if (!mode) return "—";
  return mode === "studio_1to1" ? "Studio 1-to-1" : mode === "home_training" ? "Home Training" : mode;
}

function formatDuration(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return "—";
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${minutes}min`;
}

function formatClientSince(date: string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Build the single subline from logistics. */
function buildSubline(client: DBClient): string {
  const p = client.profile;
  const format = formatDeliveryMode((client as any).delivery_mode ?? null);
  const duration = formatDuration(client.session_duration ?? null);

  // Days and time from logistics
  const days = (p?.logistics as any)?.days_of_week;
  const time = (p?.logistics as any)?.preferred_time;
  const freq = p?.logistics?.frequency ?? (p?.logistics?.sessions_per_week ? { unit: "week" as const, per_unit: p.logistics.sessions_per_week } : null);

  let schedule = "";
  if (days && days.length > 0) {
    const dayNames = days.map((d: string) => {
      const map: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
      return map[d] ?? d;
    });
    schedule = dayNames.join(", ");
    if (time) schedule += ` ${time}`;
  } else if (freq) {
    // Fallback to frequency description
    schedule = freq.unit === "week" && freq.per_unit
      ? `${freq.per_unit}x a week`
      : `${freq.per_unit}x a ${freq.unit}`;
    if (time) schedule += ` ${time}`;
  }

  const parts = [format];
  if (schedule) parts.push(schedule);
  parts.push(duration);
  if (client.start_date) parts.push(`client since ${formatClientSince(client.start_date)}`);

  return parts.join(" · ");
}

export function ClientRecordHeader({
  client,
  status,
  activeBlockId,
  sessionsRemaining,
  sessionsUsed,
  sessionsPurchased,
  paymentStatus,
  packageType,
  onRenewal,
}: {
  client: DBClient;
  status: string | null;
  activeBlockId?: string | null;
  sessionsRemaining: number | null;
  sessionsUsed: number | null;
  sessionsPurchased: number | null;
  paymentStatus: string;
  packageType: string | null;
  onRenewal?: () => void;
}) {
  const initials = client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const subline = buildSubline(client);
  const complianceLookup = status ? lookupStatus(status) : null;
  const isHomeTraining = (client as any).delivery_mode === "home_training";
  const firstName = client.name.split(" ")[0];
  const { openDrawer } = useDrawerManager();

  // Sessions chip: "N of M · Paid/Unpaid" or "Ongoing"
  const isOngoing = packageType === "ongoing" || sessionsPurchased == null;
  const sessionsChipText = isOngoing
    ? `Ongoing \u00b7 ${paymentStatus === "paid" ? "Paid" : "Unpaid"}`
    : `${sessionsRemaining ?? 0} of ${sessionsPurchased} sessions \u00b7 ${paymentStatus === "paid" ? "Paid" : "Unpaid"}`;
  const sessionsChipColor = paymentStatus === "paid"
    ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
    : "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]";

  const isDNT = status === "do_not_train";

  return (
    <>
      <a
        href="/hub/clients"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-body)] no-underline hover:text-[var(--color-ink)] mb-1.5"
      >
        ‹ Clients
      </a>

      {/* C1a — Do-Not-Train hard-stop header variant */}
      {isDNT ? (
        <div className="border border-[var(--status-danger-border)] rounded-surface overflow-hidden mb-2.5">
          <div className="flex items-center gap-3 px-4 py-3 bg-[var(--status-danger-bg)] border-b border-[var(--status-danger-border)]">
            <div className="w-[40px] h-[40px] rounded-pill bg-[var(--status-primary-bg)] text-[var(--status-primary-text)] grid place-items-center text-sm font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="m-0 text-[22px] font-bold tracking-tight text-[var(--color-ink)]">
                  {client.name}
                </h1>
                <span className="inline-flex items-center h-[21px] px-2.5 rounded-pill text-[11.5px] font-semibold border bg-[var(--status-danger-bg)] text-[var(--status-danger)] border-[var(--status-danger-border)]">
                  Do-Not-Train
                </span>
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="m-0 text-[10.5px] font-bold uppercase tracking-[.08em] text-[var(--status-danger)] mb-1">
              Hard-stop active — no sessions may be booked until cleared
            </p>
            <p className="m-0 text-[13px] text-[var(--color-body)]">
              Medical clearance required. Contact Esther to clear this client for training.
            </p>
          </div>
        </div>
      ) : (
      <div className="flex items-start gap-3.5 mb-2.5">
        {/* Avatar */}
        <div className="w-[52px] h-[52px] rounded-pill bg-[var(--status-primary-bg)] text-[var(--status-primary-text)] grid place-items-center text-base font-bold shrink-0">
          {initials}
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="m-0 text-[25px] font-bold tracking-tight text-[var(--color-ink)]">
              {client.name}
            </h1>
            <span className="text-sm font-semibold text-[var(--color-muted)]">
              #{client.client_number}
            </span>
            {complianceLookup && <StatusBadge status={status!} />}
            <span className={`inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-semibold ${sessionsChipColor}`}>
              {sessionsChipText}
            </span>
          </div>
          {subline && (
            <p className="m-0 mt-0.5 text-[13px] text-[var(--color-body)]">{subline}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* C1a — Renewal button: visible when renewal is due (remaining <= 1 or payment not paid) */}
          {onRenewal && (sessionsRemaining != null && sessionsRemaining <= 1 || paymentStatus !== "paid") && (
            <Button
              onClick={onRenewal}
              className="bg-rose hover:bg-rose/90 text-white rounded-lg px-3.5 py-1.5 h-auto text-sm font-semibold gap-1.5"
            >
              Start next package
            </Button>
          )}
          {/* C1a — Pot ledger button */}
          <Button
            variant="outline"
            onClick={() => openDrawer("dw-pot-ledger")}
            className="bg-white border-[var(--hub-field-border)] hover:bg-[var(--hub-hover)] text-foreground rounded-lg px-3.5 py-1.5 h-auto text-sm font-semibold gap-1.5"
          >
            Session balance
          </Button>
          <Link href={`/hub/clients/${client.client_number}/edit`}>
            <Button variant="outline" className="bg-white border-[var(--hub-field-border)] hover:bg-[var(--hub-hover)] text-foreground rounded-lg px-3.5 py-1.5 h-auto text-sm font-semibold gap-1.5">
              <IconPencil className="w-4 h-4" /> Edit Client
            </Button>
          </Link>
          {/* The review flow existed with no link anywhere in the app. */}
          <Link href={`/hub/clients/${client.client_number}/review`}>
            <Button variant="outline" className="bg-white border-[var(--hub-field-border)] hover:bg-[var(--hub-hover)] text-foreground rounded-control px-3.5 py-1.5 h-auto text-sm font-semibold gap-1.5">
              Full review
            </Button>
          </Link>
          {/* A home-training client is never booked into the studio, so
              "Book session" is the wrong primary action for her — the thing
              Esther actually does is get in touch. */}
          {isHomeTraining ? (
            <Link href={`/hub/clients/${client.client_number}/updates/new`}>
              <Button className="bg-rose hover:bg-rose/90 text-white rounded-lg px-3.5 py-1.5 h-auto text-sm font-semibold gap-1.5">
                <IconMail className="w-4 h-4" /> Message {firstName}
              </Button>
            </Link>
          ) : (
            <Link href={activeBlockId ? `/hub/clients/${client.client_number}/blocks/${activeBlockId}` : "/hub/schedule"}>
              <Button className="bg-rose hover:bg-rose/90 text-white rounded-lg px-3.5 py-1.5 h-auto text-sm font-semibold gap-1.5">
                <IconCalendar className="w-4 h-4" /> Book session
              </Button>
            </Link>
          )}
        </div>
      </div>
      )}
    </>
  );
}
