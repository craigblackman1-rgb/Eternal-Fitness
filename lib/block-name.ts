/**
 * Shared block display-name helper — CR-EF-153.
 *
 * Esther names a block herself (`blocks.title`); when she leaves it blank,
 * the display falls back to the block's real date span, derived from its
 * sessions' `scheduled_at` values — never a fabricated date. If a block has
 * no dated sessions yet, the span is genuinely unknown, so the fallback is
 * an honest "Not yet scheduled" rather than an invented one.
 *
 * This is the single source of truth for the block's headline label.
 * Every surface that used to render a bare "Block N" should use one of the
 * functions below so no two screens can disagree.
 *
 *   blockDisplayName(block, sessions)
 *     "Full-body strength · Sep–Oct 2026"        (named, dated)
 *     "Band block, 3 sessions/wk · Aug–Oct 2026" (named, dated)
 *     "Sep–Oct 2026 · 14 sessions"               (blank title, dated)
 *     "Not yet scheduled · 14 sessions"          (blank title, undated)
 *     "Full-body strength"                       (named, undated)
 *
 *   blockNameOrSpan(block, sessions)
 *     the same "name half" without a trailing session count, for surfaces
 *     that want to append their own count/progress text
 *     ("Sep–Oct 2026", "Not yet scheduled", or the title itself)
 */

export interface BlockNameInput {
  title?: string | null;
}

export interface SessionForBlockName {
  scheduled_at?: string | null;
}

function pluralize(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function shortMonth(d: Date): string {
  return d.toLocaleDateString("en-GB", { month: "short" });
}

/**
 * "Sep–Oct 2026" style month/year span derived from real scheduled_at
 * values. Returns null when there are no dated sessions — the caller decides
 * the honest fallback ("Not yet scheduled"), this function never invents one.
 */
export function blockMonthYearSpan(sessions: SessionForBlockName[]): string | null {
  const dates = sessions
    .map((s) => s.scheduled_at)
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return null;

  const start = dates[0];
  const end = dates[dates.length - 1];
  const startMonth = shortMonth(start);
  const endMonth = shortMonth(end);
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear !== endYear) return `${startMonth} ${startYear} – ${endMonth} ${endYear}`;
  if (startMonth === endMonth) return `${startMonth} ${startYear}`;
  return `${startMonth}–${endMonth} ${startYear}`;
}

/**
 * The "name half" of the display: the trimmed title if Esther set one,
 * otherwise the real date span, otherwise "Not yet scheduled". No trailing
 * session count — use this when the caller wants to append its own count or
 * progress text (e.g. mobile "· 3/6").
 */
export function blockNameOrSpan(block: BlockNameInput, sessions: SessionForBlockName[]): string {
  const title = block.title?.trim();
  if (title) return title;
  return blockMonthYearSpan(sessions) ?? "Not yet scheduled";
}

/**
 * Full block display name/label — CR-EF-153 target format.
 *
 * `sessionCount` defaults to `sessions.length`. Pass it explicitly when the
 * caller already has a deduplicated "pot" count (excluding supplementary
 * sub-sessions, matching `blockSessionCounts` elsewhere) so the number
 * agrees with the rest of the page.
 */
export function blockDisplayName(
  block: BlockNameInput,
  sessions: SessionForBlockName[],
  sessionCount: number = sessions.length,
): string {
  const title = block.title?.trim() || null;
  const span = blockMonthYearSpan(sessions);

  if (title) {
    return span ? `${title} · ${span}` : title;
  }
  return span
    ? `${span} · ${pluralize(sessionCount, "session")}`
    : `Not yet scheduled · ${pluralize(sessionCount, "session")}`;
}
