# Lane brief — BUG-EF-108 (high): public discovery-call booking offers the wrong hours

**WO:** wo-ef-full-grind-2026-09-02 · **Model:** opencode-go/mimo-v2.5
**Worktree:** `D:\apps\worktrees\eternal-fitness-website\ef-bug108`, branch `lane/ef-bug108` off `origin/main` (`da5b24f`).
**File to change:** `lib/booking-availability.ts` only.

## The defect

There are **two separate availability systems** in this codebase, and the public one is wrong.

**Correct system** — `lib/availability.ts` reads the `availability_pattern` and `availability_overrides`
tables plus `booking_settings`. It holds Esther's real, confirmed hours: Mon–Thu 08:00–13:30,
Friday from 07:45 (early start for Becky), Saturday 08:00–13:30, Sunday closed. Every row is noted
*"Confirmed by Craig 2026-08-31"*. This is what `app/api/availability/slots/route.ts` uses (via
`deriveWeekSlots`), and it is what the existing-client portal correctly serves.

**Broken system** — `lib/booking-availability.ts` line 33 declares:

```js
const DEFAULT_WORKING_HOURS: WorkingHoursRule[] = [
  { dayOfWeek: 1, startLocal: "09:00", endLocal: "17:00" }, // Mon
  ... Tue–Fri identical ...
];
```

and line ~228, inside `getAvailableSlots`, passes it to `generateCandidateSlots`
**unconditionally**. It is not a fallback — `availability_pattern` is never consulted.

`getAvailableSlots` is served by `app/api/booking-availability/route.ts`, which is fetched by
`app/discovery-call/DiscoveryCallClient.tsx` — the **public discovery-call booking page**.

**Confirmed live on production**, not inferred:
`GET /api/booking-availability?start=2026-09-05…&end=2026-09-06…` returned eight one-hour slots on
**Monday 7 Sept, 09:00–17:00 BST**. Two consequences:

1. A prospect can book a consultation at 16:00 — over three hours after Esther finishes at 13:30.
2. Saturday is never offered, though she works Sat 08:00–13:30. Asking for Sat 5th/Sun 6th returned Monday instead.

## The fix

Make `getAvailableSlots` derive its working hours from the same source the portal uses, and delete
the hardcoded constant.

1. In `lib/booking-availability.ts`, import from `@/lib/availability` and use
   `deriveAvailableSlots(rangeStart, rangeEnd, bookedSlots)` — signature:
   `(rangeStart: string, rangeEnd: string, bookedSlots: string[] = []): Promise<DerivedDay[]>`.
   It already resolves `booking_settings`, `availability_pattern` and `availability_overrides`
   internally, so you do not need to fetch any of them yourself.
2. Map its `DerivedDay[]` result into the existing `AvailableSlot[]` shape
   (`{ startUtc, endUtc }`) that `getAvailableSlots` already returns. **Do not change the return
   type or the response shape of `/api/booking-availability`** — `DiscoveryCallClient.tsx` consumes it.
3. **Delete `DEFAULT_WORKING_HOURS` entirely**, and `generateCandidateSlots` too if nothing else
   uses it after the change (check first — `grep -n generateCandidateSlots lib/booking-availability.ts`).
4. Keep the existing Outlook busy-range filtering: a slot must still be dropped when it overlaps a
   calendar event. `deriveAvailableSlots` handles *booked hub slots*; the Graph `calendarEvents`
   filtering in `getAvailableSlots` must remain and continue to apply on top.
5. Sunday and any override-closed day must yield no slots at all.

`confirmBooking` in the same file must keep working — check whether it independently validates a
slot against `DEFAULT_WORKING_HOURS`, and if it does, route that through the same derived source so
booking and validation cannot disagree.

## FORBIDDEN

- Touching `lib/availability.ts`, `app/api/availability/slots/route.ts`, the portal, or the hub
  availability screens. They are correct — do not "align" them to anything.
- Changing the shape of `/api/booking-availability`'s response.
- Editing the `availability_pattern` data. The hours in the database are correct and confirmed.
- Adding a migration. No schema change is needed.
- Running a dev server, a browser, Playwright, `npm install` or `pnpm install`.

## VERIFY

1. `node --check` is not enough for TypeScript — instead re-read the whole changed file top to
   bottom and confirm: no reference to `DEFAULT_WORKING_HOURS` survives, the return type is
   unchanged, and the Outlook busy-range filter is still applied.
2. `grep -n "DEFAULT_WORKING_HOURS\|09:00\|17:00" lib/booking-availability.ts` must return nothing.
3. State plainly what you changed and what you could not verify. **Do not claim the endpoint returns
   correct hours** — you cannot run the app. Claude will drive it against production data.

## COMMIT

```
git add lib/booking-availability.ts .context/lane-brief-bug-ef-108-2026-09-02.md
git commit -m "BUG-EF-108: discovery-call availability reads the confirmed pattern, not hardcoded Mon-Fri 9-5"
```

Do not push.
