import { getPortalSessionFromCookies } from "@/lib/portal-session";
import { createPortalDataClient } from "@/lib/portal-data";
import type { PortalBookingSession } from "@/lib/portal-data";
import { SlotPicker } from "./SlotPicker";

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  const end = new Date(d.getTime() + 60 * 60 * 1000);
  const endTime = end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day}, ${time}\u2013${endTime}`;
}

function weekCommencingLabel(weekNum: number): string {
  // Approximate week-commencing label based on week number.
  // The real dates come from scheduled_at when booked.
  return `w/c week ${weekNum}`;
}

export default async function PortalSessionsPage() {
  const session = await getPortalSessionFromCookies();
  if (!session) return null;

  const data = createPortalDataClient(session.clientId);
  const bookingData = await data.getBookingSessions();

  if (!bookingData?.block) {
    return (
      <div className="space-y-8">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-2">Sessions</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your sessions</h1>
          <p className="mt-1 text-muted-foreground">
            You don&apos;t have an active training block yet. When Esther sets one up, your sessions will appear here.
          </p>
        </section>
      </div>
    );
  }

  const { block, sessions } = bookingData;
  const activeSessions = sessions.filter((s) => !s.cancelled_at);
  const completedCount = activeSessions.filter((s) => s.status === "completed").length;
  const totalCount = activeSessions.length;
  const sessionsReadyToBook = activeSessions.filter((s) => !s.scheduled_at).length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Compute approximate block date range from session scheduled_at values.
  const scheduledDates = activeSessions
    .filter((s) => s.scheduled_at)
    .map((s) => new Date(s.scheduled_at!))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const blockStartDate = scheduledDates.length > 0 ? scheduledDates[0] : null;
  const blockEndDate = scheduledDates.length > 0 ? scheduledDates[scheduledDates.length - 1] : null;
  const dateRangeLabel =
    blockStartDate && blockEndDate
      ? `${blockStartDate.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} \u2013 ${blockEndDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
      : null;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-2">
          Block {block.block_number} &middot; your sessions
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Book a session with Esther</h1>
        <p className="mt-1 text-muted-foreground max-w-[40rem]">
          See what&apos;s booked, book what isn&apos;t, or move a time that no longer works.
          The times you&apos;re offered are the moments Esther genuinely has free &mdash; her own
          diary as well as her other clients &mdash; so once you see a time here, it&apos;s really open.
        </p>
      </section>

      {/* Block summary card */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4 mb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground mb-1">Current block</p>
            <h2 className="text-xl font-semibold text-foreground">
              Block {block.block_number}
              {block.focus_label ? ` \u2014 ${block.focus_label}` : ""}
            </h2>
          </div>
        </div>
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">
              {completedCount} of {totalCount} sessions complete
            </p>
            {dateRangeLabel && (
              <p className="text-sm text-muted-foreground">{dateRangeLabel}</p>
            )}
          </div>
          <div className="h-3 rounded-full bg-warm border border-border overflow-hidden">
            <div className="h-full bg-teal transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground m-0">
          Sessions usually open for booking about three weeks ahead, one a week.
          Need something different? Call or text Esther on{" "}
          <a href="tel:07517658128" className="text-foreground font-semibold hover:underline">07517 658 128</a>.
        </p>
      </div>

      {/* Session list */}
      <SlotPicker
        sessions={activeSessions}
        sessionsReadyToBook={sessionsReadyToBook}
        blockFocusLabel={block.focus_label}
      />

      {/* Phone booking fallback */}
      <div className="flex gap-4 border border-border border-l-[6px] border-l-teal rounded-xl bg-cream/60 p-5">
        <div className="w-6 h-6 shrink-0 text-foreground mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.5" /></svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-1">Would rather book by phone?</h2>
          <p className="text-sm text-muted-foreground m-0">
            Call or text Esther any time on{" "}
            <a href="tel:07517658128" className="text-foreground font-semibold hover:underline">07517 658 128</a>
            {" "}and she&apos;ll book it for you instead &mdash; this page is just another way to do the same thing.
          </p>
        </div>
      </div>
    </div>
  );
}
