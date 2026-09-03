/**
 * Normalise Postgres timestamp text to strict ISO-8601, preserving the offset.
 *
 * WHY THIS EXISTS
 * ---------------
 * `lib/pg-client.ts` returns timestamps as strings rather than JS Date objects, to
 * match PostgREST and to stop React choking on a Date in a render. That intent is
 * right. The implementation was not: it passed Postgres's own text output through
 * verbatim, e.g. `2026-09-03 18:00:00+01` — space-delimited, no `T`, and a bare
 * two-digit offset.
 *
 * PostgREST does not emit that. It emits ISO-8601.
 *
 * The difference is invisible on desktop and fatal on mobile: V8 parses the raw
 * form leniently, WebKit returns `Invalid Date`. Every browser on iOS is WebKit,
 * and the trainer PWA is used on a phone mid-session — so `new Date(row.scheduled_at)`
 * rendered "Invalid Date" on the one device that mattered, and sort comparators
 * built on it silently returned NaN and left lists in arbitrary order.
 *
 * WHY OFFSET-PRESERVING, NOT `toISOString()`
 * ------------------------------------------
 * `toISOString()` converts to UTC, which can move the DATE across a midnight
 * boundary (`2026-09-03 00:30:00+01` → `2026-09-02T23:30:00Z`). Code in this repo
 * slices the first 10 characters of a timestamp to get a date (e.g.
 * PlanScheduleTable). Preserving the offset keeps both the instant and the date
 * prefix identical, so this is a pure format change.
 *
 * Fractional seconds are truncated to milliseconds: Postgres emits up to 6 digits,
 * the ECMAScript grammar specifies 3, and engines vary on the excess.
 */

// Trailing timezone offset: `+01`, `-05`, `+0130`, `+01:30`, or `Z`.
const OFFSET = /(?:[+-]\d{2}(?::?\d{2})?|Z)$/;

export function toIsoTimestamp(value: string | null): string | null {
  if (value === null || value === undefined) return value ?? null;
  const raw = String(value);

  // Postgres special values, and anything already carrying a `T`, are left alone.
  if (raw === "infinity" || raw === "-infinity" || raw === "" || raw.includes("T")) return raw;

  // `2026-09-03 18:00:00+01` → date and time halves.
  const spaceAt = raw.indexOf(" ");
  if (spaceAt === -1) return raw; // a bare date (type 1082) is already ISO

  let out = raw.slice(0, spaceAt) + "T" + raw.slice(spaceAt + 1);

  // Truncate fractional seconds to milliseconds.
  out = out.replace(/(\.\d{3})\d+/, "$1");

  const m = out.match(OFFSET);
  if (!m) return out; // timestamp without time zone — no offset to normalise
  const off = m[0];
  if (off === "Z") return out;

  const body = out.slice(0, out.length - off.length);
  const sign = off[0];
  const digits = off.slice(1).replace(":", "");
  const hh = digits.slice(0, 2);
  const mm = digits.length > 2 ? digits.slice(2, 4) : "00";
  return `${body}${sign}${hh}:${mm}`;
}
